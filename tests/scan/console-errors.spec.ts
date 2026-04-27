import { test, expect } from "@playwright/test";

const ROUTES = [
  { path: "/ar/login", role: null },
  { path: "/ar/dashboard", role: "admin" },
  { path: "/ar/students", role: "admin" },
  { path: "/ar/payments", role: "admin" },
  { path: "/ar/expenses", role: "admin" },
  { path: "/ar/salaries", role: "admin" },
  { path: "/ar/attendance", role: "admin" },
  { path: "/ar/reports", role: "admin" },
  { path: "/ar/teachers", role: "admin" },
  { path: "/ar/super-admin", role: "super_admin" },
  { path: "/ar/super-admin/ops", role: "super_admin" },
];

// Known ignorable errors (fake icons, nonfatal warnings)
const IGNORABLE_PATTERNS = [
  /favicon/i,
  /chunk-/i,
  "ResizeObserver loop limit exceeded",
  "Non-Error promise rejection captured",
];

function isKnownIgnorable(msg: string): boolean {
  return IGNORABLE_PATTERNS.some((p) =>
    typeof p === "string" ? msg.includes(p) : p.test(msg)
  );
}

for (const { path, role } of ROUTES) {
  test(`no console errors: ${path} [${role || "anon"}]`, async ({
    page,
    context,
  }) => {
    const errors: Array<{ type: string; message: string }> = [];
    const failed: string[] = [];

    // Capture console messages
    page.on("console", (msg) => {
      const text = msg.text();
      if (!isKnownIgnorable(text)) {
        if (msg.type() === "error") {
          errors.push({ type: "console.error", message: text });
        } else if (msg.type() === "warning") {
          errors.push({ type: "console.warning", message: text });
        }
      }
    });

    // Capture unhandled errors
    page.on("pageerror", (err) => {
      if (!isKnownIgnorable(err.message)) {
        errors.push({ type: "unhandled", message: err.message });
      }
    });

    // Capture failed requests
    page.on("requestfailed", (req) => {
      failed.push(`${req.method()} ${req.url()}`);
    });

    // Navigate
    try {
      await page.goto(path, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      errors.push({ type: "navigation", message: String(e) });
    }

    // Report findings
    if (errors.length > 0) {
      console.log(
        `⚠️  Errors on ${path}:`,
        JSON.stringify(errors, null, 2)
      );
    }
    if (failed.length > 0) {
      console.log(
        `⚠️  Failed requests on ${path}:`,
        JSON.stringify(failed, null, 2)
      );
    }

    // Assert no critical errors
    const criticalErrors = errors.filter((e) => e.type !== "console.warning");
    expect(
      criticalErrors,
      `Critical errors found on ${path}`
    ).toEqual([]);
  });
}
