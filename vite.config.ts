import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

/** TanStack Router root route id — must match `src/routes/__root.tsx` / generated `routeTree.gen.ts`. */
const ROOT_ROUTE_ID = "__root__";

/** If the router generator cannot write `routeTree.gen.ts` (e.g. file lock on Windows), TanStack may leave `TSS_ROUTES_MANIFEST` unset and SSR build fails. Populate a minimal manifest so the build can complete. */
function ensureTanStackRoutesManifest(): Plugin {
  const r = (rel: string) => path.join(root, rel);
  const manifest = {
    [ROOT_ROUTE_ID]: {
      filePath: r("src/routes/__root.tsx"),
      children: ["/", "/history", "/login", "/new", "/settings", "/invoice/$id"],
    },
    "/": { filePath: r("src/routes/index.tsx") },
    "/history": { filePath: r("src/routes/history.tsx") },
    "/login": { filePath: r("src/routes/login.tsx") },
    "/new": { filePath: r("src/routes/new.tsx") },
    "/settings": { filePath: r("src/routes/settings.tsx") },
    "/invoice/$id": { filePath: r("src/routes/invoice.$id.tsx") },
  };
  return {
    name: "ensure-tss-routes-manifest",
    enforce: "post",
    configResolved() {
      const g = globalThis as unknown as { TSS_ROUTES_MANIFEST?: typeof manifest };
      if (!g.TSS_ROUTES_MANIFEST) {
        g.TSS_ROUTES_MANIFEST = manifest;
      }
    },
    generateBundle() {
      const g = globalThis as unknown as { TSS_ROUTES_MANIFEST?: typeof manifest };
      if (!g.TSS_ROUTES_MANIFEST) {
        g.TSS_ROUTES_MANIFEST = manifest;
      }
    },
  };
}

/** Browsers request `/favicon.ico` by default; we ship SVG and redirect to avoid 404 noise. */
function faviconIcoRedirect(): Plugin {
  return {
    name: "favicon-ico-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/favicon.ico") {
          res.statusCode = 302;
          res.setHeader("Location", "/favicon.svg");
          res.end();
          return;
        }
        next();
      });
    },
  };
}

// TanStack Start + Nitro (Vercel preset) — see https://vercel.com/docs/frameworks/full-stack/tanstack-start
// Custom `src/server.ts` wraps TanStack's server entry for SSR error handling.
export default defineConfig({
  root,
  server: { port: 3000 },
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
    tsconfigPaths: true,
  },
  plugins: [
    faviconIcoRedirect(),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro({
      preset: "vercel",
      routeRules: {
        "/favicon.ico": { redirect: "/favicon.svg" },
      },
    }),
    viteReact(),
    ensureTanStackRoutesManifest(),
  ],
});
