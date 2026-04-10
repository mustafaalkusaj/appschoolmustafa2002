import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test("authenticated dashboard supports bilingual locale switching", async ({ page }) => {
  await loginAsAdmin(page, "ar");

  await expect(
    page.getByRole("heading", {
      name: "لوحة التحكم",
    }).first(),
  ).toBeVisible();

  await page.locator("button").filter({ hasText: "English" }).first().click();
  await expect(page).toHaveURL(/\/en\/dashboard(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", {
      name: "Dashboard",
    }).first(),
  ).toBeVisible();

  await page.locator("button").filter({ hasText: "العربية" }).first().click();
  await expect(page).toHaveURL(/\/ar\/dashboard(?:\?.*)?$/);
});
