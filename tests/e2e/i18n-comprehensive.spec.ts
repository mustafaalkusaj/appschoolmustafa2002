import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("i18n — Arabic vs English", () => {
  test("Arabic login page has RTL direction", async ({ page }) => {
    await page.goto("/ar/login");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("rtl");
  });

  test("English login page has LTR direction", async ({ page }) => {
    await page.goto("/en/login");
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("ltr");
  });

  test("Arabic login has Arabic heading", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
  });

  test("English login has English heading", async ({ page }) => {
    await page.goto("/en/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("Arabic page has lang=ar attribute", async ({ page }) => {
    await page.goto("/ar/login");
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toMatch(/ar/);
  });
});
