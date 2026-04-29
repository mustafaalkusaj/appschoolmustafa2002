import { expect, test } from "@playwright/test";
import { e2eTag } from "../helpers/test-data";
import { ensureE2EEnvLoaded, getQAIds } from "../helpers/e2e-env";

ensureE2EEnvLoaded();
const ids = getQAIds();

test.describe("Students CRUD", () => {
  let createdStudentName: string;

  test("create student with valid data", async ({ page }) => {
    // Capture API responses
    const apiLogs: Array<{url: string; status: number; method: string; body?: string}> = [];
    const consoleLogs: string[] = [];
    const pageErrors: string[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("/api") && (url.includes("student") || url.includes("user") || url.includes("dashboard"))) {
        try {
          const body = await response.text();
          apiLogs.push({
            url: url.split("?")[0],
            status: response.status(),
            method: response.request().method(),
            body: body.substring(0, 500),
          });
          console.log(`API ${response.status()}:`, url.split("?")[0]);
        } catch {}
      }
    });

    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warn") {
        consoleLogs.push(`${msg.type()}: ${msg.text()}`);
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });
    await page.goto("/ar/students", { waitUntil: "load" });

    // Wait for page to hydrate and render buttons (React hydration takes time)
    await page.waitForFunction(() => {
      const button = document.querySelector("button");
      return button && document.body.innerText.length > 100;
    }, { timeout: 10000 });

    // Open modal
    const addButton = page.getByRole("button", { name: "+ إضافة طالب" });
    await expect(addButton).toBeVisible({ timeout: 5000 });
    await addButton.click();

    // Modal should appear - check for modal title or content instead of just dialog role
    const modalTitle = page.getByText("إضافة طالب جديد");
    await expect(modalTitle).toBeVisible({ timeout: 3000 });

    // Step 1: Fill basic info
    createdStudentName = e2eTag("Student");
    await page.locator("#full_name").fill(createdStudentName);

    // Check class options available
    const classSelect = page.locator("#class_name");
    const classOptions = await classSelect.locator("option").count();
    console.log("Class options available:", classOptions);

    if (classOptions > 1) {
      await classSelect.selectOption({ index: 1 });
      const selectedClass = await classSelect.inputValue();
      console.log("Selected class:", selectedClass);
    } else {
      console.log("No class options available!");
    }

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

    // Wait for success message or navigate back to list
    const successMessage = page.getByText(/تم إضافة الطالب|طالب مصدر|successfully/i);
    const successExists = await successMessage.isVisible({ timeout: 5000 }).catch(() => false);

    // Check for error message
    const errorMessage = page.getByRole("alert").first();
    const errorText = await errorMessage.innerText().catch(() => "");

    // Check for saving state
    const savingButton = page.getByRole("button", { name: /جاري|saving|saving/i });
    const isSaving = await savingButton.isVisible({ timeout: 1000 }).catch(() => false);

    console.log("\n=== STUDENT CREATION RESULT ===");
    console.log("Success message shown:", successExists);
    console.log("Error message shown:", errorText);
    console.log("Currently saving:", isSaving);
    console.log("API calls captured:", apiLogs.length);
    console.log("API logs:", JSON.stringify(apiLogs, null, 2));
    console.log("Console errors:", consoleLogs);
    console.log("Page errors:", pageErrors);

    // If we see success, wait a bit then navigate, otherwise just navigate
    if (successExists) {
      await page.waitForTimeout(1000);
    }

    // Navigate back to students list to verify
    await page.goto("/ar/students", { waitUntil: "load" });

    // Verify student in list
    const studentInList = page.getByText(createdStudentName).first();
    await expect(studentInList).toBeVisible({ timeout: 5000 });
  });

  test("delete student from list", async ({ page }) => {
    createdStudentName = e2eTag("Student");

    await page.goto("/ar/students", { waitUntil: "load" });

    // Wait for page to hydrate and render buttons
    await page.waitForFunction(() => {
      const button = document.querySelector("button");
      return button && document.body.innerText.length > 100;
    }, { timeout: 10000 });

    // Create a student first
    const addButton = page.getByRole("button", { name: "+ إضافة طالب" });
    await addButton.click();

    const modalTitle = page.getByText("إضافة طالب جديد");
    await expect(modalTitle).toBeVisible();

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

    // Wait for success or just navigate
    const successMessage = page.getByText(/تم إضافة الطالب|طالب مصدر|successfully/i);
    await successMessage.isVisible({ timeout: 5000 }).catch(() => false);
    await page.waitForTimeout(500);

    // Find student in list and delete
    await page.goto("/ar/students", { waitUntil: "load" });
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
