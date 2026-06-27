import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    workspace: [
      "vitest.config.frontend.ts",
      "vitest.config.backend.ts",
    ],
  },
});
