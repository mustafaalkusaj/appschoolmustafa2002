import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3000";
const OUTPUT_DIR = "./output/playwright/print-audit";
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");
const REPORT_PATH = path.join(OUTPUT_DIR, "print-audit.json");

const ADMIN_EMAIL = process.env.PW_ADMIN_EMAIL ?? "admin@schoolapp.com";
const ADMIN_PASSWORD = process.env.PW_ADMIN_PASSWORD ?? "Admin@12345";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDirs() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function login(page, locale = "ar") {
  console.log(`[print-audit] Logging in to ${BASE_URL}/${locale}/login...`);
  await page.goto(`${BASE_URL}/${locale}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  
  await emailInput.waitFor({ state: "visible", timeout: 15_000 });
  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);

  const submitButton = page.locator('button[type="submit"]');
  await submitButton.waitFor({ state: "visible" });
  
  // Wait for button to be enabled if it has loading state
  await page.waitForFunction(() => {
    const btn = document.querySelector('button[type="submit"]');
    return btn && !btn.disabled;
  }, { timeout: 10_000 }).catch(() => console.log("[print-audit] Submit button still disabled, trying anyway..."));

  await submitButton.click();
  
  // Wait for dashboard redirect
  await page.waitForURL(new RegExp(`/${locale}/dashboard`), { timeout: 20_000 });
  console.log("[print-audit] Login successful.");
  await delay(2000); // Allow dashboard to settle
}

function beginPrintPreviewWait(page) {
  console.log("[print-audit] Waiting for print-preview iframe...");
  return page.waitForSelector('iframe[title="print-preview"]', {
    state: "attached",
    timeout: 30_000,
  });
}

async function capturePrintPreview(frameHandlePromise, context, slug) {
  const frameHandle = await frameHandlePromise;
  const frame = frameHandle.contentFrame();
  if (!frame) {
    throw new Error("print preview iframe did not expose a content frame");
  }

  console.log(`[print-audit] Capturing preview for ${slug}...`);
  // Wait for some content to be present in the body
  await frame.waitForSelector("body", { state: "visible", timeout: 15_000 });
  
  // Ensure the print-shell or some content is rendered
  await frame.waitForSelector(".print-shell, table, .print-panel", { state: "visible", timeout: 10_000 })
    .catch(() => console.log(`[print-audit] Warning: Specific print elements not found for ${slug}, capturing body anyway.`));

  await delay(1500); // Extra time for fonts and layout

  const html = await frame.content();
  const text = await frame.locator("body").innerText().catch(() => "");
  
  const previewPage = await context.newPage({ 
    viewport: { width: 1240, height: 1754 },
    bypassCSP: true
  });

  try {
    await previewPage.setContent(html, { waitUntil: "networkidle", timeout: 20_000 });
    await delay(1000);
    const screenshotPath = path.join(SCREENSHOT_DIR, `${slug}.png`);
    await previewPage.screenshot({ path: screenshotPath, fullPage: true });

    await fs.writeFile(path.join(OUTPUT_DIR, `${slug}.html`), html, "utf8");
    await fs.writeFile(path.join(OUTPUT_DIR, `${slug}.txt`), `${text}\n`, "utf8");

    console.log(`[print-audit] Captured ${slug} successfully.`);
    return {
      screenshotPath,
      htmlPath: path.join(OUTPUT_DIR, `${slug}.html`),
      textPath: path.join(OUTPUT_DIR, `${slug}.txt`),
      textSample: text.slice(0, 500),
    };
  } finally {
    await previewPage.close();
  }
}

async function withRetry(fn, maxAttempts = 2) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`[print-audit] Attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxAttempts) await delay(3000);
    }
  }
  throw lastError;
}

async function auditTeacherAccountCard(page, context) {
  console.log("[print-audit] Auditing Teacher Account Card...");
  await page.goto(`${BASE_URL}/ar/teachers`, { waitUntil: "networkidle", timeout: 30_000 });
  
  // Find the first "بطاقة الدخول" button in the table
  const cardBtn = page.getByRole("button", { name: "بطاقة الدخول" }).first();
  await cardBtn.waitFor({ state: "visible", timeout: 15_000 });
  await cardBtn.click();
  
  // Wait for modal to appear
  await page.waitForSelector("text=بطاقة حساب التطبيق جاهزة", { timeout: 20_000 });
  
  const frameHandlePromise = beginPrintPreviewWait(page);
  await page.getByRole("button", { name: "طباعة بطاقة الدخول" }).click();
  
  return capturePrintPreview(frameHandlePromise, context, "teacher-account-card");
}

async function auditReportsSummary(page, context) {
  console.log("[print-audit] Auditing Reports Summary...");
  await page.goto(`${BASE_URL}/ar/reports`, { waitUntil: "networkidle", timeout: 30_000 });
  
  const frameHandlePromise = beginPrintPreviewWait(page);
  const printBtn = page.getByRole("button", { name: "طباعة الملخص" });
  await printBtn.waitFor({ state: "visible", timeout: 15_000 });
  await printBtn.click();
  
  return capturePrintPreview(frameHandlePromise, context, "reports-summary");
}

async function auditSalariesSummary(page, context) {
  console.log("[print-audit] Auditing Salaries Summary...");
  await page.goto(`${BASE_URL}/ar/salaries`, { waitUntil: "networkidle", timeout: 30_000 });
  
  const optionsBtn = page.getByRole("button", { name: "خيارات الطباعة" });
  await optionsBtn.waitFor({ state: "visible" });
  await optionsBtn.click();
  
  await page.waitForSelector("text=خيارات الطباعة", { timeout: 15_000 });
  
  const frameHandlePromise = beginPrintPreviewWait(page);
  const printAllBtn = page.getByRole("button", { name: "طباعة التقرير الشامل" });
  await printAllBtn.click();
  
  return capturePrintPreview(frameHandlePromise, context, "salaries-all-teachers");
}

async function auditStudentsFiltered(page, context) {
  console.log("[print-audit] Auditing Students Filtered...");
  await page.goto(`${BASE_URL}/ar/students`, { waitUntil: "networkidle", timeout: 30_000 });
  
  const frameHandlePromise = beginPrintPreviewWait(page);
  
  // Use a more robust selector that finds the button even with hidden spans
  const printBtn = page.locator('button:has-text("طباعة الطلاب المفلترين")');
  await printBtn.waitFor({ state: "visible", timeout: 15_000 });
  await printBtn.click();
  
  return capturePrintPreview(frameHandlePromise, context, "students-filtered");
}

async function attemptCapture(fn) {
  try {
    const result = await withRetry(fn);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  console.log("[print-audit] Starting audit...");
  await ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ 
    viewport: { width: 1440, height: 960 },
    locale: "ar-IQ"
  });
  const page = await context.newPage();

  try {
    await login(page, "ar");

    const report = {
      generatedAt: new Date().toISOString(),
      captures: {
        teacherAccountCard: await attemptCapture(() => auditTeacherAccountCard(page, context)),
        reportsSummary: await attemptCapture(() => auditReportsSummary(page, context)),
        salariesAllTeachers: await attemptCapture(() => auditSalariesSummary(page, context)),
        studentsFiltered: await attemptCapture(() => auditStudentsFiltered(page, context)),
      },
    };

    const finalPath = path.resolve(REPORT_PATH);
    await fs.mkdir(path.dirname(finalPath), { recursive: true });
    await fs.writeFile(finalPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`[print-audit] Audit completed. Report written to ${finalPath}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error("[print-audit] Fatal error:", error);
  process.exit(1);
});
