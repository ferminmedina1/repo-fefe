import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Mail, MessageCircle, Printer, X } from "lucide-react";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-500" />
            ¡Venta Completada!
          </DialogTitle>
          <DialogDescription>
            ¿Cómo deseas enviar el comprobante al cliente?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sale summary */}
          {saleData && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">Ticket:</span>
                  <span>#{saleData.sale_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Cliente:</span>
                  <span>{saleData.customer?.name || 'Venta Directa'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-lg">${saleData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Optional contact fields */}
          <div className="space-y-3">
            {!saleData?.customer?.phone && (
              <div className="space-y-2">
                <Label htmlFor="temp-phone" className="text-xs font-medium">
                  Número de WhatsApp (Opcional)
                </Label>
                <Input
                  id="temp-phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={tempPhoneNumber}
                  onChange={(e) => setTempPhoneNumber(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}
            {!saleData?.customer?.email && (
              <div className="space-y-2">
                <Label htmlFor="temp-email" className="text-xs font-medium">
                  Email (Opcional)
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

          {/* Action buttons */}
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={() => onWhatsApp(tempPhoneNumber)}
              className="h-12 bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Enviar por WhatsApp
              {saleData?.customer?.phone && (
                <span className="ml-2 text-xs opacity-75">({saleData.customer.phone})</span>
              )}
            </Button>

            <Button
              onClick={() => onEmail(tempEmail)}
              variant="outline"
              className="h-12"
            >
              <Mail className="mr-2 h-5 w-5" />
              Enviar por Email
              {saleData?.customer?.email && (
                <span className="ml-2 text-xs opacity-75">({saleData.customer.email})</span>
              )}
            </Button>

            <Button
              onClick={onPrintInvoice}
              variant="outline"
              className="h-12"
            >
              <Printer className="mr-2 h-5 w-5" />
              Generar Factura PDF (CAE/QR pendiente)
            </Button>

            <Button
              onClick={onPrint}
              variant="outline"
              className="h-12"
            >
              <Printer className="mr-2 h-5 w-5" />
              Imprimir Ticket
            </Button>

            <Button
              onClick={onSkip}
              variant="ghost"
              className="h-10"
            >
              <X className="mr-2 h-4 w-4" />
              Omitir
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
            💡 <strong>Consejo:</strong> Puedes configurar el diseño de tickets en
            <span className="font-medium"> Configuración → Diseño de Tickets</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
