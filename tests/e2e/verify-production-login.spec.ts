import { test, expect } from "@playwright/test";

// Test all 3 login page variants post-deployment
test.describe("Production Login Pages Verification", () => {
  test("1. /ar/login renders login form correctly", async ({ page }) => {
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

    // Navigate to production domain
    await page.goto("https://school-iraq.com/ar/login", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    // Get visual content
    const bodyText = await page.locator("body").innerText();
    const inputCount = await page.locator("input").count();
    const emailInput = page.locator("input[type='email'], input[name='email'], #email");
    const passwordInput = page.locator("input[type='password'], input[name='password'], #password");
    const submitButton = page.getByRole("button", { name: /تسجيل الدخول|Sign in|Login/i });

    console.log("\n========== /ar/login ==========");
    console.log("Body text length:", bodyText.length);
    console.log("Total inputs found:", inputCount);
    console.log("Email input count:", await emailInput.count());
    console.log("Password input count:", await passwordInput.count());
    console.log("Submit button count:", await submitButton.count());
    console.log("Page errors:", pageErrors.length);
    console.log("Console errors:", errors.length);

    // Take screenshot
    await page.screenshot({ path: "production-ar-login.png", fullPage: true });
    console.log("Screenshot saved: production-ar-login.png");

    // Assertions
    expect(bodyText.length).toBeGreaterThan(100);
    expect(inputCount).toBeGreaterThanOrEqual(2);
    expect(pageErrors).toHaveLength(0);
    expect(errors).toHaveLength(0);
    expect(await emailInput.count()).toBeGreaterThan(0);
    expect(await submitButton.count()).toBeGreaterThan(0);

    console.log("✅ /ar/login PASSED - Login form rendered correctly");
  });

  test("2. /ar/login?next=%2Far renders with query parameter", async ({ page }) => {
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

    await page.goto("https://school-iraq.com/ar/login?next=%2Far", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").innerText();
    const inputCount = await page.locator("input").count();
    const emailInput = page.locator("#email");

    console.log("\n========== /ar/login?next=%2Far ==========");
    console.log("Body text length:", bodyText.length);
    console.log("Total inputs found:", inputCount);
    console.log("Page errors:", pageErrors.length);
    console.log("Console errors:", errors.length);

    await page.screenshot({ path: "production-ar-login-with-next.png", fullPage: true });
    console.log("Screenshot saved: production-ar-login-with-next.png");

    // Assertions
    expect(bodyText.length).toBeGreaterThan(100);
    expect(inputCount).toBeGreaterThanOrEqual(2);
    expect(pageErrors).toHaveLength(0);
    expect(errors).toHaveLength(0);
    expect(await emailInput.count()).toBeGreaterThan(0);

    console.log("✅ /ar/login?next=%2Far PASSED - Query parameter handling works");
  });

  test("3. /en/login renders login form in English", async ({ page }) => {
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

    await page.goto("https://school-iraq.com/en/login", { waitUntil: "load" });
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").innerText();
    const inputCount = await page.locator("input").count();
    const emailInput = page.locator("#email");
    const submitButton = page.getByRole("button", { name: /Sign in|تسجيل الدخول|Login/i });

    console.log("\n========== /en/login ==========");
    console.log("Body text length:", bodyText.length);
    console.log("Total inputs found:", inputCount);
    console.log("Page errors:", pageErrors.length);
    console.log("Console errors:", errors.length);

    await page.screenshot({ path: "production-en-login.png", fullPage: true });
    console.log("Screenshot saved: production-en-login.png");

    // Assertions
    expect(bodyText.length).toBeGreaterThan(100);
    expect(inputCount).toBeGreaterThanOrEqual(2);
    expect(pageErrors).toHaveLength(0);
    expect(errors).toHaveLength(0);
    expect(await emailInput.count()).toBeGreaterThan(0);
    expect(await submitButton.count()).toBeGreaterThan(0);

    console.log("✅ /en/login PASSED - English login form rendered correctly");
  });
});
