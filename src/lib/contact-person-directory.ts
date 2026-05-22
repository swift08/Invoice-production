/**
 * Quick-pick names for Bill-to "Contact person".
 */
export const KNOWN_CONTACT_PERSON_NAMES: readonly string[] = [
  "advik",
  "amir suhali",
  "Bg Stones",
  "indo pest control",
  "k h kiran",
  "mahaveer",
  "omg clothing",
  "paras",
  "Pawan Canteen",
  "sanjana kajol",
  "Shudhindra",
  "Stock market guy",
  "tirtha",
  "vivek kotari",
].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
