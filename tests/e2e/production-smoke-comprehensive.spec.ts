import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Production smoke tests", () => {
  test("GET /ar/login returns 200", async ({ page }) => {
    const res = await page.goto("/ar/login");
    expect(res?.status()).toBe(200);
  });

  test("GET /en/login returns 200", async ({ page }) => {
    const res = await page.goto("/en/login");
    expect(res?.status()).toBe(200);
  });

  test("login page has no JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("static CSS assets load without 4xx/5xx", async ({ page }) => {
    const failedResources: string[] = [];
    page.on("response", (resp) => {
      if (resp.url().includes(".css") && resp.status() >= 400) {
        failedResources.push(`${resp.status()} ${resp.url()}`);
      }
    });
    await page.goto("/ar/login");
    await page.waitForLoadState("networkidle");
    expect(failedResources).toHaveLength(0);
  });

  test("unauthenticated dashboard redirects (not 500)", async ({ page }) => {
    const res = await page.goto("/ar/dashboard");
    expect(res?.status()).not.toBe(500);
    // Should be redirect to login, not server error
  });
});
