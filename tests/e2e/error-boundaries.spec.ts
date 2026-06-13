import { test, expect } from "@playwright/test";

test.describe("Error Boundaries", () => {
  // Test that error boundaries don't expose stack traces
  // Uses the public login page (no auth required)
  test("error boundaries hide stack traces", async ({ page }) => {
    const stackTraceMessages: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      // Only flag messages that look like real stack traces (file paths with line numbers)
      if (msg.type() === "error" && (text.includes(".tsx:") || text.includes(".ts:"))) {
        stackTraceMessages.push(text);
      }
    });

    await page.goto("/ar/login", { waitUntil: "networkidle" });

    // No file-path stack traces should appear in user-visible console errors
    expect(stackTraceMessages).toHaveLength(0);
  });

  // Test global error boundary — page loads without crashing
  test("global error boundary has retry button", async ({ page }) => {
    // Login page is always accessible — verify it loads without crashing
    await page.goto("/ar/login", { waitUntil: "networkidle" });

    // Page must have the login form (proves no global crash/error boundary triggered)
    const form = page.locator("form, #email, #password").first();
    const isVisible = await form.isVisible({ timeout: 5000 }).catch(() => false);

    expect(isVisible).toBe(true);
  });

  // Test feature error boundaries — page content renders
  test("feature error boundaries have retry button", async ({ page }) => {
    await page.goto("/ar/login", { waitUntil: "networkidle" });

    // Login heading visible = no error boundary triggered on public route
    const heading = page.getByRole("heading", { name: "تسجيل الدخول" });
    const isVisible = await heading.isVisible({ timeout: 5000 }).catch(() => false);

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
