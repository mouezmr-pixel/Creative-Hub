import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "api-server",
    environment: "node",
    setupFiles: ["./artifacts/api-server/src/test/setup.ts"],
    include: ["artifacts/api-server/src/**/*.{test,spec}.ts"],
    globals: true,
  },
  resolve: {
    alias: [
      { find: "@workspace/db/schema", replacement: path.resolve(__dirname, "lib/db/src/schema") },
      { find: "@workspace/db", replacement: path.resolve(__dirname, "lib/db/src/index.ts") },
      { find: "@workspace/api-zod", replacement: path.resolve(__dirname, "lib/api-zod/src/index.ts") },
    ],
  },
});
