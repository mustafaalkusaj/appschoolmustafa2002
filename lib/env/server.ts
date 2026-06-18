import "server-only";

import { z } from "zod";

import { getPublicEnv } from "@/lib/env/public";

// Critical vars that must be present at startup in production.
// SUPABASE_URL and SUPABASE_ANON_KEY are validated by getPublicEnv() (public.ts).
// Here we gate the server-only secrets.
function requireEnv(name: string): void {
  if (!process.env[name]) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (dev) or your deployment secrets (production).`,
    );
  }
}

if (process.env.NODE_ENV === "production") {
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  requireEnv("RBAC_COOKIE_SECRET");
}

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1).optional(),
  RBAC_COOKIE_SECRET: z.string().trim().min(32).optional(),
  HEALTHCHECK_TOKEN: z.string().trim().min(24).optional(),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
});

export type ServerEnv = ReturnType<typeof getServerEnv>;

let cachedServerEnv: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  serviceRoleKey: string | null;
  rbacCookieSecret: string | null;
  healthcheckToken: string | null;
  sessionCookieSecureOverride: boolean | null;
} | null = null;

export function getServerEnv() {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const publicEnv = getPublicEnv();
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RBAC_COOKIE_SECRET: process.env.RBAC_COOKIE_SECRET,
    HEALTHCHECK_TOKEN: process.env.HEALTHCHECK_TOKEN,
    SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE,
  });

  if (!parsed.success) {
    const formatted = parsed.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Invalid server environment configuration. ${formatted}`.trim());
  }

  cachedServerEnv = {
    supabaseUrl: publicEnv.supabaseUrl,
    supabaseAnonKey: publicEnv.supabaseAnonKey,
    serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
    rbacCookieSecret: parsed.data.RBAC_COOKIE_SECRET?.trim() || null,
    healthcheckToken: parsed.data.HEALTHCHECK_TOKEN?.trim() || null,
    sessionCookieSecureOverride:
      parsed.data.SESSION_COOKIE_SECURE === "true"
        ? true
        : parsed.data.SESSION_COOKIE_SECURE === "false"
          ? false
          : null,
  };

  return cachedServerEnv;
}

export function shouldUseSecureCookies() {
  const env = getServerEnv();
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  if (typeof env.sessionCookieSecureOverride === "boolean") {
    return env.sessionCookieSecureOverride;
  }

  return true;
}
