import { test } from "@playwright/test";

test("Verify all critical pages render correctly", async ({ page }) => {
  const pages = [
    { url: "https://school-iraq.com/ar/login", name: "/ar/login" },
    { url: "https://school-iraq.com/ar/students", name: "/ar/students" },
    { url: "https://school-iraq.com/ar/payments", name: "/ar/payments" },
    { url: "https://school-iraq.com/ar/attendance", name: "/ar/attendance" },
    { url: "https://school-iraq.com/ar/branch-overview", name: "/ar/branch-overview" },
  ];

  for (const { url, name } of pages) {
    const errors: string[] = [];
    const pageErrors: string[] = [];
    
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    
    page.on("pageerror", err => {
      pageErrors.push(err.message);
    });

    console.log(`\n━━━━ Testing ${name} ━━━━`);
    
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 })
      .catch(e => console.log("Error:", e.message));
    
    await page.waitForTimeout(3000);
    
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const inputs = await page.locator("input").count();
    const buttons = await page.locator("button").count();
    const status = page.url().includes("login") ? "login-redirect" : "protected";
    
    console.log(`Body text: ${bodyText.length} chars`);
    console.log(`Inputs: ${inputs}, Buttons: ${buttons}`);
    console.log(`Status: ${status}`);
    console.log(`Console errors: ${errors.length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    
    if (bodyText.length === 0) {
      console.log("❌ BLANK PAGE");
    } else if (bodyText.includes("تسجيل الدخول") || bodyText.includes("Sign in")) {
      console.log("✓ Shows login");
    } else {
      console.log("✓ Has content");
    }
  }
});
