import { expect, test } from "@playwright/test";

test("protected dashboard redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/ar/dashboard");

  await expect(page).toHaveURL(/\/ar\/login(?:\?.*)?$/);
  await expect(
    page.getByRole("heading", {
      name: "تسجيل الدخول",
    }),
  ).toBeVisible();
});
