import { expect, test } from "@playwright/test";
import { e2eTag } from "../helpers/test-data";
import { ensureE2EEnvLoaded } from "../helpers/e2e-env";

ensureE2EEnvLoaded();

test.describe("Expenses CRUD", () => {
  let createdExpenseTag: string;

  test("create expense with valid data", async ({ page }) => {
    await page.goto("/ar/expenses", { waitUntil: "networkidle" });

    createdExpenseTag = e2eTag("Expense");

    // Open modal
    const addButton = page.getByRole("button", { name: "إضافة مصروف" });
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Modal should appear
    const modal = page.locator("[role='dialog'], .modal, [class*='Modal']").first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Select expense type
    const expenseTypeSelect = page.locator("#form-expense-type");
    await expect(expenseTypeSelect).toBeVisible();
    await expenseTypeSelect.selectOption({ index: 1 });

    // Fill amount
    const amountInput = page.locator("#form-amount");
    await amountInput.fill("500");

    // Fill date
    const dateInput = page.locator("#form-date");
    const today = new Date().toISOString().split("T")[0];
    await dateInput.fill(today);

    // Fill recipient (E2E tag)
    const recipientInput = page.locator("#form-recipient");
    await recipientInput.fill(createdExpenseTag);

    // Submit
    const submitButton = page.getByRole("button", { name: "إضافة السجل" });
    await expect(submitButton).toBeVisible({ timeout: 3000 });
    await submitButton.click();

    // Wait for success
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Verify in list
    const expenseInList = page.getByText(createdExpenseTag).first();
    await expect(expenseInList).toBeVisible({ timeout: 5000 });
  });

  test("delete expense from list", async ({ page }) => {
    await page.goto("/ar/expenses", { waitUntil: "networkidle" });

    createdExpenseTag = e2eTag("Expense");

    // Create expense
    const addButton = page.getByRole("button", { name: "إضافة مصروف" });
    await addButton.click();

    const modal = page.locator("[role='dialog'], .modal, [class*='Modal']").first();
    await expect(modal).toBeVisible();

    const expenseTypeSelect = page.locator("#form-expense-type");
    await expenseTypeSelect.selectOption({ index: 1 });

    await page.locator("#form-amount").fill("500");
    const today = new Date().toISOString().split("T")[0];
    await page.locator("#form-date").fill(today);
    await page.locator("#form-recipient").fill(createdExpenseTag);

    const submitButton = page.getByRole("button", { name: "إضافة السجل" });
    await submitButton.click();
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Find and delete the expense
    await page.goto("/ar/expenses", { waitUntil: "networkidle" });
    const expenseText = page.getByText(createdExpenseTag).first();
    await expect(expenseText).toBeVisible({ timeout: 5000 });

    // Find row and delete icon
    const expenseRow = page.locator("tr, [class*='row'], [class*='card']").filter({ has: expenseText }).first();
    const deleteButton = expenseRow.getByRole("button", { name: /حذف|delete/i }).first();

    const exists = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (exists) {
      await deleteButton.click();

      // Confirm
      const confirmButton = page.getByRole("button", { name: "نعم، احذف" });
      await expect(confirmButton).toBeVisible({ timeout: 3000 });
      await confirmButton.click();

      await page.waitForLoadState("networkidle", { timeout: 10000 });

      // Verify removed
      const deletedText = page.getByText(createdExpenseTag).first();
      const isGone = await deletedText.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isGone).toBe(false);
    }
  });
});
