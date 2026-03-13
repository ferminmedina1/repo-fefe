import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Receipt, AlertCircle, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface AFIPInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleData: {
    id: string;
    sale_number: string;
    total: number;
    subtotal: number;
    customer?: {
      id: string;
      name: string;
      tipo_documento?: string;
      numero_documento?: string;
      condicion_iva?: string;
    };
  } | null;
  companyId: string;
  onSuccess?: (result: unknown) => void;
}

const TIPOS_DOCUMENTO = [
  { value: "80", label: "CUIT" },
  { value: "86", label: "CUIL" },
  { value: "96", label: "DNI" },
  { value: "99", label: "Sin identificar" },
];

const TIPOS_COMPROBANTE = [
  { value: "1",  label: "Factura A",         code: "FACTURA_A" },
  { value: "6",  label: "Factura B",         code: "FACTURA_B" },
  { value: "11", label: "Factura C",         code: "FACTURA_C" },
  { value: "3",  label: "Nota de Crédito A", code: "NC_A" },
  { value: "8",  label: "Nota de Crédito B", code: "NC_B" },
];

const CONDICIONES_IVA = [
  { value: "IVA Responsable Inscripto",    label: "Resp. Inscripto",  tipoFactura: "1"  },
  { value: "IVA Responsable No Inscripto", label: "Resp. No Inscripto", tipoFactura: "6" },
  { value: "IVA Sujeto Exento",            label: "Exento",           tipoFactura: "6"  },
  { value: "Consumidor Final",             label: "Consumidor Final", tipoFactura: "6"  },
  { value: "Responsable Monotributo",      label: "Monotributo",      tipoFactura: "11" },
];

// AFIP-002: mapa de tasas IVA → código AFIP
const AFIP_IVA_RATES = [
  { id: 3, rate: 0,    label: "0%"    },
  { id: 4, rate: 10.5, label: "10.5%" },
  { id: 5, rate: 21,   label: "21%"   },
  { id: 6, rate: 27,   label: "27%"   },
];

// Tipos que NO discriminan IVA (Monotributistas)
const TIPOS_SIN_IVA = ["11"];
// Tipos que requieren comprobante asociado
const TIPOS_NC = ["3", "8"];

function resolveAfipIvaId(importeNeto: number, importeIVA: number): number {
  if (importeNeto <= 0) return 5;
  const rate = (importeIVA / importeNeto) * 100;
  return AFIP_IVA_RATES.reduce((prev, curr) =>
    Math.abs(curr.rate - rate) < Math.abs(prev.rate - rate) ? curr : prev
  ).id;
}

