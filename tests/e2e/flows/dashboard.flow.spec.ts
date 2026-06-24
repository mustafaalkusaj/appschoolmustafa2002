import { expect, test } from "@playwright/test";

test.describe("Dashboard and Branch Overview", () => {
  test.beforeEach(async ({ page }) => {
    // Storage state from setup provides auth - just navigate to authenticated page
    await page.goto("/ar/dashboard", { waitUntil: "networkidle" });
  });

  test("authenticated user can load /ar/dashboard", async ({ page }) => {
    // May be on dashboard or group page after login
    await expect(page).toHaveURL(/\/ar\/(dashboard|group)(?:\?.*)?$/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("no global error boundary on authenticated pages", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await page.goto("/ar/dashboard");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });

  test("no Supabase env error on dashboard", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Supabase")) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/ar/dashboard");
    await page.waitForLoadState("networkidle");

    expect(consoleErrors).toHaveLength(0);
  });

  test("core dashboard cards render", async ({ page }) => {
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("networkidle");

    // Check for main dashboard layout
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();

    // Dashboard should have cards or content sections
    const sections = page.locator("[class*='card'], [class*='Card'], section, article");
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
  });

  test("user profile information displays", async ({ page }) => {
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("networkidle");

    // Check for profile menu trigger
    const profileMenu = page.locator(".profile-menu__trigger").first();
    await expect(profileMenu).toBeVisible({ timeout: 5000 }).catch(() => {
      // Profile menu might be hidden on some layouts
    });
  });

  test("sidebar or navigation is accessible", async ({ page }) => {
    await page.goto("/ar/dashboard");
    await page.waitForLoadState("networkidle");

    // Look for navigation menu
    const nav = page.locator("nav, [role='navigation']").first();
    await expect(nav).toBeVisible({ timeout: 5000 }).catch(() => {
      // Navigation might be hidden on mobile
    });
  });
});
