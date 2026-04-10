import fs from "node:fs/promises";
import path from "node:path";

import { expect, test, type BrowserContext, type ConsoleMessage, type Page, type Response } from "@playwright/test";

type AuditRole = "admin" | "super_admin";
type AuditLocale = "ar" | "en";

type FailedResponse = {
  url: string;
  status: number;
  method: string;
};

type PageErrorEntry = {
  message: string;
};

type RouteAuditEntry = {
  role: AuditRole;
  locale: AuditLocale;
  route: string;
  finalUrl: string;
  pageTitle: string;
  heading: string | null;
  documentDir: string | null;
  htmlLang: string | null;
  navigationMs: number;
  screenshotPath: string;
  consoleErrors: string[];
  pageErrors: PageErrorEntry[];
  failedResponses: FailedResponse[];
  buttonLabels: string[];
  linkTargets: string[];
  navigationTiming: {
    domContentLoadedMs: number | null;
    loadEventMs: number | null;
    responseEndMs: number | null;
  } | null;
  notes: string[];
};

type AuthAuditEntry = {
  role: AuditRole;
  locale: AuditLocale;
  loginUrl: string;
  landingUrl: string;
  pageTitle: string;
};

type NetworkResilienceEntry = {
  role: AuditRole;
  locale: AuditLocale;
  scenario: "offline-reload-dashboard";
  finalUrl: string;
  heading: string | null;
  visibleTextSample: string;
  reloadError: string | null;
};

type AuditReport = {
  generatedAt: string;
  baseUrl: string;
  auth: AuthAuditEntry[];
  routes: RouteAuditEntry[];
  resilience: NetworkResilienceEntry[];
};

const OUTPUT_DIR = "/Users/musatafa/school-app/output/playwright/live-audit";
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, "screenshots");
const REPORT_PATH = path.join(OUTPUT_DIR, "live-audit.json");
const BASE_URL = "http://127.0.0.1:3000";

const CREDENTIALS: Record<AuditRole, { email: string; password: string }> = {
  admin: {
    email: process.env.PW_ADMIN_EMAIL ?? "admin@schoolapp.com",
    password: process.env.PW_ADMIN_PASSWORD ?? "Admin@12345",
  },
  super_admin: {
    email: process.env.PW_SUPER_ADMIN_EMAIL ?? "super.admin@schoolapp.com",
    password: process.env.PW_SUPER_ADMIN_PASSWORD ?? "Owner@12345",
  },
};

const ROUTES_BY_ROLE: Record<AuditRole, string[]> = {
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

function slugifyRoute(route: string) {
  return route.replace(/^\//, "").replace(/\//g, "-") || "root";
}

function normalizeConsoleMessage(message: ConsoleMessage) {
  return message.text().trim();
}

async function installAuditHooks(page: Page) {
  await page.addInitScript(() => {
    const win = window as typeof window & {
      __qaAudit?: {
        printCalls: Array<{ href: string; at: number }>;
        openedUrls: string[];
      };
    };

    win.__qaAudit = {
      printCalls: [],
      openedUrls: [],
    };

    const originalPrint = window.print.bind(window);
    window.print = () => {
      win.__qaAudit?.printCalls.push({
        href: window.location.href,
        at: Date.now(),
      });
      return originalPrint();
    };

    const originalOpen = window.open.bind(window);
    window.open = (...args) => {
      win.__qaAudit?.openedUrls.push(String(args[0] ?? ""));
      return originalOpen(...args);
    };
  });
}

async function loginViaUi(page: Page, role: AuditRole, locale: AuditLocale): Promise<AuthAuditEntry> {
  const credentials = CREDENTIALS[role];
  const loginUrl = `${BASE_URL}/${locale}/login`;

  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);
  await page
    .getByRole("button", {
      name: locale === "en" ? "Sign in" : "تسجيل الدخول",
    })
    .click();

  const expectedLanding =
    role === "super_admin"
      ? new RegExp(`/${locale}/super-admin(?:\\?.*)?$`)
      : new RegExp(`/${locale}/dashboard(?:\\?.*)?$`);

  await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(expectedLanding);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1_000);

  return {
    role,
    locale,
    loginUrl,
    landingUrl: page.url(),
    pageTitle: await page.title(),
  };
}

