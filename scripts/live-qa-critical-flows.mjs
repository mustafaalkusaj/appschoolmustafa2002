import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3000";
const OUTPUT_DIR = "/Users/musatafa/school-app/output/playwright/critical-flows";
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");
const REPORT_PATH = path.join(OUTPUT_DIR, "critical-flow-audit.json");

const CREDENTIALS = {
  admin: {
    email: process.env.PW_ADMIN_EMAIL ?? "admin@schoolapp.com",
    password: process.env.PW_ADMIN_PASSWORD ?? "Admin@12345",
  },
  super_admin: {
    email: process.env.PW_SUPER_ADMIN_EMAIL ?? "super.admin@schoolapp.com",
    password: process.env.PW_SUPER_ADMIN_PASSWORD ?? "Owner@12345",
  },
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function ensureDirs() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function writeReport(report) {
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function installHooks(page) {
  page.on("dialog", async (dialog) => {
    try {
      await dialog.dismiss();
    } catch {}
  });

  await page.addInitScript(() => {
    const win = window;
    win.__qaCriticalAudit = {
      printCalls: [],
      openedUrls: [],
      confirmMessages: [],
    };

    const originalPrint = window.print.bind(window);
    window.print = () => {
      win.__qaCriticalAudit.printCalls.push({
        href: window.location.href,
        at: Date.now(),
      });
      return originalPrint();
    };

    const originalOpen = window.open.bind(window);
    window.open = (...args) => {
      win.__qaCriticalAudit.openedUrls.push(String(args[0] ?? ""));
      return originalOpen(...args);
    };

    window.confirm = (message) => {
      win.__qaCriticalAudit.confirmMessages.push(String(message ?? ""));
      return false;
    };
  });
}

async function login(page, role, locale) {
  const credentials = CREDENTIALS[role];
  const loginUrl = `${BASE_URL}/${locale}/login`;

  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  const submitButton = page.getByRole("button", {
    name: locale === "en" ? "Sign in" : "تسجيل الدخول",
  });

  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await emailInput.click();
  await page.keyboard.press("Meta+A").catch(() => undefined);
  await page.keyboard.type(credentials.email, { delay: 25 });

  await passwordInput.click();
  await page.keyboard.press("Meta+A").catch(() => undefined);
  await page.keyboard.type(credentials.password, { delay: 25 });

  await page.waitForFunction(() => {
    const button = document.querySelector('button[type="submit"]');
    return button instanceof HTMLButtonElement ? !button.disabled : false;
  });

  await submitButton.click();
  const expectedUrl =
    role === "super_admin"
      ? new RegExp(`/${locale}/super-admin(?:\\?.*)?$`)
      : new RegExp(`/${locale}/dashboard(?:\\?.*)?$`);

  await page.waitForURL(expectedUrl, { timeout: 20_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await delay(750);

  return {
    landingUrl: page.url(),
    pageTitle: await page.title(),
  };
}

async function readHookSnapshot(page) {
  return page.evaluate(() => {
    const payload = window.__qaCriticalAudit ?? {
      printCalls: [],
      openedUrls: [],
      confirmMessages: [],
    };

    return {
      printCalls: Array.isArray(payload.printCalls) ? [...payload.printCalls] : [],
      openedUrls: Array.isArray(payload.openedUrls) ? [...payload.openedUrls] : [],
      confirmMessages: Array.isArray(payload.confirmMessages) ? [...payload.confirmMessages] : [],
    };
  });
}

function diffHooks(before, after) {
  return {
    printCalls: after.printCalls.slice(before.printCalls.length),
    openedUrls: after.openedUrls.slice(before.openedUrls.length),
    confirmMessages: after.confirmMessages.slice(before.confirmMessages.length),
  };
}

async function runStep(page, role, locale, name, action) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedResponses = [];
  const notes = [];

  const onConsole = (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text().trim());
    }
  };
  const onPageError = (error) => {
    pageErrors.push(error.message);
  };
  const onResponse = (response) => {
    if (response.status() >= 400) {
      failedResponses.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      });
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);

  const beforeHooks = await readHookSnapshot(page);
  let passed = true;
  let error = null;

  try {
    const result = await action(notes);
    if (typeof result === "string" && result.trim()) {
      notes.push(result.trim());
    }
  } catch (stepError) {
    passed = false;
    error = stepError instanceof Error ? stepError.message : String(stepError);
  }

  await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {
    notes.push("networkidle timeout");
  });
  await delay(900);

  const afterHooks = await readHookSnapshot(page);
  const hookDelta = diffHooks(beforeHooks, afterHooks);
  const screenshotPath = path.join(SCREENSHOT_DIR, `${role}-${locale}-${slugify(name)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const pageMeta = await page.evaluate(() => ({
    url: window.location.href,
    title: document.title,
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    documentDir:
      document.documentElement.getAttribute("dir") ??
      document.body.getAttribute("dir") ??
      document.querySelector("[dir]")?.getAttribute("dir") ??
      null,
    htmlLang: document.documentElement.getAttribute("lang"),
    bodySnippet: document.body.innerText.slice(0, 500),
  }));

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);

  return {
    role,
    locale,
    name,
    passed,
    error,
    finalUrl: pageMeta.url,
    heading: pageMeta.heading,
    title: pageMeta.title,
    documentDir: pageMeta.documentDir,
    htmlLang: pageMeta.htmlLang,
    bodySnippet: pageMeta.bodySnippet,
    notes,
    hookDelta,
    consoleErrors,
    pageErrors,
    failedResponses,
    screenshotPath,
  };
}

async function gotoAppRoute(page, locale, route) {
  await page.goto(`${BASE_URL}/${locale}${route}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await delay(900);
}

