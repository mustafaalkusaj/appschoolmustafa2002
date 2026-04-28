import { expect, test, type Page, type Request, type Response } from "@playwright/test";

const targetUrl = process.env.QA_TARGET_URL ?? "https://appschoolmustafa2002.vercel.app";

type CollectedSignals = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  serverErrors: string[];
};

function createSignals(): CollectedSignals {
  return {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    serverErrors: [],
  };
}

function toAbsoluteUrl(pathname: string) {
  return new URL(pathname, targetUrl).toString();
}

function attachDiagnostics(page: Page, signals: CollectedSignals) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text();
      if (!text.includes("favicon.ico") && !text.includes("script tag while rendering")) {
        signals.consoleErrors.push(text);
      }
    }
  });

  page.on("pageerror", (error) => {
    signals.pageErrors.push(error.message);
  });

  page.on("requestfailed", (request: Request) => {
    const errorText = request.failure()?.errorText ?? "unknown";
    const url = request.url();

    // Next.js App Router may cancel in-flight RSC fetches during navigation.
    if (errorText === "net::ERR_ABORTED" && url.includes("_rsc=")) {
      return;
    }

    signals.failedRequests.push(`${request.method()} ${url} :: ${errorText}`);
  });

  page.on("response", async (response: Response) => {
    if (response.status() >= 500) {
      signals.serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });
}

function expectNoCriticalSignals(signals: CollectedSignals) {
  expect(
    {
      consoleErrors: signals.consoleErrors,
      pageErrors: signals.pageErrors,
      failedRequests: signals.failedRequests,
      serverErrors: signals.serverErrors,
    },
    "The page emitted critical browser/runtime/network errors.",
  ).toEqual({
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    serverErrors: [],
  });
}

test.describe("production smoke", () => {
  test("public pages load without critical browser or server errors", async ({ page }) => {
    const signals = createSignals();
    attachDiagnostics(page, signals);

    const homeResponse = await page.goto(toAbsoluteUrl("/"), { waitUntil: "networkidle" });
    expect(homeResponse && homeResponse.status()).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();

    const loginResponse = await page.goto(toAbsoluteUrl("/ar/login"), { waitUntil: "networkidle" });
    expect(loginResponse && loginResponse.status()).toBeLessThan(500);
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();

    expectNoCriticalSignals(signals);
  });

  test("protected pages do not leak data to unauthenticated users", async ({ page }) => {
    const protectedPaths = ["/dashboard", "/super-admin", "/users", "/schools", "/students"];

    for (const pathname of protectedPaths) {
      const signals = createSignals();
      attachDiagnostics(page, signals);

      const response = await page.goto(toAbsoluteUrl(pathname), { waitUntil: "domcontentloaded" });
      expect(response && response.status()).toBeLessThan(500);

      await page.waitForLoadState("networkidle");
      const finalUrl = page.url();
      const normalized = new URL(finalUrl).pathname;

      expect(
        normalized.includes("/login") || normalized.includes("/access-denied") || normalized.includes("/subscription-expired"),
        `Protected route ${pathname} remained directly accessible to an unauthenticated user at ${finalUrl}`,
      ).toBe(true);

      expectNoCriticalSignals(signals);
    }
  });

  test("protected APIs reject unauthenticated requests safely", async ({ request }) => {
    const apiPaths = [
      "/api/account/me",
      "/api/users",
      "/api/branches",
      "/api/web/dashboard/overview",
      "/api/web/super-admin/overview",
    ];

    for (const pathname of apiPaths) {
      const response = await request.get(toAbsoluteUrl(pathname), {
        failOnStatusCode: false,
      });

      expect(response.status(), `${pathname} should reject unauthenticated access safely`).not.toBe(500);
      expect(response.status(), `${pathname} should not return sensitive success data without auth`).not.toBe(200);
      expect([401, 403, 404, 302, 307, 308]).toContain(response.status());
    }
  });

  test("responsive login remains usable across desktop, tablet, and mobile", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1440, height: 900 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 390, height: 844 },
    ];

    for (const viewport of viewports) {
      const signals = createSignals();
      attachDiagnostics(page, signals);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(toAbsoluteUrl("/ar/login"), { waitUntil: "networkidle" });
      expect(response && response.status(), `${viewport.name} login should load`).toBeLessThan(500);

      await expect(page.locator("#email"), `${viewport.name} email input should be visible`).toBeVisible();
      await expect(page.locator("#password"), `${viewport.name} password input should be visible`).toBeVisible();
      await expect(page.getByRole("button", { name: "تسجيل الدخول" }), `${viewport.name} submit should be visible`).toBeVisible();

      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(hasOverflow, `${viewport.name} login page should not have horizontal overflow`).toBe(false);

      expectNoCriticalSignals(signals);
    }
  });
});
