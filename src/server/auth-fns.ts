import { createServerFn } from "@tanstack/react-start";
import { credentialsValid } from "./app-auth-credentials";
import {
  eraseSessionCookie,
  mintSessionCookieValue,
  sessionCookieValid,
  writeSessionCookie,
} from "./app-session";

export { normalizeUsername } from "./app-auth-credentials";

export const getAuthStatusFn = createServerFn({ method: "GET" }).handler(async () => ({
  ok: await sessionCookieValid(),
}));

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => {
    if (!data || typeof data.username !== "string" || typeof data.password !== "string") {
      throw new Error("Invalid request");
    }
    return data;
  })
  .handler(async ({ data }) => {
    if (!credentialsValid(data.username, data.password)) {
      throw new Error("Invalid username or password.");
    }
    const token = await mintSessionCookieValue();
    writeSessionCookie(token);
    return { ok: true as const };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  eraseSessionCookie();
  return { ok: true as const };
});
