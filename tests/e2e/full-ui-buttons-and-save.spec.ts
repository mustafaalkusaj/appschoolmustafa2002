import fs from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import { ensureE2EEnvLoaded, getQAAccount, getQAIds } from "./helpers/e2e-env";

ensureE2EEnvLoaded();

type AuditRole = "super_admin" | "school_admin_a" | "branch_admin_a" | "normal_user";

type PageAuditEntry = {
  role: AuditRole;
  route: string;
  status: number | null;
  finalUrl: string;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  serverErrors: string[];
  visibleButtons: number;
  enabledButtons: number;
  disabledButtons: number;
  trialClickableButtons: number;
  nonActionableButtons: string[];
  tabsClicked: number;
  menuOpened: boolean;
  internalLinksChecked: number;
  badInternalLinks: string[];
  issues: string[];
};

type SaveFlowEntry = {
  feature: string;
  role: AuditRole;
  tested: boolean;
  result: "passed" | "failed" | "blocked";
  issue?: string;
  artifact?: string;
};

type ResponsiveEntry = {
  role: AuditRole;
  route: string;
  viewport: string;
  width: number;
  height: number;
  status: number | null;
  horizontalOverflow: boolean;
  issues: string[];
};

type AuditReport = {
  generatedAt: string;
  baseUrl: string;
  pages: PageAuditEntry[];
  saveFlows: SaveFlowEntry[];
  responsive: ResponsiveEntry[];
};

const report: AuditReport = {
  generatedAt: new Date().toISOString(),
  baseUrl: "",
  pages: [],
  saveFlows: [],
  responsive: [],
};

const OUTPUT_DIR = path.join(process.cwd(), "output/playwright/full-ui-audit");
const REPORT_PATH = path.join(OUTPUT_DIR, "full-ui-audit-report.json");

const ids = getQAIds();

const accounts: Record<
  AuditRole,
  {
    email: string;
    password: string;
    expectedPath: RegExp;
  }
> = {
  super_admin: {
    ...getQAAccount("super_admin"),
    expectedPath: /\/ar\/super-admin(?:\?.*)?$/,
  },
  school_admin_a: {
    ...getQAAccount("school_admin_a"),
    expectedPath: /\/ar\/(dashboard|group)(?:\?.*)?$/,
  },
  branch_admin_a: {
    ...getQAAccount("branch_admin_a"),
    expectedPath: /\/ar\/branch-overview(?:\?.*)?$/,
  },
  normal_user: {
    ...getQAAccount("normal_user_a"),
    expectedPath: /\/ar\/(dashboard|branch-overview)(?:\?.*)?$/,
  },
};

const routesByRole: Record<AuditRole, string[]> = {
  super_admin: [
    "/ar/dashboard",
    "/ar/super-admin",
    "/ar/schools",
    "/ar/users",
    "/ar/teachers",
    "/ar/students",
    "/ar/attendance",
    "/ar/payments",
    "/ar/expenses",
    "/ar/reports",
    "/ar/subscriptions",
    "/ar/branch-overview",
    "/ar/access-denied",
  ],
  school_admin_a: [
    "/ar/dashboard",
    "/ar/super-admin",
    "/ar/teachers",
    "/ar/students",
    "/ar/attendance",
    "/ar/payments",
    "/ar/expenses",
    "/ar/salaries",
    "/ar/reports",
    "/ar/fee-notifications",
    "/ar/monitoring",
    "/ar/branch-overview",
    "/ar/access-denied",
  ],
  branch_admin_a: [
    "/ar/dashboard",
    "/ar/super-admin",
    "/ar/teachers",
    "/ar/students",
    "/ar/attendance",
    "/ar/payments",
    "/ar/expenses",
    "/ar/reports",
    "/ar/branch-overview",
    "/ar/access-denied",
  ],
  normal_user: [
    "/ar/dashboard",
    "/ar/super-admin",
    "/ar/students",
    "/ar/payments",
    "/ar/access-denied",
  ],
};

function createSignals() {
  return {
    consoleErrors: [] as string[],
    pageErrors: [] as string[],
    failedRequests: [] as string[],
    serverErrors: [] as string[],
  };
}

