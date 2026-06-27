import { test, expect } from "@playwright/test";

test.describe("Admin feature flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/username|email/i).fill("admin");
    await page.getByPlaceholder(/password/i).fill("admin123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("sidebar navigation links are visible", async ({ page }) => {
    for (const link of ["Dashboard", "Projects", "Clients", "Services", "Billing", "Settings"]) {
      await expect(page.getByText(link, { exact: false })).toBeVisible();
    }
  });

  test("can navigate to all admin pages", async ({ page }) => {
    const pages = [
      { name: "dashboard", url: "/dashboard" },
      { name: "clients", url: "/clients" },
      { name: "projects", url: "/projects" },
      { name: "services", url: "/services" },
      { name: "billing", url: "/billing" },
      { name: "settings", url: "/settings" },
    ];

    for (const { name, url } of pages) {
      await page.goto(url);
      await expect(page).toHaveURL(new RegExp(url.replace("/", "\\/")), { timeout: 10000 });
    }
  });
});

test.describe("Client portal flow", () => {
  test("client user can access client portal", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/username|email/i).fill("client1");
    await page.getByPlaceholder(/password/i).fill("client123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();

    await expect(page).toHaveURL(/\/client-portal/, { timeout: 10000 });
  });

  test("client is redirected away from admin pages", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/username|email/i).fill("client1");
    await page.getByPlaceholder(/password/i).fill("client123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/client-portal/, { timeout: 10000 });
  });
});

test.describe("Photographer flow", () => {
  test("photographer user can see projects", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/username|email/i).fill("photographer1");
    await page.getByPlaceholder(/password/i).fill("photo123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();

    await expect(page).toHaveURL(/\/projects/, { timeout: 10000 });
  });

  test("photographer can access My Dues page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/username|email/i).fill("photographer1");
    await page.getByPlaceholder(/password/i).fill("photo123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();

    await page.goto("/my-dues");
    await expect(page).toHaveURL(/\/my-dues/, { timeout: 10000 });
  });
});

test.describe("Logout flow", () => {
  test("user can log out", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/username|email/i).fill("admin");
    await page.getByPlaceholder(/password/i).fill("admin123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    const logoutButton = page.getByText(/log out|logout|sign out/i);
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    }
  });
});
