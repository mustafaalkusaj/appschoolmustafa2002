const args = process.argv.slice(2);
const TARGET_URL = (args[0] || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const DEFAULT_PROBE_EMAIL = `rate-limit-probe-${Date.now()}@example.invalid`;
const PROBE_EMAIL = (args[1] || process.env.LOGIN_RATE_LIMIT_PROBE_EMAIL || DEFAULT_PROBE_EMAIL).trim().toLowerCase();
const MAX_ATTEMPTS = Number(args[2] || process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS || "6");
const INVALID_PASSWORD = "WrongPass123!";

async function attemptLogin(index) {
  const response = await fetch(`${TARGET_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "198.51.100.77",
    },
    body: JSON.stringify({
      email: PROBE_EMAIL,
      password: INVALID_PASSWORD,
    }),
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });

  const payload = await response.json().catch(() => null);

  if (index === 1 && response.status !== 401) {
    throw new Error(`attempt 1 expected 401, got ${response.status}`);
  }

  return {
    status: response.status,
    payload,
    retryAfter: response.headers.get("retry-after"),
    limit: response.headers.get("x-ratelimit-limit"),
    remaining: response.headers.get("x-ratelimit-remaining"),
  };
}

async function main() {
  console.log(`[postdeploy:login-rate-limit] Target ${TARGET_URL}`);
  console.log(`[postdeploy:login-rate-limit] Probe email configured (length=${PROBE_EMAIL.length})`);

  const results = [];
  for (let i = 1; i <= MAX_ATTEMPTS; i += 1) {
    const result = await attemptLogin(i);
    results.push(result);
    console.log(`[postdeploy:login-rate-limit] attempt ${i}: status=${result.status}`);
  }

  const final = results.at(-1);
  if (!final || final.status !== 429) {
    throw new Error(`expected final attempt to return 429, got ${final?.status ?? "none"}`);
  }

  if (final.payload?.error !== "too_many_attempts") {
    throw new Error(`expected error=too_many_attempts, got ${JSON.stringify(final.payload)}`);
  }

  if (typeof final.retryAfter !== "string" || !final.retryAfter) {
    throw new Error("missing Retry-After header on 429 response");
  }

  if (typeof final.limit !== "string" || typeof final.remaining !== "string") {
    throw new Error("missing X-RateLimit-* headers on 429 response");
  }

  console.log("[postdeploy:login-rate-limit] SUCCESS invalid login throttling is active.");
}

main().catch((error) => {
  console.error(`[postdeploy:login-rate-limit] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
