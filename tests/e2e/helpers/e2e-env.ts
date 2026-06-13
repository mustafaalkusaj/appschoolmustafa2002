import * as fs from "node:fs";
import * as path from "node:path";

let loaded = false;

function loadEnvFile(fileName: string) {
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

export function ensureE2EEnvLoaded() {
  if (loaded) return;
  loadEnvFile(".env.local");
  loadEnvFile(".env.vercel.local");
  loadEnvFile(".env.e2e.local");
  loaded = true;
}

function requiredEnv(name: string) {
  ensureE2EEnvLoaded();
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required E2E env: ${name}`);
  }
  return value;
}

export type QAAccountKey =
  | "super_admin"
  | "school_admin_a"
  | "school_admin_b"
  | "branch_admin_a"
  | "branch_admin_b"
  | "normal_user_a";

export function getQAAccount(key: QAAccountKey) {
  const prefix = `QA_E2E_${key.toUpperCase()}`;
  return {
    key,
    email: requiredEnv(`${prefix}_EMAIL`),
    password: requiredEnv(`${prefix}_PASSWORD`),
  };
}

export function getQAIds() {
  return {
    schoolAId: requiredEnv("QA_E2E_SCHOOL_A_ID"),
    schoolBId: requiredEnv("QA_E2E_SCHOOL_B_ID"),
    branchAId: requiredEnv("QA_E2E_BRANCH_A_ID"),
    branchBId: requiredEnv("QA_E2E_BRANCH_B_ID"),
  };
}

export function getPlaywrightBaseUrl() {
  ensureE2EEnvLoaded();
  return process.env.PLAYWRIGHT_BASE_URL?.trim() || process.env.PW_BASE_URL?.trim() || "";
}
