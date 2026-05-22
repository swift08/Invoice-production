import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { DEFAULT_PUBLIC_LOGO_URL, COMPANY_WEBSITE_URL } from "./constants";
import type { CompanySettings, Invoice } from "./types";
import { computeTotals, formatINRForPdf, lineAmount } from "./invoice-calc";
import { rupeesInWords } from "./number-to-words";
import { statusPdfPillFill } from "./invoice-status";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("Failed to read image"));
    r.readAsDataURL(blob);
  });
}

/** jsPDF needs a data URL; fetch default `/public` logo when none is stored. */
async function companyWithResolvedLogoForPdf(c: CompanySettings): Promise<CompanySettings> {
  const existing = c.logoDataUrl?.trim();
  if (existing?.startsWith("data:image")) {
    return c;
  }
  const url = existing || DEFAULT_PUBLIC_LOGO_URL;
  try {
    const res = await fetch(url);
    if (!res.ok) return c;
    const blob = await res.blob();
    const dataUrl = await blobToDataUrl(blob);
    return { ...c, logoDataUrl: dataUrl };
  } catch {
    return c;
  }
}

const RED: [number, number, number] = [196, 30, 38];
/** Near-black for print-friendly contrast on A4 (avoids light gray that fades when printed). */
const INK: [number, number, number] = [12, 12, 12];
const LINE: [number, number, number] = [200, 200, 200];
/** Slightly softer than INK — only for tagline / secondary lines that stay readable when printed. */
const SUBTLE: [number, number, number] = [52, 52, 52];
const LINK_BLUE: [number, number, number] = [0, 72, 144];
const PAYABLE_BG: [number, number, number] = [255, 246, 246];
const BANK_FILL: [number, number, number] = [252, 252, 252];
const BANK_BORDER: [number, number, number] = [228, 228, 228];

/** jsPDF `addImage` format must match the data URL; PNG-only breaks JPEG/WebP uploads. */
function jsPdfImageFormatFromDataUrl(src: string): "PNG" | "JPEG" | "WEBP" {
  const head = src.slice(0, 48).toLowerCase();
  if (head.includes("image/jpeg") || head.includes("image/jpg")) return "JPEG";
  if (head.includes("image/webp")) return "WEBP";
  return "PNG";
}

function formatDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function buildInvoicePdf(invoice: Invoice, company: CompanySettings): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;

  doc.setFillColor(...RED);
  doc.rect(0, 0, W, 6, "F");

  const headerTop = 34;
  const nameX = M + (company.logoDataUrl ? 90 : 0);
  let headerBottom = headerTop + 54;

  if (company.logoDataUrl) {
    try {
      const fmt = jsPdfImageFormatFromDataUrl(company.logoDataUrl);
      doc.addImage(company.logoDataUrl, fmt, M, headerTop - 6, 74, 74);
      headerBottom = Math.max(headerBottom, headerTop - 6 + 74);
    } catch {
      /* ignore */
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...INK);
  doc.text(company.name || "Admark", nameX, headerTop + 20);

  if (company.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SUBTLE);
    doc.text(company.tagline, nameX, headerTop + 42);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...RED);
  doc.text("INVOICE", W - M, headerTop + 26, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(invoice.number, W - M, headerTop + 46, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(`Date: ${formatDate(invoice.date)}`, W - M, headerTop + 60, { align: "right" });
  headerBottom = Math.max(headerBottom, headerTop + 66);

  let cursorY = headerBottom + 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const companyLines = [
    company.address,
    company.email && `Email: ${company.email}`,
    company.phone && `Phone: ${company.phone}`,
    company.pan && `PAN: ${company.pan}`,
    company.gstin && `GSTIN: ${company.gstin}`,
  ].filter(Boolean) as string[];
  companyLines.forEach((l, i) => doc.text(l, M, cursorY + i * 12));
  const websiteLineY = cursorY + companyLines.length * 12;
  doc.setTextColor(...INK);
  doc.text("Website: ", M, websiteLineY);
  const siteLabelW = doc.getTextWidth("Website: ");
  doc.setTextColor(...LINK_BLUE);
  doc.textWithLink(COMPANY_WEBSITE_URL, M + siteLabelW, websiteLineY, { url: COMPANY_WEBSITE_URL });
  doc.setTextColor(...INK);

  cursorY += (companyLines.length + 1) * 12 + 32;

  doc.setDrawColor(...LINE);
  doc.line(M, cursorY, W - M, cursorY);
  cursorY += 30;

  const billBlockTop = cursorY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...RED);
  doc.text("BILL TO", M, billBlockTop);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(invoice.clientName || "—", M, billBlockTop + 22);

  let clientDetailsStartY = billBlockTop + 44;
  if (invoice.clientBusinessType) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(`Type of business: ${invoice.clientBusinessType}`, M, billBlockTop + 40);
    clientDetailsStartY = billBlockTop + 58;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const clientLines = [
    invoice.clientAddress,
    invoice.clientContact,
    invoice.clientPhone,
    invoice.clientEmail,
    invoice.clientGstin && `GSTIN: ${invoice.clientGstin}`,
  ].filter(Boolean) as string[];
  clientLines.forEach((l, i) => doc.text(String(l), M, clientDetailsStartY + i * 14));

  const metaX = W / 2 + 24;
  let metaY = billBlockTop;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...RED);
  doc.text("DETAILS", metaX, metaY);
  metaY += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const metaRows: Array<[string, string]> = [
    ["Invoice No.", invoice.number],
    ["Date", formatDate(invoice.date)],
    invoice.paymentMode ? ["Payment Mode", invoice.paymentMode] : null,
    invoice.paymentDate ? ["Payment Date", formatDate(invoice.paymentDate)] : null,
    invoice.paymentTerms ? ["Terms", invoice.paymentTerms] : null,
    ["Status", invoice.status.toUpperCase()],
  ].filter(Boolean) as Array<[string, string]>;
  metaRows.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...INK);
    doc.text(k, metaX, metaY);
    if (k === "Status") {
      const statusText = invoice.status.toUpperCase();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      const tw = doc.getTextWidth(statusText);
      const padX = 10;
      const ph = 15;
      const pw = tw + padX * 2;
      const px = W - M - pw;
      const py = metaY - 11;
      doc.setFillColor(...statusPdfPillFill(invoice.status));
      doc.roundedRect(px, py, pw, ph, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(statusText, px + pw / 2, py + ph - 4, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...INK);
      doc.text(String(v), W - M, metaY, { align: "right" });
    }
    metaY += 16;
  });

  const tableTop = Math.max(clientDetailsStartY + clientLines.length * 14 + 28, metaY + 20);

  autoTable(doc, {
    startY: tableTop,
    head: [["#", "Description", "Qty", "Rate", "Amount"]],
    body: invoice.items.map((it, i) => [
      String(i + 1),
      it.description || "—",
      String(it.quantity || 0),
      formatINRForPdf(Number(it.rate) || 0),
      formatINRForPdf(lineAmount(it)),
    ]),
    theme: "grid",
    styles: { fontSize: 9.5, cellPadding: 10, lineColor: LINE, textColor: INK, fontStyle: "normal" },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 30, halign: "center", fontStyle: "bold" },
      1: { halign: "left", fontStyle: "normal" },
      2: { cellWidth: 50, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 90, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 100, halign: "right", fontStyle: "bold" },
    },
    margin: { left: M, right: M },
  });

  const totals = computeTotals(invoice);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ty = (doc as any).lastAutoTable.finalY + 22;

  const tx = W - M - 240;
  const rowTotals = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(label, tx, ty);
    doc.text(value, W - M, ty, { align: "right" });
    ty += 15;
  };

  rowTotals("Subtotal", formatINRForPdf(totals.subtotal));
  if (totals.tax > 0) rowTotals(`Tax (${invoice.taxPercent}%)`, formatINRForPdf(totals.tax));
  if (totals.advance > 0) rowTotals("Advance Received", `- ${formatINRForPdf(totals.advance)}`);

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(1);
  doc.line(tx, ty + 4, W - M, ty + 4);
  doc.setLineWidth(0.2);
  doc.setDrawColor(...LINE);
  ty += 18;

  const payLabel = "Amount Payable";
  const payVal = formatINRForPdf(totals.payable);
  const boxPadX = 12;
  const boxH = 38;
  const boxTop = ty;
  const boxW = W - M - tx + boxPadX * 2;
  doc.setFillColor(...PAYABLE_BG);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.85);
  doc.roundedRect(tx - boxPadX, boxTop, boxW, boxH, 6, 6, "FD");
  doc.setLineWidth(0.2);
  doc.setDrawColor(...LINE);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...RED);
  doc.text(payLabel, tx, boxTop + 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...RED);
  doc.text(payVal, W - M - 10, boxTop + 30, { align: "right" });
  ty = boxTop + boxH + 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const words = `Amount in words: ${rupeesInWords(totals.payable)}`;
  const wrapped = doc.splitTextToSize(words, W - 2 * M);
  doc.text(wrapped, M, ty + 12);
  ty += 12 + wrapped.length * 12;

  if (invoice.remarks) {
    ty += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text("Remarks", M, ty);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const r = doc.splitTextToSize(invoice.remarks, W - 2 * M);
    doc.text(r, M, ty + 16);
    ty += 16 + r.length * 12;
  }

  const footerTop = Math.max(ty + 32, H - 188);
  doc.setDrawColor(...LINE);
  doc.line(M, footerTop, W - M, footerTop);

  const bankLines = [
    company.bankName && `Bank: ${company.bankName}`,
    company.accountName && `Account Name: ${company.accountName}`,
    company.accountNumber && `A/C Number: ${company.accountNumber}`,
    company.ifsc && `IFSC: ${company.ifsc}`,
    company.branch && `Branch: ${company.branch}`,
    company.upi && `UPI: ${company.upi}`,
  ].filter(Boolean) as string[];

  const bankPad = 14;
  const bankLineGap = 13;
  const bankBoxY = footerTop + 14;
  const bankBoxW = W * 0.48;
  const bankBoxH = 26 + bankLines.length * bankLineGap + bankPad;

  doc.setFillColor(...BANK_FILL);
  doc.setDrawColor(...BANK_BORDER);
  doc.roundedRect(M, bankBoxY, bankBoxW, bankBoxH, 5, 5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...RED);
  doc.text("BANK DETAILS", M + bankPad, bankBoxY + 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  bankLines.forEach((l, i) => doc.text(l, M + bankPad, bankBoxY + 36 + i * bankLineGap));

  const sigX = W - M - 180;
  const sigY = bankBoxY + 8;
  if (company.signatureDataUrl) {
    try {
      const fmt = jsPdfImageFormatFromDataUrl(company.signatureDataUrl);
      doc.addImage(company.signatureDataUrl, fmt, sigX, sigY, 160, 50);
    } catch {
      /* ignore */
    }
  }
  doc.setDrawColor(...INK);
  doc.line(sigX, sigY + 70, W - M, sigY + 70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(`For ${company.name}`, W - M, sigY + 84, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...INK);
  doc.text(company.authorizedName || "Authorized Signatory", W - M, sigY + 96, { align: "right" });

  doc.setFillColor(...RED);
  doc.rect(0, H - 4, W, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text("We appreciate the opportunity to work with you.", M, H - 30);
  doc.text("For queries, contact us anytime.", M, H - 18);
  doc.text(`Generated ${new Date().toLocaleDateString("en-IN")}`, W - M, H - 18, {
    align: "right",
  });

  return doc;
}

export async function downloadInvoicePdf(
  invoice: Invoice,
  company: CompanySettings,
): Promise<void> {
  const c = await companyWithResolvedLogoForPdf(company);
  const doc = buildInvoicePdf(invoice, c);
  const safe = invoice.number.replace(/[\s/]+/g, "_");
  doc.save(`${safe}.pdf`);
}
