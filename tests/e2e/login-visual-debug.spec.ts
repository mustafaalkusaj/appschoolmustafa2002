import { test, expect } from "@playwright/test";

test("Login page visual check - ar/login?next", async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];
  const failedReqs: string[] = [];

  page.on("console", (msg) => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
    if (msg.type() === "error") errors.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on("pageerror", (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });

  page.on("requestfailed", (req) => {
    failedReqs.push(`${req.url()} - ${req.failure()?.errorText}`);
  });

  console.log("\n========== LOGIN /ar/login?next=%2Far ==========");

  await page.goto("https://school-iraq.com/ar/login?next=%2Far", {
    waitUntil: "domcontentloaded",
    timeout: 15000
  });

  // Wait for any late-rendering
  await page.waitForTimeout(5000);

  // Get visual content
  const bodyText = await page.locator("body").innerText();
  const inputCount = await page.locator("input").count();
  const buttonCount = await page.locator("button").count();
  const formCount = await page.locator("form").count();
  const divCount = await page.locator("div").count();

  console.log("URL:", page.url());
  console.log("Title:", await page.title());
  console.log("Body text length:", bodyText.length);
  console.log("Inputs found:", inputCount);
  console.log("Buttons found:", buttonCount);
  console.log("Forms found:", formCount);
  console.log("Divs found:", divCount);
  console.log("\nBody text sample (first 500 chars):");
  console.log(bodyText.slice(0, 500));

  console.log("\n--- Console Logs ---");
  logs.forEach(log => console.log(log));

  if (errors.length > 0) {
    console.log("\n--- ERRORS FOUND ---");
    errors.forEach(err => console.log(err));
  }

  if (failedReqs.length > 0) {
    console.log("\n--- FAILED REQUESTS ---");
    failedReqs.forEach(req => console.log(req));
  }

  await page.screenshot({ path: "login-ar-debug.png", fullPage: true });
  console.log("\nScreenshot saved: login-ar-debug.png");

  console.log("\n--- VERDICT ---");
  if (bodyText.length === 0) {
    console.log("❌ BLANK PAGE - Body text is empty");
  } else if (inputCount === 0 && buttonCount === 0) {
    console.log("❌ BLANK PAGE - No inputs or buttons (empty UI)");
  } else {
    console.log("✅ LOGIN FORM VISIBLE - Inputs:", inputCount, "Buttons:", buttonCount);
  }
});

test("Login page /ar/login", async ({ page }) => {
  console.log("\n========== LOGIN /ar/login ==========");

  await page.goto("https://school-iraq.com/ar/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const bodyText = await page.locator("body").innerText();
  const inputCount = await page.locator("input").count();

  console.log("Body text length:", bodyText.length);
  console.log("Inputs:", inputCount);
  console.log(bodyText.length > 0 ? "✅ RENDERS" : "❌ BLANK");

  await page.screenshot({ path: "login-ar-simple.png", fullPage: true });
});

test("Login page /en/login", async ({ page }) => {
  console.log("\n========== LOGIN /en/login ==========");

  await page.goto("https://school-iraq.com/en/login", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const bodyText = await page.locator("body").innerText();
  const inputCount = await page.locator("input").count();

  console.log("Body text length:", bodyText.length);
  console.log("Inputs:", inputCount);
  console.log(bodyText.length > 0 ? "✅ RENDERS" : "❌ BLANK");

  await page.screenshot({ path: "login-en-simple.png", fullPage: true });
});
