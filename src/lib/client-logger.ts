/**
 * Client-side errors: log in development only so production stays quiet in the browser console.
 * Server code should use normal logging (Vercel / platform logs).
 */
export function logClientError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console -- dev-only diagnostics
    console.error(`[${context}]`, error);
  }
}
