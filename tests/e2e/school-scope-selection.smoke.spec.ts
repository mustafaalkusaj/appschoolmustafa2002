import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { getQAIds } from "./helpers/e2e-env";

const superAdminStoragePath = path.join(".playwright-state", "super-admin-storage-state.json");

test.use({
  storageState: fs.existsSync(superAdminStoragePath) ? superAdminStoragePath : undefined,
});

test("super admin school selection updates the URL and every selector", async ({ page }) => {
  const { schoolAId } = getQAIds();
  await page.goto("/ar/dashboard", { waitUntil: "networkidle" });

  const sidebar = page.getByRole("complementary");
  const schoolSelector = sidebar.getByRole("combobox");
  await expect(schoolSelector).toBeVisible();
  await schoolSelector.selectOption(schoolAId);

  await expect(page).toHaveURL(new RegExp(`[?&]school=${schoolAId}(?:&|$)`));
  await expect(schoolSelector).toHaveValue(schoolAId);
  await expect(page.getByRole("heading", { name: "اختر مدرسة لعرض لوحة التحكم" })).toBeHidden();
});
