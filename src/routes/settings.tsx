import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Save, Upload } from "lucide-react";
import { loadCompany, saveCompany } from "@/lib/storage";
import { DEFAULT_PUBLIC_LOGO_URL } from "@/lib/constants";
import { logClientError } from "@/lib/client-logger";
import { ComplianceDocumentsPanel } from "@/components/settings/ComplianceDocumentsPanel";
import type { CompanySettings, CompanyMember } from "@/lib/types";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const [c, setC] = useState<CompanySettings | null>(null);
  const [saved, setSaved] = useState(false);
  const latestRef = useRef<CompanySettings | null>(null);
  latestRef.current = c;

  const complianceSig =
    c != null
      ? `${c.udyamCertificateDataUrl?.length ?? 0}:${(c.complianceDocuments ?? []).length}:${(c.complianceDocuments ?? [])
          .map((d) => `${d.id}|${d.title}|${d.externalUrl ?? ""}|${d.fileName ?? ""}`)
          .join("¬")}`
      : "";

  /** After first non-empty compliance signature (company loaded), auto-save on further changes. */
  const primedComplianceAutoSave = useRef(false);

  useEffect(() => {
    void loadCompany().then(setC).catch((e) => logClientError("settings.loadCompany", e));
  }, []);

  useEffect(() => {
    if (complianceSig === "") return;

    if (!primedComplianceAutoSave.current) {
      primedComplianceAutoSave.current = true;
      return;
    }

    const id = window.setTimeout(() => {
      const cur = latestRef.current;
      if (!cur) return;
      void saveCompany(cur)
        .then(() => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2000);
        })
        .catch((err) => {
          logClientError("settings.autoSave", err);
          alert(
            err instanceof Error
              ? err.message
              : "Could not save (storage full or network). Try a smaller file or use a link instead.",
          );
        });
    }, 450);
    return () => window.clearTimeout(id);
  }, [complianceSig]);

  const set = <K extends keyof CompanySettings>(k: K, v: CompanySettings[K]) => {
    setC((prev) => (prev ? { ...prev, [k]: v } : null));
    setSaved(false);
  };

  const handleImage =
    (key: "logoDataUrl" | "signatureDataUrl") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        alert("Image too large (max 2MB)");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result);
        setC((prev) => (prev ? { ...prev, [key]: data } : null));
        setSaved(false);
      };
      reader.readAsDataURL(file);
    };

  const handleUdyamPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const max = 4 * 1024 * 1024;
    if (file.type !== "application/pdf") {
      alert("Please choose a PDF file.");
      e.target.value = "";
      return;
    }
    if (file.size > max) {
      alert("PDF too large (max 4MB).");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setC((prev) => (prev ? { ...prev, udyamCertificateDataUrl: data } : null));
      setSaved(false);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cur = latestRef.current;
    if (!cur) return;
    void saveCompany(cur)
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      })
      .catch((err) => {
        logClientError("settings.save", err);
        alert(err instanceof Error ? err.message : "Could not save settings.");
      });
  };

  const updateMember = (
    id: string,
    patch: Partial<Pick<CompanyMember, "name" | "email" | "phone">>,
  ) => {
    setC((prev) => {
      if (!prev) return prev;
      const list = prev.companyMembers ?? [];
      return {
        ...prev,
        companyMembers: list.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      };
    });
    setSaved(false);
  };

  const removeMember = (id: string) => {
    setC((prev) => {
      if (!prev) return prev;
      const list = (prev.companyMembers ?? []).filter((m) => m.id !== id);
      return { ...prev, companyMembers: list.length ? list : undefined };
    });
    setSaved(false);
  };

  const addMember = () => {
    setC((prev) => {
      if (!prev) return prev;
      const list = [...(prev.companyMembers ?? [])];
      const id =
        typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `member-${Date.now()}`;
      list.push({ id, name: "", email: "", phone: "" });
      return { ...prev, companyMembers: list };
    });
    setSaved(false);
  };

  if (!c) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-sm text-muted-foreground">
        Loading settings…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Company settings</h1>
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            When the server database is not configured, data is stored in this browser&apos;s{" "}
            <code className="rounded bg-secondary px-1 font-mono text-xs">admark.company</code>{" "}
            (localStorage). <span className="font-medium text-foreground/90">Compliance</span> links &
            files auto-save shortly after you change them. Use <span className="font-medium">Save</span>{" "}
            for logo, identity, bank, and to persist everything at once.
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 sm:h-auto sm:w-auto sm:justify-start sm:py-2"
        >
          <Save className="h-4 w-4" /> {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <Section title="Brand">
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField
            label="Logo"
            value={c.logoDataUrl}
            emptyPreviewSrc={DEFAULT_PUBLIC_LOGO_URL}
            onChange={handleImage("logoDataUrl")}
            onClear={() => set("logoDataUrl", undefined)}
          />
          <ImageField
            label="Signature"
            value={c.signatureDataUrl}
            onChange={handleImage("signatureDataUrl")}
            onClear={() => set("signatureDataUrl", undefined)}
          />
        </div>
      </Section>

      <Section title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company name" value={c.name} onChange={(v) => set("name", v)} />
          <Field label="Tagline" value={c.tagline || ""} onChange={(v) => set("tagline", v)} />
          <Field label="Email" value={c.email} onChange={(v) => set("email", v)} />
          <Field label="Phone" value={c.phone || ""} onChange={(v) => set("phone", v)} />
          <Field
            label="Address"
            value={c.address}
            onChange={(v) => set("address", v)}
            className="sm:col-span-2"
          />
          <Field label="PAN" value={c.pan || ""} onChange={(v) => set("pan", v)} />
          <Field label="GSTIN" value={c.gstin || ""} onChange={(v) => set("gstin", v)} />
          <Field
            label="Authorized signatory name"
            value={c.authorizedName || ""}
            onChange={(v) => set("authorizedName", v)}
            className="sm:col-span-2"
          />
        </div>
      </Section>

      <Section title="Team / company contacts">
        <p className="mb-4 text-sm text-muted-foreground">
          Direct contacts for your team. These are stored with company settings; use{" "}
          <span className="font-medium text-foreground/90">Save</span> to persist edits (same as
          identity & bank).
        </p>
        <div className="space-y-4">
          {(c.companyMembers ?? []).map((m) => (
            <div
              key={m.id}
              className="rounded-lg border border-border bg-background p-4 shadow-sm"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name" value={m.name} onChange={(v) => updateMember(m.id, { name: v })} />
                <Field
                  label="Email"
                  type="email"
                  value={m.email}
                  onChange={(v) => updateMember(m.id, { email: v })}
                />
                <Field
                  label="Phone"
                  value={m.phone}
                  onChange={(v) => updateMember(m.id, { phone: v })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeMember(m.id)}
                className="mt-3 text-xs text-muted-foreground hover:text-destructive"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addMember}
            className="rounded-md border border-input bg-card px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            Add team member
          </button>
        </div>
      </Section>

      <Section title="Compliance" className="p-4 sm:p-5">
        <ComplianceDocumentsPanel
          company={c}
          onUdyamUpload={handleUdyamPdf}
          onUdyamClear={() => set("udyamCertificateDataUrl", undefined)}
          onDocumentsChange={(docs) => {
            setC((prev) =>
              prev
                ? { ...prev, complianceDocuments: docs.length ? docs : undefined }
                : prev,
            );
            setSaved(false);
          }}
        />
      </Section>

      <Section title="Bank details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank name" value={c.bankName || ""} onChange={(v) => set("bankName", v)} />
          <Field
            label="Account holder name"
            value={c.accountName || ""}
            onChange={(v) => set("accountName", v)}
          />
          <Field
            label="Account number"
            value={c.accountNumber || ""}
            onChange={(v) => set("accountNumber", v)}
          />
          <Field label="IFSC" value={c.ifsc || ""} onChange={(v) => set("ifsc", v)} />
          <Field label="Branch" value={c.branch || ""} onChange={(v) => set("branch", v)} />
          <Field label="UPI ID" value={c.upi || ""} onChange={(v) => set("upi", v)} />
        </div>
      </Section>
    </form>
  );
}

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const pad = className.includes("p-") ? className : `p-6 ${className}`.trim();
  return (
    <section className={`rounded-lg border border-border bg-card shadow-sm ${pad}`}>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  type?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </label>
  );
}

function ImageField({
  label,
  value,
  emptyPreviewSrc,
  onChange,
  onClear,
}: {
  label: string;
  value?: string;
  /** Shown when no file is uploaded (e.g. default app logo). */
  emptyPreviewSrc?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const previewSrc = value || emptyPreviewSrc;
  return (
    <div>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex items-center gap-4 rounded-md border border-dashed border-border bg-background p-4">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-md bg-secondary">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt={label}
              className={`h-full w-full object-contain ${value ? "" : "opacity-80"}`}
            />
          ) : (
            <span className="text-xs text-muted-foreground">No image</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary">
            <Upload className="h-3.5 w-3.5" /> Upload
            <input type="file" accept="image/*" className="hidden" onChange={onChange} />
          </label>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
