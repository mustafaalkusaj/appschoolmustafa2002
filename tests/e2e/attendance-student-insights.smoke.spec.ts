import { test } from "@playwright/test";

test.describe.serial("attendance student insights", () => {
  test.use({ storageState: "/Users/musatafa/school-app/artifacts/reliability-audit/admin-storage-state.json" });

  test("attendance page exposes the student insights search and handles empty result sets", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/en/attendance");

    // Wait for the page shell to render.
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 20_000 });

    const section = page.getByTestId("attendance-student-insights");
    await expect(section).toBeVisible({ timeout: 20_000 });

    const searchInput = page.getByTestId("attendance-student-search-input");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();

    await searchInput.click();
    await searchInput.pressSequentially("zz", { delay: 20 });
    await expect(searchInput).toHaveValue("zz");

    const emptyMessage = page.getByText("No matching results.");
    const results = page.getByTestId("attendance-student-search-results");

    await expect
      .poll(
        async () => {
          if (await results.isVisible()) return "results";
          if (await emptyMessage.isVisible()) return "empty";
          return "pending";
        },
        { timeout: 20_000 },
      )
      .toMatch(/results|empty/);

    if (await results.isVisible()) {
      await results.getByTestId("attendance-student-search-result").first().click();
      await expect(page.getByTestId("attendance-student-insights-modal")).toBeVisible({ timeout: 20_000 });
    } else {
      await expect(emptyMessage).toBeVisible({ timeout: 20_000 });
    }

    // Export class absences action exists (may be disabled if no class filter).
    await expect(page.getByLabel("Export class absences (CSV)")).toBeVisible();
  });
});
