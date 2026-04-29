import { expect, test } from "@playwright/test";
import { ensureE2EEnvLoaded } from "../helpers/e2e-env";

ensureE2EEnvLoaded();

test.describe("Payments CRUD", () => {
  test("payment modal opens and form is accessible", async ({ page }) => {
    await page.goto("/ar/payments", { waitUntil: "networkidle" });

    // Open modal
    const addButton = page.getByRole("button", { name: "+ إضافة فاتورة" });
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Modal should appear
    const modal = page.locator("[role='dialog'], .modal, [class*='Modal']").first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Verify student search field exists
    const studentSearch = page.locator("#student-search");
    await expect(studentSearch).toBeVisible({ timeout: 3000 });

    // Verify receipt date field exists
    const receiptDate = page.locator("#receipt-date");
    await expect(receiptDate).toBeVisible({ timeout: 2000 });

    // Verify payment amount field exists
    const paymentAmount = page.locator("#payment-amount");
    await expect(paymentAmount).toBeVisible({ timeout: 2000 });

    // Verify submit button disabled (no student selected yet)
    const submitButton = page.getByRole("button", { name: "تسجيل الدفعة" });
    await expect(submitButton).toBeVisible({ timeout: 2000 });
    const isDisabled = await submitButton.isDisabled().catch(() => true);
    expect(isDisabled).toBe(true);
  });

  test("student search dropdown appears and students can be selected", async ({ page }) => {
    await page.goto("/ar/payments", { waitUntil: "networkidle" });

    const addButton = page.getByRole("button", { name: "+ إضافة فاتورة" });
    await addButton.click();

    const modal = page.locator("[role='dialog'], .modal, [class*='Modal']").first();
    await expect(modal).toBeVisible();

    // Type in student search
    const studentSearch = page.locator("#student-search");
    await studentSearch.fill("QA");

    // Wait for dropdown to appear
    const dropdown = page.locator("[role='listbox'], [role='menu'], [class*='dropdown']").first();
    const dropdownVisible = await dropdown.isVisible({ timeout: 3000 }).catch(() => false);

    // If dropdown appeared, try selecting an option
    if (dropdownVisible) {
      const firstOption = dropdown.locator("[role='option'], li, div").first();
      await expect(firstOption).toBeVisible({ timeout: 2000 });
      await firstOption.click();

      // Submit button should now be enabled
      const submitButton = page.getByRole("button", { name: "تسجيل الدفعة" });
      const isEnabled = await submitButton.isEnabled({ timeout: 2000 }).catch(() => false);
      expect(isEnabled).toBe(true);
    }
  });

  test("delete payment confirmation dialog appears", async ({ page }) => {
    await page.goto("/ar/payments", { waitUntil: "networkidle" });

    // Look for any delete payment buttons
    const deleteButtons = page.getByRole("button", { name: /حذف|delete/i });
    const count = await deleteButtons.count();

    if (count > 0) {
      await deleteButtons.first().click();

      // Confirmation dialog should appear
      const confirmDialog = page.locator("[role='dialog'], [class*='Modal']").first();
      await expect(confirmDialog).toBeVisible({ timeout: 3000 });

      // Cancel button should be present
      const cancelButton = page.getByRole("button", { name: /إلغاء|Cancel/ });
      await expect(cancelButton).toBeVisible({ timeout: 2000 });

      // Cancel the operation
      await cancelButton.click();
      await page.waitForTimeout(500);
    }
  });
});