export function AFIPInvoiceDialog({
  open,
  onOpenChange,
  saleData,
  companyId,
  onSuccess,
}: AFIPInvoiceDialogProps) {
  const [tipoComprobante, setTipoComprobante] = useState("6");
  const [tipoDocumento,   setTipoDocumento]   = useState("96");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [selectedPOSId,   setSelectedPOSId]   = useState("");

  // AFIP-003: comprobante asociado — obligatorio para Notas de Crédito
  const [cbtesAsocTipo,     setCbtesAsocTipo]     = useState("6");
  const [cbtesAsocPtoVenta, setCbtesAsocPtoVenta] = useState("");
  const [cbtesAsocNro,      setCbtesAsocNro]      = useState("");

  // AFIP-001: useEffect en lugar de useState(() => {...}) — nunca hacer setState durante render
  useEffect(() => {
    if (!open) return;

    // Resetear campos de NC y POS cada vez que se abre el dialog
    setSelectedPOSId("");
    setCbtesAsocTipo("6");
    setCbtesAsocPtoVenta("");
    setCbtesAsocNro("");

    if (saleData?.customer) {
      const tipoDoc =
        saleData.customer.tipo_documento === "CUIT" ? "80" :
        saleData.customer.tipo_documento === "DNI"  ? "96" : "99";
      setTipoDocumento(tipoDoc);
      setNumeroDocumento(saleData.customer.numero_documento || "");

      const condicion = CONDICIONES_IVA.find(c => c.value === saleData.customer?.condicion_iva);
      if (condicion) setTipoComprobante(condicion.tipoFactura);
    } else {
      setTipoDocumento("99");
      setNumeroDocumento("");
      setTipoComprobante("6");
    }
  }, [open, saleData]);

  const { data: posPoints } = useQuery({
    queryKey: ["pos-afip-active", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("pos_afip")
        .select("id, punto_venta, descripcion")
        .eq("company_id", companyId)
        .eq("active", true)
        .order("punto_venta");
      if (error) throw error;
      return (data || []) as Array<{ id: string; punto_venta: number; descripcion: string }>;
    },
    enabled: open && !!companyId,
  });

  const { data: companyConfig } = useQuery({
    queryKey: ["company-afip-config", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("cuit, razon_social, condicion_iva, afip_enabled, afip_ambiente")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open && !!companyId,
  });

  // AFIP-004 + AFIP-005: validaciones fiscales antes de invocar la edge function
  const validateForm = (): boolean => {
    if (!selectedPOSId) {
      toast.error("Seleccioná un punto de venta");
      return false;
    }

    // Factura A → CUIT obligatorio
    if (tipoComprobante === "1" && tipoDocumento !== "80") {
      toast.error("Factura A requiere CUIT del receptor (tipo documento 80)");
      return false;
    }

    const cleanDoc = numeroDocumento.replace(/\D/g, "");

    // CUIT/CUIL: exactamente 11 dígitos
    if (["80", "86"].includes(tipoDocumento) && !/^\d{11}$/.test(cleanDoc)) {
      toast.error("CUIT/CUIL debe tener exactamente 11 dígitos");
      return false;
    }

    // DNI: 7 u 8 dígitos (si fue ingresado)
    if (tipoDocumento === "96" && cleanDoc && (cleanDoc.length < 7 || cleanDoc.length > 8)) {
      toast.error("DNI debe tener 7 u 8 dígitos");
      return false;
    }

    // AFIP-003: NC requiere comprobante asociado completo
    if (TIPOS_NC.includes(tipoComprobante)) {
      if (!cbtesAsocPtoVenta.trim() || !cbtesAsocNro.trim()) {
        toast.error("Las Notas de Crédito requieren el comprobante original (punto de venta y número)");
        return false;
      }
      if (isNaN(Number(cbtesAsocPtoVenta)) || isNaN(Number(cbtesAsocNro))) {
        toast.error("El punto de venta y número del comprobante asociado deben ser numéricos");
        return false;
      }
    }

    return true;
  };

  const emitirComprobante = useMutation({
    mutationFn: async () => {
      if (!saleData) throw new Error("No hay datos de venta");

      const pos = posPoints?.find(p => p.id === selectedPOSId);
      if (!pos) throw new Error("Punto de venta no encontrado");

      const isFacturaC = TIPOS_SIN_IVA.includes(tipoComprobante);
      const isNC       = TIPOS_NC.includes(tipoComprobante);

      // AFIP-002: IVA según tipo — Factura C no discrimina, A/B usan importes reales
      let importeNeto: number;
      let importeIVA: number;
      let ivaItems: Array<{ id: number; baseImp: number; importe: number }>;

      if (isFacturaC) {
        importeNeto = saleData.total;
        importeIVA  = 0;
        ivaItems    = [];
      } else {
        importeNeto = saleData.subtotal;
        importeIVA  = Math.max(0, saleData.total - saleData.subtotal);
        ivaItems    = importeIVA > 0
          ? [{ id: resolveAfipIvaId(importeNeto, importeIVA), baseImp: importeNeto, importe: importeIVA }]
          : [];
      }

      const payload: Record<string, unknown> = {
        companyId,
        posAfipId:        selectedPOSId,
        puntoVenta:       pos.punto_venta,
        tipoComprobante:  parseInt(tipoComprobante),
        concepto:         1,
        fecha:            format(new Date(), "yyyy-MM-dd"),
        clienteDocTipo:   parseInt(tipoDocumento),
        clienteDocNro:    numeroDocumento.replace(/\D/g, ""),
        importeTotal:     saleData.total,
        importeNeto,
        importeIVA,
        importeTributos:  0,
        importeExento:    0,
        importeNoGravado: 0,
        iva:              ivaItems,
        ambiente:         companyConfig?.afip_ambiente || "testing",
        saleId:           saleData.id,
      };

      // AFIP-003: adjuntar comprobante asociado si es NC
      if (isNC && cbtesAsocNro) {
        payload.cbtesAsoc = [{
          tipo:   parseInt(cbtesAsocTipo),
          ptoVta: parseInt(cbtesAsocPtoVenta),
          nro:    parseInt(cbtesAsocNro),
        }];
      }

      const { data, error } = await supabase.functions.invoke("afip-facturar", { body: payload });

      if (error) throw error;

      // AFIP-010: type guard — data puede ser null si la edge function falla inesperadamente
      if (!data || typeof data !== "object") {
        throw new Error("Respuesta inesperada del servidor AFIP");
      }
      const result = data as Record<string, unknown>;
      if (!result.success) {
        throw new Error((result.error as string) || "Error al emitir comprobante");
      }

      return result as { success: true; numeroComprobante: string };
    },
    onSuccess: (data) => {
      toast.success(`Comprobante emitido: ${data.numeroComprobante}`);
      if (onSuccess) onSuccess(data);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al emitir comprobante AFIP");
    },
  });

  if (!saleData) return null;

  const isAFIPEnabled     = companyConfig?.afip_enabled;
  const ambiente          = companyConfig?.afip_ambiente || "testing";
  const isFacturaC        = TIPOS_SIN_IVA.includes(tipoComprobante);
  const isNC              = TIPOS_NC.includes(tipoComprobante);
  const importeIVADisplay = isFacturaC ? 0 : Math.max(0, saleData.total - saleData.subtotal);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Emitir Comprobante AFIP
          </DialogTitle>
          <DialogDescription>
            Generar factura electrónica para la venta {saleData.sale_number}
          </DialogDescription>
        </DialogHeader>

        {!isAFIPEnabled ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              La facturación AFIP no está habilitada para esta empresa.
              Configure los certificados en Configuración → AFIP.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {ambiente === "testing" && (
              <Alert className="border-amber-500/50 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-600">
                  Modo HOMOLOGACIÓN — Los comprobantes no tienen validez fiscal
                </AlertDescription>
              </Alert>
            )}

            {/* Resumen de venta */}
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${(saleData.subtotal ?? 0).toFixed(2)}</span>
              </div>
              {/* AFIP-002: mostrar IVA solo si corresponde al tipo de comprobante */}
              {!isFacturaC ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA:</span>
                  <span>${importeIVADisplay.toFixed(2)}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Factura C: IVA incluido, no discriminado
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${(saleData.total ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Punto de Venta */}
            <div className="space-y-2">
              <Label>Punto de Venta *</Label>
              <Select value={selectedPOSId} onValueChange={setSelectedPOSId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar punto de venta" />
                </SelectTrigger>
                <SelectContent>
                  {posPoints?.map(pos => (
                    <SelectItem key={pos.id} value={pos.id}>
                      PV {String(pos.punto_venta).padStart(4, "0")} — {pos.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Comprobante */}
            <div className="space-y-2">
              <Label>Tipo de Comprobante *</Label>
              <Select value={tipoComprobante} onValueChange={setTipoComprobante}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_COMPROBANTE.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AFIP-003: comprobante asociado — obligatorio para NC */}
            {isNC && (
              <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium">Comprobante Original Asociado *</Label>
                <p className="text-xs text-muted-foreground">
                  AFIP requiere el comprobante que origina esta Nota de Crédito.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={cbtesAsocTipo} onValueChange={setCbtesAsocTipo}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Factura A</SelectItem>
                        <SelectItem value="6">Factura B</SelectItem>
                        <SelectItem value="11">Factura C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pto. Venta</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="0001"
                      value={cbtesAsocPtoVenta}
                      onChange={e => setCbtesAsocPtoVenta(e.target.value.replace(/\D/g, ""))}
                      maxLength={4}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Número</Label>
                    <Input
                      className="h-8 text-xs"
                      placeholder="00000001"
                      value={cbtesAsocNro}
                      onChange={e => setCbtesAsocNro(e.target.value.replace(/\D/g, ""))}
                      maxLength={8}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Datos del Cliente */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Datos del Cliente</h4>

              {saleData.customer ? (
                <div className="p-3 border rounded-lg">
                  <p className="font-medium text-sm">{saleData.customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {saleData.customer.condicion_iva || "Consumidor Final"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Consumidor Final</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo Documento</Label>
                  <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_DOCUMENTO.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Número Documento</Label>
                  <Input
                    value={numeroDocumento}
                    onChange={e => setNumeroDocumento(e.target.value)}
                    placeholder={
                      tipoDocumento === "80" || tipoDocumento === "86"
                        ? "20123456789"
                        : "12345678"
                    }
                  />
                </div>
              </div>

              {/* Alerta inline: Factura A sin CUIT */}
              {tipoComprobante === "1" && tipoDocumento !== "80" && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs">
                    Factura A requiere CUIT del receptor. Cambiá el tipo de documento a CUIT.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => { if (validateForm()) emitirComprobante.mutate(); }}
            disabled={emitirComprobante.isPending || !isAFIPEnabled}
          >
            {emitirComprobante.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Emitiendo...</>
            ) : (
              <><FileText className="mr-2 h-4 w-4" />Emitir Comprobante</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
