import { expect, test } from "@playwright/test";

// These tests run WITHOUT pre-authenticated storage state.
// They test auth flows from scratch — no session cookies are carried in.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication flows", () => {
  test("Arabic login page renders correctly", async ({ page }) => {
    await page.goto("/ar/login");

    await expect(page).toHaveURL(/\/ar\/login(?:\?.*)?$/);

    // Form fields
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // Submit button with Arabic label
    await expect(
      page.getByRole("button", { name: "تسجيل الدخول" }),
    ).toBeVisible();

    // Page direction should be RTL for Arabic
    const dir = await page.locator("html").getAttribute("dir");
    expect(dir).toBe("rtl");
  });

  test("English login page renders correctly", async ({ page }) => {
    await page.goto("/en/login");

    await expect(page).toHaveURL(/\/en\/login(?:\?.*)?$/);

    // Form fields
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();

    // Submit button with English label
    await expect(
      page.getByRole("button", { name: "Sign in" }),
    ).toBeVisible();
  });

  test("unauthenticated access to /ar/dashboard redirects to login", async ({
    page,
  }) => {
    await page.goto("/ar/dashboard", { waitUntil: "domcontentloaded" });

    await page.waitForURL(/\/ar\/login(?:\?.*)?$/, { timeout: 15_000 });

    const url = new URL(page.url());
    expect(url.pathname).toBe("/ar/login");
  });

  test("unauthenticated access to /ar/students redirects to login", async ({
    page,
  }) => {
    await page.goto("/ar/students", { waitUntil: "domcontentloaded" });

    await page.waitForURL(/\/ar\/login(?:\?.*)?$/, { timeout: 15_000 });

    const url = new URL(page.url());
    expect(url.pathname).toBe("/ar/login");
  });

  test("unauthenticated access to /ar/payments redirects to login", async ({
    page,
  }) => {
    await page.goto("/ar/payments", { waitUntil: "domcontentloaded" });

    await page.waitForURL(/\/ar\/login(?:\?.*)?$/, { timeout: 15_000 });

    const url = new URL(page.url());
    expect(url.pathname).toBe("/ar/login");
  });

  test("invalid credentials stays on login page", async ({ page }) => {
    await page.goto("/ar/login");

    await expect(page.locator("#email")).toBeEditable({ timeout: 10_000 });
    await page.locator("#email").fill("wrong@example.com");

    await expect(page.locator("#password")).toBeEditable({ timeout: 10_000 });
    await page.locator("#password").fill("wrongpassword123");

    await page.getByRole("button", { name: "تسجيل الدخول" }).click();

    // After a failed login attempt the user must remain on the login page.
    // Allow a short wait for any client-side redirect attempt to settle.
    await page.waitForTimeout(3_000);

    expect(page.url()).toMatch(/\/ar\/login/);
  });

  // Successful login is intentionally skipped — it requires live QA credentials
  // that may not be present in CI. See tests/e2e/flows/auth-and-public.flow.spec.ts
  // for the logout flow that exercises the authenticated state.
});
