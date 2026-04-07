import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useSecureMutation } from "@/lib/useSecureMutation";
import { validateUUID } from "@/lib/validators";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { StripeCardFields } from "@/components/signup/StripeCardFields";
import { MercadoPagoCardFields } from "@/components/signup/MercadoPagoCardFields";

const COUNTRIES = [
  { code: "AR", name: "Argentina" },
  { code: "US", name: "Estados Unidos" },
  { code: "MX", name: "México" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "ES", name: "España" },
  { code: "OTHER", name: "Otro" },
];

interface PaymentMethod {
  id: string;
  type: "card" | "mercadopago";
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  holder_name?: string;
  is_default: boolean;
  created_at: string;
  mp_preapproval_id?: string;
}

export function PaymentMethodsManager({
  companyId,
  showTitle = true,
  compact = false
}: {
  companyId?: string;
  showTitle?: boolean;
  compact?: boolean;
}) {
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [billingCountry, setBillingCountry] = useState("AR");
  const [stripePromise] = useState(() => {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
    return key ? loadStripe(key) : null;
  });

  const effectiveProvider = billingCountry === "AR" ? "mercadopago" : "stripe";

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ["payment-methods", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("company_payment_methods")
        .select("*")
        .eq("company_id", companyId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as PaymentMethod[];
    },
  });

  const handlePaymentSuccess = async (
    paymentMethodRef: string,
    metadata: { brand: string; last4: string; exp_month: number; exp_year: number }
  ) => {
    try {
      if (effectiveProvider === "stripe") {
        const { error } = await supabase.functions.invoke("save-stripe-payment-method", {
          body: { payment_method_id: paymentMethodRef, company_id: companyId },
        });
        if (error) throw error;
      } else {
        const isFirst = !paymentMethods || paymentMethods.length === 0;
        const { error } = await supabase
          .from("company_payment_methods")
          .insert({
            company_id: companyId,
            type: "card",
            brand: metadata.brand,
            last4: metadata.last4,
            exp_month: metadata.exp_month,
            exp_year: metadata.exp_year,
            mp_preapproval_id: paymentMethodRef,
            is_default: isFirst,
            billing_country: billingCountry,
          });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["payment-methods", companyId] });
      toast.success("Tarjeta guardada exitosamente");
      setAddDialogOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Error al guardar el método de pago");
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      // Validate UUID
      const validation = validateUUID(methodId);
      if (!validation.valid) {
        toast.error("ID de método inválido");
        console.error("Invalid payment method ID:", methodId);
        return;
      }

      const { error } = await supabase
        .from("company_payment_methods")
        .update({ is_default: false })
        .eq("company_id", companyId!);

      if (error) throw error;

      const { error: err2 } = await supabase
        .from("company_payment_methods")
        .update({ is_default: true })
        .eq("id", methodId);

      if (err2) throw err2;

      await queryClient.invalidateQueries({ queryKey: ["payment-methods", companyId] });
      toast.success("Método de pago predeterminado actualizado");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Error al establecer método predeterminado");
    }
  };

  const handleDelete = async (methodId: string) => {
    try {
      // Validate UUID
      const validation = validateUUID(methodId);
      if (!validation.valid) {
        toast.error("ID de método inválido");
        console.error("Invalid payment method ID:", methodId);
        return;
      }

      const { error } = await supabase.functions.invoke("delete-payment-method", {
        body: { method_id: methodId },
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["payment-methods", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["subscription", companyId] });
      toast.success("Método de pago eliminado");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Error al eliminar método de pago");
    }
  };

  const getCardBrandIcon = (brand?: string) => {
    const b = (brand ?? "").toLowerCase();
    if (b.includes("visa")) return "💳";
    if (b.includes("master")) return "💳";
    if (b.includes("amex")) return "💳";
    return "💳";
  };

  if (!companyId) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p>No hay empresa seleccionada</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        {showTitle && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Tus tarjetas de pago</h3>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Añadir tarjeta
              </Button>
            </DialogTrigger>
          </div>
        )}

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir tarjeta de crédito o débito</DialogTitle>
            <DialogDescription>
              Ingresa los datos de tu tarjeta de forma segura
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>País de facturación</Label>
              <Select value={billingCountry} onValueChange={setBillingCountry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {effectiveProvider === "mercadopago" ? (
              <MercadoPagoCardFields
                onSuccess={handlePaymentSuccess}
                isLoading={false}
              />
            ) : stripePromise ? (
              <Elements stripe={stripePromise}>
                <StripeCardFields
                  onSuccess={handlePaymentSuccess}
                  isLoading={false}
                />
              </Elements>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Stripe no está configurado. Contacta al administrador.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-24 bg-muted" />
            </Card>
          ))}
        </div>
      ) : paymentMethods && paymentMethods.length > 0 ? (
        <div className="grid gap-3">
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className={cn(
                "transition-all hover:shadow-md cursor-pointer",
                method.is_default && "border-primary bg-primary/5"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 text-white text-2xl">
                      {getCardBrandIcon(method.brand)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">
                          {(method.brand
                            ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1).toLowerCase()
                            : "Tarjeta")} •••• {method.last4 ?? "****"}
                        </p>
                        {method.is_default && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Predeterminada
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {method.holder_name && `${method.holder_name} • `}
                        {method.exp_month && method.exp_year
                          ? `Vence ${String(method.exp_month).padStart(2, '0')}/${method.exp_year}`
                          : `Autorizado • ${new Date(method.created_at).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!method.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(method.id);
                        }}
                      >
                        Establecer predeterminada
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("¿Eliminar este método de pago?")) {
                          handleDelete(method.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full bg-muted p-4">
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">No tienes tarjetas guardadas</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Añade una tarjeta para facilitar tus pagos
                </p>
              </div>
              <Button variant="outline" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir tarjeta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
