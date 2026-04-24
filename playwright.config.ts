import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const useDevServer = process.env.PLAYWRIGHT_USE_DEV_SERVER === "1";
const skipAuthSetup = process.env.PLAYWRIGHT_SKIP_AUTH_SETUP === "1";
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === "1";

function loadEnvFile(fileName: string) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

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

loadEnvFile(".env.local");
loadEnvFile(".env.vercel.local");
loadEnvFile(".env.e2e.local");

const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim() || process.env.PW_BASE_URL?.trim();
const baseURL = configuredBaseUrl || "http://127.0.0.1:3000";
const remoteBaseUrl = /^https?:\/\//i.test(baseURL) && !baseURL.includes("127.0.0.1:3000") && !baseURL.includes("localhost:3000");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "output/playwright/report" }],
  ],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  outputDir: "output/playwright/test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "chromium",
      dependencies: skipAuthSetup ? [] : ["setup"],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: disableWebServer || remoteBaseUrl
    ? undefined
    : {
        command: useDevServer
          ? "npm run dev -- --hostname 127.0.0.1 --port 3000"
          : "npm run build && npm run start -- --hostname 127.0.0.1 --port 3000",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: useDevServer && !process.env.CI,
        timeout: useDevServer ? 120_000 : 240_000,
      },
});
