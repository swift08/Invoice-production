/** Internal team / company contacts (shown in settings; optional on invoices later). */
export interface CompanyMember {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface CompanySettings {
  name: string;
  tagline?: string;
  address: string;
  email: string;
  phone?: string;
  pan?: string;
  gstin?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  upi?: string;
  logoDataUrl?: string;
  signatureDataUrl?: string;
  /** Optional PDF override; default certificate is served from `public/` when unset. */
  udyamCertificateDataUrl?: string;
  /** Extra compliance files (PDF, Word, etc.) and links (Digilocker, Drive, …). */
  complianceDocuments?: ComplianceDocument[];
  authorizedName?: string;
  /** Team members — name, email, phone for reference and settings UI. */
  companyMembers?: CompanyMember[];
}

/** Saved with company settings — file as data URL and/or a trusted https link only. */
export interface ComplianceDocument {
  id: string;
  title: string;
  fileDataUrl?: string;
  fileName?: string;
  mimeType?: string;
  /** Digilocker, Google Drive, OneDrive, etc. */
  externalUrl?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: string; // uuid
  number: string; // AM/26-27/0001 (legacy AM 0001/26-27 supported)
  date: string; // YYYY-MM-DD
  clientName: string;
  /** e.g. SaaS, retail, NGO — shown under client on invoice */
  clientBusinessType?: string;
  clientAddress?: string;
  clientContact?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientGstin?: string;
  items: LineItem[];
  advance: number;
  taxPercent: number;
  remarks?: string;
  paymentTerms?: string;
  paymentMode?: string;
  paymentDate?: string;
  status: "paid" | "pending" | "partial" | "overdue";
  createdAt: number;
}
