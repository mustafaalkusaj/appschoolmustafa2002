import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { ensureE2EEnvLoaded, getQAAccount, getQAIds } from "./helpers/e2e-env";

ensureE2EEnvLoaded();

type FailureEventState = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
};

function createFailureEventState(): FailureEventState {
  return {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };
}

function bindFailureEventCapture(page: Page, state: FailureEventState) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      state.consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    state.pageErrors.push(error.message);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    state.failedRequests.push(`${request.method()} ${request.url()} :: ${failure?.errorText ?? "unknown"}`);
  });
}

async function attachFailureArtifacts(testInfo: TestInfo, state: FailureEventState) {
  if (testInfo.status === testInfo.expectedStatus) {
    return;
  }

  await testInfo.attach("console-errors", {
    body: Buffer.from(state.consoleErrors.join("\n") || "none", "utf8"),
    contentType: "text/plain",
  });
  await testInfo.attach("page-errors", {
    body: Buffer.from(state.pageErrors.join("\n") || "none", "utf8"),
    contentType: "text/plain",
  });
  await testInfo.attach("failed-requests", {
    body: Buffer.from(state.failedRequests.join("\n") || "none", "utf8"),
    contentType: "text/plain",
  });
}

async function login(page: Page, email: string, password: string, expectedPath: RegExp) {
  await page.goto("/ar/login", { waitUntil: "networkidle" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(expectedPath, { timeout: 30_000 });
}

async function logout(page: Page) {
  const cancelButton = page.getByRole("button", { name: "إلغاء" }).last();
  if (await cancelButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await cancelButton.click();
    await expect(cancelButton).toBeHidden({ timeout: 10_000 }).catch(() => {});
  }

  // Navigate to dashboard if current page has no profile menu (e.g. access-denied)
  const menuTrigger = page.locator(".profile-menu__trigger").first();
  if (!await menuTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.goto("/ar/dashboard", { waitUntil: "domcontentloaded" });
  }
  await expect(menuTrigger).toBeVisible({ timeout: 15_000 });
  await menuTrigger.click();
  await page.getByRole("menuitem", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/ar\/login(?:\?.*)?$/, { timeout: 30_000 });
}

async function expectGuardedRoute(page: Page, route: string) {
  await page.goto(`/ar${route}`, { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.url(), { timeout: 20_000 }).toMatch(/\/ar\/(login|access-denied|subscription-expired)(?:\?|$)/);
}

async function requestJson(page: Page, url: string, options?: { expectedStatuses?: number[] }) {
  const response = await page.request.get(url);
  const expectedStatuses = options?.expectedStatuses ?? [200];
  expect(expectedStatuses).toContain(response.status());
  const text = await response.text();
  return {
    response,
    text,
    json: text ? JSON.parse(text) : null,
  };
}

function makeTinyPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s1tFoAAAAAASUVORK5CYII=",
    "base64",
  );
}

test.beforeEach(async ({ page }, testInfo) => {
  const state = createFailureEventState();
  bindFailureEventCapture(page, state);
  testInfo.setTimeout(90_000);
  testInfo.annotations.push({ type: "failure-state", description: JSON.stringify(state) });
  (testInfo as TestInfo & { qaFailureState?: FailureEventState }).qaFailureState = state;
});

test.afterEach(async ({}, testInfo) => {
  const state = (testInfo as TestInfo & { qaFailureState?: FailureEventState }).qaFailureState;
  if (state) {
    await attachFailureArtifacts(testInfo, state);
  }
});

test.describe("QA Auth and RBAC", () => {
  const ids = getQAIds();
  const superAdmin = getQAAccount("super_admin");
  const schoolAdminA = getQAAccount("school_admin_a");
  const schoolAdminB = getQAAccount("school_admin_b");
  const branchAdminA = getQAAccount("branch_admin_a");
  const branchAdminB = getQAAccount("branch_admin_b");
  const normalUserA = getQAAccount("normal_user_a");

  test("public and unauthenticated protection works", async ({ page }) => {
    await page.goto("/ar/login", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/ar\/login$/);
    await expect(page.locator("#email")).toBeVisible();

    await expectGuardedRoute(page, "/dashboard");
    await expectGuardedRoute(page, "/super-admin");
    await expectGuardedRoute(page, "/users");

    const unauthenticatedApis = [
      "/api/users",
      `/api/web/dashboard/overview?schoolId=${ids.schoolAId}`,
      "/api/web/super-admin/overview",
      `/api/web/students/list?schoolId=${ids.schoolAId}`,
    ];

    for (const api of unauthenticatedApis) {
      const response = await page.request.get(api);
      expect([401, 403]).toContain(response.status());
    }
  });

  test("super admin login, access, and logout work", async ({ page }) => {
    await login(page, superAdmin.email, superAdmin.password, /\/ar\/super-admin(?:\?.*)?$/);
    await page.goto("/ar/schools", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/ar\/schools(?:\?.*)?$/);
    await page.goto("/ar/users", { waitUntil: "networkidle" });
    // /ar/users redirects to /ar/teachers — intentional product behaviour (users list is under teachers)
    await expect(page).toHaveURL(/\/ar\/(users|teachers)(?:\?.*)?$/);
    await page.goto("/ar/dashboard", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/ar\/dashboard(?:\?.*)?$/);
    await logout(page);
  });

  test("school admin A is scoped to school A and denied super admin", async ({ page }) => {
    await login(page, schoolAdminA.email, schoolAdminA.password, /\/ar\/(dashboard|group)(?:\?.*)?$/);

    await page.goto("/ar/super-admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ar\/access-denied(?:\?.*)?$/);

    const brandingOwn = await requestJson(page, `/api/web/dashboard/branding?schoolId=${ids.schoolAId}`);
    expect(brandingOwn.json?.school?.id).toBe(ids.schoolAId);

    const brandingOther = await page.request.get(`/api/web/dashboard/branding?schoolId=${ids.schoolBId}`);
    expect(brandingOther.status()).toBe(403);

    const overviewOther = await page.request.get(`/api/web/dashboard/overview?schoolId=${ids.schoolBId}`);
    expect(overviewOther.status()).toBe(403);

    await logout(page);
  });

  test("school admin B is scoped to school B and denied school A", async ({ page }) => {
    await login(page, schoolAdminB.email, schoolAdminB.password, /\/ar\/(dashboard|group)(?:\?.*)?$/);

    const brandingOwn = await requestJson(page, `/api/web/dashboard/branding?schoolId=${ids.schoolBId}`);
    expect(brandingOwn.json?.school?.id).toBe(ids.schoolBId);

    const brandingOther = await page.request.get(`/api/web/dashboard/branding?schoolId=${ids.schoolAId}`);
    expect(brandingOther.status()).toBe(403);

    const overviewOther = await page.request.get(`/api/web/dashboard/overview?schoolId=${ids.schoolAId}`);
    expect(overviewOther.status()).toBe(403);

    await logout(page);
  });

  test("branch admin A only accesses branch A scope", async ({ page }) => {
    await login(page, branchAdminA.email, branchAdminA.password, /\/ar\/branch-overview(?:\?.*)?$/);

    await page.goto("/ar/super-admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ar\/access-denied(?:\?.*)?$/);

    const ownStudents = await requestJson(page, `/api/web/students/list?schoolId=${ids.schoolAId}&branchId=${ids.branchAId}`);
    expect(ownStudents.response.status()).toBe(200);
    expect(JSON.stringify(ownStudents.json)).toContain("QA_TEST_BRANCH_A_STUDENT");
    expect(JSON.stringify(ownStudents.json)).not.toContain("QA_TEST_BRANCH_B_STUDENT");

    const otherStudents = await page.request.get(`/api/web/students/list?schoolId=${ids.schoolAId}&branchId=${ids.branchBId}`);
    expect(otherStudents.status()).toBe(403);

    const ownOverview = await requestJson(page, `/api/web/dashboard/overview?schoolId=${ids.schoolAId}&branchId=${ids.branchAId}`);
    expect(ownOverview.response.status()).toBe(200);

    const otherOverview = await page.request.get(`/api/web/dashboard/overview?schoolId=${ids.schoolAId}&branchId=${ids.branchBId}`);
    expect(otherOverview.status()).toBe(403);

    await logout(page);
  });

  test("branch admin B only accesses branch B scope", async ({ page }) => {
    await login(page, branchAdminB.email, branchAdminB.password, /\/ar\/branch-overview(?:\?.*)?$/);

    const ownStudents = await requestJson(page, `/api/web/students/list?schoolId=${ids.schoolAId}&branchId=${ids.branchBId}`);
    expect(ownStudents.response.status()).toBe(200);
    expect(JSON.stringify(ownStudents.json)).toContain("QA_TEST_BRANCH_B_STUDENT");
    expect(JSON.stringify(ownStudents.json)).not.toContain("QA_TEST_BRANCH_A_STUDENT");

    const otherStudents = await page.request.get(`/api/web/students/list?schoolId=${ids.schoolAId}&branchId=${ids.branchAId}`);
    expect(otherStudents.status()).toBe(403);

    await logout(page);
  });

  test("normal user is denied admin surfaces and stays in allowed scope", async ({ page }) => {
    await login(page, normalUserA.email, normalUserA.password, /\/ar\/(dashboard|branch-overview)(?:\?.*)?$/);

    for (const route of ["/super-admin", "/schools", "/users"]) {
      await page.goto(`/ar${route}`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/ar\/access-denied(?:\?.*)?$/);
    }

    const ownStudents = await requestJson(page, `/api/web/students/list?schoolId=${ids.schoolAId}&branchId=${ids.branchAId}`);
    expect(ownStudents.response.status()).toBe(200);
    expect(JSON.stringify(ownStudents.json)).toContain("QA_TEST_BRANCH_A_STUDENT");

    const otherStudents = await page.request.get(`/api/web/students/list?schoolId=${ids.schoolAId}&branchId=${ids.branchBId}`);
    expect(otherStudents.status()).toBe(403);

    await logout(page);
  });

  test("API authorization rejects weaker roles on super admin endpoints", async ({ page }) => {
    await login(page, schoolAdminA.email, schoolAdminA.password, /\/ar\/(dashboard|group)(?:\?.*)?$/);
    const schoolAdminSuperEndpoint = await page.request.get("/api/web/super-admin/overview");
    expect(schoolAdminSuperEndpoint.status()).toBe(403);
    await logout(page);

    await login(page, branchAdminA.email, branchAdminA.password, /\/ar\/branch-overview(?:\?.*)?$/);
    const branchAdminSuperEndpoint = await page.request.get("/api/web/super-admin/overview");
    expect(branchAdminSuperEndpoint.status()).toBe(403);
    await logout(page);
  });

  test("branch admin cannot access general school dashboard and lands on branch overview", async ({ page }) => {
    await login(page, branchAdminA.email, branchAdminA.password, /\/ar\/branch-overview(?:\?.*)?$/);

    // Direct navigation to /ar/dashboard must redirect to /ar/branch-overview
    await page.goto("/ar/dashboard", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/ar\/branch-overview(?:\?.*)?$/, { timeout: 15_000 });

    await logout(page);
  });

  test("school logo upload works for admin and invalid file is rejected", async ({ page }) => {
    // SchoolBrandingPanel only renders for super_admin on dashboard
    await login(page, superAdmin.email, superAdmin.password, /\/ar\/super-admin(?:\?.*)?$/);
    await page.goto(`/ar/dashboard?school=${ids.schoolAId}`, { waitUntil: "networkidle" });

    const schoolLogoInput = page.getByTestId("school-logo-input");
    await expect(schoolLogoInput).toBeAttached({ timeout: 20_000 });
    await schoolLogoInput.setInputFiles({
      name: "QA_TEST_school_logo.png",
      mimeType: "image/png",
      buffer: makeTinyPngBuffer(),
    });

    await expect(page.locator('input[placeholder*="logo"], input[placeholder*="الشعار"]').first()).toHaveValue(/QA_TEST_school_logo|school-logos/, { timeout: 30_000 });

    await schoolLogoInput.setInputFiles({
      name: "QA_TEST_invalid_logo.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("QA_TEST_INVALID", "utf8"),
    });

    const schoolLogoError = page.getByTestId("school-logo-upload-error");
    await expect(schoolLogoError).toBeVisible({ timeout: 30_000 });
    await expect(schoolLogoError).toContainText(/تعذر رفع الصورة|نوع الملف|غير مدعوم|invalid|mime/i);
    await logout(page);
  });

  test("branch logo upload works for super admin and normal user cannot upload via storage API", async ({ page }) => {
    await login(page, superAdmin.email, superAdmin.password, /\/ar\/super-admin(?:\?.*)?$/);
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });

    const branchesTabButton = page.getByRole("button", { name: /الفروع|Branches/i }).first();
    if (await branchesTabButton.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await branchesTabButton.click();
    }

    // branch-logo-input is inside the branch edit modal — click تعديل on first branch
    const editButton = page.getByRole("button", { name: /تعديل/i }).first();
    await expect(editButton).toBeVisible({ timeout: 15_000 });
    await editButton.click();

    const branchLogoInput = page.getByTestId("branch-logo-input");
    await expect(branchLogoInput).toBeAttached({ timeout: 10_000 });
    await branchLogoInput.setInputFiles({
      name: "QA_TEST_branch_logo.png",
      mimeType: "image/png",
      buffer: makeTinyPngBuffer(),
    });

    await expect(page.locator('input[placeholder*="URL"]').last()).toHaveValue(/QA_TEST_branch_logo|branch-logos/, { timeout: 30_000 });
    await logout(page);

    await login(page, normalUserA.email, normalUserA.password, /\/ar\/(dashboard|branch-overview)(?:\?.*)?$/);
    const deniedUpload = await page.request.post("/storage/v1/object/branch-logos/test/QA_TEST_forbidden.png", {
      headers: {
        "content-type": "image/png",
      },
      data: makeTinyPngBuffer(),
    });
    expect([401, 403, 404]).toContain(deniedUpload.status());
    await logout(page);
  });
});
