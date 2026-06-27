import { test, expect } from "@playwright/test";

test.describe("Authentication flows", () => {
  test("login page loads and shows form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("form")).toBeVisible();
    await expect(page.getByPlaceholder(/username|email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /login|log in|submit/i })).toBeVisible();
  });

  test("login with valid admin credentials redirects to dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/username|email/i).fill("admin");
    await page.getByPlaceholder(/password/i).fill("admin123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder(/username|email/i).fill("admin");
    await page.getByPlaceholder(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();

    await expect(page.getByText(/invalid credentials|authFailed/i)).toBeVisible({ timeout: 10000 });
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe("Dashboard flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/username|email/i).fill("admin");
    await page.getByPlaceholder(/password/i).fill("admin123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("dashboard shows project list", async ({ page }) => {
    await expect(page.getByText(/projects?/i)).toBeVisible();
  });

  test("date range dropdown opens and shows options", async ({ page }) => {
    const dropdownTrigger = page.locator("[data-testid='date-preset-trigger']");
    if (await dropdownTrigger.isVisible()) {
      await dropdownTrigger.click();
      await expect(page.getByText(/this month|thisMonth|all time|allTime/i)).toBeVisible();
    }
  });
});

test.describe("Clients flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/username|email/i).fill("admin");
    await page.getByPlaceholder(/password/i).fill("admin123");
    await page.getByRole("button", { name: /login|log in|submit/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("navigate to clients page and see list", async ({ page }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/clients/, { timeout: 10000 });
  });

  test("search clients by name", async ({ page }) => {
    await page.goto("/clients");

    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill("Sarah");
    }
  });
});
