import { test } from "@playwright/test";

test("Debug: /ar/branch-overview blank page issue", async ({ page }) => {
  const errors: string[] = [];
  const pageErrors: string[] = [];
  const failedReqs: string[] = [];
  const badResponses: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  page.on("requestfailed", (req) => {
    failedReqs.push(`${req.url()} - ${req.failure()?.errorText}`);
  });

  page.on("response", (res) => {
    if (res.status() >= 400) {
      badResponses.push(`${res.status()} ${res.url()}`);
    }
  });

  console.log("\n━━━━ Opening /ar/branch-overview ━━━━");
  await page.goto("https://school-iraq.com/ar/branch-overview", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  }).catch(e => console.log("Goto error:", e.message));

  await page.waitForTimeout(8000);

  const url = page.url();
  const title = await page.title();
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const htmlLength = (await page.content()).length;
  const inputs = await page.locator("input").count();
  const buttons = await page.locator("button").count();
  const headings = await page.locator("h1,h2,h3").count();

  console.log("\n━━━━ PAGE STATE ━━━━");
  console.log("URL:", url);
  console.log("Title:", title);
  console.log("Body text length:", bodyText.length);
  console.log("HTML length:", htmlLength);
  console.log("Inputs:", inputs);
  console.log("Buttons:", buttons);
  console.log("Headings:", headings);

  if (bodyText.length > 0) {
    console.log("\nBody text (first 500 chars):", bodyText.slice(0, 500));
  }

  console.log("\n━━━━ ERRORS ━━━━");
  console.log("Console errors:", errors.length > 0 ? errors : "none");
  console.log("Page errors:", pageErrors.length > 0 ? pageErrors : "none");
  console.log("Failed requests:", failedReqs.length > 0 ? failedReqs : "none");
  console.log("Bad responses:", badResponses.length > 0 ? badResponses : "none");

  await page.screenshot({ path: "branch-overview-debug.png", fullPage: true });
  console.log("\nScreenshot saved: branch-overview-debug.png");

  console.log("\n━━━━ VERDICT ━━━━");
  if (bodyText.length === 0 && htmlLength < 1000) {
    console.log("❌ BLANK PAGE - Minimal HTML, empty body");
  } else if (bodyText.includes("تسجيل الدخول") || bodyText.includes("Sign in")) {
    console.log("✓ LOGIN REDIRECT - Page shows login form");
  } else if (bodyText.includes("dashboard") || bodyText.includes("لوحة")) {
    console.log("✓ DASHBOARD CONTENT - Dashboard rendered");
  } else if (url.includes("login")) {
    console.log("✓ REDIRECTED TO LOGIN - URL changed");
  } else {
    console.log("⚠️ UNEXPECTED STATE - Body present but unknown content");
  }
});
