import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ReceiptPDF } from "@/components/pos/ReceiptPDF";
import { InvoicePDF } from "@/components/pos/InvoicePDF";
import type { CartItem } from "./useCartLogic";
import type { PaymentMethod } from "./usePaymentLogic";

interface SaleProcessingParams {
  cart: CartItem[];
  paymentMethods: PaymentMethod[];
  selectedCustomer: any;
  selectedWarehouse: string;
  selectedPOSAfipId: string;
  subtotal: number;
  totalDiscount: number;
  discountRate: number;
  loyaltyDiscountRate: number;
  taxAmount: number;
  taxRate: number;
  total: number;
  remaining: number;
  loyaltyPointsToUse: number;
  companySettings: any;
  posPoints: any[] | undefined;
  currentCompany: any;
  onSaleSuccess: () => void;
}

export function useSaleProcessing(params: SaleProcessingParams) {
  const {
    cart, paymentMethods, selectedCustomer, selectedWarehouse, selectedPOSAfipId,
    subtotal, totalDiscount, discountRate, loyaltyDiscountRate, taxAmount, taxRate,
    total, remaining, loyaltyPointsToUse, companySettings, posPoints,
    currentCompany, onSaleSuccess,
  } = params;

  const queryClient = useQueryClient();
  const [showReceiptOptions, setShowReceiptOptions] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  const determineComprobante = (company: any, customer: any): string => {
    const empresa = company?.condicion_iva || 'responsable_inscripto';
    const cliente = customer?.condicion_iva || 'consumidor_final';
    if (!company?.afip_enabled) return 'TICKET';
    if (empresa === 'responsable_inscripto') {
      if (cliente === 'responsable_inscripto') return 'FACTURA_A';
      if (cliente === 'consumidor_final' || cliente === 'monotributista' || cliente === 'exento') return 'FACTURA_B';
    }
    if (empresa === 'monotributista') return 'FACTURA_C';
    if (empresa === 'exento') return 'FACTURA_C';
    return 'TICKET';
  };

  const generateTextMessage = (saleData: any) => {
    return `
🧾 *COMPROBANTE DE VENTA*

📋 Ticket: ${saleData.sale_number}
📅 Fecha: ${format(new Date(saleData.created_at), "dd/MM/yyyy HH:mm")}
${saleData.customer ? `👤 Cliente: ${saleData.customer.name}` : '👤 Cliente: Venta Directa'}

📦 *PRODUCTOS:*
${saleData.items.map((item: any) =>
  `• ${item.product.name}\n  ${item.quantity} x $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`
).join('\n')}

💰 *TOTALES:*
Subtotal: $${saleData.subtotal.toFixed(2)}
Impuestos: $${saleData.tax.toFixed(2)}
*TOTAL: $${saleData.total.toFixed(2)}*

¡Gracias por su compra! 🙏
    `.trim();
  };

  const generatePDFBlob = async (saleData: any): Promise<Blob | null> => {
    try {
      const { jsPDF } = await import('jspdf');
      let config = {
        paper_width: '80mm',
        font_size: 'small',
        company_name: 'Mi Empresa',
        company_address: '',
        company_phone: '',
        footer_message: '¡Gracias por su compra!',
      };
      try {
        if (currentCompany?.id) {
          const { data: ticketConfig, error } = await supabase
            .from('companies')
            .select('*')
            .eq('id', currentCompany.id)
            .single();
          if (!error && ticketConfig) {
            config = {
              paper_width: '80mm',
              font_size: 'small',
              company_name: ticketConfig.name || 'Mi Empresa',
              company_address: ticketConfig.address || '',
              company_phone: ticketConfig.phone || '',
              footer_message: ticketConfig.receipt_footer || '¡Gracias por su compra!',
            };
          }
        }
      } catch (configError) {
        console.warn('Error fetching ticket config, using defaults:', configError);
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 150] });
      const fontSize = 8;
      doc.setFontSize(fontSize);
      let yPos = 10;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 5;

      if (config.company_name) {
        doc.setFont(undefined, 'bold');
        doc.text(config.company_name, pageWidth / 2, yPos, { align: 'center' });
        yPos += 5;
      }
      if (config.company_address) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(fontSize - 1);
        doc.text(config.company_address, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      if (config.company_phone) {
        doc.text(config.company_phone, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }
      yPos += 3;

      doc.setFontSize(fontSize);
      doc.text(`Ticket: ${saleData.sale_number}`, margin, yPos); yPos += 4;
      doc.text(`Fecha: ${format(new Date(saleData.created_at), "dd/MM/yyyy HH:mm")}`, margin, yPos); yPos += 4;
      doc.text(`Cliente: ${saleData.customer?.name || 'Venta Directa'}`, margin, yPos); yPos += 6;

      doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 4;
      doc.text('PRODUCTOS:', margin, yPos); yPos += 4;

      saleData.items.forEach((item: any) => {
        doc.text(`${item.product.name}`, margin, yPos); yPos += 3;
        doc.text(`${item.quantity} x $${item.unit_price.toFixed(2)} = $${item.total.toFixed(2)}`, margin + 2, yPos); yPos += 4;
      });
      yPos += 2;

      doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 4;
      doc.text(`Subtotal: $${saleData.subtotal.toFixed(2)}`, margin, yPos); yPos += 4;
      doc.text(`Impuestos: $${saleData.tax.toFixed(2)}`, margin, yPos); yPos += 4;
      doc.setFont(undefined, 'bold');
      doc.text(`TOTAL: $${saleData.total.toFixed(2)}`, margin, yPos); yPos += 6;

      if (config.footer_message) {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(fontSize - 1);
        doc.text(config.footer_message, pageWidth / 2, yPos, { align: 'center' });
      }

      return doc.output('blob');
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  };

  const processSaleMutation = useMutation({
    mutationFn: async () => {
      // Client-side pre-validation (server validates everything authoritatively)
      if (cart.length === 0) throw new Error("El carrito está vacío");
      if (paymentMethods.length === 0) throw new Error("Agregue al menos un método de pago");
      if (remaining > 0.01) throw new Error("Debe completar el pago antes de procesar la venta");

      // Single atomic RPC: recalculates totals server-side, validates payments,
      // inserts sale+items+payments, decrements stock, handles loyalty — all in one transaction.
      const rpcPayload = {
        p_input: {
          company_id: currentCompany?.id,
          customer_id: selectedCustomer?.id || null,
          warehouse_id: selectedWarehouse || null,
          pos_afip_id: selectedPOSAfipId || null,
          discount_rate: discountRate,
          loyalty_points_to_use: loyaltyPointsToUse,
          tipo_comprobante: determineComprobante(companySettings, selectedCustomer) || 'TICKET',
          condicion_iva_cliente: selectedCustomer?.condicion_iva || 'consumidor_final',
          cart: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          payments: paymentMethods.map(p => ({
            method: p.method,
            amount: p.originalAmount,
            currency: p.currency || 'ARS',
            installments: p.installments || 1,
          })),
        },
      };
      const { data, error } = await supabase.rpc('process_sale', rpcPayload);

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: async (saleResult: any) => {
      // Cash register is now handled inside the RPC transaction.
      // Invalidate cash register queries so the UI stays in sync.
      queryClient.invalidateQueries({ queryKey: ["cash-register"] });

      const completeSaleData = {
        ...saleResult,
        items: cart.map(item => ({
          ...item,
          total: item.unit_price * item.quantity,
          product: { name: item.product_name, code: '' },
        })),
        customer: selectedCustomer,
        paymentMethods,
      };

      setLastSaleData(completeSaleData);
      setShowReceiptOptions(true);
      onSaleSuccess();
      toast.success("¡Venta procesada exitosamente!");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sales-stats"] });
      queryClient.invalidateQueries({ queryKey: ["customers-pos"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al procesar la venta");
    },
  });

  const handlePrintReceipt = () => {
    if (lastSaleData) {
      ReceiptPDF(lastSaleData);
      setShowReceiptOptions(false);
      setLastSaleData(null);
    }
  };

  const handlePrintInvoice = () => {
    if (!lastSaleData) return;
    const tipo = determineComprobante(companySettings, lastSaleData.customer);
    const pvSel = (posPoints || []).find((p: any) => p.id === (lastSaleData.pos_afip_id || selectedPOSAfipId));
    const puntoVenta = pvSel?.punto_venta || null;
    const comp = companySettings || currentCompany || {};
    const items = (lastSaleData.items || []).map((it: any) => ({
      product_name: it.product_name || it.product?.name || "Producto",
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      subtotal: Number(it.subtotal != null ? it.subtotal : (Number(it.unit_price) || 0) * (Number(it.quantity) || 1)),
    }));

    InvoicePDF({
      tipoComprobante: tipo.startsWith('FACTURA') ? tipo : 'FACTURA_B',
      puntoVenta,
      numeroComprobante: lastSaleData.numero_comprobante || null,
      cae: lastSaleData.cae || null,
      caeVencimiento: lastSaleData.fecha_vencimiento_cae || null,
      fecha: lastSaleData.created_at,
      company: {
        razon_social: comp?.razon_social || comp?.name || undefined,
        nombre_fantasia: comp?.nombre_fantasia || undefined,
        cuit: comp?.tax_id || undefined,
        condicion_iva: comp?.condicion_iva || undefined,
        address: comp?.address || undefined,
        phone: comp?.phone || undefined,
      },
      customer: lastSaleData.customer ? {
        name: lastSaleData.customer.name,
        condicion_iva: lastSaleData.customer.condicion_iva || undefined,
        tipo_documento: lastSaleData.customer.tipo_documento || (lastSaleData.customer.document ? 'dni' : undefined),
        numero_documento: lastSaleData.customer.numero_documento || lastSaleData.customer.document || undefined,
      } : null,
      items,
      subtotal: Number(lastSaleData.subtotal) || 0,
      discount: Number(lastSaleData.discount) || 0,
      tax: Number(lastSaleData.tax) || 0,
      tax_rate: Number(lastSaleData.tax_rate) || undefined,
      total: Number(lastSaleData.total) || 0,
      paymentMethods: (lastSaleData.paymentMethods || []).map((pm: any) => ({
        method: pm.method,
        amount: Number(pm.amount) || 0,
        installments: pm.installments || 1,
      })),
    });

    setShowReceiptOptions(false);
    setLastSaleData(null);
  };

  const handleEmailReceipt = async (extraEmail = "") => {
    if (!lastSaleData) return;
    try {
      const email = lastSaleData.customer?.email || extraEmail;
      if (!email.trim()) {
        toast.error("Se requiere un email para enviar el comprobante");
        return;
      }
      const pdfBlob = await generatePDFBlob(lastSaleData);
      if (pdfBlob) {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = `Ticket_${lastSaleData.sale_number}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);

        const emailSubject = `Comprobante de Venta - Ticket #${lastSaleData.sale_number}`;
        const emailBody = `
Estimado/a cliente,

Le adjuntamos el comprobante de su compra:

Ticket: ${lastSaleData.sale_number}
Fecha: ${format(new Date(lastSaleData.created_at), "dd/MM/yyyy HH:mm")}
Cliente: ${lastSaleData.customer?.name || 'Venta Directa'}
Total: $${lastSaleData.total.toFixed(2)}

El archivo PDF se ha descargado automáticamente. Por favor, adjúntelo a su email.

¡Gracias por su compra!

Saludos cordiales.
        `.trim();

        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(mailtoUrl);
        toast.success("PDF descargado y cliente de email abierto. Adjunta el archivo manualmente.", { duration: 5000 });
      } else {
        toast.error("Error al generar el PDF");
      }
      setShowReceiptOptions(false);
      setLastSaleData(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar el email");
    }
  };

  const handleWhatsAppReceipt = async (extraPhone = "") => {
    if (!lastSaleData) return;
    try {
      const phoneNumber = lastSaleData.customer?.phone || extraPhone;
      if (!phoneNumber.trim()) {
        toast.error("Se requiere un número de teléfono para WhatsApp");
        return;
      }
      const pdfBlob = await generatePDFBlob(lastSaleData);
      if (pdfBlob) {
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = pdfUrl;
        downloadLink.download = `Ticket_${lastSaleData.sale_number}.pdf`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);

        const message = `
🧾 *COMPROBANTE DE VENTA*

📋 Ticket: ${lastSaleData.sale_number}
📅 Fecha: ${format(new Date(lastSaleData.created_at), "dd/MM/yyyy HH:mm")}
${lastSaleData.customer ? `👤 Cliente: ${lastSaleData.customer.name}` : '👤 Cliente: Venta Directa'}

💰 *TOTAL: $${lastSaleData.total.toFixed(2)}*

📎 El comprobante PDF se ha descargado automáticamente.
📤 Por favor, adjúntalo manualmente a este chat de WhatsApp.

¡Gracias por su compra! 🙏
        `.trim();

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^\d]/g, '')}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        toast.success("PDF descargado y WhatsApp abierto. Adjunta el archivo manualmente.", { duration: 5000 });
      } else {
        const textMessage = generateTextMessage(lastSaleData);
        const encodedMessage = encodeURIComponent(textMessage);
        const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^\d]/g, '')}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        toast.success("WhatsApp abierto con comprobante de texto");
      }
      setShowReceiptOptions(false);
      setLastSaleData(null);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al procesar el comprobante");
    }
  };

  const handleSkipReceipt = () => {
    setShowReceiptOptions(false);
    setLastSaleData(null);
  };

  return {
    processSaleMutation,
    showReceiptOptions,
    setShowReceiptOptions,
    lastSaleData,
    handlePrintReceipt,
    handlePrintInvoice,
    handleEmailReceipt,
    handleWhatsAppReceipt,
    handleSkipReceipt,
  };
}
