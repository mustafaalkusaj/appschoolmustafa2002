import { loadProductionEnv } from "./env-utils.mjs";

const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "RBAC_COOKIE_SECRET",
  "HEALTHCHECK_TOKEN",
  "JWT_SECRET",
];

const recommendedEnvKeys = [
  "NEXT_PUBLIC_SENTRY_DSN",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

const { env, loadedFiles } = loadProductionEnv();

function hasValue(key) {
  return typeof env[key] === "string" && env[key].trim().length > 0;
}

function fail(message) {
  console.error(`[predeploy-check] FAIL: ${message}`);
  process.exitCode = 1;
}

function warn(message) {
  console.warn(`[predeploy-check] WARN: ${message}`);
}

function ok(message) {
  console.log(`[predeploy-check] OK: ${message}`);
}

function validateSecrets() {
  const missingRequired = requiredEnvKeys.filter((key) => !hasValue(key));
  if (missingRequired.length > 0) {
    fail(`Missing required env vars: ${missingRequired.join(", ")}`);
  } else {
    ok("All required production env vars are configured.");
  }

  const missingRecommended = recommendedEnvKeys.filter((key) => !hasValue(key));
  if (missingRecommended.length > 0) {
    warn(`Missing recommended env vars: ${missingRecommended.join(", ")}`);
  } else {
    ok("Recommended env vars are configured.");
  }
}

function validateSecuritySettings() {
  const rbacSecret = env.RBAC_COOKIE_SECRET?.trim() ?? "";
  const healthToken = env.HEALTHCHECK_TOKEN?.trim() ?? "";

  if (rbacSecret.length > 0 && rbacSecret.length < 32) {
    fail("RBAC_COOKIE_SECRET must be at least 32 characters.");
  } else if (rbacSecret.length >= 32) {
    ok("RBAC cookie secret length looks valid.");
  }

  if (healthToken.length > 0 && healthToken.length < 24) {
    fail("HEALTHCHECK_TOKEN must be at least 24 characters.");
  } else if (healthToken.length >= 24) {
    ok("Health check token length looks valid.");
  }

  const jwtSecret = env.JWT_SECRET?.trim() ?? "";
  if (jwtSecret.length > 0 && jwtSecret.length < 32) {
    fail("JWT_SECRET must be at least 32 characters.");
  } else if (jwtSecret.length >= 32) {
    ok("JWT secret length looks valid.");
  }

  const upstashUrl = hasValue("UPSTASH_REDIS_REST_URL");
  const upstashToken = hasValue("UPSTASH_REDIS_REST_TOKEN");
  if (upstashUrl !== upstashToken) {
    fail("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together.");
  } else if (upstashUrl && upstashToken) {
    ok("Distributed rate limiting is configured.");
  } else {
    warn("Distributed rate limiting is not configured; auth login will fall back to per-instance memory throttling in production.");
  }
}

function validateRuntimeHints() {
  const nodeEnv = env.NODE_ENV?.trim() ?? "";
  if (nodeEnv && nodeEnv !== "production") {
    warn(`NODE_ENV is '${nodeEnv}'. Production deployments should use NODE_ENV=production.`);
  } else {
    ok("NODE_ENV is production or unset for build tooling.");
  }

  const appUrl = env.APP_URL?.trim() || env.NEXT_PUBLIC_APP_URL?.trim() || "";
  if (!appUrl) {
    warn("APP_URL is not configured. Post-deploy smoke tests should pass APP_URL explicitly.");
  } else if (!/^https?:\/\//.test(appUrl)) {
    warn(`APP_URL '${appUrl}' is missing an http/https scheme.`);
  } else {
    ok("APP_URL is configured.");
  }
}

if (loadedFiles.length > 0) {
  console.log(`[predeploy-check] Loaded env files: ${loadedFiles.join(", ")}`);
} else {
  console.log("[predeploy-check] Loaded env values from process.env only.");
}

validateSecrets();
validateSecuritySettings();
validateRuntimeHints();

if (process.exitCode && process.exitCode !== 0) {
  console.error("[predeploy-check] Deployment readiness check failed.");
  process.exit(process.exitCode);
}

console.log("[predeploy-check] Deployment readiness check passed.");
