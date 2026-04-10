import fs from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { loginAsAdmin, loginAsSuperAdmin } from "./helpers/auth";

const screenshotDir = "/Users/musatafa/school-app/output/playwright/critical-routes";

async function captureRoute(page: Page, route: string, filename: string) {
  await page.goto(route);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: `${screenshotDir}/${filename}`, fullPage: true });
}

test.describe.serial("critical route coverage", () => {
  test("admin routes render in Arabic and English", async ({ page }) => {
    test.setTimeout(420_000);
    await fs.mkdir(screenshotDir, { recursive: true });

    await loginAsAdmin(page, "ar");
    await page.context().storageState({ path: "/Users/musatafa/school-app/artifacts/reliability-audit/admin-storage-state.json" });

    for (const [route, filename] of [
      ["/ar/dashboard", "dashboard-ar.png"],
      ["/en/dashboard", "dashboard-en.png"],
      ["/ar/students", "students-ar.png"],
      ["/en/students", "students-en.png"],
      ["/ar/payments", "payments-ar.png"],
      ["/en/payments", "payments-en.png"],
      ["/ar/salaries", "salaries-ar.png"],
      ["/en/salaries", "salaries-en.png"],
      ["/ar/teachers", "teachers-ar.png"],
      ["/ar/attendance", "attendance-ar.png"],
      ["/ar/expenses", "expenses-ar.png"],
      ["/ar/reports", "reports-ar.png"],
      ["/ar/monitoring", "monitoring-ar.png"],
      ["/ar/fee-notifications", "fee-notifications-ar.png"],
    ] as const) {
      await captureRoute(page, route, filename);
    }
  });

  test("super admin routes render in Arabic and English", async ({ page }) => {
    test.setTimeout(300_000);
    await fs.mkdir(screenshotDir, { recursive: true });

    await loginAsSuperAdmin(page, "ar");
    await page.context().storageState({ path: "/Users/musatafa/school-app/artifacts/reliability-audit/super-admin-storage-state.json" });

    for (const [route, filename] of [
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
    ] as const) {
      await captureRoute(page, route, filename);
    }
  });
});