async function captureRoute(
  page: Page,
  role: AuditRole,
  locale: AuditLocale,
  route: string,
): Promise<RouteAuditEntry> {
  const consoleErrors: string[] = [];
  const pageErrors: PageErrorEntry[] = [];
  const failedResponses: FailedResponse[] = [];
  const startedAt = Date.now();

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === "error") {
      consoleErrors.push(normalizeConsoleMessage(message));
    }
  };

  const onPageError = (error: Error) => {
    pageErrors.push({ message: error.message });
  };

  const onResponse = (response: Response) => {
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

  const targetUrl = `${BASE_URL}/${locale}${route}`;
  const notes: string[] = [];

  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  } catch (error) {
    notes.push(error instanceof Error ? error.message : String(error));
  }

  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
    notes.push("networkidle timeout");
  });
  await page.waitForTimeout(1_500);

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  page.off("response", onResponse);

  const routeSlug = slugifyRoute(route);
  const screenshotPath = path.join(SCREENSHOT_DIR, `${role}-${locale}-${routeSlug}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const heading = await page.locator("h1").first().textContent().catch(() => null);
  const pageTitle = await page.title();
  const finalUrl = page.url();

  const documentMeta = await page.evaluate(() => {
    const nearestDir = document.querySelector("[dir]")?.getAttribute("dir");
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    return {
      documentDir: document.documentElement.getAttribute("dir") ?? nearestDir ?? null,
      htmlLang: document.documentElement.getAttribute("lang"),
      buttonLabels: Array.from(document.querySelectorAll("button"))
        .map((element) => {
          const aria = element.getAttribute("aria-label")?.trim();
          if (aria) return aria;
          const title = element.getAttribute("title")?.trim();
          if (title) return title;
          return element.textContent?.trim() ?? "";
        })
        .filter(Boolean)
        .slice(0, 80),
      linkTargets: Array.from(document.querySelectorAll("a"))
        .map((element) => {
          const href = element.getAttribute("href")?.trim();
          const label = element.textContent?.trim();
          if (!href) return null;
          return label ? `${label} -> ${href}` : href;
        })
        .filter((value): value is string => Boolean(value))
        .slice(0, 80),
      visibleTextSample: document.body.innerText.slice(0, 500),
      navigationTiming: nav
        ? {
            domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
            loadEventMs: nav.loadEventEnd ? Math.round(nav.loadEventEnd) : null,
            responseEndMs: Math.round(nav.responseEnd),
          }
        : null,
    };
  });

  if (documentMeta.visibleTextSample.includes("تعذر")) {
    notes.push("visible-error-copy");
  }
  if (documentMeta.visibleTextSample.includes("Error")) {
    notes.push("visible-english-error-copy");
  }

  return {
    role,
    locale,
    route,
    finalUrl,
    pageTitle,
    heading: heading?.trim() || null,
    documentDir: documentMeta.documentDir,
    htmlLang: documentMeta.htmlLang,
    navigationMs: Date.now() - startedAt,
    screenshotPath,
    consoleErrors,
    pageErrors,
    failedResponses,
    buttonLabels: documentMeta.buttonLabels,
    linkTargets: documentMeta.linkTargets,
    navigationTiming: documentMeta.navigationTiming,
    notes,
  };
}

async function captureOfflineReloadProbe(
  page: Page,
  context: BrowserContext,
  role: AuditRole,
  locale: AuditLocale,
): Promise<NetworkResilienceEntry> {
  await page.goto(`${BASE_URL}/${locale}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1_000);

  let reloadError: string | null = null;
  await context.setOffline(true);

  try {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 10_000 });
  } catch (error) {
    reloadError = error instanceof Error ? error.message : String(error);
  }

  await page.waitForTimeout(1_000);

  const probe = await page.evaluate(() => ({
    heading: document.querySelector("h1")?.textContent?.trim() ?? null,
    visibleTextSample: document.body.innerText.slice(0, 400),
  }));

  await context.setOffline(false);
  await page.waitForTimeout(500);

  return {
    role,
    locale,
    scenario: "offline-reload-dashboard",
    finalUrl: page.url(),
    heading: probe.heading,
    visibleTextSample: probe.visibleTextSample,
    reloadError,
  };
}

test("collect live audit artifacts across roles and locales", async ({ browser }) => {
  test.setTimeout(20 * 60 * 1_000);

  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    auth: [],
    routes: [],
    resilience: [],
  };

  for (const role of ["admin", "super_admin"] as const) {
    for (const locale of ["ar", "en"] as const) {
      const context = await browser.newContext({
        baseURL: BASE_URL,
        viewport: { width: 1440, height: 1100 },
      });
      const page = await context.newPage();

      await installAuditHooks(page);

      const auth = await loginViaUi(page, role, locale);
      report.auth.push(auth);

      for (const route of ROUTES_BY_ROLE[role]) {
        const entry = await captureRoute(page, role, locale, route);
        report.routes.push(entry);
      }

      report.resilience.push(await captureOfflineReloadProbe(page, context, role, locale));

      await context.close();
    }
  }

  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
});
