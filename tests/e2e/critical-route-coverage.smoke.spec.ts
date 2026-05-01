import fs from "node:fs/promises";
import { test, type Page } from "@playwright/test";

const screenshotDir = "/Users/musatafa/school-app/output/playwright/critical-routes";

async function captureRoute(page: Page, route: string, filename: string) {
  await page.goto(route);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: `${screenshotDir}/${filename}`, fullPage: true });
}

test.describe.serial("critical route coverage - admin", () => {
  test.use({ storageState: "/Users/musatafa/school-app/artifacts/reliability-audit/admin-storage-state.json" });

  const adminRoutes = [
    ["/ar/dashboard", "dashboard-ar.png"],
    ["/en/dashboard", "dashboard-en.png"],
    ["/ar/students", "students-ar.png"],
    ["/en/students", "students-en.png"],
    ["/ar/payments", "payments-ar.png"],
    ["/en/payments", "payments-en.png"],
    ["/ar/salaries", "salaries-ar.png"],
    ["/en/salaries", "salaries-en.png"],
    ["/ar/teachers", "teachers-ar.png"],
    ["/en/teachers", "teachers-en.png"],
    ["/ar/attendance", "attendance-ar.png"],
    ["/en/attendance", "attendance-en.png"],
    ["/ar/expenses", "expenses-ar.png"],
    ["/en/expenses", "expenses-en.png"],
    ["/ar/reports", "reports-ar.png"],
    ["/en/reports", "reports-en.png"],
    ["/ar/monitoring", "monitoring-ar.png"],
    ["/en/monitoring", "monitoring-en.png"],
    ["/ar/fee-notifications", "fee-notifications-ar.png"],
    ["/en/fee-notifications", "fee-notifications-en.png"],
  ] as const;

  test.beforeAll(async () => {
    await fs.mkdir(screenshotDir, { recursive: true });
  });

  for (const [route, filename] of adminRoutes) {
    test(`admin route renders: ${route}`, async ({ page }) => {
      test.setTimeout(90_000);
      await captureRoute(page, route, filename);
    });
  }
});

test.describe.serial("critical route coverage - super admin", () => {
  test.use({ storageState: "/Users/musatafa/school-app/artifacts/reliability-audit/super-admin-storage-state.json" });

  const superAdminRoutes = [
    ["/ar/super-admin", "super-admin-ar.png"],
    ["/en/super-admin", "super-admin-en.png"],
    ["/ar/schools", "schools-ar.png"],
    ["/en/schools", "schools-en.png"],
    ["/ar/subscriptions", "subscriptions-ar.png"],
    ["/en/subscriptions", "subscriptions-en.png"],
    ["/ar/users", "users-ar.png"],
    ["/en/users", "users-en.png"],
    ["/ar/access-denied", "access-denied-ar.png"],
    ["/ar/subscription-expired", "subscription-expired-ar.png"],
  ] as const;

  test.beforeAll(async () => {
    await fs.mkdir(screenshotDir, { recursive: true });
  });

  for (const [route, filename] of superAdminRoutes) {
    test(`super admin route renders: ${route}`, async ({ page }) => {
      test.setTimeout(90_000);
      await captureRoute(page, route, filename);
    });
  }
});
