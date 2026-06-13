import { expect, test } from "@playwright/test";

test.describe("Financial pages", () => {
  test("expenses page loads", async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/ar/expenses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
    expect(pageErrors).toHaveLength(0);

    const content = page.locator("main, [role='main'], body").first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test("incomes page loads", async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/ar/incomes", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
    expect(pageErrors).toHaveLength(0);

    const content = page.locator("main, [role='main'], body").first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test("reports page loads", async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    await page.goto("/ar/reports", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/login/);
    expect(pageErrors).toHaveLength(0);

    const content = page.locator("main, [role='main'], body").first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test("expenses page has no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/ar/expenses", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    expect(consoleErrors).toHaveLength(0);
  });

  test("incomes page has no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/ar/incomes", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    expect(consoleErrors).toHaveLength(0);
  });

  test("reports page has no console errors", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/ar/reports", { waitUntil: "networkidle" });
    await page.waitForLoadState("networkidle");

    expect(consoleErrors).toHaveLength(0);
  });
});
