import fs from "node:fs/promises";
import { test, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

const outputDir = "/Users/musatafa/school-app/output/playwright/redesign-verification";

async function capture(page: Page, route: string, filename: string) {
  await page.goto(route);
  if (route.includes("/login")) {
    await page.locator("#email").waitFor({ state: "visible" });
  } else {
    await page.locator("header").first().waitFor({ state: "visible" });
  }
  await page.waitForTimeout(2_500);
  await page.screenshot({ path: `${outputDir}/${filename}`, fullPage: true });
}

test("capture redesign verification routes", async ({ page }) => {
  test.setTimeout(180_000);
  await fs.mkdir(outputDir, { recursive: true });

  await capture(page, "/ar/login", "login-ar-light.png");
  await capture(page, "/en/login", "login-en-light.png");

  await loginAsAdmin(page, "ar");

  for (const [route, filename] of [
    ["/ar/dashboard", "dashboard-ar-light.png"],
    ["/en/dashboard", "dashboard-en-light.png"],
    ["/ar/students", "students-ar-light.png"],
    ["/en/students", "students-en-light.png"],
    ["/ar/payments", "payments-ar-light.png"],
    ["/en/payments", "payments-en-light.png"],
    ["/ar/salaries", "salaries-ar-light.png"],
    ["/en/salaries", "salaries-en-light.png"],
  ] as const) {
    await capture(page, route, filename);
  }

  await page.goto("/ar/login");
  await page.evaluate(() => {
    window.localStorage.setItem("theme", "dark");
  });

  for (const [route, filename] of [
    ["/ar/login", "login-ar-dark.png"],
    ["/en/dashboard", "dashboard-en-dark.png"],
    ["/en/students", "students-en-dark.png"],
    ["/en/payments", "payments-en-dark.png"],
    ["/en/salaries", "salaries-en-dark.png"],
  ] as const) {
    await capture(page, route, filename);
  }
});
