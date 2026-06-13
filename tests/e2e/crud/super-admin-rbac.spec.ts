import { expect, test } from "@playwright/test";
import { loginAsSuperAdmin } from "../helpers/auth";
import { ensureE2EEnvLoaded } from "../helpers/e2e-env";

ensureE2EEnvLoaded();

test.describe("Super-Admin RBAC Protection", () => {
  test("unauthenticated user cannot access super-admin", async ({ page }) => {
    // Navigate to super-admin without logging in
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    console.log("→ After navigation to /ar/super-admin (no auth). Current URL:", page.url());

    // Should be redirected to login
    expect(page.url()).toContain("/login");
  });

  test("super-admin can access super-admin page", async ({ page }) => {
    await loginAsSuperAdmin(page, "ar");

    console.log("✓ Super admin logged in. Current URL:", page.url());

    // Should be on super-admin page
    expect(page.url()).toContain("/super-admin");
  });

  test("super-admin dashboard loads content", async ({ page }) => {
    await loginAsSuperAdmin(page, "ar");

    // Navigate to super-admin
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    // Check for main content area
    const mainContent = page.locator("main, [role='main'], [class*='content']").first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });

  test("super-admin tabs are visible", async ({ page }) => {
    await loginAsSuperAdmin(page, "ar");

    // Navigate to super-admin
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    // Look for tab buttons
    const tabs = page.locator("button, [role='tab']");
    const tabCount = await tabs.count();

    // Should have at least some tabs
    expect(tabCount).toBeGreaterThan(0);
  });

  test("super-admin page has no critical errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await loginAsSuperAdmin(page, "ar");
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    // No uncaught errors should occur
    expect(errors).toHaveLength(0);
  });

  test("ProtectedRoute blocks unauthorized access at client level", async ({ page }) => {
    // This test verifies that the ProtectedRoute component is properly rendering
    // The actual RBAC check happens in getAccessDecision() which:
    // 1. Checks isRoleAllowedForPath(role, pathname)
    // 2. For super-admin path, only role="super_admin" is allowed
    // 3. Checks ROUTE_ACCESS_RULES which defines super-admin as super_admin-only
    // 4. ProtectedRoute renders empty fallback if blockedReason exists
    // 5. Client redirects to /access-denied or /login

    // Navigate to super-admin without auth
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    // Should not show the super-admin page (no "المدير العام" heading)
    const superAdminHeading = page.locator("h1, h2, [class*='title']").filter({
      hasText: /المدير العام|System Owner/,
    });

    const isVisible = await superAdminHeading.first().isVisible().catch(() => false);
    expect(isVisible).toBe(false);
  });
});
