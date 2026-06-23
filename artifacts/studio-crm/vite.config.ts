import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// PORT/BASE_PATH are only meaningful for the dev/preview *server* — the
// `build` command just bundles static files into dist/public and never
// reads `server.port` from process.env at runtime. Requiring PORT
// unconditionally at module top-level breaks `vite build` (and thus
// `pnpm build`) in any environment — like a Replit Deployment build step —
// that doesn't export PORT during the build phase.
//
// So: only resolve (and require) PORT when a server command is actually
// running (`vite` / `vite preview`), and fall back to a safe default
// otherwise so the config can always be loaded for bundling.

function resolvePort(): number {
  const rawPort = process.env.PORT;

  if (!rawPort) {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return port;
}

export default defineConfig(async ({ command }) => {
  const isServe = command === "serve";

  // `base` affects how built asset URLs are generated, so it does matter
  // for `build`. Default to "/" when not provided (e.g. local builds,
  // CI, or a Deployment build step) instead of throwing.
  const basePath = process.env.BASE_PATH ?? "/";

  // `vite build` never binds a port, so don't require PORT for it.
  const port = isServe ? resolvePort() : 0;

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer({
                root: path.resolve(import.meta.dirname, ".."),
              }),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      proxy: {
        "/api": "http://localhost:8080",
        "/uploads": "http://localhost:8080",
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
