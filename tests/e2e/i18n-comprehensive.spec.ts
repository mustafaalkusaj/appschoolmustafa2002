import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

// Note: app sets dir/lang on an inner <div> (app/[locale]/layout.tsx line 53), not on <html>

test.describe("i18n — Arabic vs English", () => {
  test("Arabic login page has RTL direction on layout div", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    // dir="rtl" is on the inner layout div, not <html>
    const dir = await page.evaluate(
      () => document.querySelector("div[dir]")?.getAttribute("dir") ?? ""
    );
    expect(dir).toBe("rtl");
  });

  test("English login page has LTR direction on layout div", async ({ page }) => {
    await page.goto("/en/login");
    await page.waitForLoadState("networkidle");
    const dir = await page.evaluate(
      () => document.querySelector("div[dir]")?.getAttribute("dir") ?? ""
    );
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

  test("Arabic page has lang=ar attribute on layout div", async ({ page }) => {
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    // lang="ar" is on the inner layout div, not <html>
    const lang = await page.evaluate(
      () => document.querySelector("div[lang]")?.getAttribute("lang") ?? ""
    );
    expect(lang).toBe("ar");
  });
});
