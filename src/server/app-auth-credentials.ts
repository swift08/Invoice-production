const DEFAULT_USERNAME = "Admark Digitals";
const DEFAULT_PASSWORD = "HTRP@2026";

function expectedUsername(): string {
  return process.env.ADMARK_APP_USERNAME?.trim() || DEFAULT_USERNAME;
}

function expectedPassword(): string {
  return process.env.ADMARK_APP_PASSWORD ?? DEFAULT_PASSWORD;
}

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function credentialsValid(username: string, password: string): boolean {
  const userOk = normalizeUsername(username) === normalizeUsername(expectedUsername());
  const passOk = password === expectedPassword();
  return userOk && passOk;
}