async function clickButtonByText(page, text, index = 0) {
  await page.getByRole("button", { name: text }).nth(index).click();
}

async function waitForPrintFrame(page, timeoutMs = 4_000) {
  return page.evaluate(
    (timeout) =>
      new Promise((resolve) => {
        const selector = 'iframe[title="print-preview"]';
        const baseline = document.querySelectorAll(selector).length;
        const observer = new MutationObserver(() => {
          if (document.querySelectorAll(selector).length > baseline) {
            observer.disconnect();
            resolve(true);
          }
        });

        observer.observe(document.body, { childList: true, subtree: true });
        window.setTimeout(() => {
          observer.disconnect();
          resolve(document.querySelectorAll(selector).length > baseline);
        }, timeout);
      }),
    timeoutMs,
  );
}

async function runAdminFlows(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  await installHooks(page);

  const steps = [];

  await gotoAppRoute(page, "ar", "/login");
  steps.push(
    await runStep(page, "admin", "ar", "login-ar", async () => {
      const result = await login(page, "admin", "ar");
      return `landing=${result.landingUrl}`;
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "dashboard-locale-switch", async () => {
      await gotoAppRoute(page, "ar", "/dashboard");
      await page.getByRole("button", { name: /English|الإنجليزية/ }).first().click();
      await page.waitForURL(/\/en\/dashboard(?:\?.*)?$/, { timeout: 15_000 });
      await page.getByRole("button", { name: /العربية|Arabic/ }).first().click();
      await page.waitForURL(/\/ar\/dashboard(?:\?.*)?$/, { timeout: 15_000 });
      return "verified Arabic to English and back";
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "dashboard-retry-widget", async (notes) => {
      await gotoAppRoute(page, "ar", "/dashboard");
      const retryButton = page.getByRole("button", { name: /إعادة المحاولة/ }).first();
      if (await retryButton.isVisible().catch(() => false)) {
        await retryButton.click();
        await delay(1_500);
        if (await page.getByText(/تعذر|خطأ/).first().isVisible().catch(() => false)) {
          notes.push("dashboard error copy remains visible after retry");
        }
      } else {
        notes.push("retry button not visible");
      }
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "students-add-modal", async () => {
      await gotoAppRoute(page, "ar", "/students");
      await page.getByRole("button", { name: /^\+ إضافة طالب$/ }).click();
      await page.locator("#full_name").waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: /إغلاق|إلغاء/ }).first().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "students-print-filtered", async (notes) => {
      await gotoAppRoute(page, "ar", "/students");
      const printWatcher = waitForPrintFrame(page);
      const button = page.getByRole("button", { name: /طباعة الطلاب المفلترين/ }).first();
      await button.click();
      const printed = await printWatcher;
      if (!printed) {
        notes.push("no print preview iframe was detected");
      }
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "students-edit-first-row", async () => {
      await gotoAppRoute(page, "ar", "/students");
      await page.locator('button[aria-label*="خيارات"]').first().click();
      await page.getByRole("button", { name: "تعديل", exact: true }).click();
      await page.locator("#edit_full_name").waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: /إغلاق|إلغاء/ }).first().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "students-delete-cancel", async () => {
      await gotoAppRoute(page, "ar", "/students");
      await page.locator('button[aria-label*="خيارات"]').first().click();
      await page.getByRole("button", { name: "حذف", exact: true }).click();
      await page.getByText(/تأكيد الحذف/).first().waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: /إلغاء/ }).last().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "students-print-first-row", async (notes) => {
      await gotoAppRoute(page, "ar", "/students");
      await page.locator('button[aria-label*="خيارات"]').first().click();
      const printWatcher = waitForPrintFrame(page);
      await page.getByRole("button", { name: "طباعة", exact: true }).click();
      const printed = await printWatcher;
      if (!printed) {
        notes.push("student print action did not create a print preview iframe");
      }
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "teachers-add-modal", async () => {
      await gotoAppRoute(page, "ar", "/teachers");
      await clickButtonByText(page, "إضافة أستاذ");
      await page.getByText(/إضافة أستاذ|تعديل حساب الأستاذ/).first().waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: /إغلاق|إلغاء/ }).first().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "teachers-edit-first-row", async () => {
      await gotoAppRoute(page, "ar", "/teachers");
      await clickButtonByText(page, "تعديل");
      await page.getByText(/تعديل حساب الأستاذ|إضافة أستاذ/).first().waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: /إغلاق|إلغاء/ }).first().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "teachers-account-card-and-print", async (notes) => {
      await gotoAppRoute(page, "ar", "/teachers");
      await clickButtonByText(page, "بطاقة الدخول");
      await page.getByText(/بطاقة حساب التطبيق جاهزة/).first().waitFor({ state: "visible", timeout: 20_000 });
      const printWatcher = waitForPrintFrame(page);
      await page.getByRole("button", { name: "طباعة بطاقة الدخول" }).click();
      const printed = await printWatcher;
      if (!printed) {
        notes.push("teacher account-card print did not create a print preview iframe");
      }
      await page.getByRole("button", { name: "إغلاق" }).first().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "teachers-delete-confirm-guard", async () => {
      await gotoAppRoute(page, "ar", "/teachers");
      await clickButtonByText(page, "حذف");
      await delay(750);
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "payments-add-invoice-modal", async () => {
      await gotoAppRoute(page, "ar", "/payments");
      await page.getByRole("button", { name: /^\+ إضافة فاتورة$/ }).click();
      await page.getByText(/تسجيل دفعة جديدة/).first().waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: "إلغاء" }).click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "payments-detail-drawer", async () => {
      await gotoAppRoute(page, "ar", "/payments");
      await clickButtonByText(page, "عرض التفاصيل");
      await page.getByText(/تفاصيل الفاتورة/).first().waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: "إغلاق" }).last().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "payments-drawer-actions", async (notes) => {
      await gotoAppRoute(page, "ar", "/payments");
      await clickButtonByText(page, "عرض التفاصيل");
      await page.getByText(/تفاصيل الفاتورة/).first().waitFor({ state: "visible", timeout: 15_000 });

      await page.getByRole("button", { name: /^\+ إضافة دفعة$/ }).click();
      await page.getByText(/تسجيل دفعة جديدة/).first().waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: "إلغاء" }).click();
      await delay(750);

      const receiptButton = page.getByRole("button", { name: "طباعة الإيصال" }).first();
      if (await receiptButton.isVisible().catch(() => false)) {
        const printWatcher = waitForPrintFrame(page);
        await receiptButton.click();
        const printed = await printWatcher;
        if (!printed) {
          notes.push("payment receipt print did not create a print preview iframe");
        }
      } else {
        notes.push("no stored payment row was visible in the selected student drawer");
      }

      const deleteButton = page.getByRole("button", { name: "حذف الدفعة" }).first();
      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        await page.getByText(/حذف الدفعة|تأكيد|سيتم حذف الدفعة/).first().waitFor({ state: "visible", timeout: 10_000 });
        await page.getByRole("button", { name: "إلغاء" }).last().click();
      } else {
        notes.push("no payment-delete button was visible in the selected student drawer");
      }

      await page.getByRole("button", { name: "إغلاق" }).last().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "salaries-add-teacher-modal", async () => {
      await gotoAppRoute(page, "ar", "/salaries");
      await clickButtonByText(page, "إضافة أستاذ");
      await page.getByText(/إضافة أستاذ|تعديل بيانات الأستاذ/).first().waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: /إغلاق|إلغاء/ }).first().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "salaries-print-options", async (notes) => {
      await gotoAppRoute(page, "ar", "/salaries");
      await clickButtonByText(page, "خيارات الطباعة");
      await page.getByText(/خيارات الطباعة/).first().waitFor({ state: "visible", timeout: 15_000 });
      const printWatcher = waitForPrintFrame(page);
      await page.getByRole("button", { name: "طباعة التقرير الشامل" }).click();
      const printed = await printWatcher;
      if (!printed) {
        notes.push("salaries print-all action did not create a print preview iframe");
      }
      await page.getByRole("button", { name: "إغلاق" }).last().click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "salaries-pay-modal", async () => {
      await gotoAppRoute(page, "ar", "/salaries");
      await clickButtonByText(page, "دفع");
      await page.getByText(/دفع راتب/).first().waitFor({ state: "visible", timeout: 15_000 });
      await page.getByRole("button", { name: "إلغاء" }).click();
    }),
  );

  steps.push(
    await runStep(page, "admin", "ar", "reports-print-summary", async (notes) => {
      await gotoAppRoute(page, "ar", "/reports");
      const printWatcher = waitForPrintFrame(page);
      await page.getByRole("button", { name: "طباعة الملخص" }).click();
      const printed = await printWatcher;
      if (!printed) {
        notes.push("reports summary print did not create a print preview iframe");
      }
    }),
  );

  steps.push(
    await runStep(page, "admin", "en", "login-en", async () => {
      await page.context().clearCookies();
      const result = await login(page, "admin", "en");
      return `landing=${result.landingUrl}`;
    }),
  );

  steps.push(
    await runStep(page, "admin", "en", "english-expenses-localization", async (notes) => {
      await gotoAppRoute(page, "en", "/expenses");
      const heading = (await page.locator("h1").first().textContent())?.trim() ?? "";
      if (/[ء-ي]/.test(heading)) {
        notes.push(`english route heading still Arabic: ${heading}`);
      }
    }),
  );

  await context.close();
  return steps;
}

