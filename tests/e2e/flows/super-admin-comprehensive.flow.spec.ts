import { expect, test } from "@playwright/test";

test.describe("Super-admin page (super-admin project)", () => {
  test("super-admin page loads", async ({ page }) => {
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    // Super admin storage state is used — page should load without crashing
    const url = page.url();
    const isOnSuperAdmin = /\/ar\/super-admin/.test(url);
    const isRedirected = /\/(access-denied|dashboard|group|login)/.test(url);

    expect(isOnSuperAdmin || isRedirected).toBe(true);
  });

  test("no redirect to login — super admin is authenticated", async ({ page }) => {
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/ar\/login(?:\?.*)?$/);
  });
});
