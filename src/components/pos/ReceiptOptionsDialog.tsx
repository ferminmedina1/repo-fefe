import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, FileText, Mail, MessageCircle, Printer, Receipt, X } from "lucide-react";

interface ReceiptOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleData: any;
  onPrint: () => void;
  onPrintInvoice: () => void;
  onEmail: (extraEmail: string) => void;
  onWhatsApp: (extraPhone: string) => void;
  onSkip: () => void;
}

export function ReceiptOptionsDialog({
  open,
  onOpenChange,
  saleData,
  onPrint,
  onPrintInvoice,
  onEmail,
  onWhatsApp,
  onSkip,
}: ReceiptOptionsDialogProps) {
  const [tempPhoneNumber, setTempPhoneNumber] = useState("");
  const [tempEmail, setTempEmail] = useState("");

  const hasPhone = !!saleData?.customer?.phone;
  const hasEmail = !!saleData?.customer?.email;
  const showContactFields = !hasPhone || !hasEmail;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden gap-0">
        {/* Success header */}
        <div className="bg-green-50 dark:bg-green-950/30 px-6 py-5 flex flex-col items-center text-center border-b">
          <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-3 mb-3">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-green-800 dark:text-green-300">¡Venta Completada!</h2>
          <p className="text-sm text-green-700/70 dark:text-green-400/70 mt-0.5">
            ¿Cómo enviás el comprobante?
          </p>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Sale summary card */}
          {saleData && (
            <div className="bg-muted/60 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Ticket</p>
                <p className="text-sm font-semibold truncate">#{saleData.sale_number}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {saleData.customer?.name || "Venta Directa"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total</p>
                <p className="text-2xl font-bold tabular-nums">${saleData.total.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* Optional contact fields */}
          {showContactFields && (
            <div className="space-y-3">
              {!hasPhone && (
                <div className="space-y-1.5">
                  <Label htmlFor="temp-phone" className="text-xs font-medium text-muted-foreground">
                    Número de WhatsApp (opcional)
                  </Label>
                  <Input
                    id="temp-phone"
                    type="tel"
                    placeholder="+54 9 11 1234-5678"
                    value={tempPhoneNumber}
                    onChange={(e) => setTempPhoneNumber(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
              {!hasEmail && (
                <div className="space-y-1.5">
                  <Label htmlFor="temp-email" className="text-xs font-medium text-muted-foreground">
                    Email (opcional)
                  </Label>
                  <Input
                    id="temp-email"
                    type="email"
                    placeholder="cliente@email.com"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Primary actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => onWhatsApp(tempPhoneNumber)}
              className="h-11 bg-green-600 hover:bg-green-700 text-white flex flex-col items-center gap-0.5 py-1"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs leading-tight">WhatsApp</span>
              {hasPhone && (
                <span className="text-[10px] opacity-70 leading-tight truncate max-w-[7rem]">
                  {saleData.customer.phone}
                </span>
              )}
            </Button>

            <Button
              onClick={() => onEmail(tempEmail)}
              variant="outline"
              className="h-11 flex flex-col items-center gap-0.5 py-1"
            >
              <Mail className="h-4 w-4" />
              <span className="text-xs leading-tight">Email</span>
              {hasEmail && (
                <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[7rem]">
                  {saleData.customer.email}
                </span>
              )}
            </Button>
          </div>

          {/* Secondary actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onPrintInvoice}
              variant="outline"
              className="h-11 flex flex-col items-center gap-0.5 py-1"
            >
              <FileText className="h-4 w-4" />
              <span className="text-xs leading-tight text-center">Factura PDF</span>
              <span className="text-[10px] text-muted-foreground leading-tight">CAE/QR pendiente</span>
            </Button>

            <Button
              onClick={onPrint}
              variant="outline"
              className="h-11 flex flex-col items-center gap-0.5 py-1"
            >
              <Printer className="h-4 w-4" />
              <span className="text-xs leading-tight">Imprimir Ticket</span>
            </Button>
          </div>

          <Separator />

          <Button
            onClick={onSkip}
            variant="ghost"
            className="w-full h-9 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Omitir sin enviar
          </Button>

          <p className="text-[11px] text-muted-foreground text-center pb-1">
            Configurá el diseño de tickets en{" "}
            <span className="font-medium">Configuración → Diseño de Tickets</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
