import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @ts-expect-error -- plain .mjs deploy helper, no type declarations
import { loadProductionEnv, buildProductionEnv } from "../../scripts/env-utils.mjs";

/**
 * Guards the deploy-time env render.
 *
 * scripts/direct-deploy.sh uploads this output verbatim as the server's
 * .env.production and pm2 loads it with --update-env. Copying the operator's
 * whole shell environment would ship a macOS PATH/HOME/TMPDIR onto the Linux
 * host and leak unrelated session tokens from whatever tool ran the deploy.
 */

let workDir: string;
const savedEnv = { ...process.env };
// Resolved once: a test below sets a bogus TMPDIR, and os.tmpdir() reads it.
const tmpRoot = os.tmpdir();

function writeEnvFile(name: string, body: string) {
  fs.writeFileSync(path.join(workDir, name), body, "utf8");
}

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(tmpRoot, "env-render-"));
  writeEnvFile(
    ".env",
    [
      "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-placeholder",
      "SUPABASE_SERVICE_ROLE_KEY=service-placeholder",
      "RBAC_COOKIE_SECRET=rbac-placeholder",
      "HEALTHCHECK_TOKEN=health-placeholder",
    ].join("\n"),
  );
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });

  // Mutate in place: reassigning process.env swaps the magic object for a
  // plain one and stops changes reaching the real environment.
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
});

describe("loadProductionEnv", () => {
  it("drops host and session variables that no env file declares", () => {
    process.env.PATH = "/Users/operator/bin";
    process.env.HOME = "/Users/operator";
    process.env.TMPDIR = "/var/folders/operator";
    process.env.SSH_AUTH_SOCK = "/private/tmp/agent.sock";
    process.env.SOME_UNRELATED_CLI_TOKEN = "leaked";

    const { env } = loadProductionEnv(workDir);

    expect(env.PATH).toBeUndefined();
    expect(env.HOME).toBeUndefined();
    expect(env.TMPDIR).toBeUndefined();
    expect(env.SSH_AUTH_SOCK).toBeUndefined();
    expect(env.SOME_UNRELATED_CLI_TOKEN).toBeUndefined();
  });

  it("still lets process.env override application keys", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://override.supabase.co";

    const { env } = loadProductionEnv(workDir);

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://override.supabase.co");
  });

  it("still lets process.env override any key an env file declares", () => {
    writeEnvFile(".env.production", "CUSTOM_APP_FLAG=from-file");
    process.env.CUSTOM_APP_FLAG = "from-process";

    const { env } = loadProductionEnv(workDir);

    expect(env.CUSTOM_APP_FLAG).toBe("from-process");
  });
});

describe("buildProductionEnv", () => {
  it("never ships build-tool credentials or cache settings", () => {
    writeEnvFile(
      ".env.production",
      [
        "VERCEL_OIDC_TOKEN=short-lived-placeholder",
        "TURBO_CACHE=remote",
        "NX_DAEMON=false",
      ].join("\n"),
    );

    const { env } = buildProductionEnv(workDir);

    expect(env.VERCEL_OIDC_TOKEN).toBeUndefined();
    expect(env.TURBO_CACHE).toBeUndefined();
    expect(env.NX_DAEMON).toBeUndefined();
  });

  it("keeps the keys the server actually needs", () => {
    const { env } = buildProductionEnv(workDir);

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://example.supabase.co");
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service-placeholder");
    expect(env.RBAC_COOKIE_SECRET).toBe("rbac-placeholder");
    expect(env.HEALTHCHECK_TOKEN).toBe("health-placeholder");
    expect(env.NODE_ENV).toBe("production");
    expect(env.PORT).toBe("3001");
    expect(env.SESSION_COOKIE_SECURE).toBe("true");
  });
});
