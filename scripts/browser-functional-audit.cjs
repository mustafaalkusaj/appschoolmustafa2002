const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE_URL = process.env.AUDIT_BASE_URL || "http://127.0.0.1:3031";
const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "reliability-audit");

async function loginAndSaveState(browser, options) {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  await page.goto("/ar/login", { waitUntil: "domcontentloaded", timeout: 20_000 });
  await page.waitForTimeout(700);
  await page.fill("#email", options.email);
  await page.fill("#password", options.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 30_000 });
  await page.waitForTimeout(1500);

  const storageStatePath = path.join(OUTPUT_DIR, `${options.label}-storage-state.json`);
  await context.storageState({ path: storageStatePath });

  const output = {
    label: options.label,
    email: options.email,
    finalUrl: page.url(),
    storageStatePath,
  };

  await context.close();
  return output;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    const admin = await loginAndSaveState(browser, {
      label: "admin",
      email: "admin@schoolapp.com",
      password: "Admin@12345",
    });
    const superAdmin = await loginAndSaveState(browser, {
      label: "super-admin",
      email: "super.admin@schoolapp.com",
      password: "Owner@12345",
    });

    const result = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      admin,
      superAdmin,
    };

    const outputPath = path.join(OUTPUT_DIR, "browser-functional-audit.json");
    await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
