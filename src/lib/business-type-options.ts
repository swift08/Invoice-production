/**
 * Preset "Type of business" values for invoices (Bill to).
 */
export const BUSINESS_TYPE_OPTIONS: readonly string[] = [
  "Development Agency",
  "International Sales",
  "Marketing Agency",
  "Marketing/Media",
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
