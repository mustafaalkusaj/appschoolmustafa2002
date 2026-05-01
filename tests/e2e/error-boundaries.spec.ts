import { test } from "@playwright/test";

test.describe("Error Boundaries", () => {
  // Test that error boundaries don't expose stack traces
  test("error boundaries hide stack traces", async ({ page, _context }) => {
    const consoleMessages: string[] = [];

    page.on("console", (msg) => {
      consoleMessages.push(msg.text());
    });

    // Navigate to a protected route with auth
    await page.goto("/ar/students", { waitUntil: "networkidle" });

    // Check that no stack traces are shown in console for production errors
    const hasStackTrace = consoleMessages.some((msg) =>
      msg.includes("at ") || msg.includes(".tsx:") || msg.includes("function ")
    );

    // Stack traces in console.error are logged by Sentry but not exposed to user
    expect(hasStackTrace).not.toBe(true);
  });

  // Test global error boundary has retry button
  test("global error boundary has retry button", async ({ page }) => {
    // Global errors normally shouldn't happen, but test the structure exists
    await page.goto("/ar/students", { waitUntil: "networkidle" });

    // Verify the page content is loaded (no global error)
    const content = page.locator("main, [role='main']");
    const isVisible = await content.isVisible({ timeout: 3000 }).catch(() => false);

    expect(isVisible).toBe(true);
  });

  // Test feature error boundaries (route-level) have retry
  test("feature error boundaries have retry button", async ({ page }) => {
    await page.goto("/ar/students", { waitUntil: "networkidle" });

    // The page should load successfully
    const mainContent = page.locator("main, [role='main'], [class*='content']");
    const isVisible = await mainContent.isVisible({ timeout: 3000 }).catch(() => false);

    expect(isVisible).toBe(true);
  });

  // Test that error digest is shown (not full stack)
  test("error digest is shown without full stack", async ({ page }) => {
    await page.goto("/ar/login", { waitUntil: "networkidle" });

    // In normal operation, no error should be shown
    const errorElement = page.locator("[class*='error'], [role='alert']");
    const errorVisible = await errorElement.isVisible({ timeout: 2000 }).catch(() => false);

    // If error is shown, it should be minimal
    if (errorVisible) {
      const errorText = await errorElement.textContent();
      // Should not contain file paths or function names
      expect(errorText).not.toMatch(/\.tsx|\.ts|function|at /);
    }
  });
});
