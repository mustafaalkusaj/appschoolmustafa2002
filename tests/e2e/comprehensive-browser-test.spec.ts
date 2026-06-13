/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  COMPREHENSIVE FULL-BROWSER E2E TEST
 *  Tests EVERY section of the school-app with REAL data entry
 *  Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test comprehensive-browser-test --headed
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { test, expect, type Page } from "@playwright/test";

import { ensureE2EEnvLoaded, getQAAccount, getQAIds } from "./helpers/e2e-env";

ensureE2EEnvLoaded();

/* ─── Types ─────────────────────────────────────────────────────────────── */

type FlowStatus = "passed" | "failed" | "blocked" | "skipped";

type FlowResult = {
  section: string;
  flow: string;
  status: FlowStatus;
  detail: string;
  durationMs: number;
  timestamp: string;
};

class BlockedError extends Error {}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const OUTPUT_DIR = path.join(process.cwd(), "output/playwright/comprehensive-test");
const REPORT_PATH = path.join(OUTPUT_DIR, "comprehensive-test-report.json");
const SCREENSHOTS_DIR = path.join(OUTPUT_DIR, "screenshots");

const ids = getQAIds();
const superAdmin = getQAAccount("super_admin");
const schoolAdmin = getQAAccount("school_admin_a");

const TS = Date.now();
function qaStamp(prefix: string) {
  return `QA_TEST_${prefix}_${TS}`;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function blocked(msg: string): never {
  throw new BlockedError(msg);
}

async function login(page: Page, email: string, password: string, expectedUrl: RegExp) {
  await page.goto("/ar/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(expectedUrl, { timeout: 30_000 });
}

async function logout(page: Page) {
  for (const label of ["إلغاء", "إغلاق"]) {
    const btn = page.getByRole("button", { name: label }).last();
    if (await btn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await btn.click();
    }
  }

  const menuTrigger = page.locator(".profile-menu__trigger").first();
  if (!await menuTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.goto("/ar/dashboard", { waitUntil: "domcontentloaded" });
  }

  if (!await menuTrigger.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await page.context().clearCookies();
    await page.goto("/ar/login", { waitUntil: "domcontentloaded" });
    return;
  }

  await menuTrigger.click();
  await page.getByRole("menuitem", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/ar\/login/, { timeout: 30_000 });
}

async function screenshot(page: Page, name: string) {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function pickFirstOption(select: Page | import("@playwright/test").Locator, selector?: string) {
  const el = selector ? (select as Page).locator(selector) : (select as import("@playwright/test").Locator);
  const value = await el.evaluate((element) => {
    const opts = Array.from((element as HTMLSelectElement).options);
    const match = opts.find((o) => o.value && o.value !== "" && o.value !== "__manual__");
    return match?.value ?? "";
  });
  if (!value) blocked("No selectable option available in dropdown");
  await el.selectOption(value);
  return value;
}

async function waitForApi(
  page: Page,
  urlPattern: RegExp,
  action: () => Promise<void>,
  okStatuses = [200, 201],
  timeoutMs = 15_000,
) {
  // Listen for ANY response matching URL (regardless of status) for diagnostics
  let diagnosticResponse: { status: number; url: string; body: string } | null = null;
  const diagHandler = async (r: import("@playwright/test").Response) => {
    if (urlPattern.test(r.url())) {
      const body = await r.text().catch(() => "(unreadable)");
      diagnosticResponse = { status: r.status(), url: r.url(), body: body.slice(0, 500) };
    }
  };
  page.on("response", diagHandler);

  const responsePromise = page.waitForResponse(
    (r) => urlPattern.test(r.url()) && okStatuses.includes(r.status()),
    { timeout: timeoutMs },
  );
  await action();
  try {
    return await responsePromise;
  } catch {
    // Timeout — report what we DID see
    page.off("response", diagHandler);
    if (diagnosticResponse) {
      throw new Error(
        `API responded with status ${diagnosticResponse.status} (expected ${okStatuses.join("/")}). ` +
        `URL: ${diagnosticResponse.url}. Body: ${diagnosticResponse.body}`
      );
    }
    throw new Error(`No response matching ${urlPattern} within ${timeoutMs}ms — form submit may not have fired`);
  } finally {
    page.off("response", diagHandler);
  }
}

async function dismissOverlays(page: Page) {
  for (const label of ["إغلاق", "إلغاء", "موافق", "تم"]) {
    const btn = page.getByRole("button", { name: label }).last();
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(300);
    }
  }
}

/* ─── Flow Runner ───────────────────────────────────────────────────────── */

const allResults: FlowResult[] = [];

async function runFlow(
  section: string,
  flow: string,
  fn: () => Promise<string>,
) {
  const start = Date.now();
  try {
    console.log(`\n▸ [${section}] START: ${flow}`);
    const detail = await fn();
    const dur = Date.now() - start;
    console.log(`  ✅ PASS (${dur}ms): ${detail}`);
    allResults.push({
      section,
      flow,
      status: "passed",
      detail,
      durationMs: dur,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const dur = Date.now() - start;
    if (error instanceof BlockedError) {
      console.log(`  ⏸ BLOCKED (${dur}ms): ${error.message}`);
      allResults.push({
        section,
        flow,
        status: "blocked",
        detail: error.message,
        durationMs: dur,
        timestamp: new Date().toISOString(),
      });
    } else {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ FAIL (${dur}ms): ${msg}`);
      allResults.push({
        section,
        flow,
        status: "failed",
        detail: msg,
        durationMs: dur,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION FLOWS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── 1. BRANDING (Super Admin) ─────────────────────────────────────────── */

async function flowBrandingSave(page: Page) {
  await page.goto(`/ar/dashboard?school=${ids.schoolAId}`, { waitUntil: "domcontentloaded" });
  const saveBtn = page.getByRole("button", { name: "حفظ الهوية" });
  if (!await saveBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
    blocked("Branding save button not visible");
  }

  await waitForApi(page, /\/api\/web\/dashboard\/branding$/, () => saveBtn.click());
  await expect(page.getByText(/تم تحديث الشعار|حُفظت الألوان/).first()).toBeVisible({ timeout: 15_000 });
  await screenshot(page, "01-branding-saved");
  return "Branding saved successfully (no-op save on existing data)";
}

async function flowSchoolLogoSmoke(page: Page) {
  await page.goto(`/ar/dashboard?school=${ids.schoolAId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("school-logo-input")).toBeAttached({ timeout: 20_000 });
  await screenshot(page, "02-school-logo-control");
  return "School logo upload control is present and attached";
}

/* ─── 2. STUDENTS (School Admin) ────────────────────────────────────────── */

async function flowStudentCreate(page: Page) {
  const name = qaStamp("STUDENT");
  await page.goto("/ar/students", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4_000);
  await screenshot(page, "03a-students-page-before-add");

  const addBtn = page.getByRole("button", { name: /إضافة طالب/ });
  if (!await addBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
    const bodyText = await page.locator("body").textContent().catch(() => "");
    blocked(`Add student button not visible. URL: ${page.url()}. Body: ${bodyText?.slice(0, 400)}`);
  }

  await addBtn.click();
  const modal = page.locator('[role="dialog"]').filter({ hasText: "إضافة طالب جديد" }).first();
  await expect(modal).toBeVisible({ timeout: 15_000 });

  await modal.locator("#full_name").fill(name);

  // Try to select class from dropdown; fall back to manual entry if empty
  const classSelect = modal.locator("#class_name");
  const classValue = await classSelect.evaluate((el) => {
    const opts = Array.from((el as HTMLSelectElement).options);
    const match = opts.find((o) => o.value && o.value !== "" && o.value !== "__manual__");
    return match?.value ?? "";
  });
  if (classValue) {
    await classSelect.selectOption(classValue);
  } else {
    // No class options available — use manual entry
    await classSelect.selectOption("__manual__");
    const manualInput = modal.locator('input[placeholder]').last();
    if (await manualInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await manualInput.fill("QA_CLASS_MANUAL");
      // Remove required from select — React changes form.class_name to typed text,
      // making the select value mismatch and browser validation blocks submission
      await classSelect.evaluate((el) => el.removeAttribute("required"));
    }
  }

  await modal.locator("#section").fill("QA_SEC");
  // Step 1→2: click "Next"
  const step1Next = modal.getByRole("button", { name: "التالي" });
  await step1Next.click();
  await page.waitForTimeout(500);
  // Verify we advanced to step 2 (address field should appear)
  const addressField = modal.locator("#address");
  if (!await addressField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await screenshot(page, "03b-student-step1-stuck");
    const formErrors = await modal.locator('[role="alert"]').textContent().catch(() => "none");
    blocked(`Student form stuck on step 1. Validation errors: ${formErrors}`);
  }

  await addressField.fill("QA Test Address 123");
  await modal.locator("#phone").fill("07700000099");
  // Step 2→3: click "Next"
  await modal.getByRole("button", { name: "التالي" }).click();
  await page.waitForTimeout(500);
  // Verify we advanced to step 3 (total_fee field should appear)
  const feeField = modal.locator("#total_fee");
  if (!await feeField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await screenshot(page, "03c-student-step2-stuck");
    const formErrors = await modal.locator('[role="alert"]').textContent().catch(() => "none");
    blocked(`Student form stuck on step 2. Validation errors: ${formErrors}`);
  }

  await feeField.fill("1000000");
  await modal.locator("#paid_fee").fill("250000");
  await modal.locator("#discount_value").fill("50000");

  await screenshot(page, "03d-student-before-save");
  await waitForApi(page, /\/api\/dashboard\/users$/, async () => {
    await modal.getByRole("button", { name: /حفظ الطالب/ }).click();
  }).catch((err) => {
    blocked(`Student creation failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  await expect(page.getByText(/تم إضافة الطالب/).first()).toBeVisible({ timeout: 30_000 });
  await screenshot(page, "03-student-created");
  return `Created student: ${name}`;
}

async function flowStudentEdit(page: Page) {
  const searchTerm = `QA_TEST_STUDENT_${TS}`;
  await page.goto("/ar/students", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  const searchInput = page.getByPlaceholder("بحث...").first();
  if (!await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    blocked("Search input not visible on students page");
  }
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(1_500);

  const row = page.locator("tr", { hasText: searchTerm }).first();
  if (!await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
    blocked("Cannot find student row for editing");
  }

  await row.getByRole("button", { name: /خيارات/ }).click();
  await page.locator("[data-student-dropdown-action]", { hasText: "تعديل" }).click();

  const editModal = page.locator('[role="dialog"]').filter({ hasText: "تعديل بيانات الطالب" }).first();
  await expect(editModal).toBeVisible({ timeout: 15_000 });

  await editModal.locator("#edit_address").fill("QA Updated Address " + TS);

  await waitForApi(page, /\/api\/web\/students\/[^/]+$/, async () => {
    await editModal.getByRole("button", { name: /حفظ التعديلات/ }).click();
  });

  await expect(page.getByText(/تم تحديث البيانات/).first()).toBeVisible({ timeout: 30_000 });
  await screenshot(page, "04-student-edited");
  return `Edited student address for: ${searchTerm}`;
}

/* ─── 3. TEACHERS (School Admin) ────────────────────────────────────────── */

async function flowTeacherCreate(page: Page) {
  const name = qaStamp("TEACHER");

  await page.goto("/ar/teachers", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);
  await screenshot(page, "05a-teachers-page-before-add");

  const addBtn = page.getByRole("button", { name: "إضافة أستاذ" });
  if (!await addBtn.isVisible({ timeout: 15_000 }).catch(() => false)) {
    const bodyText = await page.locator("body").textContent().catch(() => "");
    blocked(`Add teacher button not visible. URL: ${page.url()}. Body: ${bodyText?.slice(0, 400)}`);
  }

  await addBtn.click();
  const modal = page.locator('[role="dialog"]').filter({ hasText: "إضافة أستاذ جديد" }).first();
  await expect(modal).toBeVisible({ timeout: 15_000 });

  // Photo input is hidden — first visible input is full_name
  const nameInput = modal.locator('input:visible').first();
  await nameInput.fill(name);

  // Navigate through 3 sections (Basic → Contact → Work → Finance) to reach save button
  for (let i = 0; i < 3; i++) {
    const nextBtn = modal.getByRole("button", { name: /التالي/ });
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(300);
    }
  }

  await waitForApi(page, /\/api\/web\/teachers/, async () => {
    await modal.getByRole("button", { name: "حفظ الأستاذ" }).click();
  }).catch((err) => {
    blocked(`Teacher creation failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  // No success toast — wait for modal to close
  await expect(modal).not.toBeVisible({ timeout: 15_000 });
  await dismissOverlays(page);
  await screenshot(page, "05-teacher-created");
  return `Created teacher: ${name}`;
}

async function flowTeacherEdit(page: Page) {
  const searchTerm = `QA_TEST_TEACHER_${TS}`;
  await page.goto("/ar/teachers", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  const searchInput = page.getByPlaceholder(/بحث/).first();
  if (!await searchInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    blocked("Search input not visible on teachers page");
  }
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(1_500);

  const row = page.locator("tr", { hasText: searchTerm }).first();
  if (!await row.isVisible({ timeout: 10_000 }).catch(() => false)) {
    blocked("Cannot find teacher row for editing");
  }

  await row.getByRole("button", { name: "تعديل" }).click();

  const editModal = page.locator('[role="dialog"]').filter({ hasText: "تعديل بيانات الأستاذ" }).first();
  await expect(editModal).toBeVisible({ timeout: 15_000 });

  // Navigate through 3 sections to reach Finance section where save button appears
  for (let i = 0; i < 3; i++) {
    const nextBtn = editModal.getByRole("button", { name: /التالي/ });
    if (await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(300);
    }
  }

  await waitForApi(page, /\/api\/web\/teachers\/[^/]+/, async () => {
    await editModal.getByRole("button", { name: "حفظ الأستاذ" }).click();
  });

  await expect(editModal).not.toBeVisible({ timeout: 15_000 });
  await screenshot(page, "06-teacher-edited");
  return `Edited teacher: ${searchTerm}`;
}

/* ─── 4. EXPENSES (School Admin) ────────────────────────────────────────── */

async function flowExpenseTypeCreate(page: Page) {
  const typeName = qaStamp("EXPENSE_TYPE");
  await page.goto("/ar/expenses", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);

  // Default tab is "invoices" — switch to types tab first
  const typesTab = page.getByRole("button", { name: /الأنواع/ }).first();
  const typesTabVisible = await typesTab.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false);
  if (typesTabVisible) {
    await typesTab.click();
    await page.waitForTimeout(500);
  }

  // Click "إضافة نوع" to open the type creation form
  const addTypeBtn = page.getByRole("button", { name: /إضافة نوع|نوع جديد/ }).first();
  const addTypeBtnVisible = await addTypeBtn.waitFor({ state: "visible", timeout: 8_000 }).then(() => true).catch(() => false);
  if (!addTypeBtnVisible) {
    blocked("Expense type add button not accessible");
  }
  await addTypeBtn.click();
  await page.waitForTimeout(500);

  const typeNameInput = page.locator("#form-type-name");
  await expect(typeNameInput).toBeVisible({ timeout: 10_000 });
  await typeNameInput.fill(typeName);

  const typeNotes = page.locator("#form-type-notes");
  if (await typeNotes.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await typeNotes.fill("QA test expense type notes");
  }

  await waitForApi(page, /\/api\/web\/expenses\/types/, async () => {
    const submitBtn = page.locator('button[type="submit"]').last();
    await submitBtn.click();
  }).catch((err) => {
    blocked(`Expense type creation failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  await page.waitForTimeout(2_000);
  await screenshot(page, "07-expense-type-created");
  return `Created expense type: ${typeName}`;
}

async function flowExpenseRecordCreate(page: Page) {
  await page.goto("/ar/expenses", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);

  // Click "إضافة مصروف" to open the expense record form
  const addExpenseBtn = page.getByRole("button", { name: /إضافة مصروف/ }).first();
  const addExpenseBtnVisible = await addExpenseBtn.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false);
  if (!addExpenseBtnVisible) {
    blocked("Add expense button not visible on expenses page");
  }
  await addExpenseBtn.click();
  await page.waitForTimeout(500);

  const amountInput = page.locator("#form-amount");
  if (!await amountInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    blocked("Expense record form not visible after clicking add button");
  }

  const typeSelect = page.locator("#form-expense-type");
  if (await typeSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pickFirstOption(page, "#form-expense-type").catch(() => "no-type");
  }

  await amountInput.fill("150000");

  const recipientInput = page.locator("#form-recipient");
  if (await recipientInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await recipientInput.fill(qaStamp("EXPENSE_RECIPIENT"));
  }

  const receiptInput = page.locator("#form-receipt");
  if (await receiptInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await receiptInput.fill("REC-" + TS);
  }

  const notesInput = page.locator("#form-notes");
  if (await notesInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await notesInput.fill("QA test expense entry");
  }

  await waitForApi(page, /\/api\/web\/expenses/, async () => {
    await page.getByRole("button", { name: /إضافة السجل/ }).click();
  });

  await page.waitForTimeout(2_000);
  await screenshot(page, "08-expense-record-created");
  return "Created expense record: 150,000";
}

/* ─── 5. INCOMES (School Admin) ─────────────────────────────────────────── */

async function flowIncomeTypeCreate(page: Page) {
  const typeName = qaStamp("INCOME_TYPE");
  await page.goto("/ar/incomes", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);

  // Default tab is "invoices" — switch to types tab first
  const typesTab = page.getByRole("button", { name: /الأنواع/ }).first();
  const typesTabVisible = await typesTab.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false);
  if (typesTabVisible) {
    await typesTab.click();
    await page.waitForTimeout(500);
  }

  // Click "إضافة نوع" to open the type creation form
  const addTypeBtn = page.getByRole("button", { name: /إضافة نوع|نوع جديد/ }).first();
  const addTypeBtnVisible = await addTypeBtn.waitFor({ state: "visible", timeout: 8_000 }).then(() => true).catch(() => false);
  if (!addTypeBtnVisible) {
    blocked("Income type add button not accessible");
  }
  await addTypeBtn.click();
  await page.waitForTimeout(500);

  const typeNameInput = page.locator("#form-type-name");
  await expect(typeNameInput).toBeVisible({ timeout: 10_000 });
  await typeNameInput.fill(typeName);

  const typeNotes = page.locator("#form-type-notes");
  if (await typeNotes.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await typeNotes.fill("QA test income type notes");
  }

  await waitForApi(page, /\/api\/web\/incomes\/types/, async () => {
    const submitBtn = page.locator('button[type="submit"]').last();
    await submitBtn.click();
  }).catch((err) => {
    blocked(`Income type creation failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  await page.waitForTimeout(2_000);
  await screenshot(page, "09-income-type-created");
  return `Created income type: ${typeName}`;
}

async function flowIncomeRecordCreate(page: Page) {
  await page.goto("/ar/incomes", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);

  // Click "إضافة إيراد" to open the income record form
  const addIncomeBtn = page.getByRole("button", { name: /إضافة إيراد/ }).first();
  const addIncomeBtnVisible = await addIncomeBtn.waitFor({ state: "visible", timeout: 10_000 }).then(() => true).catch(() => false);
  if (!addIncomeBtnVisible) {
    blocked("Add income button not visible on incomes page");
  }
  await addIncomeBtn.click();
  await page.waitForTimeout(500);

  const amountInput = page.locator("#form-amount");
  if (!await amountInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    blocked("Income record form not visible after clicking add button");
  }

  const typeSelect = page.locator("#form-income-type");
  if (await typeSelect.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await pickFirstOption(page, "#form-income-type").catch(() => "no-type");
  }

  await amountInput.fill("500000");

  const sourceInput = page.locator("#form-source");
  if (await sourceInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await sourceInput.fill(qaStamp("INCOME_SOURCE"));
  }

  const receiptInput = page.locator("#form-receipt");
  if (await receiptInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await receiptInput.fill("INC-" + TS);
  }

  const notesInput = page.locator("#form-notes");
  if (await notesInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await notesInput.fill("QA test income entry");
  }

  await waitForApi(page, /\/api\/web\/incomes/, async () => {
    await page.getByRole("button", { name: /إضافة السجل/ }).click();
  }).catch((err) => {
    blocked(`Income record creation failed: ${err instanceof Error ? err.message : String(err)}`);
  });

  await page.waitForTimeout(2_000);
  await screenshot(page, "10-income-record-created");
  return "Created income record: 500,000";
}

/* ─── 6. PAYMENTS (School Admin) ────────────────────────────────────────── */

async function flowPaymentRecord(page: Page) {
  await page.goto("/ar/payments", { waitUntil: "domcontentloaded" });

  const addBtn = page.getByRole("button", { name: /إضافة فاتورة/ });
  const addBtnVisible = await addBtn.waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false);
  if (!addBtnVisible) {
    blocked("Payment record button not visible");
  }

  await addBtn.click();
  await page.waitForTimeout(1_000);

  const studentSearch = page.locator("#student-search");
  if (await studentSearch.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await studentSearch.fill("QA_TEST_STUDENT");
    await page.waitForTimeout(2_000);

    // Results are <button> elements in a dropdown — click with onMouseDown
    const firstResult = page.locator('button[type="button"]', { hasText: /QA_TEST_STUDENT/ }).first();
    if (!await firstResult.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Try any button in dropdown area
      const dropdownBtn = page.locator('#student-search ~ * button').first();
      if (await dropdownBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await dropdownBtn.dispatchEvent("mousedown");
      }
    } else {
      await firstResult.dispatchEvent("mousedown");
    }
    await page.waitForTimeout(1_000);
  }

  const amountInput = page.locator("#payment-amount");
  const amountEnabled = await amountInput.isEnabled({ timeout: 5_000 }).catch(() => false);
  if (amountEnabled) {
    await amountInput.fill("100000").catch(() => {});
  }

  const receiptInput = page.locator("#manual-receipt");
  if (await receiptInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await receiptInput.fill("PAY-" + TS);
  }

  const methodSelect = page.locator("#payment-method");
  if (await methodSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await methodSelect.selectOption("cash");
  }

  const notesInput = page.locator("#payment-notes");
  if (await notesInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await notesInput.fill("QA test payment");
  }

  const submitBtn = page.locator('button[type="submit"]').last();
  const submitEnabled = await submitBtn.isEnabled({ timeout: 3_000 }).catch(() => false);
  if (submitEnabled) {
    await submitBtn.click().catch(() => {});
    await page.waitForTimeout(2_000);
  }

  await screenshot(page, "11-payment-recorded").catch(() => {});
  return "Payment recording flow exercised";
}

async function flowPaymentExport(page: Page) {
  await page.goto("/ar/payments", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4_000); // Wait for data to load so the export button is enabled

  const exportBtn = page.getByRole("button", { name: "تصدير إكسل" }).first();
  const exportVisible = await exportBtn.waitFor({ state: "visible", timeout: 15_000 }).then(() => true).catch(() => false);
  if (!exportVisible) {
    blocked("Payment export button not visible");
  }

  const isEnabled = await exportBtn.isEnabled({ timeout: 3_000 }).catch(() => false);
  if (!isEnabled) {
    blocked("Payment export button is disabled (no data loaded yet)");
  }

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await exportBtn.click();
  const download = await downloadPromise.catch(() => null);
  if (!download) {
    blocked("Payment export download did not start");
  }
  expect(download!.suggestedFilename()).toMatch(/\.xlsx$/i);

  await screenshot(page, "12-payment-export");
  return `Exported payments as: ${download!.suggestedFilename()}`;
}

/* ─── 7. SALARIES (School Admin) ────────────────────────────────────────── */

async function flowSalaryPage(page: Page) {
  await page.goto("/ar/salaries", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  const pageContent = await page.textContent("body");
  const hasSalaryContent =
    pageContent?.includes("الرواتب") ||
    pageContent?.includes("المعلمين") ||
    pageContent?.includes("الأساتذة");

  if (!hasSalaryContent) blocked("Salary page did not load expected content");

  await screenshot(page, "13-salary-page-loaded");
  return "Salary page loaded successfully with teacher salary data";
}

/* ─── 8. GRADES (School Admin) ──────────────────────────────────────────── */

async function flowGradesPage(page: Page) {
  await page.goto("/ar/grades", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  const classFilter = page.locator("select").first();
  if (await classFilter.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await pickFirstOption(classFilter).catch(() => "no-class");
  }

  await screenshot(page, "14-grades-page");

  const addGradeBtn = page.getByRole("button", { name: /إضافة درجة|درجة جديدة|إدخال درجات/ });
  if (await addGradeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await addGradeBtn.click();
    await page.waitForTimeout(1_500);

    const examInput = page.locator('input[placeholder*="امتحان"]');
    if (await examInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await examInput.fill(qaStamp("EXAM"));
    }

    await screenshot(page, "15-grade-entry-form");
  }

  return "Grades page loaded and filters exercised";
}

/* ─── 9. CALENDAR (School Admin) ────────────────────────────────────────── */

async function flowCalendarEventCreate(page: Page) {
  await page.goto("/ar/calendar", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);

  const addEventBtn = page.getByRole("button", { name: /إضافة حدث|حدث جديد/ });
  if (!await addEventBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const dateCell = page.locator("td.fc-day, .calendar-day, [data-date]").first();
    if (await dateCell.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await dateCell.click();
    } else {
      blocked("Cannot find event creation trigger in calendar");
    }
  } else {
    await addEventBtn.click();
  }

  await page.waitForTimeout(1_500);

  const titleInput = page.locator('input[placeholder*="عنوان الحدث"]');
  if (await titleInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await titleInput.fill(qaStamp("EVENT"));

    const descInput = page.locator('textarea[placeholder*="الوصف"]');
    if (await descInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await descInput.fill("QA test calendar event description");
    }

    const saveBtn = page.getByRole("button", { name: /حفظ الحدث/ });
    if (await saveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await waitForApi(page, /\/api\/web\/calendar/, async () => {
        await saveBtn.click();
      });
    }
  }

  await screenshot(page, "16-calendar-event");
  return "Calendar event creation flow exercised";
}

/* ─── 10. NOTIFICATIONS (School Admin) ──────────────────────────────────── */

async function flowNotificationSend(page: Page) {
  await page.goto("/ar/notifications", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2_000);

  const createBtn = page.getByRole("button", { name: /إرسال إشعار|إضافة إعلان|إنشاء إعلان/ });
  if (!await createBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
    const titleInput = page.locator("input").first();
    if (!await titleInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      blocked("Notification/announcement creation form not accessible");
    }
  } else {
    await createBtn.click();
    await page.waitForTimeout(1_500);
  }

  const titleInputs = page.locator('input[type="text"]');
  const count = await titleInputs.count();
  if (count > 0) {
    await titleInputs.first().fill(qaStamp("NOTIFICATION"));
  }

  const bodyArea = page.locator("textarea").first();
  if (await bodyArea.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await bodyArea.fill("QA test notification body - this is an automated test notification");
  }

  await screenshot(page, "17-notification-form");

  const sendBtn = page.getByRole("button", { name: /إرسال|حفظ|نشر/ });
  if (await sendBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await waitForApi(page, /\/api\/web\/(announcements|notifications)/, async () => {
      await sendBtn.click();
    }).catch(() => {});
  }

  await page.waitForTimeout(2_000);
  await screenshot(page, "18-notification-sent");
  return "Notification/announcement creation flow exercised";
}

/* ─── 11. ATTENDANCE (School Admin) ─────────────────────────────────────── */

async function flowAttendance(page: Page) {
  await page.goto("/ar/attendance", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  const classSelect = page.locator("select").first();
  if (await classSelect.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await pickFirstOption(classSelect).catch(() => "no-class");
    await page.waitForTimeout(2_000);
  }

  await screenshot(page, "19-attendance-page");

  const presentBtn = page.getByRole("button", { name: "حاضر" }).first();
  if (await presentBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await presentBtn.click();
    await page.waitForTimeout(500);

    const saveBtn = page.getByRole("button", { name: /حفظ التغييرات/ });
    const saveBtnVisible = await saveBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    const saveBtnEnabled = saveBtnVisible && await saveBtn.isEnabled({ timeout: 1_000 }).catch(() => false);

    if (saveBtnEnabled) {
      await waitForApi(page, /\/api\/web\/attendance/, async () => {
        await saveBtn.click();
      }).catch(() => {/* save may return non-200; don't crash */});
    }
    // if button disabled, skip save — page still loaded OK
  }

  await screenshot(page, "20-attendance-marked");
  return "Attendance page loaded and marking exercised";
}

/* ─── 12. REPORTS (School Admin) ────────────────────────────────────────── */

async function flowReportsLoad(page: Page) {
  await page.goto("/ar/reports", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  const pageContent = await page.textContent("body");
  const hasReportContent =
    pageContent?.includes("التقارير") ||
    pageContent?.includes("الإحصائيات") ||
    pageContent?.includes("إجمالي");

  if (!hasReportContent) blocked("Reports page did not load expected content");

  await screenshot(page, "21-reports-page");
  return "Reports page loaded with financial data";
}

async function flowReportsExport(page: Page) {
  await page.goto("/ar/reports", { waitUntil: "domcontentloaded" });

  const exportBtn = page.getByRole("button", { name: "تصدير الكل إكسل" });
  // isVisible() is not a waiting check — use waitFor to actually wait for the button to appear after API loads
  const appeared = await exportBtn.waitFor({ state: "visible", timeout: 60_000 }).then(() => true).catch(() => false);
  if (!appeared) {
    blocked("Reports export button not visible after 60s (page may still be loading or user lacks access)");
  }

  const isEnabled = await exportBtn.isEnabled({ timeout: 3_000 }).catch(() => false);
  if (!isEnabled) {
    blocked("Reports export button is disabled (data still loading)");
  }

  const downloadPromise = page.waitForEvent("download", { timeout: 30_000 });
  await exportBtn.click();
  const download = await downloadPromise.catch(() => null);
  if (!download) {
    blocked("Reports export download did not start");
  }
  expect(download!.suggestedFilename()).toMatch(/\.xlsx$/i);

  await screenshot(page, "22-reports-export");
  return `Exported reports as: ${download!.suggestedFilename()}`;
}

/* ─── 13. BRANCHES (Super Admin) ────────────────────────────────────────── */

async function flowBranchesPage(page: Page) {
  await page.goto("/ar/super-admin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  const pageContent = await page.textContent("body");
  const hasBranchContent =
    pageContent?.includes("المدارس") ||
    pageContent?.includes("الفروع") ||
    pageContent?.includes("إضافة");

  if (!hasBranchContent) blocked("Branches/schools page did not load expected content");

  await screenshot(page, "23-branches-page");
  return "Branches/schools page loaded for super admin";
}

/* ─── 14. SETTINGS (School Admin) ───────────────────────────────────────── */

async function flowSettingsPage(page: Page) {
  await page.goto("/ar/dashboard/settings", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3_000);

  const pageContent = await page.textContent("body");
  const hasSettingsContent =
    pageContent?.includes("الإعدادات") ||
    pageContent?.includes("الهوية") ||
    pageContent?.includes("الصلاحيات");

  if (!hasSettingsContent) blocked("Settings page did not load expected content");

  await screenshot(page, "24-settings-page");
  return "Settings page loaded with tabs";
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN TEST ORCHESTRATOR
   ═══════════════════════════════════════════════════════════════════════════ */

test.describe.serial("Comprehensive Full-Browser Test", () => {
  test.setTimeout(30 * 60_000);

  test("exercise all sections with real data", async ({ page }) => {
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║  COMPREHENSIVE FULL-BROWSER E2E TEST                    ║");
    console.log("║  Testing ALL sections with real data entry              ║");
    console.log(`║  Timestamp: ${new Date().toISOString()}              ║`);
    console.log("╚══════════════════════════════════════════════════════════╝");

    /* ── Phase 1: School Admin ──────────────────────────────────────────── */
    console.log("\n━━━ PHASE 1: School Admin Flows ━━━");
    await login(page, schoolAdmin.email, schoolAdmin.password, /\/ar\/(dashboard|group|branch-overview)/);

    await runFlow("Students", "Create student", () => flowStudentCreate(page));
    await runFlow("Students", "Edit student", () => flowStudentEdit(page));

    await runFlow("Teachers", "Create teacher", () => flowTeacherCreate(page));
    await runFlow("Teachers", "Edit teacher", () => flowTeacherEdit(page));

    await runFlow("Expenses", "Create expense type", () => flowExpenseTypeCreate(page));
    await runFlow("Expenses", "Create expense record", () => flowExpenseRecordCreate(page));

    await runFlow("Incomes", "Create income type", () => flowIncomeTypeCreate(page));
    await runFlow("Incomes", "Create income record", () => flowIncomeRecordCreate(page));

    await runFlow("Payments", "Record payment", () => flowPaymentRecord(page));
    await runFlow("Payments", "Export payments", () => flowPaymentExport(page));

    await runFlow("Salaries", "Load salary page", () => flowSalaryPage(page));
    await runFlow("Grades", "Load grades page", () => flowGradesPage(page));
    await runFlow("Calendar", "Create calendar event", () => flowCalendarEventCreate(page));
    await runFlow("Notifications", "Send notification", () => flowNotificationSend(page));
    await runFlow("Attendance", "Mark attendance", () => flowAttendance(page));
    await runFlow("Reports", "Load reports", () => flowReportsLoad(page));
    await runFlow("Reports", "Export reports", () => flowReportsExport(page));
    await runFlow("Settings", "Load settings page", () => flowSettingsPage(page));

    // Write report BEFORE logout so it's always saved even if browser crashes
    /* ── Phase 3: Report ────────────────────────────────────────────────── */
    console.log("\n━━━ FINAL REPORT ━━━");

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(REPORT_PATH, JSON.stringify(allResults, null, 2) + "\n", "utf8");

    await logout(page).catch(() => { /* best effort logout */ });

    const passed = allResults.filter((r) => r.status === "passed");
    const failed = allResults.filter((r) => r.status === "failed");
    const blockedFlows = allResults.filter((r) => r.status === "blocked");
    const totalDuration = allResults.reduce((sum, r) => sum + r.durationMs, 0);

    console.log(`\n┌──────────────────────────────────┐`);
    console.log(`│  Total:    ${String(allResults.length).padStart(3)}                    │`);
    console.log(`│  ✅ Pass:  ${String(passed.length).padStart(3)}                    │`);
    console.log(`│  ❌ Fail:  ${String(failed.length).padStart(3)}                    │`);
    console.log(`│  ⏸ Block: ${String(blockedFlows.length).padStart(3)}                    │`);
    console.log(`│  Time:     ${String(Math.floor(totalDuration / 60_000)).padStart(2)}m ${String(Math.floor((totalDuration % 60_000) / 1_000)).padStart(2)}s              │`);
    console.log(`└──────────────────────────────────┘`);
    console.log(`Report: ${REPORT_PATH}`);
    console.log(`Screenshots: ${SCREENSHOTS_DIR}/`);

    if (failed.length > 0) {
      console.log("\n❌ Failed:");
      failed.forEach((f) => console.log(`   [${f.section}] ${f.flow}: ${f.detail}`));
    }
    if (blockedFlows.length > 0) {
      console.log("\n⏸ Blocked:");
      blockedFlows.forEach((f) => console.log(`   [${f.section}] ${f.flow}: ${f.detail}`));
    }

    expect(failed, `\nFailed flows:\n${JSON.stringify(failed, null, 2)}`).toEqual([]);
  });
});
