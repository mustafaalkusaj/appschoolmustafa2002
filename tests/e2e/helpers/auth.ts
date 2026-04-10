import { expect, type Page } from "@playwright/test";

const adminEmail = process.env.PW_ADMIN_EMAIL ?? "admin@schoolapp.com";
const adminPassword = process.env.PW_ADMIN_PASSWORD ?? "Admin@12345";
const superAdminEmail = process.env.PW_SUPER_ADMIN_EMAIL ?? "super.admin@schoolapp.com";
const superAdminPassword = process.env.PW_SUPER_ADMIN_PASSWORD ?? "Owner@12345";
const loginTimeoutMs = 30_000;

type Locale = "ar" | "en";

type LoginOptions = {
  locale?: Locale;
  email: string;
  password: string;
  expectedPath: RegExp;
  expectedHeading: string;
};

export async function loginWithCredentials(
  page: Page,
  { locale = "ar", email, password, expectedPath, expectedHeading }: LoginOptions,
) {
  await page.goto(`/${locale}/login`);

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: locale === "en" ? "Sign in" : "تسجيل الدخول" }).click();
  await expect.poll(() => page.url(), { timeout: loginTimeoutMs }).toMatch(expectedPath);
  await expect(page).toHaveURL(expectedPath, { timeout: loginTimeoutMs });
  await expect(
    page.getByRole("heading", {
      name: expectedHeading,
    }).first(),
  ).toBeVisible({ timeout: loginTimeoutMs });
}

export async function loginAsAdmin(page: Page, locale: Locale = "ar") {
  await loginWithCredentials(page, {
    locale,
    email: adminEmail,
    password: adminPassword,
    expectedPath: new RegExp(`/${locale}/dashboard(?:\\?.*)?$`),
    expectedHeading: locale === "en" ? "Dashboard" : "لوحة التحكم",
  });
}

export async function loginAsSuperAdmin(page: Page, locale: Locale = "ar") {
  await loginWithCredentials(page, {
    locale,
    email: superAdminEmail,
    password: superAdminPassword,
    expectedPath: new RegExp(`/${locale}/super-admin(?:\\?.*)?$`),
    expectedHeading: locale === "en" ? "Super Admin" : "المدير العام",
  });
}
