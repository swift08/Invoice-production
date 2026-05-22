import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

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
  ],
});
