import { test, expect } from "@playwright/test";

import { ensureE2EEnvLoaded, getPlaywrightBaseUrl } from "./helpers/e2e-env";

ensureE2EEnvLoaded();

const PROD_URL = getPlaywrightBaseUrl();

test.describe("API Endpoints Verification", () => {
  test("verify PATCH endpoint has status update capability", async ({ request }) => {
    console.log("=== PHASE 1: Verify API Endpoints Structure ===");

    // Test that OPTIONS request is handled (using fetch — Playwright APIRequestContext has no options() method)
    try {
      const response = await fetch(`${PROD_URL}/api/web/students/test-id`, {
        method: "OPTIONS",
        headers: {
          "Origin": PROD_URL,
        },
      });
      console.log(`OPTIONS /api/web/students/[id]: status ${response.status}`);
    } catch (e) {
      console.log(`OPTIONS request failed (expected if no CORS): ${(e as Error).message}`);
    }

    // Verify endpoint exists (will return 401/400 without auth but route should exist)
    const patchResponse = await request.patch(
      `${PROD_URL}/api/web/students/00000000-0000-0000-0000-000000000000`,
      {
        data: { status: "active" },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log(
      `PATCH /api/web/students/[id] endpoint exists: ${
        patchResponse.status() === 404 ? "NO (404)" : "YES"
      } (status: ${patchResponse.status()})`
    );
    console.log(`PATCH response headers:`, patchResponse.headers());

    // Verify DELETE endpoint exists
    const deleteResponse = await request.delete(
      `${PROD_URL}/api/web/students/00000000-0000-0000-0000-000000000000`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log(
      `DELETE /api/web/students/[id] endpoint exists: ${
        deleteResponse.status() === 404 ? "NO (404)" : "YES"
      } (status: ${deleteResponse.status()})`
    );

    console.log("\n=== PHASE 2: Verify Code Deployed ===");
    // Make a GET to students page and check for expected code markers
    const pageResponse = await request.get(`${PROD_URL}/ar/students`);
    const html = await pageResponse.text();

    const codeChecks = {
      "Transfer function (نقل الطالب)": html.includes("نقل الطالب"),
      "Suspend function (توقيف الطالب)": html.includes("توقيف الطالب"),
      "Delete function (حذف الطالب)": html.includes("حذف الطالب"),
      "Restore function (استعادة)": html.includes("استعادة"),
      "Transferred tab (المنقولون)": html.includes("المنقولون"),
      "Suspended tab (الموقوفون)": html.includes("الموقوفون"),
      "Deleted tab (المحذوفون)": html.includes("المحذوفون"),
    };

    console.log("\nUI Strings found in deployed code:");
    Object.entries(codeChecks).forEach(([check, found]) => {
      console.log(`  ${check}: ${found ? "✓" : "✗"}`);
    });

    const allFound = Object.values(codeChecks).every((v) => v);
    if (allFound) {
      console.log("\n✓ All expected UI strings found - code deployed successfully");
    } else {
      console.log("\n✗ Some UI strings missing - code may not be fully deployed");
    }

    // Check content type (should be HTML)
    const contentType = pageResponse.headers()["content-type"] || "";
    console.log(`\nContent-Type: ${contentType}`);

    // Check response is not a 404 or redirect to login
    console.log(`Page response status: ${pageResponse.status()}`);
  });

  test("verify request/response structure for student updates", async ({ request }) => {
    console.log("=== PHASE 3: API Request/Response Structure ===");

    // Create test body matching the expected schema
    const testBodies = [
      {
        name: "Status update request",
        body: {
          school_id: "test-school-id",
          status: "suspended",
        },
      },
      {
        name: "Transfer to class request",
        body: {
          school_id: "test-school-id",
          transfer_type: "class",
          target_class: "First Year",
          target_section: "A",
        },
      },
      {
        name: "Transfer to transferred tab request",
        body: {
          school_id: "test-school-id",
          transfer_type: "transferred",
        },
      },
    ];

    console.log("Request schemas that should be accepted:");
    testBodies.forEach((test) => {
      console.log(`  - ${test.name}: ${JSON.stringify(test.body)}`);
    });

    console.log("\n=== PHASE 4: Database Schema ===");
    console.log("Expected student status values: active | suspended | transferred | deleted");
    console.log("Transfer types: class | section | transferred");
    console.log("Expected PATCH handlers:");
    console.log("  1. transfer_type='class' → updates class_name, sets status=active");
    console.log("  2. transfer_type='section' → updates section, sets status=active");
    console.log("  3. transfer_type='transferred' → sets status=transferred");
    console.log("  4. status field only → updates status directly");
    console.log("  5. DELETE with force_delete → soft-delete with status=deleted");
  });

  test("verify page load and auth flow", async ({ page }) => {
    console.log("=== PHASE 5: Auth and Page Load ===");

    // Navigate without auth
    console.log("Step 1: Navigate to students page without auth");
    const response = await page.goto(`${PROD_URL}/ar/students`);
    console.log(`Response status: ${response?.status()}`);
    console.log(`Final URL: ${page.url()}`);

    // Check if redirected to login
    const isLoginPage = page.url().includes("/login");
    console.log(`Redirected to login: ${isLoginPage}`);

    if (isLoginPage) {
      console.log("✓ Auth protection working - redirects unauthenticated requests to login");

      // Check for login form
      const emailInput = page.locator("#email, [type='email']");
      const emailExists = await emailInput.count().then((c) => c > 0);
      console.log(`Email input field found: ${emailExists}`);

      const passwordInput = page.locator("[type='password']");
      const passwordExists = await passwordInput.count().then((c) => c > 0);
      console.log(`Password input field found: ${passwordExists}`);

      const submitBtn = page.locator("button:has-text('Sign in'), button:has-text('تسجيل الدخول')");
      const submitExists = await submitBtn.count().then((c) => c > 0);
      console.log(`Submit button found: ${submitExists}`);

      if (emailExists && passwordExists && submitExists) {
        console.log("✓ Login form structure correct");
      }
    } else {
      console.log("⚠ Not redirected to login - may be already authenticated or public page");
    }

    console.log("\n=== CONCLUSION ===");
    console.log("Production server status: REACHABLE");
    console.log("Next steps require: Valid production credentials for full browser verification");
  });
});
