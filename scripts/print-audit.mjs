import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3000";
const OUTPUT_DIR = "/Users/musatafa/school-app/output/playwright/print-audit";
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
  await page.goto(`${BASE_URL}/${locale}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  const submitButton = page.getByRole("button", {
    name: locale === "en" ? "Sign in" : "تسجيل الدخول",
  });

  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await emailInput.click();
  await page.keyboard.press("Meta+A").catch(() => undefined);
  await page.keyboard.type(ADMIN_EMAIL, { delay: 25 });

  await passwordInput.click();
  await page.keyboard.press("Meta+A").catch(() => undefined);
  await page.keyboard.type(ADMIN_PASSWORD, { delay: 25 });

  await page.waitForFunction(() => {
    const button = document.querySelector('button[type="submit"]');
    return button instanceof HTMLButtonElement ? !button.disabled : false;
  });

  await submitButton.click();
  await page.waitForURL(new RegExp(`/${locale}/dashboard(?:\\?.*)?$`), { timeout: 20_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
}

function beginPrintPreviewWait(page) {
  return page.waitForSelector('iframe[title="print-preview"]', {
    state: "attached",
    timeout: 6_000,
  });
}

async function capturePrintPreview(frameHandlePromise, context, slug) {
  const frameHandle = await frameHandlePromise;
  let frame = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    frame = await frameHandle.contentFrame();
    if (frame) break;
    await delay(200);
  }
  if (!frame) {
    throw new Error("print preview iframe did not expose a content frame");
  }

  await frame.locator("body").waitFor({ state: "visible", timeout: 6_000 }).catch(() => undefined);
  await delay(750);

  const html = await frame.content();
  const text = await frame.locator("body").innerText().catch(() => "");
  const previewPage = await context.newPage({ viewport: { width: 1240, height: 1754 } });

  try {
    await previewPage.setContent(html, { waitUntil: "load", timeout: 10_000 });
    await delay(500);
    const screenshotPath = path.join(SCREENSHOT_DIR, `${slug}.png`);
    await previewPage.screenshot({ path: screenshotPath, fullPage: true });

    await fs.writeFile(path.join(OUTPUT_DIR, `${slug}.html`), html, "utf8");
    await fs.writeFile(path.join(OUTPUT_DIR, `${slug}.txt`), `${text}\n`, "utf8");

    return {
      screenshotPath,
      htmlPath: path.join(OUTPUT_DIR, `${slug}.html`),
      textPath: path.join(OUTPUT_DIR, `${slug}.txt`),
      textSample: text.slice(0, 800),
    };
  } finally {
    await previewPage.close();
  }
}

async function auditTeacherAccountCard(page, context) {
  await page.goto(`${BASE_URL}/ar/teachers`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await page.getByRole("button", { name: "بطاقة الدخول" }).first().click();
  await page.getByText(/بطاقة حساب التطبيق جاهزة/).first().waitFor({ state: "visible", timeout: 20_000 });
  const frameHandlePromise = beginPrintPreviewWait(page);
  await page.getByRole("button", { name: "طباعة بطاقة الدخول" }).click();
  return capturePrintPreview(frameHandlePromise, context, "teacher-account-card");
}

async function auditReportsSummary(page, context) {
  await page.goto(`${BASE_URL}/ar/reports`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  const frameHandlePromise = beginPrintPreviewWait(page);
  await page.getByRole("button", { name: "طباعة الملخص" }).click();
  return capturePrintPreview(frameHandlePromise, context, "reports-summary");
}

async function auditSalariesSummary(page, context) {
  await page.goto(`${BASE_URL}/ar/salaries`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await page.getByRole("button", { name: "خيارات الطباعة" }).click();
  await page.getByText(/خيارات الطباعة/).first().waitFor({ state: "visible", timeout: 15_000 });
  const frameHandlePromise = beginPrintPreviewWait(page);
  await page.getByRole("button", { name: "طباعة التقرير الشامل" }).click();
  return capturePrintPreview(frameHandlePromise, context, "salaries-all-teachers");
}

async function auditStudentsFiltered(page, context) {
  await page.goto(`${BASE_URL}/ar/students`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  const frameHandlePromise = beginPrintPreviewWait(page);
  await page.getByRole("button", { name: /طباعة الطلاب المفلترين/ }).first().click();
  return capturePrintPreview(frameHandlePromise, context, "students-filtered");
}

async function attemptCapture(fn) {
  try {
    const result = await fn();
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  await ensureDirs();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  try {
    await login(page, "ar");

    const report = {
      generatedAt: new Date().toISOString(),
      captures: {
        teacherAccountCard: await attemptCapture(() =>
          auditTeacherAccountCard(page, context),
        ),
        reportsSummary: await attemptCapture(() =>
          auditReportsSummary(page, context),
        ),
        salariesAllTeachers: await attemptCapture(() =>
          auditSalariesSummary(page, context),
        ),
        studentsFiltered: await attemptCapture(() =>
          auditStudentsFiltered(page, context),
        ),
      },
    };

    await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`[print-audit] report written to ${REPORT_PATH}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
