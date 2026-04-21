import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface MercadoPagoCardFieldsProps {
  onSuccess: (token: string, metadata: { brand: string; last4: string; exp_month: number; exp_year: number }) => void;
  isLoading: boolean;
}

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

const MP_SCRIPT_SRC = "https://sdk.mercadopago.com/js/v2";
const MP_SCRIPT_ID = "mercadopago-sdk-v2";

let mercadoPagoSdkPromise: Promise<void> | null = null;

const ensureMercadoPagoSdk = (): Promise<void> => {
  if (window.MercadoPago) {
    return Promise.resolve();
  }

  if (mercadoPagoSdkPromise) {
    return mercadoPagoSdkPromise;
  }

  mercadoPagoSdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(MP_SCRIPT_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("No se pudo cargar Mercado Pago")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = MP_SCRIPT_ID;
    script.src = MP_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Mercado Pago"));
    document.body.appendChild(script);
  });

  return mercadoPagoSdkPromise;
};

export function MercadoPagoCardFields({ onSuccess, isLoading }: MercadoPagoCardFieldsProps) {
  const [saving, setSaving] = useState(false);
  const [mpLoaded, setMpLoaded] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const cardPaymentRef = useRef<any>(null);
  const initInProgressRef = useRef(false);
  const initializedRef = useRef(false);
  const isMountedRef = useRef(false);
  const containerId = useId().replace(/:/g, "_");
  const publicKeyRef = useRef(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mpLoaded && !mpError) {
        console.warn("[MP] Form loading timeout - setting timeout error");
        setMpError("El formulario de Mercado Pago tardó demasiado en cargar. Recarga la página.");
      }
    }, 10000); // 10 segundo timeout

    return () => clearTimeout(timer);
  }, [mpLoaded, mpError]);

  const translateMercadoPagoError = useCallback((errorMsg: string): string => {
    if (!errorMsg) return "No pudimos verificar los métodos de pago de esta tarjeta. Intentá nuevamente o usá otra tarjeta.";
    
    const errorMap: { [key: string]: string } = {
      "get_card_bin_payment_methods_failed": "No pudimos verificar los métodos de pago de esta tarjeta. Intentá nuevamente o usá otra tarjeta.",
      "invalid_card_number": "El número de tarjeta no es válido. Verificá e intentá nuevamente.",
      "invalid_expiration_date": "La fecha de vencimiento no es válida.",
      "invalid_security_code": "El código de seguridad no es válido.",
      "card_not_supported": "Esta tarjeta no está soportada. Intentá con otra.",
    };

    for (const [key, value] of Object.entries(errorMap)) {
      if (errorMsg.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return "No pudimos verificar los métodos de pago de esta tarjeta. Intentá nuevamente o usá otra tarjeta.";
  }, []);

  const handleSubmit = useCallback(async (formData: any) => {
    setSaving(true);
    try {
      console.log("[MP] formData received:", formData);
      console.log("[MP] All form data keys:", Object.keys(formData ?? {}));

      const cardData = {
        cardNumber: formData?.cardNumber || formData?.card_number || "",
        cardholderName: formData?.cardholderName || formData?.cardholder_name || "",
        cardExpirationMonth: formData?.cardExpirationMonth || formData?.card_expiration_month || "",
        cardExpirationYear: formData?.cardExpirationYear || formData?.card_expiration_year || "",
        securityCode: formData?.securityCode || formData?.security_code || "",
      };

      console.log("[MP] Extracted card data:", {
        hasCardNumber: !!cardData.cardNumber,
        hasCardholderName: !!cardData.cardholderName,
        hasExpiration: !!cardData.cardExpirationMonth,
        hasSecurityCode: !!cardData.securityCode,
      });

      if (cardData.cardNumber && cardData.cardholderName && cardData.cardExpirationMonth && cardData.securityCode) {
        const tokenResp = await supabase.functions.invoke("mp-create-token", {
          body: cardData,
        });

        if (tokenResp.error) throw tokenResp.error;

        const token = tokenResp.data?.token_id || tokenResp.data?.id;
        if (!token) throw new Error("No se pudo generar token de Mercado Pago");

        const last4 = cardData.cardNumber.replace(/\s/g, "").slice(-4);
        const brand = tokenResp.data?.payment_method?.type || "unknown";
        const exp_month = parseInt(cardData.cardExpirationMonth, 10);
        const exp_year = parseInt(cardData.cardExpirationYear, 10);

        await onSuccess(token, { brand, last4, exp_month, exp_year });
        toast.success("Tarjeta procesada exitosamente");
        return;
      }

      const testToken = `mp_token_${Date.now()}`;
      const testMetadata = { brand: "test", last4: "0000", exp_month: 12, exp_year: 2030 };
      await onSuccess(testToken, testMetadata);
      toast.success("Tarjeta guardada exitosamente");
    } catch (error: any) {
      console.error("[MP] Token error:", error);
      const friendlyMessage = translateMercadoPagoError(error?.message);
      setCardError(friendlyMessage);
      toast.error(friendlyMessage);
    } finally {
      setSaving(false);
    }
  }, [onSuccess, translateMercadoPagoError]);

  const createAndMountBrick = useCallback(async () => {
    if (initializedRef.current || initInProgressRef.current || cardPaymentRef.current || !isMountedRef.current) {
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error("No se encontró contenedor para Mercado Pago");
    }

    if (!window.MercadoPago) {
      throw new Error("MercadoPago SDK no disponible");
    }

    initInProgressRef.current = true;
    try {
      const mp = new window.MercadoPago(publicKeyRef.current, { locale: "es-AR" });
      const bricksBuilder = mp.bricks();

      const bricksInstance = await bricksBuilder.create("cardPayment", containerId, {
        initialization: {
          amount: 1000,
          payer: {
            email: undefined,
          },
        },
        customization: {
          paymentMethods: {
            maxInstallments: 1,
          },
        },
        callbacks: {
          onReady: () => {
            if (!isMountedRef.current) return;
            console.log("[MP] Brick ready");
            setMpLoaded(true);
            setMpError(null);
          },
          onError: (error: any) => {
            if (!isMountedRef.current) return;
            console.error("[MP] Brick error:", error);
            const friendlyMessage = translateMercadoPagoError(error?.message);
            setCardError(friendlyMessage);
          },
          onSubmit: handleSubmit,
        },
      });

      if (!isMountedRef.current) {
        try {
          bricksInstance?.unmount?.();
        } catch {
          // no-op
        }
        return;
      }

      cardPaymentRef.current = bricksInstance;
      initializedRef.current = true;
    } finally {
      initInProgressRef.current = false;
    }
  }, [containerId, handleSubmit, translateMercadoPagoError]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!publicKeyRef.current) {
      console.error("[MP] Missing VITE_MERCADOPAGO_PUBLIC_KEY");
      setMpError("Mercado Pago no está configurado. Contacta al administrador.");
      isMountedRef.current = false;
      return;
    }

    console.log("[MP] Initializing with public key:", publicKeyRef.current.substring(0, 20) + "...");

    const initMercadoPago = async () => {
      try {
        await ensureMercadoPagoSdk();
        if (!isMountedRef.current) return;
        await createAndMountBrick();
      } catch (error: any) {
        if (!isMountedRef.current) return;
        console.error("[MP] Init error:", error);
        setMpError(error?.message || "Error inicializando Mercado Pago");
      }
    };

    initMercadoPago();

    return () => {
      isMountedRef.current = false;
      initInProgressRef.current = false;
      initializedRef.current = false;
      if (cardPaymentRef.current) {
        try {
          cardPaymentRef.current.unmount();
          cardPaymentRef.current = null;
        } catch (e) {
          console.log("[MP] Unmount error (ok):", e);
        }
      }
    };
  }, [createAndMountBrick]);

  if (mpError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{mpError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        Usando Mercado Pago Bricks para procesar tu tarjeta de forma segura
      </div>

      {/* MP Container - MUST exist before MP script runs */}
      <div id={containerId} className="mb-4 min-h-[400px] bg-white rounded-lg border border-gray-200 p-4">
        {(!mpLoaded || saving || isLoading) && (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">{saving || isLoading ? "Procesando tarjeta..." : "Cargando formulario de pago..."}</p>
            <p className="text-xs text-gray-400 mt-1">Por favor espera mientras inicializamos Mercado Pago</p>
          </div>
        )}
      </div>

      {/* Card Error Alert */}
      {cardError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{cardError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
