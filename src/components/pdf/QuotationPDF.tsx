import jsPDF from "jspdf";

interface QuotationData {
  quotation_number: string;
  customer_name: string;
  created_at: string;
  valid_until?: string;
  subtotal: number;
  discount: number;
  discount_rate: number;
  tax: number;
  total: number;
  notes?: string;
  currency?: string;
  exchange_rate?: number;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  company?: {
    company_name: string;
    address?: string;
    phone?: string;
    email?: string;
    tax_id?: string;
  };
}

export const generateQuotationPDF = async (
  quotation: QuotationData,
  companySettings?: any
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  // ── Header: company info ──────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companySettings?.company_name || "Mi Empresa", pageWidth / 2, yPos, { align: "center" });

  yPos += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  if (companySettings?.address) {
    doc.text(companySettings.address, pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
  }
  if (companySettings?.phone || companySettings?.email) {
    const contactInfo = [companySettings.phone, companySettings.email].filter(Boolean).join(" | ");
    doc.text(contactInfo, pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
  }
  if (companySettings?.tax_id) {
    doc.text(`CUIT/RUT: ${companySettings.tax_id}`, pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
  }

  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ── Document title ────────────────────────────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PRESUPUESTO", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // ── Quotation metadata ────────────────────────────────────────────────────
  const labelX = margin;
  const valueX = margin + 38;
  doc.setFontSize(10);

  doc.setFont("helvetica", "bold");
  doc.text("Número:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.quotation_number, valueX, yPos);

  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(quotation.created_at).toLocaleDateString("es-ES"), valueX, yPos);

  if (quotation.valid_until) {
    yPos += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Válido hasta:", labelX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(quotation.valid_until).toLocaleDateString("es-ES"), valueX, yPos);
  }

  yPos += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", labelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(quotation.customer_name, valueX, yPos);

  yPos += 15;

  // ── Items table ───────────────────────────────────────────────────────────
  // Column positions (right-aligned anchors)
  const colProduct = margin;
  const colQtyR   = pageWidth - margin - 85;
  const colPriceR = pageWidth - margin - 45;
  const colTotalR = pageWidth - margin;

  // Header row
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPos - 5, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Producto", colProduct + 2, yPos);
  doc.text("Cant.", colQtyR,   yPos, { align: "right" });
  doc.text("Precio Unit.", colPriceR, yPos, { align: "right" });
  doc.text("Subtotal", colTotalR, yPos, { align: "right" });

  yPos += 8;
  doc.setFont("helvetica", "normal");

  // Rows
  quotation.items.forEach((item) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    const maxProductWidth = colQtyR - colProduct - 10;
    const productLines = doc.splitTextToSize(item.product_name, maxProductWidth);
    doc.text(productLines[0], colProduct + 2, yPos);
    doc.text(item.quantity.toString(), colQtyR,   yPos, { align: "right" });
    doc.text(`$${Number(item.unit_price).toFixed(2)}`, colPriceR, yPos, { align: "right" });
    doc.text(`$${Number(item.subtotal).toFixed(2)}`,   colTotalR, yPos, { align: "right" });
    yPos += 6;
  });

  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // ── Totals block ──────────────────────────────────────────────────────────
  // Two fixed columns inside a right-side block
  const totalsLabelR = pageWidth - margin - 40; // right edge of label
  const totalsValueR = pageWidth - margin;       // right edge of value

  const currency = quotation.currency || "ARS";
  const currencySymbol = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "$";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text("Subtotal:", totalsLabelR, yPos, { align: "right" });
  doc.text(`${currencySymbol}${Number(quotation.subtotal).toFixed(2)}`, totalsValueR, yPos, { align: "right" });

  if (quotation.discount > 0) {
    yPos += 7;
    doc.text(`Descuento (${quotation.discount_rate}%):`, totalsLabelR, yPos, { align: "right" });
    doc.text(`-${currencySymbol}${Number(quotation.discount).toFixed(2)}`, totalsValueR, yPos, { align: "right" });
  }

  if (quotation.tax > 0) {
    yPos += 7;
    doc.text("Impuestos:", totalsLabelR, yPos, { align: "right" });
    doc.text(`${currencySymbol}${Number(quotation.tax).toFixed(2)}`, totalsValueR, yPos, { align: "right" });
  }

  yPos += 5;
  doc.setDrawColor(180, 180, 180);
  doc.line(pageWidth - margin - 80, yPos, pageWidth - margin, yPos);
  yPos += 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`TOTAL (${currency}):`, totalsLabelR, yPos, { align: "right" });
  doc.text(`${currencySymbol}${Number(quotation.total).toFixed(2)}`, totalsValueR, yPos, { align: "right" });

  if (currency !== "ARS" && quotation.exchange_rate) {
    yPos += 6;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    const totalARS = Number(quotation.total) * quotation.exchange_rate;
    doc.text(
      `Equivalente: $${totalARS.toFixed(2)} ARS — TC: ${quotation.exchange_rate}`,
      totalsValueR, yPos, { align: "right" }
    );
    doc.setTextColor(0);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (quotation.notes) {
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notas:", margin, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(quotation.notes, contentWidth);
    doc.text(splitNotes, margin, yPos);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.setTextColor(0);
  }

  doc.save(`Presupuesto-${quotation.quotation_number}.pdf`);
};