function attachSignals(page: Page, signals: ReturnType<typeof createSignals>) {
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("favicon.ico")) {
      signals.consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    signals.pageErrors.push(error.message);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    const url = request.url();

    if (failure?.errorText === "net::ERR_ABORTED" && url.includes("_rsc=")) {
      return;
    }

    signals.failedRequests.push(`${request.method()} ${url} :: ${failure?.errorText ?? "unknown"}`);
  });

  page.on("response", (response) => {
    if (response.status() >= 500) {
      signals.serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });
}

async function login(page: Page, role: AuditRole) {
  const account = accounts[role];

  await page.goto("/ar/login", { waitUntil: "networkidle" });
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(account.password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(account.expectedPath, { timeout: 30_000 });
}

async function logout(page: Page) {
  if (page.isClosed()) {
    return;
  }

  const cancelButton = page.getByRole("button", { name: "إلغاء" }).last();
  if (await cancelButton.isVisible({ timeout: 750 }).catch(() => false)) {
    await cancelButton.click();
  }

  const menuTrigger = page.locator(".profile-menu__trigger").first();
  if (!await menuTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.goto("/ar/dashboard", { waitUntil: "domcontentloaded" });
  }

  if (await menuTrigger.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await menuTrigger.click();
    const logoutItem = page.getByRole("menuitem", { name: "تسجيل الخروج" });
    if (await logoutItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logoutItem.click();
      await expect(page).toHaveURL(/\/ar\/login(?:\?.*)?$/, { timeout: 30_000 });
    }
  }
}

async function collectButtonDiagnostics(page: Page) {
  const buttons = page.locator("button:visible");
  const visibleButtons = await buttons.count();
  const sampledButtons = Math.min(visibleButtons, 12);
  let enabledButtons = 0;
  let disabledButtons = 0;
  let trialClickableButtons = 0;
  const nonActionableButtons: string[] = [];

  for (let index = 0; index < sampledButtons; index += 1) {
    const button = buttons.nth(index);
    const label = (await button.innerText().catch(() => ""))
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || (await button.getAttribute("title").catch(() => "")) || `button-${index + 1}`;

    const disabled = !(await button.isEnabled().catch(() => false));
    if (disabled) {
      disabledButtons += 1;
      continue;
    }

    enabledButtons += 1;

    try {
      await button.click({ trial: true, timeout: 2_000 });
      trialClickableButtons += 1;
    } catch {
      nonActionableButtons.push(label);
    }
  }

  return {
    visibleButtons,
    enabledButtons,
    disabledButtons,
    trialClickableButtons,
    nonActionableButtons,
  };
}

async function checkInternalLinks(page: Page) {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
      .map((anchor) => anchor.getAttribute("href")?.trim() ?? "")
      .filter((href) => href.startsWith("/") && !href.startsWith("//")),
  );

  const uniqueHrefs = [...new Set(hrefs)].slice(0, 4);
  const badInternalLinks: string[] = [];

  for (const href of uniqueHrefs) {
    try {
      const response = await page.request.get(href, { timeout: 5_000 });
      if (response.status() >= 400 && ![401, 403].includes(response.status())) {
        badInternalLinks.push(`${href} -> ${response.status()}`);
      }
    } catch (error) {
      badInternalLinks.push(`${href} -> ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    internalLinksChecked: uniqueHrefs.length,
    badInternalLinks,
  };
}

async function interactWithTabsAndMenus(page: Page) {
  let tabsClicked = 0;
  const tabs = page.locator('[role="tab"]:visible');
  const tabCount = Math.min(await tabs.count(), 4);

  for (let index = 0; index < tabCount; index += 1) {
    await tabs.nth(index).click({ timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(200);
    tabsClicked += 1;
  }

  let menuOpened = false;
  const menuButton = page.locator('button[aria-haspopup="menu"]:visible').first();
  if (await menuButton.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await menuButton.click().catch(() => undefined);
    await page.keyboard.press("Escape").catch(() => undefined);
    menuOpened = true;
  }

  return { tabsClicked, menuOpened };
}

async function auditRoute(page: Page, role: AuditRole, route: string) {
  const signals = createSignals();
  attachSignals(page, signals);

  const entry: PageAuditEntry = {
    role,
    route,
    status: null,
    finalUrl: "",
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    serverErrors: [],
    visibleButtons: 0,
    enabledButtons: 0,
    disabledButtons: 0,
    trialClickableButtons: 0,
    nonActionableButtons: [],
    tabsClicked: 0,
    menuOpened: false,
    internalLinksChecked: 0,
    badInternalLinks: [],
    issues: [],
  };

  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30_000 });
    entry.status = response?.status() ?? null;
    entry.finalUrl = page.url();
    await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(400);

    const buttonDiagnostics = await collectButtonDiagnostics(page);
    Object.assign(entry, buttonDiagnostics);

    const linkDiagnostics = await checkInternalLinks(page);
    Object.assign(entry, linkDiagnostics);

    const interactionDiagnostics = await interactWithTabsAndMenus(page);
    Object.assign(entry, interactionDiagnostics);
  } catch (error) {
    entry.issues.push(error instanceof Error ? error.message : String(error));
    entry.finalUrl = page.url();
  }

  entry.consoleErrors = signals.consoleErrors;
  entry.pageErrors = signals.pageErrors;
  entry.failedRequests = signals.failedRequests;
  entry.serverErrors = signals.serverErrors;

  if ((entry.status ?? 0) >= 500) {
    entry.issues.push(`route returned ${entry.status}`);
  }
  if (entry.serverErrors.length > 0) {
    entry.issues.push("server errors observed");
  }
  if (entry.badInternalLinks.length > 0) {
    entry.issues.push("bad internal links observed");
  }
  if (entry.nonActionableButtons.length > 0) {
    entry.issues.push("non-actionable enabled buttons observed");
  }

  report.pages.push(entry);
}

async function recordSaveFlow(flow: SaveFlowEntry) {
  report.saveFlows.push(flow);
}

async function _createSchoolViaUi(page: Page) {
  const qaName = `QA_TEST_AUDIT_SCHOOL_${Date.now()}`;

  try {
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /إضافة مدرسة/ }).first().click();

    const dialog = page.locator(".ui-dialog").last();
    await dialog.locator("input.ui-input").first().fill(qaName);
    await dialog.getByRole("button", { name: /إضافة/ }).last().click();
    await expect(page.getByText(/تم الحفظ بنجاح/).first()).toBeVisible({ timeout: 30_000 });

    await recordSaveFlow({
      feature: "create QA_TEST school",
      role: "super_admin",
      tested: true,
      result: "passed",
      artifact: qaName,
    });
  } catch (error) {
    await recordSaveFlow({
      feature: "create QA_TEST school",
      role: "super_admin",
      tested: true,
      result: "failed",
      issue: error instanceof Error ? error.message : String(error),
      artifact: qaName,
    });
  }
}

async function _createBranchViaUi(page: Page) {
  const qaName = `QA_TEST_AUDIT_BRANCH_${Date.now()}`;

  try {
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });
    const branchesTab = page.getByRole("button", { name: /الفروع|Branches/i }).first();
    if (await branchesTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await branchesTab.click();
    }

    await page.getByRole("button", { name: /إضافة فرع/ }).first().click();
    const dialog = page.locator(".ui-dialog").last();
    const schoolSelect = dialog.locator("select").first();
    await schoolSelect.selectOption(ids.schoolAId);
    await dialog.locator('input.ui-input[type="text"]').first().fill(qaName);
    await dialog.getByRole("button", { name: /إضافة الفرع/ }).click();
    await expect(page.getByText(/تم حفظ الفرع|تم الحفظ/).first()).toBeVisible({ timeout: 30_000 });

    await recordSaveFlow({
      feature: "create QA_TEST branch",
      role: "super_admin",
      tested: true,
      result: "passed",
      artifact: qaName,
    });
  } catch (error) {
    await recordSaveFlow({
      feature: "create QA_TEST branch",
      role: "super_admin",
      tested: true,
      result: "failed",
      issue: error instanceof Error ? error.message : String(error),
      artifact: qaName,
    });
  }
}

function makeTinyPngBuffer() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9s1tFoAAAAAASUVORK5CYII=",
    "base64",
  );
}

async function uploadSchoolLogo(page: Page) {
  try {
    await page.goto(`/ar/dashboard?school=${ids.schoolAId}`, { waitUntil: "networkidle" });
    const input = page.getByTestId("school-logo-input");
    await expect(input).toBeAttached({ timeout: 20_000 });
    await input.setInputFiles({
      name: "QA_TEST_school_logo.png",
      mimeType: "image/png",
      buffer: makeTinyPngBuffer(),
    });
    await expect(page.locator('input[placeholder*="logo"], input[placeholder*="الشعار"]').first()).toHaveValue(/school-logos|QA_TEST_school_logo/, { timeout: 30_000 });

    await recordSaveFlow({
      feature: "school logo upload",
      role: "super_admin",
      tested: true,
      result: "passed",
    });
  } catch (error) {
    await recordSaveFlow({
      feature: "school logo upload",
      role: "super_admin",
      tested: true,
      result: "failed",
      issue: error instanceof Error ? error.message : String(error),
    });
  }
}

async function uploadBranchLogo(page: Page) {
  try {
    await page.goto("/ar/super-admin", { waitUntil: "networkidle" });
    const branchesTab = page.getByRole("button", { name: /الفروع|Branches/i }).first();
    if (await branchesTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await branchesTab.click();
    }

    await page.getByRole("button", { name: /تعديل/i }).first().click();
    const input = page.getByTestId("branch-logo-input");
    await expect(input).toBeAttached({ timeout: 10_000 });
    await input.setInputFiles({
      name: "QA_TEST_branch_logo.png",
      mimeType: "image/png",
      buffer: makeTinyPngBuffer(),
    });
    await expect(page.locator('input[placeholder*="URL"]').last()).toHaveValue(/branch-logos|QA_TEST_branch_logo/, { timeout: 30_000 });

    await recordSaveFlow({
      feature: "branch logo upload",
      role: "super_admin",
      tested: true,
      result: "passed",
    });
  } catch (error) {
    await recordSaveFlow({
      feature: "branch logo upload",
      role: "super_admin",
      tested: true,
      result: "failed",
      issue: error instanceof Error ? error.message : String(error),
    });
  }
}

async function _createExpenseTypeAndExpense(page: Page) {
  const typeName = `QA_TEST_EXPENSE_TYPE_${Date.now()}`;
  const note = `QA_TEST_EXPENSE_NOTE_${Date.now()}`;

  try {
    await page.goto("/ar/expenses", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /الأنواع|Categories/i }).first().click().catch(() => undefined);
    await page.getByRole("button", { name: /إضافة نوع/ }).first().click();

    await page.locator('input[placeholder*="صيانة"], input[placeholder*="Maintenance"]').first().fill(typeName);
    await page.locator("textarea").last().fill(note);
    await page.getByRole("button", { name: /إضافة نوع|حفظ التغييرات/ }).click();
    await expect(page.getByText(/تمت إضافة النوع|تم تحديث النوع|تم الحفظ/).first()).toBeVisible({ timeout: 30_000 });

    await recordSaveFlow({
      feature: "create QA_TEST expense type",
      role: "school_admin_a",
      tested: true,
      result: "passed",
      artifact: typeName,
    });

    await page.getByRole("button", { name: /المصروفات|Expenses/i }).first().click().catch(() => undefined);
    await page.getByRole("button", { name: /إضافة مصروف/ }).first().click();
    await page.locator("select").first().selectOption({ label: typeName });
    await page.locator('input[type="number"]').first().fill("12345");
    await page.locator('input[type="date"]').first().fill(new Date().toISOString().slice(0, 10));
    await page.locator('input[placeholder*="اسم"], input[placeholder*="recipient"]').first().fill("QA_TEST_RECIPIENT");
    await page.locator('input[placeholder*="الإيصال"], input[placeholder*="receipt"]').first().fill(`QA-${Date.now()}`);
    await page.locator("textarea").first().fill(note);
    await page.getByRole("button", { name: /إضافة السجل|تعديل السجل/ }).click();
    await expect(page.getByText(/تمت إضافة المصروف|تم تحديث المصروف/).first()).toBeVisible({ timeout: 30_000 });

    await recordSaveFlow({
      feature: "create QA_TEST expense",
      role: "school_admin_a",
      tested: true,
      result: "passed",
      artifact: note,
    });
  } catch (error) {
    await recordSaveFlow({
      feature: "create QA_TEST expense type",
      role: "school_admin_a",
      tested: true,
      result: "failed",
      issue: error instanceof Error ? error.message : String(error),
      artifact: typeName,
    });
  }
}

async function verifyNormalUserRestrictions(page: Page) {
  try {
    await page.goto("/ar/students", { waitUntil: "networkidle" });
    const addStudentButton = page.getByRole("button", { name: /إضافة طالب|Add Student/i });
    const visible = await addStudentButton.isVisible({ timeout: 2_000 }).catch(() => false);

    await recordSaveFlow({
      feature: "normal user cannot access admin save actions",
      role: "normal_user",
      tested: true,
      result: visible ? "failed" : "passed",
      issue: visible ? "Add student button is visible for normal user." : undefined,
    });
  } catch (error) {
    await recordSaveFlow({
      feature: "normal user cannot access admin save actions",
      role: "normal_user",
      tested: true,
      result: "failed",
      issue: error instanceof Error ? error.message : String(error),
    });
  }
}

async function openAndCancelFlow(page: Page, input: {
  feature: string;
  role: AuditRole;
  route: string;
  openButton: RegExp;
  modalHeading: RegExp;
}) {
  try {
    await page.goto(input.route, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: input.openButton }).first().click();
    await expect(page.getByText(input.modalHeading).first()).toBeVisible({ timeout: 15_000 });

    const cancelButton = page.getByRole("button", { name: /إلغاء|Cancel/i }).last();
    if (await cancelButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await cancelButton.click();
    } else {
      await page.keyboard.press("Escape").catch(() => undefined);
    }

    await recordSaveFlow({
      feature: input.feature,
      role: input.role,
      tested: true,
      result: "passed",
    });
  } catch (error) {
    await recordSaveFlow({
      feature: input.feature,
      role: input.role,
      tested: true,
      result: "failed",
      issue: error instanceof Error ? error.message : String(error),
    });
  }
}

test.describe.serial("full ui buttons and save audit", () => {
  test.setTimeout(30 * 60_000);
  // Disable trace/video for this describe — the crawl runs 25+ min and generates massive
  // trace data that exhausts browser memory and corrupts trace files on cleanup.
  // This suite writes its own JSON report so traces are not needed.
  test.use({ trace: "off", video: "off", screenshot: "only-on-failure" });

  test.beforeAll(async ({ baseURL }) => {
    report.baseUrl = baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  });

  test.afterAll(async () => {
    await fs.writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  });

  test("crawl routes and audit visible buttons", async ({ page }) => {
    for (const role of Object.keys(routesByRole) as AuditRole[]) {
      await login(page, role);
      for (const route of routesByRole[role]) {
        await auditRoute(page, role, route);
      }
      await logout(page);
    }
  });

  test("exercise safe save flows", async ({ page }) => {
    await login(page, "super_admin");
    await uploadSchoolLogo(page);
    await uploadBranchLogo(page);
    await logout(page);

    await login(page, "school_admin_a");
    await openAndCancelFlow(page, {
      feature: "students add modal open/cancel",
      role: "school_admin_a",
      route: "/ar/students",
      openButton: /إضافة طالب|Add Student/i,
      modalHeading: /إضافة طالب|Add Student/i,
    });
    await openAndCancelFlow(page, {
      feature: "teachers add modal open/cancel",
      role: "school_admin_a",
      route: "/ar/teachers",
      openButton: /إضافة أستاذ|Add Teacher/i,
      modalHeading: /إضافة أستاذ|Teacher/i,
    });
    await openAndCancelFlow(page, {
      feature: "expenses add modal open/cancel",
      role: "school_admin_a",
      route: "/ar/expenses",
      openButton: /إضافة مصروف|Add expense/i,
      modalHeading: /إضافة مصروف جديد|Add expense/i,
    });
    await logout(page);

    await login(page, "normal_user");
    await verifyNormalUserRestrictions(page);
    await logout(page);
  });

  test("responsive smoke for login and dashboard", async ({ page }) => {
    const viewports = [
      { viewport: "desktop", width: 1440, height: 900 },
      { viewport: "tablet", width: 768, height: 1024 },
      { viewport: "mobile", width: 390, height: 844 },
    ];

    for (const size of viewports) {
      await page.setViewportSize({ width: size.width, height: size.height });

      const loginResponse = await page.goto("/ar/login", { waitUntil: "networkidle" });
      report.responsive.push({
        role: "school_admin_a",
        route: "/ar/login",
        viewport: size.viewport,
        width: size.width,
        height: size.height,
        status: loginResponse?.status() ?? null,
        horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
        issues: [],
      });

      await login(page, "school_admin_a");
      const dashboardResponse = await page.goto("/ar/dashboard", { waitUntil: "networkidle" });
      report.responsive.push({
        role: "school_admin_a",
        route: "/ar/dashboard",
        viewport: size.viewport,
        width: size.width,
        height: size.height,
        status: dashboardResponse?.status() ?? null,
        horizontalOverflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1),
        issues: [],
      });
      await logout(page);
    }
  });
});
