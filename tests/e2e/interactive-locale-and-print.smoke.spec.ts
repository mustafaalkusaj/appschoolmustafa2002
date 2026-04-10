import fs from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

const screenshotDir = "/Users/musatafa/school-app/output/playwright/interactive-flows";

async function installPrintFrameProbe(page: Page) {
  await page.evaluate(() => {
    const win = window as Window & {
      __qaSawPrintFrame?: boolean;
      __qaPrintProbeInstalled?: boolean;
    };

    win.__qaSawPrintFrame = false;

    if (win.__qaPrintProbeInstalled) {
      return;
    }

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node instanceof HTMLIFrameElement && node.title === "print-preview") {
            win.__qaSawPrintFrame = true;
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    win.__qaPrintProbeInstalled = true;
  });
}

test.describe.serial("interactive locale and print coverage", () => {
  test("English payments drawer stays localized and receipt print still initializes", async ({ page }) => {
    test.setTimeout(240_000);
    await fs.mkdir(screenshotDir, { recursive: true });

    await loginAsAdmin(page, "en");
    await page.goto("/en/payments");

    await page.locator("tbody tr").nth(1).locator("button").first().click();

    await expect(page.getByRole("heading", { name: /Invoice details/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Student information")).toBeVisible();
    await expect(page.getByText("Financial summary")).toBeVisible();

    await page.screenshot({ path: `${screenshotDir}/payments-detail-en.png`, fullPage: true });

    await installPrintFrameProbe(page);
    await expect(page.getByRole("button", { name: "Print receipt" })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Print receipt" }).click();

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const win = window as Window & { __qaSawPrintFrame?: boolean };
            return Boolean(win.__qaSawPrintFrame);
          }),
        { timeout: 10_000 },
      )
      .toBe(true);
  });

  test("English salaries print modal stays localized and full report print still initializes", async ({ page }) => {
    test.setTimeout(240_000);
    await fs.mkdir(screenshotDir, { recursive: true });

    await loginAsAdmin(page, "en");
    await page.goto("/en/salaries");

    await page.getByRole("button", { name: "Print options" }).click();

    await expect(page.getByRole("heading", { name: "Print options" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Detailed teacher report")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print full report" })).toBeVisible();

    await page.screenshot({ path: `${screenshotDir}/salaries-print-modal-en.png`, fullPage: true });

    await installPrintFrameProbe(page);
    await page.getByRole("button", { name: "Print full report" }).click();

    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const win = window as Window & { __qaSawPrintFrame?: boolean };
            return Boolean(win.__qaSawPrintFrame);
          }),
        { timeout: 10_000 },
      )
      .toBe(true);
  });
});
