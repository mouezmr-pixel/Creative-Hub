import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm run --filter @workspace/api-server dev",
      url: "http://localhost:8080/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: "pnpm run --filter @workspace/studio-crm dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        PORT: "3000",
        BASE_PATH: "/",
      },
    },
  ],
});
