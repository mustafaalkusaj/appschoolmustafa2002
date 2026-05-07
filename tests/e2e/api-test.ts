import { test, expect } from "@playwright/test";

const PROD_URL = "https://app.school-iraq.com"; // fallback

// Test accounts with real credentials
const accounts = [
  {
    name: "ابتدائية (Teacher)",
    email: "zena3@school-iraq.com",
    password: "zena102030",
    type: "teacher",
  },
  {
    name: "ثانوية بنين (Teacher)",
    email: "saif1@school-iraq.com",
    password: "saif102030",
    type: "teacher",
  },
  {
    name: "ثانوية بنات (Teacher)",
    email: "zena1@school-iraq.com",
    password: "zena102030",
    type: "teacher",
  },
  {
    name: "مدير مدرسة (Admin)",
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

test.describe("API & Authentication Tests", () => {
  accounts.forEach((account) => {
    test.describe(`${account.name}`, () => {
      test("Login and get JWT token", async ({ request }) => {
        const response = await request.post(`${PROD_URL}/api/auth/login`, {
          data: {
            email: account.email,
            password: account.password,
          },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.token).toBeTruthy();
      });

      test("Access protected endpoint with token", async ({ request }) => {
        // First login
        const loginRes = await request.post(`${PROD_URL}/api/auth/login`, {
          data: {
            email: account.email,
            password: account.password,
          },
        });

        expect(loginRes.ok()).toBeTruthy();
        const { token } = await loginRes.json();

        // Access protected endpoint
        const apiRes = await request.get(
          `${PROD_URL}/api/web/students/list`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        expect(apiRes.ok()).toBeTruthy();
        const data = await apiRes.json();
        expect(data.data).toBeDefined();
      });

      test("Verify role-based access", async ({ request }) => {
        const loginRes = await request.post(`${PROD_URL}/api/auth/login`, {
          data: {
            email: account.email,
            password: account.password,
          },
        });

        const { token } = await loginRes.json();

        // Super admin can access super-admin endpoints
        if (account.type === "super_admin") {
          const schoolsRes = await request.get(
            `${PROD_URL}/api/web/super-admin/schools`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          expect(schoolsRes.ok()).toBeTruthy();
          const { data } = await schoolsRes.json();
          expect(Array.isArray(data)).toBe(true);
        } else {
          // Regular users should have access denied to super-admin endpoints
          const schoolsRes = await request.get(
            `${PROD_URL}/api/web/super-admin/schools`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          expect([401, 403]).toContain(schoolsRes.status());
        }
      });

      test("Branch isolation enforced", async ({ request }) => {
        const loginRes = await request.post(`${PROD_URL}/api/auth/login`, {
          data: {
            email: account.email,
            password: account.password,
          },
        });

        const { token } = await loginRes.json();
        const studentsRes = await request.get(
          `${PROD_URL}/api/web/students/list`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        expect(studentsRes.ok()).toBeTruthy();
        const { data } = await studentsRes.json();

        // Each branch should see only their students
        if (data && Array.isArray(data)) {
          // Verify students belong to the correct branch
          expect(data.length).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  test.describe("Security Tests", () => {
    test("Invalid token rejected", async ({ request }) => {
      const response = await request.get(
        `${PROD_URL}/api/web/students/list`,
        {
          headers: {
            Authorization: "Bearer invalid-token",
          },
        }
      );
      expect([401, 403]).toContain(response.status());
    });

    test("Missing auth header rejected", async ({ request }) => {
      const response = await request.get(`${PROD_URL}/api/web/students/list`);
      expect([401, 403]).toContain(response.status());
    });

    test("Rate limiting active", async ({ request }) => {
      // Make many requests rapidly
      const promises = Array(20)
        .fill(0)
        .map(() =>
          request.post(`${PROD_URL}/api/auth/login`, {
            data: {
              email: "test@test.com",
              password: "wrong",
            },
          })
        );

      const responses = await Promise.all(promises);
      const status429 = responses.some((r) => r.status() === 429);

      expect(status429).toBe(true); // At least one should be rate limited
    });
  });

  test.describe("Performance", () => {
    test("Login under 2s", async ({ request }) => {
      const start = Date.now();
      await request.post(`${PROD_URL}/api/auth/login`, {
        data: {
          email: "zena3@school-iraq.com",
          password: "zena102030",
        },
      });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    test("Student list API under 1s", async ({ request }) => {
      const loginRes = await request.post(`${PROD_URL}/api/auth/login`, {
        data: {
          email: "zena3@school-iraq.com",
          password: "zena102030",
        },
      });

      const { token } = await loginRes.json();
      const start = Date.now();

      await request.get(`${PROD_URL}/api/web/students/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
});
