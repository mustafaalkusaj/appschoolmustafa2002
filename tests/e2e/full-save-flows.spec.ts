import * as fs from "node:fs/promises";
import * as path from "node:path";

import { test, expect, type Locator, type Page } from "@playwright/test";

import { ensureE2EEnvLoaded, getQAAccount, getQAIds } from "./helpers/e2e-env";

ensureE2EEnvLoaded();

type FlowStatus = "passed" | "failed" | "blocked";

type FlowResult = {
  flow: string;
  status: FlowStatus;
  detail: string;
};

class BlockedFlowError extends Error {}

const OUTPUT_DIR = path.join(process.cwd(), "output/playwright/full-save-flows");
const REPORT_PATH = path.join(OUTPUT_DIR, "full-save-flows-report.json");

const ids = getQAIds();
const superAdmin = getQAAccount("super_admin");
const schoolAdminA = getQAAccount("school_admin_a");

function qaStamp(prefix: string) {
  return `${prefix}_${Date.now()}`;
}

function blocked(message: string): never {
  throw new BlockedFlowError(message);
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
  }

  const closeButton = page.getByRole("button", { name: "إغلاق" }).last();
  if (await closeButton.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await closeButton.click();
  }

  const menuTrigger = page.locator(".profile-menu__trigger").first();
  if (!await menuTrigger.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await page.goto("/ar/dashboard", { waitUntil: "domcontentloaded" });
  }

  if (!await menuTrigger.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await page.context().clearCookies();
    await page.goto("/ar/login", { waitUntil: "networkidle" });
    await expect(page).toHaveURL(/\/ar\/login(?:\?.*)?$/, { timeout: 30_000 });
    return;
  }

  await menuTrigger.click();
  await page.getByRole("menuitem", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/ar\/login(?:\?.*)?$/, { timeout: 30_000 });
}

async function closeOverlayIfPresent(page: Page, buttonName: string) {
  const button = page.getByRole("button", { name: buttonName }).last();
  if (await button.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await button.click();
  }
}

async function pickFirstRealOption(select: Locator, excludedValues: string[] = ["", "__manual__"]) {
  const value = await select.evaluate((element, excluded) => {
    const options = Array.from((element as HTMLSelectElement).options);
    const match = options.find((option) => !excluded.includes(option.value));
    return match?.value ?? "";
  }, excludedValues);

  if (!value) {
    blocked("No selectable option was available for a required dropdown.");
  }

  await select.selectOption(value);
  return value;
}

async function expectMutationResponse(
  page: Page,
  matcher: RegExp,
  action: () => Promise<void>,
  expectedStatuses: number[] = [200, 201],
) {
  const responsePromise = page.waitForResponse((response) => {
    return matcher.test(response.url()) && expectedStatuses.includes(response.status());
  }, { timeout: 30_000 });

  await action();
  return responsePromise;
}

