import { expect, test } from "@playwright/test";

import { getQAAccount } from "./helpers/e2e-env";
import { loginWithCredentials } from "./helpers/auth";

const branchAdmin = getQAAccount("branch_admin_b");

test.use({ storageState: { cookies: [], origins: [] } });

test("branch admin can rename a class without losing its fee", async ({ page }) => {
  const stamp = Date.now();
  const originalName = `QA_TEST_CLASS_RENAME_${stamp}`;
  const renamedName = `${originalName}_UPDATED`;

  await loginWithCredentials(page, {
    email: branchAdmin.email,
    password: branchAdmin.password,
    expectedPath: /\/ar\/branch-overview(?:\?.*)?$/,
    expectedHeading: "لوحة التحكم الرئيسية",
  });
  await page.goto("/ar/classes", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "+ إضافة صف" }).click();
  await page.getByPlaceholder("مثال: الصف الخامس").fill(originalName);
  await page.getByRole("spinbutton").fill("410000");
  await page.getByRole("button", { name: "إضافة صف", exact: true }).click();

  const originalRow = page.locator("tr", { hasText: originalName });
  await expect(originalRow).toContainText("410,000", { timeout: 30_000 });
  await originalRow.getByTitle("تعديل الصف").click();
  await page.getByPlaceholder("مثال: الصف الخامس").fill(renamedName);
  await page.getByRole("button", { name: "حفظ التعديلات", exact: true }).click();

  const renamedRow = page.locator("tr", { hasText: renamedName });
  await expect(renamedRow).toContainText("410,000", { timeout: 30_000 });

  await renamedRow.getByTitle("حذف").click();
  await renamedRow.getByRole("button", { name: "تأكيد حذف الصف" }).click();
  await expect(page.locator("tr", { hasText: renamedName })).toHaveCount(0, { timeout: 30_000 });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileNavigationToggle = page.getByRole("button", { name: "فتح التنقل", exact: true });
  await expect(mobileNavigationToggle).toHaveCount(1);
  await mobileNavigationToggle.click();

  const mobileSidebar = page.getByRole("complementary");
  await expect(mobileSidebar).toBeVisible();
  const sidebarBox = await mobileSidebar.boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(sidebarBox!.x + sidebarBox!.width).toBeGreaterThanOrEqual(389);

  await page.getByRole("button", { name: "إغلاق التنقل", exact: true }).click();
  await expect.poll(async () => (await mobileSidebar.boundingBox())?.x ?? 0).toBeGreaterThanOrEqual(389);
});
