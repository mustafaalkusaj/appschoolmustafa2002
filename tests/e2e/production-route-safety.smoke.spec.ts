import { expect, test } from "@playwright/test";

const PROD_BASE_URL = process.env.PW_PROD_BASE_URL ?? "https://school-iraq.com";

const SAFE_ERROR_PATTERNS = [
  "حدث خطأ حرج في التطبيق",
  "Missing Supabase URL",
  "Missing Supabase",
  "missing public supabase key",
  "hydration failed",
];

const ROUTES = [
  { path: "/ar", locale: "ar", protected: false },
  { path: "/ar/login", locale: "ar", protected: false },
  { path: "/ar/branch-overview", locale: "ar", protected: true },
  { path: "/ar/salaries", locale: "ar", protected: true },
  { path: "/ar/attendance", locale: "ar", protected: true },
  { path: "/ar/payments", locale: "ar", protected: true },
  { path: "/en", locale: "en", protected: false },
  { path: "/en/payments", locale: "en", protected: true },
] as const;

test.describe.serial("production route safety", () => {
  for (const route of ROUTES) {
    test(`safe render or redirect: ${route.path}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });

      const response = await page.goto(`${PROD_BASE_URL}${route.path}`, {
        waitUntil: "domcontentloaded",
      });

      expect(response).not.toBeNull();
      expect(response?.status()).toBeLessThan(500);

      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => undefined);

      const finalUrl = page.url();
      const bodyText = await page.locator("body").innerText().catch(() => "");

      for (const pattern of SAFE_ERROR_PATTERNS) {
        expect(bodyText.toLowerCase()).not.toContain(pattern.toLowerCase());
        expect(consoleErrors.join("\n").toLowerCase()).not.toContain(pattern.toLowerCase());
      }

      if (route.protected) {
        const landedOnProtectedRoute = finalUrl.startsWith(`${PROD_BASE_URL}${route.path}`);
        const redirectedToLogin =
          finalUrl.startsWith(`${PROD_BASE_URL}/${route.locale}/login`) ||
          finalUrl.startsWith(`${PROD_BASE_URL}/login`);

        expect(landedOnProtectedRoute || redirectedToLogin).toBe(true);
      } else {
        expect(finalUrl.startsWith(`${PROD_BASE_URL}/${route.locale}`)).toBe(true);
      }
    });
  }
});