async function runSuperAdminFlows(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();
  await installHooks(page);

  const steps = [];

  steps.push(
    await runStep(page, "super_admin", "ar", "login-ar", async () => {
      const result = await login(page, "super_admin", "ar");
      return `landing=${result.landingUrl}`;
    }),
  );

  steps.push(
    await runStep(page, "super_admin", "ar", "super-admin-home", async () => {
      await gotoAppRoute(page, "ar", "/super-admin");
    }),
  );

  steps.push(
    await runStep(page, "super_admin", "ar", "schools-page", async () => {
      await gotoAppRoute(page, "ar", "/schools");
    }),
  );

  steps.push(
    await runStep(page, "super_admin", "ar", "subscriptions-page", async () => {
      await gotoAppRoute(page, "ar", "/subscriptions");
    }),
  );

  steps.push(
    await runStep(page, "super_admin", "en", "login-en", async () => {
      await page.context().clearCookies();
      const result = await login(page, "super_admin", "en");
      return `landing=${result.landingUrl}`;
    }),
  );

  steps.push(
    await runStep(page, "super_admin", "en", "english-schools-localization", async (notes) => {
      await gotoAppRoute(page, "en", "/schools");
      const heading = (await page.locator("h1").first().textContent())?.trim() ?? "";
      if (/[ء-ي]/.test(heading)) {
        notes.push(`english route heading still Arabic: ${heading}`);
      }
    }),
  );

  await context.close();
  return steps;
}

async function main() {
  await ensureDirs();

  const browser = await chromium.launch({ headless: true });

  try {
    const adminSteps = await runAdminFlows(browser);
    const superAdminSteps = await runSuperAdminFlows(browser);

    const report = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      stepCount: adminSteps.length + superAdminSteps.length,
      steps: [...adminSteps, ...superAdminSteps],
    };

    await writeReport(report);
    console.log(`[critical-flows] report written to ${REPORT_PATH}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
