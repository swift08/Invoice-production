import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Search, Trash2 } from "lucide-react";
import { deleteInvoice, loadCompany, loadInvoices } from "@/lib/storage";
import { computeTotals, formatINR } from "@/lib/invoice-calc";
import { downloadInvoicePdf } from "@/lib/pdf";
import type { Invoice } from "@/lib/types";
import { statusBadgeClassDark, statusIndicatorEmoji } from "@/lib/invoice-status";
import { logClientError } from "@/lib/client-logger";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Invoice["status"]>("all");

  useEffect(() => {
    void loadInvoices().then(setInvoices).catch((e) => logClientError("history.loadInvoices", e));
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (status !== "all" && inv.status !== status) return false;
      if (!term) return true;
      return (
        inv.number.toLowerCase().includes(term) ||
        inv.clientName.toLowerCase().includes(term) ||
        (inv.clientBusinessType?.toLowerCase().includes(term) ?? false) ||
        inv.items.some((i) => i.description.toLowerCase().includes(term))
      );
    });
  }, [invoices, q, status]);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    void deleteInvoice(id)
      .then(() => loadInvoices())
      .then(setInvoices)
      .catch((e) => logClientError("history.deleteInvoice", e));
  };

  const handleDownload = (inv: Invoice) => {
    void loadCompany()
      .then((company) => downloadInvoicePdf(inv, company))
      .catch((e) => logClientError("history.downloadPdf", e));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Invoice history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search by invoice number, client, or service.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-64">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search invoices..."
            className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="w-full shrink-0 rounded-md border border-input bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-auto"
        >
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No invoices match your search.
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden" aria-label="Invoice list">
              {filtered.map((inv) => {
                const t = computeTotals(inv);
                return (
                  <li key={inv.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/invoice/$id"
                          params={{ id: inv.id }}
                          className="block truncate text-base font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline"
                          title={inv.number}
                        >
                          {inv.number}
                        </Link>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{inv.clientName}</p>
                      </div>
                      <span
                        className={
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide " +
                          statusBadgeClassDark(inv.status)
                        }
                      >
                        <span className="select-none text-sm leading-none" aria-hidden>
                          {statusIndicatorEmoji(inv.status)}
                        </span>
                        {inv.status.toUpperCase()}
                      </span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Date</dt>
                        <dd className="tabular-nums text-foreground">{inv.date}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Total</dt>
                        <dd className="tabular-nums text-foreground">{formatINR(t.total)}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="font-medium text-foreground">Payable</dt>
                        <dd className="font-semibold tabular-nums text-foreground">{formatINR(t.payable)}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex justify-end gap-1 border-t border-border pt-3">
                      <button
                        type="button"
                        onClick={() => handleDownload(inv)}
                        title="Download PDF"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(inv.id)}
                        title="Delete"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/80 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-normal">Invoice #</th>
                    <th className="px-4 py-3 font-normal">Client</th>
                    <th className="px-4 py-3 font-normal">Date</th>
                    <th className="px-4 py-3 text-right font-normal">Total</th>
                    <th className="px-4 py-3 text-right font-normal">Payable</th>
                    <th className="px-4 py-3 font-normal">Status</th>
                    <th className="px-4 py-3 text-right font-normal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const t = computeTotals(inv);
                    return (
                      <tr key={inv.id} className="border-t border-border transition-colors hover:bg-muted/40">
                        <td className="max-w-[11rem] px-4 py-3">
                          <Link
                            to="/invoice/$id"
                            params={{ id: inv.id }}
                            className="block truncate font-semibold text-foreground hover:text-primary"
                            title={inv.number}
                          >
                            {inv.number}
                          </Link>
                        </td>
                        <td className="max-w-[10rem] truncate px-4 py-3" title={inv.clientName}>
                          {inv.clientName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{inv.date}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatINR(t.total)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                          {formatINR(t.payable)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide " +
                              statusBadgeClassDark(inv.status)
                            }
                          >
                            <span className="select-none text-sm leading-none" aria-hidden>
                              {statusIndicatorEmoji(inv.status)}
                            </span>
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleDownload(inv)}
                              title="Download PDF"
                              className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(inv.id)}
                              title="Delete"
                              className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
