import { test } from "@playwright/test";

test.use({ storageState: "/Users/musatafa/school-app/artifacts/reliability-audit/admin-storage-state.json" });

test("authenticated dashboard supports bilingual locale switching", async ({ page }) => {
  await page.goto("/ar/dashboard");

  await expect(
    page.getByRole("heading", {
      name: "لوحة التحكم",
    }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "التبديل إلى الإنجليزية" }).click();
  await expect(page).toHaveURL(/\/en\/dashboard(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", {
      name: "Dashboard",
    }).first(),
  ).toBeVisible();

  await page.getByRole("button", { name: "Switch to Arabic" }).click();
  await expect(page).toHaveURL(/\/ar\/dashboard(?:\?.*)?$/);
});
