import type { Invoice } from "./types";

/** Colored circle + label for invoice UI (browser renders emoji reliably). */
export function statusIndicatorEmoji(status: Invoice["status"]): string {
  const map: Record<Invoice["status"], string> = {
    paid: "🟢",
    pending: "🟠",
    partial: "🔵",
    overdue: "🔴",
  };
  return map[status];
}

/** Solid fill for status pill in PDF (white label text on top). */
export function statusPdfPillFill(status: string): [number, number, number] {
  const s = status.toLowerCase();
  if (s === "paid") return [22, 163, 74];
  if (s === "pending") return [234, 88, 12];
  if (s === "partial") return [37, 99, 235];
  if (s === "overdue") return [220, 38, 38];
  return [71, 85, 105];
}

/** Tailwind classes for status chips (light invoice surface + dark dashboard). */
export function statusBadgeClassLight(status: Invoice["status"]): string {
  const map: Record<Invoice["status"], string> = {
    paid: "border border-emerald-300/80 bg-emerald-50 text-emerald-950 shadow-sm",
    pending: "border border-amber-300/80 bg-amber-50 text-amber-950 shadow-sm",
    partial: "border border-sky-300/80 bg-sky-50 text-sky-950 shadow-sm",
    overdue: "border border-red-300/80 bg-red-50 text-red-950 shadow-sm",
  };
  return map[status];
}

export function statusBadgeClassDark(status: Invoice["status"]): string {
  const map: Record<Invoice["status"], string> = {
    paid: "border border-emerald-400/40 bg-emerald-500/20 text-emerald-50 shadow-sm",
    pending: "border border-amber-400/40 bg-amber-500/20 text-amber-50 shadow-sm",
    partial: "border border-sky-400/40 bg-sky-500/20 text-sky-50 shadow-sm",
    overdue: "border border-red-400/40 bg-red-500/20 text-red-50 shadow-sm",
  };
  return map[status];
}
