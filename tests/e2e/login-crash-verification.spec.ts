import { test, expect } from "@playwright/test";

test("Login page loads without errors", async ({ page }) => {
  const errors: string[] = [];
  const pageErrors: Error[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err);
  });

  // Navigate to login
  await page.goto("https://school-iraq.com/ar/login", { waitUntil: "load" });

  // Wait for any dynamic imports
  await page.waitForTimeout(1000);

  // Check for error messages
  const errorBoundary = await page.locator("text=/حدث خطأ حرج|Critical Error/").count();

  console.log("Console Errors:", errors);
  console.log("Page Errors:", pageErrors);
  console.log("Error Boundary Count:", errorBoundary);

  // Assertions
  expect(pageErrors).toHaveLength(0);
  expect(errors).toHaveLength(0);
  expect(errorBoundary).toBe(0);

  // Check that login form elements exist
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const formText = await page.locator("text=/تسجيل الدخول|Sign In|Login/").count();

  console.log("Form elements found:", await emailInput.count());
  console.log("Form text count:", formText);

  expect(formText).toBeGreaterThan(0);
});

test("Login page with redirect query works", async ({ page }) => {
  const pageErrors: Error[] = [];

  page.on("pageerror", (err) => {
    pageErrors.push(err);
  });

  await page.goto("https://school-iraq.com/ar/login?next=%2Far", { waitUntil: "load" });
  await page.waitForTimeout(500);

  expect(pageErrors).toHaveLength(0);
});

test("English login page loads", async ({ page }) => {
  const pageErrors: Error[] = [];

  page.on("pageerror", (err) => {
    pageErrors.push(err);
  });

  await page.goto("https://school-iraq.com/en/login", { waitUntil: "load" });
  await page.waitForTimeout(500);

  expect(pageErrors).toHaveLength(0);
});
