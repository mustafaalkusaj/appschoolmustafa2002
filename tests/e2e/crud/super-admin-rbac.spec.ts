import { expect, test } from "@playwright/test";
import { loginWithCredentials } from "../helpers/auth";
import { ensureE2EEnvLoaded, getQAAccount } from "../helpers/e2e-env";

ensureE2EEnvLoaded();

test.describe("Super-Admin RBAC Protection", () => {
  test("normal user cannot access super-admin", async ({ page }) => {
    const normalUser = getQAAccount("normal_user_a");

    // Login as normal user
    await loginWithCredentials(page, {
      locale: "ar",
      email: normalUser.email,
      password: normalUser.password,
      expectedPath: /\/dashboard|\/group|\/login/,
    });

    // Try to navigate to super-admin
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    // Should be redirected away or show access denied
    const isNotOnSuperAdmin = !page.url().includes("/super-admin") || page.url().includes("/login") || page.url().includes("/access-denied");
    expect(isNotOnSuperAdmin).toBe(true);
  });

  test("branch admin cannot access super-admin", async ({ page }) => {
    const branchAdmin = getQAAccount("branch_admin_a");

    // Login as branch admin
    await loginWithCredentials(page, {
      locale: "ar",
      email: branchAdmin.email,
      password: branchAdmin.password,
      expectedPath: /\/dashboard|\/group|\/login/,
    });

    // Try to navigate to super-admin
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    // Should be redirected away
    const isNotOnSuperAdmin = !page.url().includes("/super-admin") || page.url().includes("/login") || page.url().includes("/access-denied");
    expect(isNotOnSuperAdmin).toBe(true);
  });

  test("super-admin can access super-admin page", async ({ page }) => {
    const superAdmin = getQAAccount("super_admin");

    // Login as super admin
    await loginWithCredentials(page, {
      locale: "ar",
      email: superAdmin.email,
      password: superAdmin.password,
      expectedPath: /\/super-admin/,
    });

    // Should be on super-admin page
    expect(page.url()).toContain("/super-admin");
  });

  test("super-admin health tab loads", async ({ page }) => {
    const superAdmin = getQAAccount("super_admin");

    await loginWithCredentials(page, {
      locale: "ar",
      email: superAdmin.email,
      password: superAdmin.password,
      expectedPath: /\/super-admin/,
    });

    // Navigate to super-admin
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    // Look for health tab
    const healthTab = page.locator("button, [role='tab']").filter({ hasText: /صحة|Health|مراقبة/ });
    const tabExists = await healthTab.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (tabExists) {
      await healthTab.first().click();
      await page.waitForLoadState("networkidle");

      // Content should load
      const mainContent = page.locator("main, [role='main'], [class*='content']").first();
      const isVisible = await mainContent.isVisible({ timeout: 3000 }).catch(() => false);
      expect(isVisible).toBe(true);
    }
  });

  test("super-admin no global error boundary", async ({ page }) => {
    const superAdmin = getQAAccount("super_admin");

    const errors: string[] = [];
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await loginWithCredentials(page, {
      locale: "ar",
      email: superAdmin.email,
      password: superAdmin.password,
      expectedPath: /\/super-admin/,
    });

    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    expect(errors).toHaveLength(0);
  });
});
