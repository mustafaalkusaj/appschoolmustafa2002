import { test } from "@playwright/test";

test("localized login page renders the core sign-in form", async ({ page }) => {
  await page.goto("/ar/login");

  const identifierInput = page.locator("#email");
  const passwordInput = page.locator("#password");

  await expect(page).toHaveURL(/\/ar\/login$/);
  await expect(identifierInput).toBeVisible();
  await expect(identifierInput).toHaveAttribute("placeholder", "name@school.com");
  await expect(passwordInput).toBeVisible();
  await expect(passwordInput).toHaveAttribute("placeholder", "أدخل كلمة المرور");
  await expect(page.locator("button").filter({ hasText: "English" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "إظهار كلمة المرور" })).toBeVisible();
  await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();
});
