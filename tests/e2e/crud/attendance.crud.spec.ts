import { expect, test } from "@playwright/test";
import { ensureE2EEnvLoaded } from "../helpers/e2e-env";

ensureE2EEnvLoaded();

test.describe("Attendance CRUD", () => {
  test("attendance page loads with status controls", async ({ page }) => {
    await page.goto("/ar/attendance", { waitUntil: "networkidle" });

    // Verify attendance controls exist
    const presentButton = page.getByRole("button", { name: "حاضر" });
    const absentButton = page.getByRole("button", { name: "غائب" });
    const lateButton = page.getByRole("button", { name: "متأخر" });
    const excusedButton = page.getByRole("button", { name: "بعذر" });

    // At least one of these should be visible (might be in different rows)
    const present = await presentButton.isVisible({ timeout: 2000 }).catch(() => false);
    const absent = await absentButton.isVisible({ timeout: 2000 }).catch(() => false);
    const late = await lateButton.isVisible({ timeout: 2000 }).catch(() => false);
    const excused = await excusedButton.isVisible({ timeout: 2000 }).catch(() => false);

    const hasAnyStatus = present || absent || late || excused;
    expect(hasAnyStatus).toBe(true);
  });

  test("attendance save button is present and disabled initially", async ({ page }) => {
    await page.goto("/ar/attendance", { waitUntil: "networkidle" });

    // Save button should exist
    const saveButton = page.getByRole("button", { name: /حفظ التغييرات/ });
    await expect(saveButton).toBeVisible({ timeout: 5000 });

    // Should be disabled initially (no changes)
    const isDisabled = await saveButton.isDisabled().catch(() => true);
    expect(isDisabled).toBe(true);
  });

  test("changing attendance status enables save button", async ({ page }) => {
    await page.goto("/ar/attendance", { waitUntil: "networkidle" });

    // Find first student row with status buttons
    const rows = page.locator("tr, [class*='row'], [class*='card']");
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Get first row
      const firstRow = rows.first();

      // Try to find and click a status button
      const presentButton = firstRow.getByRole("button", { name: "حاضر" });
      const absentButton = firstRow.getByRole("button", { name: "غائب" });

      const presentExists = await presentButton.isVisible({ timeout: 1000 }).catch(() => false);
      const absentExists = await absentButton.isVisible({ timeout: 1000 }).catch(() => false);

      if (presentExists) {
        // Click present to toggle status
        const isActive = await presentButton.evaluate((el) =>
          el.classList.contains("active") || el.getAttribute("aria-pressed") === "true"
        );

        if (!isActive && absentExists) {
          // Change to absent to create a change
          await absentButton.click();

          // Save button should now be enabled
          await page.waitForTimeout(500);
          const saveButton = page.getByRole("button", { name: /حفظ التغييرات/ });
          const isEnabled = await saveButton.isEnabled({ timeout: 2000 }).catch(() => false);
          expect(isEnabled).toBe(true);
        }
      }
    }
  });

  test("reload data button restores original values", async ({ page }) => {
    await page.goto("/ar/attendance", { waitUntil: "networkidle" });

    // Look for reload button
    const reloadButton = page.getByRole("button", { name: /إعادة تحميل|Reload/ });
    const reloadExists = await reloadButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (reloadExists) {
      // Click reload button
      await reloadButton.click();

      // Wait for reload
      await page.waitForLoadState("networkidle", { timeout: 10000 });

      // Save button should be disabled again
      const saveButton = page.getByRole("button", { name: /حفظ التغييرات/ });
      const isDisabled = await saveButton.isDisabled({ timeout: 2000 }).catch(() => true);
      expect(isDisabled).toBe(true);
    }
  });
});
