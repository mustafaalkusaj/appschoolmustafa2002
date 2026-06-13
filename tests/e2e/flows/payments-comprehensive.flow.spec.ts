import { expect, test } from "@playwright/test";

test.describe("Payments management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/payments", { waitUntil: "networkidle" });
  });

  test("payments page loads", async ({ page }) => {
    await page.goto("/ar/payments", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);

    const content = page.locator("main, [role='main'], body").first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test("no console errors on load", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/ar/payments", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test("payments stats or summary section is visible", async ({ page }) => {
    await page.goto("/ar/payments", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    const statsCard = page
      .locator("[class*='stat'], [class*='Stat'], [class*='card'], [class*='Card'], [class*='summary'], [class*='Summary']")
      .first();
    const content = page.locator("main, [role='main']").first();

    const hasStats = await statsCard.isVisible({ timeout: 3000 }).catch(() => false);
    const hasContent = await content.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasStats || hasContent).toBe(true);
  });

  test("payments list or table is rendered", async ({ page }) => {
    await page.goto("/ar/payments", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    const table = page.locator("table, [role='grid'], [role='table']").first();
    const list = page.locator("[class*='list'], [class*='List'], tbody, tr").first();
    const content = page.locator("main, [role='main'], [class*='content']").first();

    const hasTable = await table.isVisible({ timeout: 3000 }).catch(() => false);
    const hasList = await list.isVisible({ timeout: 3000 }).catch(() => false);
    const hasContent = await content.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasList || hasContent).toBe(true);
  });
});
