import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

function loadEnvFileIfPresent(fileName: string) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    if (!key || process.env[key]) continue;

    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

test("QA safe public routes and health probe work without touching real data", async ({ page, request }) => {
  loadEnvFileIfPresent(".env.local");
  loadEnvFileIfPresent(".env.vercel.local");

  const healthToken = process.env.HEALTHCHECK_TOKEN;

  expect(healthToken, "HEALTHCHECK_TOKEN must be available for QA health probe").toBeTruthy();

  await page.goto("/ar/login");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();

  await page.goto("/en/forgot-password");
  await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
  await expect(page.locator("#forgot-password-email")).toBeVisible();

  const healthResponse = await request.get("/api/health", {
    headers: {
      "x-health-token": healthToken!,
    },
  });

  expect(healthResponse.ok()).toBeTruthy();

  const healthBody = await healthResponse.json();
  expect(healthBody.ok).toBe(true);
  expect(healthBody.checks?.env).toBe(true);
  expect(healthBody.dependencies?.supabase?.status).toBe("ok");
});
