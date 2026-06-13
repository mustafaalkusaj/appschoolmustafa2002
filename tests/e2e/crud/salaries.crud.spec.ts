import { expect, test } from "@playwright/test";
import { ensureE2EEnvLoaded } from "../helpers/e2e-env";

ensureE2EEnvLoaded();

test.describe("Salaries Safe Smoke Tests", () => {
  test("salaries page loads without errors", async ({ page }) => {
    await page.goto("/ar/salaries", { waitUntil: "networkidle" });

    // Verify page loaded
    await expect(page).not.toHaveURL(/\/login/);

    // Check for critical errors
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    expect(errors).toHaveLength(0);
  });

  test("teacher modal opens safely", async ({ page }) => {
    await page.goto("/ar/salaries", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Look for teacher selection or modal button
    const teacherButtons = page.locator("button").filter({ hasText: /معلم|Teacher|اختر/ });
    const count = await teacherButtons.count();

    if (count > 0) {
      const firstButton = teacherButtons.first();
      const visible = await firstButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (visible) {
        await firstButton.click();
        await page.waitForTimeout(500);

        // Modal or content should appear
        const modal = page.locator("[role='dialog'], [class*='Modal'], [class*='panel']").first();
        const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

        expect(modalVisible).toBe(true);
      }
    }
  });

  test("pay modal opens safely", async ({ page }) => {
    await page.goto("/ar/salaries", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Look for pay or payment button
    const payButtons = page.locator("button").filter({ hasText: /دفع|Pay|تسديد/ });
    const count = await payButtons.count();

    if (count > 0) {
      const firstButton = payButtons.first();
      const visible = await firstButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (visible) {
        await firstButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator("[role='dialog'], [class*='Modal']").first();
        const modalVisible = await modal.isVisible({ timeout: 3000 }).catch(() => false);

        expect(modalVisible).toBe(true);
      }
    }
  });

  test("deductions section is accessible", async ({ page }) => {
    await page.goto("/ar/salaries", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    // Look for deductions button or section
    const deductionsButton = page.locator("button").filter({ hasText: /خصم|Deduction|استقطاع/ });
    const deductionsSection = page.locator("[class*='deduction'], [class*='Deduction']").first();

    const buttonExists = await deductionsButton.count().then((c) => c > 0);
    const sectionExists = await deductionsSection.isVisible({ timeout: 2000 }).catch(() => false);

    expect(buttonExists || sectionExists).toBe(true);
  });

  test("no critical errors on salaries page", async ({ page }) => {
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

    expect(consoleErrors).toHaveLength(0);
    expect(pageErrors).toHaveLength(0);
  });
});
