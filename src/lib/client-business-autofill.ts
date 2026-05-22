/**
 * When Bill-to "Client / company name" matches a key here, "Type of business" auto-fills.
 * Partner rows → business category; client rows → project type (from your reference sheets).
 */

/** Partner name → type of business (category) */
const PARTNER_BUSINESS_TYPE: Readonly<Record<string, string>> = {
  Epixable: "Marketing Agency",
  "Heat Wave Media": "Marketing Agency",
  "A7 Global Tech LLP": "Development Agency",
  "Win Research Center": "Development Agency",
  "Pixel Geek": "Marketing Agency",
  "Dronark - Pungi": "Marketing Agency",
  "Zach (Poland)": "International Sales",
  "Jackfruit Technologies": "Development Agency",
  "Rajans Poorvik Media": "Marketing/Media",
  "Megha Signs Kodagu": "Marketing Agency",
  "4AM Media": "Marketing Agency",
  "Sparkling Ads": "Marketing Agency",
};

/** Client name → project / engagement type (shown in Type of business) */
const CLIENT_PROJECT_TYPE: Readonly<Record<string, string>> = {
  "Kapila FAQ": "Whatsapp Bot",
  "MTM FAQ": "Whatsapp Bot",
  "RLS P": "Website",
  TAH: "Website + Billing System",
  "Kannan Sirangapalli": "Inventory System (Meeting)",
  "Kapila Management Software": "Dashboard",
  "A7 Gtech - 2 Hostings": "Per Project",
  "Royal Passage": "Website",
  "Safe Wheels": "Dashboard",
  "Spice Trip": "Dashboard",
  "Jayanth - Paint": "Inventory System (Meeting)",
  Texa: "WhatsApp Automation · Inventory System (Meeting)",
  "Pawan Refer - Krishna": "WhatsApp Automation",
  "Powergate energy": "WhatsApp Automation",
  "Alliance Square": "Property Listing",
  "Cafe - Chintu Friend": "Basic Billing",
  "Sublime Camps": "Website + WhatsApp Automation",
  "Epixable (Hospital)": "Booking System (SaaS/Web App)",
  "Panche Kattu": "Inventory System (Meeting)",
  "SS Foundation": "Web App",
  "Joanne Slaughter (363)": "Inventory System (Meeting)",
};

function lookupIgnoreCase(map: Readonly<Record<string, string>>, raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (map[trimmed] !== undefined) return map[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

/**
 * Returns the value to set for "Type of business" when client name matches a known row.
 * Partner table is checked first, then client project table.
 */
export function autoFillBusinessTypeForClientName(clientName: string): string | undefined {
  const fromPartner = lookupIgnoreCase(PARTNER_BUSINESS_TYPE, clientName);
  if (fromPartner !== undefined) return fromPartner;
  return lookupIgnoreCase(CLIENT_PROJECT_TYPE, clientName);
}
