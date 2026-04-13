const args = process.argv.slice(2);
const TARGET_URL = (args[0] || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const HEALTHCHECK_TOKEN = args[1] || process.env.HEALTHCHECK_TOKEN || "";

async function expectJson(pathname, configure = () => ({}), validate) {
  const url = `${TARGET_URL}${pathname}`;
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
    ...configure(),
  });

  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`);
  }

  const payload = await response.json();
  validate?.(payload);
  console.log(`[postdeploy:smoke] OK ${pathname}`);
}

async function expectPage(pathname, validate) {
  const url = `${TARGET_URL}${pathname}`;
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`${pathname} returned ${response.status}`);
  }

  const html = await response.text();
  validate?.(html, response.url);
  console.log(`[postdeploy:smoke] OK ${pathname}`);
}

async function main() {
  console.log(`[postdeploy:smoke] Target ${TARGET_URL}`);

  await expectJson("/api/ping", undefined, (payload) => {
    if (!payload?.ok) {
      throw new Error("/api/ping returned ok=false");
    }
  });

  if (HEALTHCHECK_TOKEN) {
    await expectJson(
      "/api/health",
      () => ({
        headers: {
          "x-health-token": HEALTHCHECK_TOKEN,
        },
      }),
      (payload) => {
        if (!payload?.ok) {
          throw new Error("/api/health returned degraded state");
        }
      },
    );
  } else {
    console.warn("[postdeploy:smoke] WARN /api/health skipped because HEALTHCHECK_TOKEN is not set.");
  }

  await expectPage("/", (_, finalUrl) => {
    if (!/\/(ar|en)\/login/.test(finalUrl)) {
      throw new Error(`/ did not land on localized login, got ${finalUrl}`);
    }
  });

  await expectPage("/ar/login", (html) => {
    if (!html.includes("name@school.com")) {
      throw new Error("/ar/login does not contain the login form");
    }
  });

  await expectPage("/en/login", (html) => {
    if (!html.includes("name@school.com")) {
      throw new Error("/en/login does not contain the login form");
    }
  });

  console.log("[postdeploy:smoke] SUCCESS all checks passed.");
}

main().catch((error) => {
  console.error(`[postdeploy:smoke] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
