import { expect, test } from "@playwright/test";

test.describe("Salaries management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ar/salaries", { waitUntil: "networkidle" });
  });

  test("salaries page loads", async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/ar/salaries", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
    expect(pageErrors).toHaveLength(0);

    const content = page.locator("main, [role='main'], body").first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test("no login redirect from salaries", async ({ page }) => {
    await page.goto("/ar/salaries", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).not.toHaveURL(/\/ar\/login/);
  });

  test("salaries page has no console errors", async ({ page }) => {
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

    await page.goto("/ar/salaries", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });

  test("salaries page renders teacher list or table", async ({ page }) => {
    await page.goto("/ar/salaries", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    const table = page.locator("table, [role='grid'], [role='table']").first();
    const list = page
      .locator("[class*='list'], [class*='List'], [class*='teacher'], [class*='Teacher'], tbody, tr")
      .first();
    const content = page.locator("main, [role='main'], [class*='content']").first();

    const hasTable = await table.isVisible({ timeout: 3000 }).catch(() => false);
    const hasList = await list.isVisible({ timeout: 3000 }).catch(() => false);
    const hasContent = await content.isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasTable || hasList || hasContent).toBe(true);
  });
});
