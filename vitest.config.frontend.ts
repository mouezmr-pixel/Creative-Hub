import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "studio-crm",
    environment: "jsdom",
    setupFiles: ["./artifacts/studio-crm/src/test/setup.ts"],
    include: ["artifacts/studio-crm/src/**/*.{test,spec}.{ts,tsx}"],
    globals: true,
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "artifacts/studio-crm/src"),
      "@workspace/api-client-react": path.resolve(
        __dirname,
        "lib/api-client-react/src/index.ts"
      ),
    },
  },
});
