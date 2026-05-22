import { createFileRoute, useNavigate } from "@tanstack/react-router";
import InvoiceForm from "@/components/invoice/InvoiceForm";

export const Route = createFileRoute("/new")({ component: NewInvoicePage });

function NewInvoicePage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Step 1 — Details
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create new invoice</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Invoice number is generated for the current financial year.
        </p>
      </div>
      <InvoiceForm onSaved={(inv) => navigate({ to: "/invoice/$id", params: { id: inv.id } })} />
    </div>
  );
}
