import { expect, test } from "@playwright/test";

test("forgot-password page renders the recovery request flow in both locales", async ({ page }) => {
  await page.goto("/ar/forgot-password");
  await expect(page.getByRole("heading", { name: "استعادة كلمة المرور" })).toBeVisible();
  await expect(page.locator("#forgot-password-email")).toBeVisible();
  await expect(page.getByRole("button", { name: "إرسال رابط الاستعادة" })).toBeVisible();

  await page.goto("/en/forgot-password");
  await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  await expect(page.locator("#forgot-password-email")).toBeVisible();
});
