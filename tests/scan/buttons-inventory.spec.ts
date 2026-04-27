import { test, expect } from "@playwright/test";

// Test credentials from environment or use defaults for test environment
const TEST_USER_DOMAIN = process.env.TEST_USER_DOMAIN || "test.school.com";
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || "test1234";

const PAGES = [
  { path: "/ar/dashboard", role: "admin" },
  { path: "/ar/students", role: "admin" },
  { path: "/ar/payments", role: "admin" },
  { path: "/ar/expenses", role: "admin" },
  { path: "/ar/salaries", role: "admin" },
  { path: "/ar/attendance", role: "admin" },
  { path: "/ar/teachers", role: "admin" },
  { path: "/ar/reports", role: "admin" },
  { path: "/ar/branch-overview", role: "branch_user" },
  { path: "/ar/super-admin", role: "super_admin" },
  { path: "/ar/super-admin/ops", role: "super_admin" },
  { path: "/ar/monitoring", role: "admin" },
];

interface ButtonInfo {
  text: string | null;
  ariaLabel: string | null;
  testId: string | null;
  disabled: boolean;
  hasOnClick: boolean;
  type: string | null;
  tagName: string;
}

for (const { path, role } of PAGES) {
  test(`buttons inventory: ${path} [${role}]`, async ({ page }) => {
    // Login as role
    await page.goto("/ar/login");
    await page.fill('input[type="email"]', `${role}@${TEST_USER_DOMAIN}`);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**", { timeout: 10000 }).catch(() => null);

    // Navigate to page
    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    // Collect all buttons
    const buttons = await page.$$eval("button, a[role='button'], [role='menuitem'], [data-testid*='button']", (els) =>
      (els as HTMLElement[]).map((el) => ({
        text: el.textContent?.trim().slice(0, 60) || null,
        ariaLabel: el.getAttribute("aria-label"),
        testId: el.getAttribute("data-testid"),
        disabled:
          el.hasAttribute("disabled") ||
          el.getAttribute("aria-disabled") === "true" ||
          el.classList.contains("disabled"),
        hasOnClick: !!(el as any).onclick || !!el.getAttribute("onclick"),
        type: el.getAttribute("type"),
        tagName: el.tagName.toLowerCase(),
      }))
    );

    // Dedupe by text
    const unique = Array.from(new Map(buttons.map((b) => [b.text, b])).values());

    console.log(
      JSON.stringify(
        {
          path,
          role,
          total: buttons.length,
          unique: unique.length,
          buttons: unique.slice(0, 50), // First 50 for readability
        },
        null,
        2
      )
    );

    // Save detailed log
    await page.context().close();

    expect(unique.length).toBeGreaterThan(0);
  });
}
