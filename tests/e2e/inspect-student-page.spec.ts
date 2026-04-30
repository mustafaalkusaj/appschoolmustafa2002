import { test, expect } from "@playwright/test";

const PROD_URL = "https://school-iraq.com";

test.describe("Student Page Inspection", () => {
  test("inspect page structure and elements", async ({ page }) => {
    console.log("=== NAVIGATING TO PRODUCTION ===");
    const response = await page.goto(`${PROD_URL}/ar/students`, {
      waitUntil: "networkidle",
    });
    console.log(`Page status: ${response?.status()}`);

    await page.waitForTimeout(2000);

    // Check page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    // Check URL
    console.log(`Current URL: ${page.url()}`);

    // Look for main content
    const mainContent = page.locator("main");
    const mainVisible = await mainContent.isVisible().catch(() => false);
    console.log(`Main content visible: ${mainVisible}`);

    // Look for any table elements
    const tables = page.locator("table");
    const tableCount = await tables.count();
    console.log(`Table count: ${tableCount}`);

    // Look for rows in any table
    const rows = page.locator("table tr");
    const rowCount = await rows.count();
    console.log(`Table row count: ${rowCount}`);

    if (rowCount > 0) {
      const firstRow = rows.nth(0);
      const firstRowText = await firstRow.textContent();
      console.log(`First row text: ${firstRowText}`);
    }

    // Look for divs that might contain student data
    const studentCards = page.locator("[data-student-id]");
    const cardCount = await studentCards.count();
    console.log(`Elements with data-student-id: ${cardCount}`);

    // Look for menu buttons
    const menuButtons = page.locator("[data-student-menu-trigger]");
    const menuCount = await menuButtons.count();
    console.log(`Menu trigger buttons: ${menuCount}`);

    // Check if data is loading
    const spinner = page.locator("[role='progressbar'], .spinner, [class*='loading']");
    const spinnerVisible = await spinner.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Loading spinner visible: ${spinnerVisible}`);

    // Check for error message
    const errorMsg = page.locator('[role="alert"], .error, [class*="error"]');
    const errorCount = await errorMsg.count();
    console.log(`Error elements found: ${errorCount}`);
    if (errorCount > 0) {
      const firstError = await errorMsg.nth(0).textContent();
      console.log(`First error text: ${firstError}`);
    }

    // Check for empty state message
    const emptyState = page.locator("text=/لا توجد|no students|لا يوجد/i");
    const emptyVisible = await emptyState.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`Empty state visible: ${emptyVisible}`);

    // Look for tabs
    const tabs = page.locator("button:has-text('نشط'), button:has-text('الموقوفون'), button:has-text('المحذوفون')");
    const tabCount = await tabs.count();
    console.log(`Student tabs visible: ${tabCount}`);

    // Try to find all buttons with Arabic text
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    console.log(`Total button count: ${buttonCount}`);

    // Get visible text on page
    const bodyText = await page.locator("body").textContent();
    if (bodyText && bodyText.length < 1000) {
      console.log(`Page body text: ${bodyText.substring(0, 500)}`);
    }

    // Check localStorage for any clues
    const storageData = await page.evaluate(() => {
      return {
        local: Object.keys(localStorage),
        session: Object.keys(sessionStorage),
      };
    });
    console.log(`Storage keys:`, JSON.stringify(storageData, null, 2));
  });
});
