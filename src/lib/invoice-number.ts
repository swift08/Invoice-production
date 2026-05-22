import { loadInvoices } from "./storage";

/**
 * Indian financial year: Apr 1 → Mar 31.
 * For a date in May 2026 → "26-27"; in Feb 2027 → "26-27"; in May 2027 → "27-28".
 */
export function financialYear(date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-based
  const startYear = m >= 3 ? y : y - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

/**
 * Enterprise-style format: `AM/26-27/0001` (FY in the middle, 4-digit sequence).
 * Legacy `AM 0001/26-27` is still parsed for sequencing.
 */
export function formatInvoiceNumber(seq: number, fy: string): string {
  return `AM/${fy}/${String(seq).padStart(4, "0")}`;
}

/** Parse sequence from stored invoice number for a given FY, or null if not matched. */
export function parseInvoiceSequence(number: string, fy: string): number | null {
  const trimmed = number.trim();
  const newRe = new RegExp(`^AM/${fy}/(\\d{4})$`, "i");
  let m = trimmed.match(newRe);
  if (m) return parseInt(m[1], 10);
  const oldRe = new RegExp(`^AM\\s+(\\d+)/${fy}$`, "i");
  m = trimmed.match(oldRe);
  if (m) return parseInt(m[1], 10);
  return null;
}

/** Look at existing invoices to find next sequence for current FY. */
export async function nextInvoiceNumber(date = new Date()): Promise<string> {
  const fy = financialYear(date);
  let max = 0;
  const invoices = await loadInvoices();
  for (const inv of invoices) {
    const n = parseInvoiceSequence(inv.number, fy);
    if (n != null && n > max) max = n;
  }
  return formatInvoiceNumber(max + 1, fy);
}
