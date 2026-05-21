import { expect, test } from "@playwright/test";

test.describe("RBAC enforcement (admin storage state)", () => {
  test("admin user accessing /ar/super-admin is redirected away", async ({ page }) => {
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    // Admin should NOT be allowed to stay on the super-admin page
    await expect(page).not.toHaveURL(/\/ar\/super-admin$/);
  });

  test("admin user accessing /ar/dashboard stays on dashboard (not redirected to login)", async ({ page }) => {
    await page.goto("/ar/dashboard", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
  });
});
