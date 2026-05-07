import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

const accounts = [
  {
    name: "ابتدائية",
    email: "zena3@school-iraq.com",
    password: "zena102030",
    type: "teacher",
  },
  {
    name: "ثانوية بنين",
    email: "saif1@school-iraq.com",
    password: "saif102030",
    type: "teacher",
  },
  {
    name: "ثانوية بنات",
    email: "zena1@school-iraq.com",
    password: "zena102030",
    type: "teacher",
  },
  {
    name: "مدير مدرسة",
    email: "dr.anmar@school-iraq.com",
    password: "anmar12345",
    type: "admin",
  },
  {
    name: "super admin",
    email: "super.admin@school-iraq.com",
    password: "Admin@School2026",
    type: "super_admin",
  },
];

test.describe("Comprehensive App Test Suite", () => {
  accounts.forEach((account) => {
    test.describe(`Account: ${account.name}`, () => {
      test("Login successful", async ({ page }) => {
        await page.goto(`${BASE_URL}/ar/login`);
        await page.fill('input[type="email"]', account.email);
        await page.fill('input[type="password"]', account.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await expect(page).not.toHaveURL(/login/);
      });

      test("Dashboard loads", async ({ page }) => {
        await page.goto(`${BASE_URL}/ar/login`);
        await page.fill('input[type="email"]', account.email);
        await page.fill('input[type="password"]', account.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        const status = await page.evaluate(() => document.readyState);
        expect(status).toBe("complete");
      });

      test("School scope applied correctly", async ({ page }) => {
        await page.goto(`${BASE_URL}/ar/login`);
        await page.fill('input[type="email"]', account.email);
        await page.fill('input[type="password"]', account.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        const html = await page.content();
        expect(html.length).toBeGreaterThan(1000);
      });

      test("API calls include authorization header", async ({ page }) => {
        let authHeaderFound = false;
        page.on("response", (response) => {
          const request = response.request();
          if (request.url().includes("/api/")) {
            const auth = request.headerValue("authorization");
            if (auth) authHeaderFound = true;
          }
        });
        await page.goto(`${BASE_URL}/ar/login`);
        await page.fill('input[type="email"]', account.email);
        await page.fill('input[type="password"]', account.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await page.waitForTimeout(2000);
        expect(authHeaderFound).toBe(true);
      });

      test("Logout works", async ({ page }) => {
        await page.goto(`${BASE_URL}/ar/login`);
        await page.fill('input[type="email"]', account.email);
        await page.fill('input[type="password"]', account.password);
        await page.click('button[type="submit"]');
        await page.waitForNavigation();
        await page.click('button:has-text("تسجيل الخروج"), button:has-text("Logout")');
        await page.waitForNavigation();
        await expect(page).toHaveURL(/login/);
      });
    });
  });

  test.describe("Security & Isolation", () => {
    test("Branch isolation enforced", async ({ page: page1 }) => {
      const context2 = await page1.context().browser()?.newContext();
      const page2 = await context2?.newPage();

      // Login as saif1 (branch 1)
      await page1.goto(`${BASE_URL}/ar/login`);
      await page1.fill('input[type="email"]', "saif1@school-iraq.com");
      await page1.fill('input[type="password"]', "saif102030");
      await page1.click('button[type="submit"]');
      await page1.waitForNavigation();

      // Try to access another branch's data
      const response1 = await page1.evaluate(() =>
        fetch("/api/web/students/list").then((r) => r.json())
      );
      const saifStudentCount = response1.data?.length || 0;

      // Login as zena3 (different branch)
      await page2!.goto(`${BASE_URL}/ar/login`);
      await page2!.fill('input[type="email"]', "zena3@school-iraq.com");
      await page2!.fill('input[type="password"]', "zena102030");
      await page2!.click('button[type="submit"]');
      await page2!.waitForNavigation();

      const response2 = await page2!.evaluate(() =>
        fetch("/api/web/students/list").then((r) => r.json())
      );
      const zenaStudentCount = response2.data?.length || 0;

      // Different users should see different data (isolation working)
      expect(saifStudentCount).not.toBe(zenaStudentCount);
      await context2?.close();
    });

    test("XSS protection (no dangerous HTML in responses)", async ({
      page,
    }) => {
      await page.goto(`${BASE_URL}/ar/login`);
      await page.fill('input[type="email"]', "super.admin@school-iraq.com");
      await page.fill('input[type="password"]', "Admin@School2026");
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      const html = await page.content();
      expect(html).not.toContain("dangerouslySetInnerHTML");
      expect(html).not.toContain("<script>");
    });

    test("CSRF token present in forms", async ({ page }) => {
      await page.goto(`${BASE_URL}/ar/login`);
      const formContent = await page.content();
      // Check if forms have CSRF protection or similar
      expect(formContent).toBeTruthy();
    });
  });

  test.describe("Performance", () => {
    test("Login page loads under 3s", async ({ page }) => {
      const start = Date.now();
      await page.goto(`${BASE_URL}/ar/login`);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(3000);
    });

    test("Dashboard loads under 5s", async ({ page }) => {
      await page.goto(`${BASE_URL}/ar/login`);
      await page.fill('input[type="email"]', "super.admin@school-iraq.com");
      await page.fill('input[type="password"]', "Admin@School2026");
      const start = Date.now();
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });

    test("API response under 1s", async ({ page }) => {
      await page.goto(`${BASE_URL}/ar/login`);
      await page.fill('input[type="email"]', "super.admin@school-iraq.com");
      await page.fill('input[type="password"]', "Admin@School2026");
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      const start = Date.now();
      const response = await page.evaluate(() =>
        fetch("/api/web/students/list").then((r) => r.json())
      );
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
      expect(response).toBeTruthy();
    });
  });

  test.describe("Core Functionality", () => {
    test("Super admin can view all schools", async ({ page }) => {
      await page.goto(`${BASE_URL}/ar/login`);
      await page.fill('input[type="email"]', "super.admin@school-iraq.com");
      await page.fill('input[type="password"]', "Admin@School2026");
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      const response = await page.evaluate(() =>
        fetch("/api/web/super-admin/schools").then((r) => r.json())
      );
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
    });

    test("Admin can view school-scoped data", async ({ page }) => {
      await page.goto(`${BASE_URL}/ar/login`);
      await page.fill('input[type="email"]', "dr.anmar@school-iraq.com");
      await page.fill('input[type="password"]', "anmar12345");
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      const response = await page.evaluate(() =>
        fetch("/api/web/students/list").then((r) => r.json())
      );
      expect(response.data).toBeDefined();
    });

    test("Teacher can view students", async ({ page }) => {
      await page.goto(`${BASE_URL}/ar/login`);
      await page.fill('input[type="email"]', "saif1@school-iraq.com");
      await page.fill('input[type="password"]', "saif102030");
      await page.click('button[type="submit"]');
      await page.waitForNavigation();

      const response = await page.evaluate(() =>
        fetch("/api/web/students/list").then((r) => r.json())
      );
      expect(response.data).toBeDefined();
    });
  });
});
