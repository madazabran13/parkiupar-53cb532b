import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from './formatters';

// ─── COMMON HELPERS ──────────────────────────────────────

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(17, 24, 39); // gray-900
  doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 18);
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 28);
  }
  doc.setFontSize(8);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, doc.internal.pageSize.width - 14, 18, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' }
    );
  }
}

// ─── 1. EXPIRATION REPORT ────────────────────────────────

type TenantRow = {
  name: string;
  city: string;
  planName: string;
  priceMonthly: number;
  startedAt: string | null;
  expiresAt: string | null;
  daysLeft: number | null;
  status: string;
};

export function generateExpirationReportPDF(tenants: TenantRow[]) {
  const doc = new jsPDF({ orientation: 'landscape' });

  addHeader(doc, 'Reporte de Vencimientos y Estado de Pagos', `Total parqueaderos: ${tenants.length}`);

  const body = tenants.map(t => [
    t.name,
    t.city,
    t.planName || '—',
    t.priceMonthly ? formatCurrency(t.priceMonthly) : '—',
    t.startedAt ? format(new Date(t.startedAt), 'dd/MM/yyyy') : '—',
    t.expiresAt ? format(new Date(t.expiresAt), 'dd/MM/yyyy') : '—',
    t.daysLeft !== null ? (t.daysLeft < 0 ? `Vencido (${Math.abs(t.daysLeft)}d)` : `${t.daysLeft} días`) : 'Sin plan',
    t.status,
  ]);

  autoTable(doc, {
    startY: 46,
    head: [['Parqueadero', 'Ciudad', 'Plan', 'Precio/mes', 'Inicio', 'Vencimiento', 'Días rest.', 'Estado']],
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      3: { halign: 'right' },
      6: { halign: 'center' },
      7: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw);
        if (val === 'Vencido') data.cell.styles.textColor = [220, 38, 38];
        else if (val === 'Por vencer') data.cell.styles.textColor = [217, 119, 6];
        else if (val === 'Activo') data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  // Summary
  const expired = tenants.filter(t => t.status === 'Vencido').length;
  const warning = tenants.filter(t => t.status === 'Por vencer').length;
  const active = tenants.filter(t => t.status === 'Activo').length;
  const noPlan = tenants.filter(t => t.status === 'Sin plan').length;
  const totalRevenue = tenants.reduce((sum, t) => sum + (t.priceMonthly || 0), 0);

  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen:', 14, finalY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Activos: ${active}  |  Por vencer: ${warning}  |  Vencidos: ${expired}  |  Sin plan: ${noPlan}  |  Ingreso mensual estimado: ${formatCurrency(totalRevenue)}`, 14, finalY + 20);

  addFooter(doc);
  doc.save(`reporte-vencimientos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ─── 2. PROFESSIONAL INVOICE ─────────────────────────────

type InvoiceData = {
  invoiceNumber: string;
  tenantName: string;
  tenantCity: string;
  tenantAddress: string | null;
  tenantPhone: string | null;
  tenantEmail: string | null;
  planName: string;
  priceMonthly: number;
  months: number;
  totalAmount: number;
  previousExpires: string | null;
  newExpires: string;
  paymentDate: string;
  companyName?: string;
};

export async function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.width;

  // ── Header bar
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, pw, 50, 'F');

  const textX = 14;
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', textX, 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName || 'ParkSuite SaaS', textX, 30);
  doc.text(`N° ${data.invoiceNumber}`, textX, 38);

  // Date on right
  doc.setFontSize(9);
  doc.text(`Fecha: ${format(new Date(data.paymentDate), "dd 'de' MMMM yyyy", { locale: es })}`, pw - 14, 22, { align: 'right' });

  // ── Client info section
  doc.setTextColor(0, 0, 0);
  let y = 62;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(14, y - 4, pw - 28, 36, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Facturado a:', 20, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.tenantName, 20, y + 12);
  doc.text(data.tenantCity + (data.tenantAddress ? ` — ${data.tenantAddress}` : ''), 20, y + 19);
  const contactParts: string[] = [];
  if (data.tenantPhone) contactParts.push(`Tel: ${data.tenantPhone}`);
  if (data.tenantEmail) contactParts.push(data.tenantEmail);
  if (contactParts.length) doc.text(contactParts.join('  |  '), 20, y + 26);

  // ── Items table
  y = 106;
  autoTable(doc, {
    startY: y,
    head: [['Descripción', 'Período', 'Precio/mes', 'Meses', 'Total']],
    body: [
      [
        `Plan ${data.planName}`,
        `${data.previousExpires ? format(new Date(data.previousExpires), 'dd/MM/yy') : format(new Date(data.paymentDate), 'dd/MM/yy')} → ${format(new Date(data.newExpires), 'dd/MM/yy')}`,
        formatCurrency(data.priceMonthly),
        String(data.months),
        formatCurrency(data.totalAmount),
      ],
    ],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'right' },
    },
    theme: 'grid',
  });

  // ── Totals
  const tableEndY = (doc as any).lastAutoTable?.finalY || 140;
  const totalsY = tableEndY + 8;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(pw - 100, totalsY, 86, 30, 3, 3, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', pw - 94, totalsY + 10);
  doc.text(formatCurrency(data.totalAmount), pw - 20, totalsY + 10, { align: 'right' });

  doc.setDrawColor(200);
  doc.line(pw - 94, totalsY + 15, pw - 20, totalsY + 15);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', pw - 94, totalsY + 24);
  doc.text(formatCurrency(data.totalAmount), pw - 20, totalsY + 24, { align: 'right' });

  // ── Payment info
  const infoY = totalsY + 44;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('Método de pago: Manual / Transferencia', 14, infoY);
  doc.text(`Nuevo vencimiento: ${format(new Date(data.newExpires), "dd 'de' MMMM yyyy", { locale: es })}`, 14, infoY + 7);

  // ── Footer line
  doc.setDrawColor(17, 24, 39);
  doc.setLineWidth(0.5);
  doc.line(14, doc.internal.pageSize.height - 20, pw - 14, doc.internal.pageSize.height - 20);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text('Factura generada automáticamente por ParkSuite — Este documento es válido como comprobante de pago.', pw / 2, doc.internal.pageSize.height - 14, { align: 'center' });

  addFooter(doc);
  doc.save(`factura-${data.invoiceNumber}.pdf`);
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── 3. PAYMENT HISTORY REPORT ───────────────────────────

type HistoryRow = {
  date: string;
  tenantName: string;
  planName: string;
  months: number;
  amount: number;
  previousExpires: string | null;
  newExpires: string;
};

export function generatePaymentHistoryPDF(rows: HistoryRow[]) {
  const doc = new jsPDF();

  addHeader(doc, 'Historial de Pagos y Renovaciones', `Total transacciones: ${rows.length}`);

  const body = rows.map(r => [
    format(new Date(r.date), 'dd/MM/yyyy HH:mm'),
    r.tenantName,
    r.planName,
    `${r.months} mes${r.months > 1 ? 'es' : ''}`,
    formatCurrency(r.amount),
    r.previousExpires ? format(new Date(r.previousExpires), 'dd/MM/yy') : '—',
    format(new Date(r.newExpires), 'dd/MM/yy'),
  ]);

  autoTable(doc, {
    startY: 46,
    head: [['Fecha', 'Parqueadero', 'Plan', 'Duración', 'Monto', 'Venc. anterior', 'Nuevo venc.']],
    body,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      4: { halign: 'right' },
    },
  });

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const finalY = (doc as any).lastAutoTable?.finalY || 100;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total recaudado: ${formatCurrency(total)}`, 14, finalY + 12);

  addFooter(doc);
  doc.save(`historial-pagos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
