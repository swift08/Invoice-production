import type { CompanySettings } from "./types";
import { DEFAULT_PUBLIC_LOGO_URL, DEFAULT_UDYAM_CERTIFICATE_URL } from "./constants";

/** Logo for UI: custom upload (data URL) or bundled default from `/public`. */
export function companyLogoSrc(c: Pick<CompanySettings, "logoDataUrl">): string {
  const u = c.logoDataUrl?.trim();
  return u || DEFAULT_PUBLIC_LOGO_URL;
}

/** Udyam certificate PDF: saved data URL or bundled default from `/public`. */
export function udyamCertificateSrc(c: Pick<CompanySettings, "udyamCertificateDataUrl">): string {
  const u = c.udyamCertificateDataUrl?.trim();
  return u || DEFAULT_UDYAM_CERTIFICATE_URL;
}
