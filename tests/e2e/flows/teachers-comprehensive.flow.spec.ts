import { expect, test } from "@playwright/test";

test.describe("Teachers page", () => {
  test("teachers page loads without redirect to login", async ({ page }) => {
    await page.goto("/ar/teachers", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
  });

  test("no JS errors on teachers page load", async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/ar/teachers", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
    expect(pageErrors).toHaveLength(0);
  });

  test("teachers page has some content visible", async ({ page }) => {
    await page.goto("/ar/teachers", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);

    const table = page.locator("table, [role='grid'], [role='table']").first();
    const list = page.locator("tbody, tr, [class*='list'], [class*='List']").first();
    const main = page.locator("main, [role='main'], [class*='content']").first();

    const hasTable = await table.isVisible({ timeout: 3000 }).catch(() => false);
    const hasList = await list.isVisible({ timeout: 3000 }).catch(() => false);
    const hasMain = await main.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasList || hasMain).toBe(true);
  });
});
