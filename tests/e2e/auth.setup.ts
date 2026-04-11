import path from "node:path";

import { test } from "@playwright/test";

import { loginAsAdmin, loginAsSuperAdmin } from "./helpers/auth";

const artifactsDir = "/Users/musatafa/school-app/artifacts/reliability-audit";
const adminStoragePath = path.join(artifactsDir, "admin-storage-state.json");
const superAdminStoragePath = path.join(artifactsDir, "super-admin-storage-state.json");

test("authenticate admin once for shared E2E state", async ({ page }) => {
  await loginAsAdmin(page, "ar");
  await page.context().storageState({ path: adminStoragePath });
});

test("authenticate super admin once for shared E2E state", async ({ page }) => {
  await loginAsSuperAdmin(page, "ar");
  await page.context().storageState({ path: superAdminStoragePath });
});
