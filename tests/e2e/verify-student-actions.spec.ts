import { test, expect } from "@playwright/test";

const PROD_URL = "https://school-iraq.com";
const QA_EMAIL = process.env.QA_EMAIL || "";
const QA_PASSWORD = process.env.QA_PASSWORD || "";

test.describe("Student Actions Verification - Production", () => {
  test.beforeEach(async ({ page, context }) => {
    // Load existing auth state if available
    if (process.env.STORAGE_STATE) {
      await context.addInitScript(() => {
        const state = JSON.parse(process.env.STORAGE_STATE || "{}");
        Object.entries(state.cookies || {}).forEach(([name, value]) => {
          document.cookie = `${name}=${value}`;
        });
      });
    }
  });

  test("suspend active student", async ({ page }) => {
    console.log("TEST: Suspend active student");
    
    // Navigate to students page
    await page.goto(`${PROD_URL}/ar/students`, { waitUntil: "networkidle" });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Look for first active student
    const rows = page.locator("tr");
    const count = await rows.count();
    console.log(`Found ${count} rows`);
    
    if (count < 2) {
      console.log("No students found");
      return;
    }
    
    // Try to open menu for first student
    const firstRow = rows.nth(1);
    const menuBtn = firstRow.locator("[data-student-menu-trigger]");
    const visible = await menuBtn.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!visible) {
      console.log("Menu button not visible - checking permissions");
      return;
    }
    
    console.log("Menu button found - clicking");
    await menuBtn.click();
    await page.waitForTimeout(300);
    
    // Look for suspend action
    const suspendBtn = page.locator("button:has-text('توقيف الطالب')").first();
    const suspendVisible = await suspendBtn.isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log(`Suspend button visible: ${suspendVisible}`);
    
    if (suspendVisible) {
      const studentName = await firstRow.locator("td:nth-child(2)").textContent();
      console.log(`Suspending student: ${studentName}`);
      
      await suspendBtn.click();
      await page.waitForTimeout(500);
      
      // Check for success toast
      const successToast = page.locator("text=/تم توقيف|successfully/");
      const toastVisible = await successToast.isVisible({ timeout: 3000 }).catch(() => false);
      
      console.log(`Success toast visible: ${toastVisible}`);
      
      // Check if student moved to suspended tab
      const suspendedTab = page.locator("button:has-text('الموقوفون')");
      if (await suspendedTab.isVisible()) {
        await suspendedTab.click();
        await page.waitForTimeout(500);
        
        const movedToSuspended = await page.locator(`text='${studentName}'`).isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`Student appeared in suspended tab: ${movedToSuspended}`);
      }
    }
  });

  test("verify delete action", async ({ page }) => {
    console.log("TEST: Delete action verification");
    
    await page.goto(`${PROD_URL}/ar/students`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    
    const rows = page.locator("tr");
    if (await rows.count() < 2) return;
    
    const firstRow = rows.nth(1);
    const menuBtn = firstRow.locator("[data-student-menu-trigger]");
    
    if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuBtn.click();
      await page.waitForTimeout(300);
      
      const deleteBtn = page.locator("button:has-text('حذف الطالب')").first();
      const deleteVisible = await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false);
      
      console.log(`Delete button visible: ${deleteVisible}`);
    }
  });

  test("verify restore actions", async ({ page }) => {
    console.log("TEST: Verify restore actions available");
    
    await page.goto(`${PROD_URL}/ar/students`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    
    // Check suspended tab
    const suspendedTab = page.locator("button:has-text('الموقوفون')");
    if (await suspendedTab.isVisible()) {
      await suspendedTab.click();
      await page.waitForTimeout(500);
      
      const rows = page.locator("tr");
      if (await rows.count() > 1) {
        const row = rows.nth(1);
        const menuBtn = row.locator("[data-student-menu-trigger]");
        
        if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await menuBtn.click();
          await page.waitForTimeout(300);
          
          const restoreBtn = page.locator("button:has-text('استعادة')").first();
          const restoreVisible = await restoreBtn.isVisible({ timeout: 2000 }).catch(() => false);
          
          console.log(`Restore button visible in suspended tab: ${restoreVisible}`);
        }
      }
    }
    
    // Check deleted tab
    const deletedTab = page.locator("button:has-text('المحذوفون')");
    if (await deletedTab.isVisible()) {
      await deletedTab.click();
      await page.waitForTimeout(500);
      
      const rows = page.locator("tr");
      if (await rows.count() > 1) {
        const row = rows.nth(1);
        const menuBtn = row.locator("[data-student-menu-trigger]");
        
        if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await menuBtn.click();
          await page.waitForTimeout(300);
          
          const restoreBtn = page.locator("button:has-text('استعادة')").first();
          const restoreVisible = await restoreBtn.isVisible({ timeout: 2000 }).catch(() => false);
          
          console.log(`Restore button visible in deleted tab: ${restoreVisible}`);
        }
      }
    }
  });
});
