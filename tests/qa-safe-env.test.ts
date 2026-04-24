import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

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

function loadPreferredEnv() {
  loadEnvFileIfPresent(".env.local");
  loadEnvFileIfPresent(".env.vercel.local");
}

describe("QA safe environment validation", () => {
  it("resolves the required environment variables without exposing them", async () => {
    loadPreferredEnv();

    const requiredKeys = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "RBAC_COOKIE_SECRET",
      "SESSION_COOKIE_SECURE",
      "HEALTHCHECK_TOKEN",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ] as const;

    for (const key of requiredKeys) {
      expect(process.env[key], `${key} should be configured`).toBeTruthy();
    }
  });

  it("can perform a read-only Supabase probe with the service role server-side", async () => {
    loadPreferredEnv();

    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toMatch(/^https?:\/\//);
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ?? 0).toBeGreaterThan(10);
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeTruthy();
    expect(process.env.RBAC_COOKIE_SECRET).toBeTruthy();
    expect(process.env.SESSION_COOKIE_SECURE === "true" || process.env.SESSION_COOKIE_SECURE === "false").toBe(true);
    expect(process.env.HEALTHCHECK_TOKEN).toBeTruthy();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );

    const [{ error: schoolsError }, { error: authUsersError }] = await Promise.all([
      supabase.from("schools").select("id").limit(1),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ]);

    expect(schoolsError).toBeNull();
    expect(authUsersError).toBeNull();
  });

  it("can perform a read-only Upstash probe when redis env is configured", async () => {
    loadPreferredEnv();

    expect(process.env.UPSTASH_REDIS_REST_URL, "UPSTASH_REDIS_REST_URL should be configured").toBeTruthy();
    expect(process.env.UPSTASH_REDIS_REST_TOKEN, "UPSTASH_REDIS_REST_TOKEN should be configured").toBeTruthy();

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const missingKey = `QA_TEST_READONLY_MISSING_${Date.now()}`;
    const readProbe = await redis.get(missingKey);
    expect(readProbe).toBeNull();
  });
});
