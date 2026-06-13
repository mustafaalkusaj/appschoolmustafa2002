import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3000";
const OUTPUT_DIR = "/Users/musatafa/school-app/output/playwright/live-audit";
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");
const REPORT_PATH = path.join(OUTPUT_DIR, "live-audit.json");

const ROUTES_BY_ROLE = {
  admin: [
    "/dashboard",
    "/students",
    "/teachers",
    "/attendance",
    "/payments",
    "/expenses",
    "/salaries",
    "/reports",
    "/monitoring",
    "/fee-notifications",
    "/super-admin",
  ],
  super_admin: [
    "/super-admin",
    "/schools",
    "/subscriptions",
    "/users",
    "/dashboard",
    "/students",
    "/teachers",
    "/attendance",
    "/payments",
    "/expenses",
    "/salaries",
    "/reports",
    "/monitoring",
    "/fee-notifications",
  ],
};

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

function slugifyRoute(route) {
  return route.replace(/^\//, "").replace(/\//g, "-") || "root";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDirs() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
}

async function writeReport(report) {
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
}

async function waitForUrlMatch(page, matcher, timeoutMs = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (matcher.test(page.url())) return true;
    await delay(250);
  }
  return false;
}

async function installHooks(page) {
  page.on("dialog", async (dialog) => {
    try {
      await dialog.dismiss();
    } catch {}
  });

  await page.addInitScript(() => {
    const win = window;
    win.__qaAudit = {
      printCalls: [],
      openedUrls: [],
    };

    const originalPrint = window.print.bind(window);
    window.print = () => {
      win.__qaAudit.printCalls.push({
        href: window.location.href,
        at: Date.now(),
      });
      return originalPrint();
    };

    const originalOpen = window.open.bind(window);
    window.open = (...args) => {
      win.__qaAudit.openedUrls.push(String(args[0] ?? ""));
      return originalOpen(...args);
    };
  });
}

async function login(page, role, locale) {
  const credentials = CREDENTIALS[role];
  const loginUrl = `${BASE_URL}/${locale}/login`;
  console.log(`[audit] login ${role} ${locale} -> ${loginUrl}`);

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

  const expected =
    role === "super_admin"
      ? new RegExp(`/${locale}/super-admin(?:\\?.*)?$`)
      : new RegExp(`/${locale}/dashboard(?:\\?.*)?$`);

  const landed = await waitForUrlMatch(page, expected, 20_000);
  if (!landed) {
    throw new Error(`login did not reach expected landing page; current url=${page.url()}`);
  }

  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await delay(1_000);

  return {
    role,
    locale,
    loginUrl,
    landingUrl: page.url(),
    pageTitle: await page.title(),
  };
}

async function captureRoute(page, role, locale, route) {
  const targetUrl = `${BASE_URL}/${locale}${route}`;
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

  const startedAt = Date.now();
  console.log(`[audit] route ${role} ${locale} ${route}`);

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch (error) {
    notes.push(error instanceof Error ? error.message : String(error));
  }

  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {
    notes.push("networkidle timeout");
  });
  await delay(1_250);

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);

  const slug = slugifyRoute(route);
  const screenshotPath = path.join(SCREENSHOT_DIR, `${role}-${locale}-${slug}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });

  const meta = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const buttonLabels = Array.from(document.querySelectorAll("button"))
      .map((element) => {
        const aria = element.getAttribute("aria-label")?.trim();
        const title = element.getAttribute("title")?.trim();
        const text = element.textContent?.trim();
        return aria || title || text || "";
      })
      .filter(Boolean)
      .slice(0, 100);
    const linkTargets = Array.from(document.querySelectorAll("a"))
      .map((element) => {
        const href = element.getAttribute("href")?.trim();
        const text = element.textContent?.trim();
        if (!href) return null;
        return text ? `${text} -> ${href}` : href;
      })
      .filter(Boolean)
      .slice(0, 100);
    const textSample = document.body.innerText.slice(0, 600);

    return {
      pageTitle: document.title,
      heading: document.querySelector("h1")?.textContent?.trim() ?? null,
      htmlLang: document.documentElement.getAttribute("lang"),
      documentDir:
        document.documentElement.getAttribute("dir") ??
        document.body.getAttribute("dir") ??
        document.querySelector("[dir]")?.getAttribute("dir") ??
        null,
      textSample,
      buttonLabels,
      linkTargets,
      navigationTiming: nav && nav.toJSON ? nav.toJSON() : null,
      auditHooks: window.__qaAudit ?? null,
    };
  });

  if (meta.textSample.includes("تعذر")) {
    notes.push("visible-error-copy");
  }
  if (meta.textSample.includes("Error")) {
    notes.push("visible-english-error-copy");
  }

  return {
    role,
    locale,
    route,
    finalUrl: page.url(),
    pageTitle: meta.pageTitle,
    heading: meta.heading,
    htmlLang: meta.htmlLang,
    documentDir: meta.documentDir,
    navigationMs: Date.now() - startedAt,
    screenshotPath,
    consoleErrors,
    pageErrors,
    failedResponses,
    buttonLabels: meta.buttonLabels,
    linkTargets: meta.linkTargets,
    navigationTiming: meta.navigationTiming,
    printHooks: meta.auditHooks,
    notes,
  };
}

async function runOfflineProbe(page, context, role, locale) {
  console.log(`[audit] resilience ${role} ${locale} offline reload`);
  await page.goto(`${BASE_URL}/${locale}/dashboard`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await delay(750);

  let reloadError = null;
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 8_000 });
  } catch (error) {
    reloadError = error instanceof Error ? error.message : String(error);
  }

  await delay(750);
  const snapshot = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    textSample: document.body.innerText.slice(0, 400),
  }));
  await context.setOffline(false);

  return {
    role,
    locale,
    scenario: "offline-reload-dashboard",
    finalUrl: page.url(),
    reloadError,
    heading: snapshot.heading,
    visibleTextSample: snapshot.textSample,
  };
}

async function main() {
  await ensureDirs();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    auth: [],
    routes: [],
    resilience: [],
  };

  const browser = await chromium.launch({ headless: true });

  try {
    for (const role of ["admin", "super_admin"]) {
      for (const locale of ["ar", "en"]) {
        const context = await browser.newContext({
          baseURL: BASE_URL,
          viewport: { width: 1440, height: 1100 },
        });
        const page = await context.newPage();
        await installHooks(page);

        report.auth.push(await login(page, role, locale));
        await writeReport(report);

        for (const route of ROUTES_BY_ROLE[role]) {
          const entry = await captureRoute(page, role, locale, route);
          report.routes.push(entry);
          await writeReport(report);
        }

        report.resilience.push(await runOfflineProbe(page, context, role, locale));
        await writeReport(report);

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`[audit] report written to ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error("[audit] fatal", error);
  process.exit(1);
});
