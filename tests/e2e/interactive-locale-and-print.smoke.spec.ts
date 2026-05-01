import fs from "node:fs/promises";
import { test, type Page } from "@playwright/test";

const screenshotDir = "/Users/musatafa/school-app/output/playwright/interactive-flows";

test.use({ storageState: "/Users/musatafa/school-app/artifacts/reliability-audit/admin-storage-state.json" });

async function expectPrintFrame(page: Page, timeout = 25_000) {
  await page.waitForSelector('iframe[title="print-preview"]', {
    state: "attached",
    timeout,
  });
}

test.describe.serial("interactive locale and print coverage", () => {
  test("English payments drawer stays localized and receipt print still initializes", async ({ page }) => {
    test.setTimeout(240_000);
    await fs.mkdir(screenshotDir, { recursive: true });

    await page.goto("/en/payments");

    await page.locator("tbody tr").nth(1).locator("button").first().click();

    await expect(page.getByRole("heading", { name: /Invoice details/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("text=Student information").first()).toBeVisible();
    await expect(page.locator("text=Financial summary").first()).toBeVisible();

    await page.screenshot({ path: `${screenshotDir}/payments-detail-en.png`, fullPage: true });

    await expect(page.getByRole("button", { name: "Print receipt" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Print receipt" }).click();
    await expectPrintFrame(page, 10_000);
  });

  test("English salaries print modal stays localized and full report print still initializes", async ({ page }) => {
    test.setTimeout(240_000);
    await fs.mkdir(screenshotDir, { recursive: true });

    await page.goto("/en/salaries");

    await page.getByRole("button", { name: "Print options" }).click();

    await expect(page.getByRole("heading", { name: "Print options" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Detailed teacher report")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print full report" })).toBeVisible();

    await page.screenshot({ path: `${screenshotDir}/salaries-print-modal-en.png`, fullPage: true });

    await page.getByRole("button", { name: "Print full report" }).click();
    await expectPrintFrame(page);
  });

  test("Arabic reports summary print initializes", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/ar/reports");
    const printSummaryButton = page.getByRole("button", { name: "طباعة الملخص" });
    await expect(printSummaryButton).toBeVisible({ timeout: 30_000 });
    await printSummaryButton.click();
    await expectPrintFrame(page);
  });

  test("Arabic students filtered print initializes", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/ar/students");
    await expect(page.locator("tbody [data-student-menu-trigger]").first()).toBeVisible({ timeout: 30_000 });
    const printFilteredStudentsButton = page.getByRole("button", { name: /طباعة الطلاب المفلترين/ }).first();
    await expect(printFilteredStudentsButton).toBeVisible({ timeout: 30_000 });
    await printFilteredStudentsButton.click();
    await expectPrintFrame(page);
  });

  test("Arabic teacher account card print initializes", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/ar/teachers");
    const printAccountCardButton = page.getByRole("button", { name: "بطاقة الدخول" }).first();
    await expect(printAccountCardButton).toBeVisible({ timeout: 30_000 });
    await printAccountCardButton.click();
    await expect(page.getByText(/بطاقة حساب التطبيق جاهزة/)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "طباعة بطاقة الدخول" }).click();
    await expectPrintFrame(page);
  });
});