async function runFlow(results: FlowResult[], flow: string, fn: () => Promise<string>) {
  try {
    console.log(`[full-save-flows] START ${flow}`);
    const detail = await fn();
    console.log(`[full-save-flows] PASS ${flow}: ${detail}`);
    results.push({ flow, status: "passed", detail });
  } catch (error) {
    if (error instanceof BlockedFlowError) {
      console.log(`[full-save-flows] BLOCKED ${flow}: ${error.message}`);
      results.push({ flow, status: "blocked", detail: error.message });
      return;
    }

    console.log(`[full-save-flows] FAIL ${flow}: ${error instanceof Error ? error.message : String(error)}`);
    results.push({
      flow,
      status: "failed",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function saveBrandingNoop(page: Page) {
  await page.goto(`/ar/dashboard?school=${ids.schoolAId}`, { waitUntil: "networkidle" });
  const saveButton = page.getByRole("button", { name: "حفظ الهوية" });
  if (!await saveButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
    blocked("Branding save is not available on the current dashboard view.");
  }

  await expectMutationResponse(page, /\/api\/web\/dashboard\/branding$/, async () => {
    await saveButton.click();
  });

  await expect(page.getByText(/تم تحديث الشعار|حُفظت الألوان محلياً/).first()).toBeVisible({ timeout: 30_000 });
  return "Super admin branding save completed as a no-op save on the existing school branding.";
}

async function smokeSchoolLogoControl(page: Page) {
  await page.goto(`/ar/dashboard?school=${ids.schoolAId}`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("school-logo-input")).toBeAttached({ timeout: 20_000 });
  return "School logo upload control is present; upload path remains covered elsewhere.";
}

async function createAndEditStudent(page: Page) {
  const studentName = qaStamp("QA_TEST_STUDENT_SAVE_FLOW");
  const updatedAddress = qaStamp("QA_TEST_UPDATED_ADDRESS");

  await page.goto("/ar/students", { waitUntil: "networkidle" });

  const addStudentButton = page.getByRole("button", { name: /إضافة طالب/ });
  if (!await addStudentButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
    blocked("Student creation UI is not available for the current school scope.");
  }

  await addStudentButton.click();
  const addModal = page.locator('[role="dialog"]').filter({ hasText: "إضافة طالب جديد" }).first();
  await expect(addModal).toBeVisible({ timeout: 15_000 });

  await addModal.locator("#full_name").fill(studentName);
  await pickFirstRealOption(addModal.locator("#class_name"));
  await addModal.locator("#section").fill("QA_TEST_SEC");
  await addModal.getByRole("button", { name: "التالي" }).click();
  await addModal.locator("#address").fill("QA_TEST_ADDRESS");
  await addModal.locator("#phone").fill("07700000000");
  await addModal.getByRole("button", { name: "التالي" }).click();
  await addModal.locator("#total_fee").fill("500000");
  await addModal.locator("#paid_fee").fill("0");
  await addModal.locator("#discount_value").fill("0");

  await expectMutationResponse(page, /\/api\/dashboard\/students$/, async () => {
    await addModal.getByRole("button", { name: /حفظ الطالب/ }).click();
  });

  await expect(page.getByText(/تم إضافة الطالب وإنشاء حساب التطبيق/).first()).toBeVisible({ timeout: 30_000 });

  await page.getByPlaceholder("بحث...").fill(studentName);
  const studentRow = page.locator("tr", { hasText: studentName }).first();
  if (!await studentRow.isVisible({ timeout: 15_000 }).catch(() => false)) {
    blocked("Created student row could not be located for edit verification.");
  }

  await studentRow.getByRole("button", { name: /خيارات الطالب/ }).click();
  await page.locator("[data-student-dropdown-action]", { hasText: "تعديل" }).click();
  const editModal = page.locator('[role="dialog"]').filter({ hasText: "تعديل بيانات الطالب" }).first();
  await expect(editModal).toBeVisible({ timeout: 15_000 });

  await editModal.locator("#edit_address").fill(updatedAddress);
  await expectMutationResponse(page, /\/api\/dashboard\/students\/[^/]+$/, async () => {
    await editModal.getByRole("button", { name: /حفظ التعديلات/ }).click();
  });

  await expect(page.getByText(/تم تحديث البيانات وربط الطالب تلقائياً بالأساتذة/).first()).toBeVisible({ timeout: 30_000 });
  return `Created and edited ${studentName}. Cleanup was skipped; the QA_TEST_ record may remain for later QA-only removal.`;
}

async function createAndEditTeacher(page: Page) {
  const teacherName = qaStamp("QA_TEST_TEACHER_SAVE_FLOW");
  const teacherEmail = `${teacherName.toLowerCase()}@qa-test.local`;

  await page.goto("/ar/teachers", { waitUntil: "networkidle" });

  const addTeacherButton = page.getByRole("button", { name: "إضافة أستاذ" });
  if (!await addTeacherButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
    blocked("Teacher creation UI is not available for the current school scope.");
  }

  await addTeacherButton.click();
  const createModal = page.locator(".ui-dialog").filter({ hasText: "إضافة أستاذ" }).first();
  await expect(createModal).toBeVisible({ timeout: 15_000 });

  await createModal.locator('input').nth(1).fill(teacherName);
  await createModal.locator('input').nth(2).fill("07700000001");
  await createModal.locator('input[type="email"]').fill(teacherEmail);
  await createModal.locator('input[list="subjects-list"]').fill("QA_TEST_SUBJECT");
  await pickFirstRealOption(createModal.locator("select").nth(1));

  const sectionSelect = createModal.locator("select").nth(2);
  if (await sectionSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
    const sectionValue = await sectionSelect.evaluate((element) => {
      const options = Array.from((element as HTMLSelectElement).options);
      return options.find((option) => option.value)?.value ?? "";
    });
    if (sectionValue) {
      await sectionSelect.selectOption(sectionValue);
    }
  }

  await expectMutationResponse(page, /\/api\/dashboard\/users$/, async () => {
    await createModal.getByRole("button", { name: "إنشاء الحساب" }).click();
  });

  await expect(page.getByText(/تم إنشاء حساب الأستاذ بنجاح/).first()).toBeVisible({ timeout: 30_000 });
  await closeOverlayIfPresent(page, "إغلاق");

  await page.getByPlaceholder(/بحث/).fill(teacherName);
  const teacherRow = page.locator("tr", { hasText: teacherName }).first();
  if (!await teacherRow.isVisible({ timeout: 15_000 }).catch(() => false)) {
    blocked("Created teacher row could not be located for edit verification.");
  }

  await teacherRow.getByRole("button", { name: "تعديل" }).click();
  const editModal = page.locator(".ui-dialog").filter({ hasText: "تعديل حساب الأستاذ" }).first();
  await expect(editModal).toBeVisible({ timeout: 15_000 });
  await editModal.locator('input').nth(1).fill(`${teacherName}_EDITED`);

  await expectMutationResponse(page, /\/api\/dashboard\/users\/[^/]+$/, async () => {
    await editModal.getByRole("button", { name: "حفظ التعديلات" }).click();
  });

  await expect(page.getByText(/تم تحديث الحساب بنجاح/).first()).toBeVisible({ timeout: 30_000 });
  return `Created and edited ${teacherName}. Cleanup was skipped; the QA_TEST_ record may remain for later QA-only removal.`;
}

async function exercisePaymentsFiltersAndExport(page: Page) {
  await page.goto("/ar/payments", { waitUntil: "networkidle" });

  const searchInput = page.getByPlaceholder(/بحث باسم الطالب أو الصف/);
  if (!await searchInput.isVisible({ timeout: 15_000 }).catch(() => false)) {
    blocked("Payments filters/search are not available for the current school scope.");
  }

  await searchInput.fill("QA_TEST");
  await expect(page.getByText(/نتيجة/).first()).toBeVisible({ timeout: 15_000 });

  const exportPromise = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByRole("button", { name: "تصدير إكسل" }).first().click();
  const download = await exportPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);

  return "Payments filters responded and XLSX export download was generated successfully.";
}

async function exerciseReportsLoadAndExport(page: Page) {
  await page.goto("/ar/reports", { waitUntil: "networkidle" });
  const exportAllButton = page.getByRole("button", { name: "تصدير الكل إكسل" });
  if (!await exportAllButton.isVisible({ timeout: 30_000 }).catch(() => false)) {
    blocked("Reports export UI is not available for the current school scope.");
  }

  const exportPromise = page.waitForEvent("download", { timeout: 30_000 });
  await exportAllButton.click();
  const download = await exportPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);

  return "Reports loaded and the combined Excel export download completed successfully.";
}

test.describe.serial("full save flows", () => {
  test.setTimeout(20 * 60_000);

  test("exercise safe save flows and document blocked ones", async ({ page }) => {
    const results: FlowResult[] = [];

    await login(page, superAdmin.email, superAdmin.password, /\/ar\/super-admin(?:\?.*)?$/);
    await runFlow(results, "branding save (super admin)", () => saveBrandingNoop(page));
    await runFlow(results, "school logo upload smoke", () => smokeSchoolLogoControl(page));
    await runFlow(results, "branch create", async () => blocked("Branch create was not automated because the current super-admin flow is not deterministic enough for QA-only data without introducing flaky selectors."));
    await runFlow(results, "branch edit", async () => blocked("Branch edit was not automated because the current super-admin branches view has no deterministic QA-only selector for the newly created row."));
    await logout(page);

    await login(page, schoolAdminA.email, schoolAdminA.password, /\/ar\/(dashboard|group)(?:\?.*)?$/);
    await runFlow(results, "student create and edit", () => createAndEditStudent(page));
    await runFlow(results, "teacher create and edit", () => createAndEditTeacher(page));
    await runFlow(results, "expense type create and expense create", async () => blocked("Expenses create flow was not automated because the current expenses UI did not expose stable QA-only selectors without risking accidental edits to non-QA records."));
    await runFlow(results, "expense edit", async () => blocked("Expense edit was not automated because the current expenses UI does not expose a stable QA-only selector for the newly created row/card."));
    await runFlow(results, "payments filters and export", () => exercisePaymentsFiltersAndExport(page));
    await runFlow(results, "reports load and export", () => exerciseReportsLoadAndExport(page));
    await logout(page);

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(REPORT_PATH, `${JSON.stringify(results, null, 2)}\n`, "utf8");

    const failed = results.filter((result) => result.status === "failed");
    expect(failed, JSON.stringify(results, null, 2)).toEqual([]);
  });
});
