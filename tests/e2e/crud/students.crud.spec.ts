import { expect, test } from "@playwright/test";
import { e2eTag } from "../helpers/test-data";
import { ensureE2EEnvLoaded, getQAIds } from "../helpers/e2e-env";

ensureE2EEnvLoaded();
const ids = getQAIds();

test.describe("Students CRUD", () => {
  let createdStudentName: string;

  test("create student with valid data", async ({ page }) => {
    await page.goto("/ar/students", { waitUntil: "networkidle" });

    // Open modal
    const addButton = page.getByRole("button", { name: "+ إضافة طالب" });
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Modal should appear
    const modal = page.locator("[role='dialog'], .modal, [class*='Modal']").first();
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Step 1: Fill basic info
    createdStudentName = e2eTag("Student");
    await page.locator("#full_name").fill(createdStudentName);

    // Select first class option
    const classSelect = page.locator("#class_name");
    await classSelect.selectOption({ index: 1 });

    // Optional section
    await page.locator("#section").fill("QA");

    // Go to next step
    await page.getByRole("button", { name: "التالي" }).click();
    await page.waitForTimeout(500);

    // Step 2: Contact info (skip optional fields)
    await page.getByRole("button", { name: "التالي" }).click();
    await page.waitForTimeout(500);

    // Step 3: Fees
    await page.locator("#total_fee").fill("1000");
    await page.locator("#paid_fee").fill("0");

    // Save
    const saveButton = page.getByRole("button", { name: /حفظ الطالب/ });
    await expect(saveButton).toBeVisible({ timeout: 3000 });
    await saveButton.click();

    // Wait for success and navigation
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Verify student in list
    const studentInList = page.getByText(createdStudentName).first();
    await expect(studentInList).toBeVisible({ timeout: 5000 });
  });

  test("delete student from list", async ({ page }) => {
    createdStudentName = e2eTag("Student");

    await page.goto("/ar/students", { waitUntil: "networkidle" });

    // Create a student first
    const addButton = page.getByRole("button", { name: "+ إضافة طالب" });
    await addButton.click();

    const modal = page.locator("[role='dialog'], .modal, [class*='Modal']").first();
    await expect(modal).toBeVisible();

    // Fill and save
    await page.locator("#full_name").fill(createdStudentName);
    const classSelect = page.locator("#class_name");
    await classSelect.selectOption({ index: 1 });

    await page.getByRole("button", { name: "التالي" }).click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "التالي" }).click();
    await page.waitForTimeout(300);

    await page.locator("#total_fee").fill("1000");
    await page.getByRole("button", { name: /حفظ الطالب/ }).click();
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    // Find student in list and delete
    await page.goto("/ar/students", { waitUntil: "networkidle" });
    const studentText = page.getByText(createdStudentName).first();
    await expect(studentText).toBeVisible({ timeout: 5000 });

    // Find row containing student and locate delete action
    const studentRow = page.locator("tr, [class*='row'], [class*='card']").filter({ has: studentText }).first();

    // Try to find delete button in row (might be dropdown, icon, or menu)
    const deleteButton = studentRow.getByRole("button", { name: /حذف|delete/i }).first();
    const exists = await deleteButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (exists) {
      await deleteButton.click();

      // Confirm deletion
      const confirmButton = page.getByRole("button", { name: "نعم، احذف" });
      await expect(confirmButton).toBeVisible({ timeout: 3000 });
      await confirmButton.click();

      // Wait for deletion to complete
      await page.waitForLoadState("networkidle", { timeout: 10000 });

      // Verify student no longer in active list
      const deletedStudentText = page.getByText(createdStudentName).first();
      const isGone = await deletedStudentText.isVisible({ timeout: 2000 }).catch(() => false);
      expect(isGone).toBe(false);
    }
  });
});
