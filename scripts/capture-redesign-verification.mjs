import { chromium } from "@playwright/test";
import fs from "node:fs/promises";

const outDir = "output/playwright/redesign-verification";
const adminEmail = process.env.PW_ADMIN_EMAIL ?? "admin@schoolapp.com";
const adminPassword = process.env.PW_ADMIN_PASSWORD ?? "Admin@12345";

async function login(page, locale = "ar") {
  await page.goto(`http://127.0.0.1:3000/${locale}/login`, { waitUntil: "domcontentloaded" });
  const loginResult = await page.evaluate(
    async ({ email, password }) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => null);
      return { ok: response.ok, payload };
    },
    { email: adminEmail, password: adminPassword },
  );

  if (!loginResult.ok) {
    throw new Error(`Login failed for screenshot capture: ${JSON.stringify(loginResult.payload)}`);
  }

  await page.goto(`http://127.0.0.1:3000/${locale}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(new RegExp(`/${locale}/dashboard(?:\\?.*)?$`), { timeout: 20_000 });
  await page.waitForTimeout(2_500);
}

async function capture(page, route, filename, waitForText = null) {
  try {
    await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: "commit" });
    await page.waitForLoadState("domcontentloaded").catch(() => null);
    if (waitForText) {
      await page.getByText(waitForText, { exact: false }).first().waitFor({ state: "visible", timeout: 20_000 }).catch(() => null);
    }
    await page.waitForLoadState("networkidle").catch(() => null);
    await page.waitForTimeout(3_500);
    await page.screenshot({ path: `${outDir}/${filename}`, fullPage: true });
    console.log(`${route} -> ${outDir}/${filename}`);
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAILED ${route}: ${message}`);
    return { route, filename, message };
  }
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const failures = [];

  const browser = await chromium.launch({ headless: true });

  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const publicPage = await publicContext.newPage();
  failures.push(...[await capture(publicPage, "/ar/login", "login-ar-light.png", "تسجيل الدخول"), await capture(publicPage, "/en/login", "login-en-light.png", "Sign In")].filter(Boolean));
  await publicContext.close();

  const authedContext = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const authedPage = await authedContext.newPage();
  await login(authedPage, "ar");

  for (const [route, filename] of [
    ["/ar/dashboard", "dashboard-ar-light.png"],
    ["/en/dashboard", "dashboard-en-light.png"],
    ["/ar/students", "students-ar-light.png"],
    ["/en/students", "students-en-light.png"],
    ["/ar/payments", "payments-ar-light.png"],
    ["/en/payments", "payments-en-light.png"],
    ["/ar/salaries", "salaries-ar-light.png"],
    ["/en/salaries", "salaries-en-light.png"],
  ]) {
    const waitForText =
      route.includes("/dashboard") ? (route.startsWith("/en/") ? "Dashboard" : "لوحة التحكم") :
      route.includes("/students") ? (route.startsWith("/en/") ? "Students" : "الطلاب") :
      route.includes("/payments") ? (route.startsWith("/en/") ? "Payments" : "الحسابات") :
      route.includes("/salaries") ? (route.startsWith("/en/") ? "Salaries" : "الرواتب") :
      null;
    const failure = await capture(authedPage, route, filename, waitForText);
    if (failure) failures.push(failure);
  }

  const storageState = await authedContext.storageState();
  await authedContext.close();

  const darkContext = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    storageState,
  });
    await darkContext.addInitScript(() => {
      window.localStorage.setItem("theme", "dark");
    });

  const darkPage = await darkContext.newPage();
  for (const [route, filename] of [
    ["/ar/login", "login-ar-dark.png"],
    ["/en/dashboard", "dashboard-en-dark.png"],
    ["/en/students", "students-en-dark.png"],
    ["/en/payments", "payments-en-dark.png"],
    ["/en/salaries", "salaries-en-dark.png"],
  ]) {
    const waitForText =
      route.includes("/dashboard") ? (route.startsWith("/en/") ? "Dashboard" : "لوحة التحكم") :
      route.includes("/students") ? (route.startsWith("/en/") ? "Students" : "الطلاب") :
      route.includes("/payments") ? (route.startsWith("/en/") ? "Payments" : "الحسابات") :
      route.includes("/salaries") ? (route.startsWith("/en/") ? "Salaries" : "الرواتب") :
      route.includes("/login") ? (route.startsWith("/en/") ? "Sign In" : "تسجيل الدخول") :
      null;
    const failure = await capture(darkPage, route, filename, waitForText);
    if (failure) failures.push(failure);
  }

  await darkContext.close();
  await browser.close();

  if (failures.length > 0) {
    await fs.writeFile(`${outDir}/capture-failures.json`, JSON.stringify(failures, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
