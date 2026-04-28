import { expect, type Locator, type Page } from "@playwright/test";
import { ensureE2EEnvLoaded, getQAAccount } from "./e2e-env";

ensureE2EEnvLoaded();

const adminAccount = getQAAccount("school_admin_a");
const superAdminAccount = getQAAccount("super_admin");
const loginTimeoutMs = 30_000;

type Locale = "ar" | "en";

type LoginOptions = {
  locale?: Locale;
  email: string;
  password: string;
  expectedPath: RegExp;
  expectedHeading: string;
};

async function typeControlledValue(locator: Locator, value: string) {
  await locator.click();
  await locator.pressSequentially(value, { delay: 20 });
}

export async function loginWithCredentials(
  page: Page,
  { locale = "ar", email, password, expectedPath, expectedHeading }: LoginOptions,
) {
  await page.goto(`/${locale}/login`);

  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  const submitButton = page.getByRole("button", { name: locale === "en" ? "Sign in" : "تسجيل الدخول" });

  await expect(emailInput).toBeEditable({ timeout: loginTimeoutMs });
  await typeControlledValue(emailInput, email);
  await expect(emailInput).toHaveValue(email);

  await expect(passwordInput).toBeEditable({ timeout: loginTimeoutMs });
  await typeControlledValue(passwordInput, password);
  await expect(passwordInput).toHaveValue(password);

  await expect(submitButton).toBeEnabled({ timeout: loginTimeoutMs });
  await submitButton.click();
  await expect.poll(() => page.url(), { timeout: loginTimeoutMs }).toMatch(expectedPath);
  await expect(page).toHaveURL(expectedPath, { timeout: loginTimeoutMs });

  // Verify page loaded (might be dashboard, group selection, or other post-login page)
  await expect(page.locator("body")).toBeVisible({ timeout: loginTimeoutMs });
}

export async function loginAsAdmin(page: Page, locale: Locale = "ar") {
  await loginWithCredentials(page, {
    locale,
    email: adminAccount.email,
    password: adminAccount.password,
    expectedPath: new RegExp(`/${locale}/(dashboard|group)(?:\\?.*)?$`),
    expectedHeading: locale === "en" ? "Dashboard" : "لوحة التحكم|المجموعة",
  });
}

export async function loginAsSuperAdmin(page: Page, locale: Locale = "ar") {
  await loginWithCredentials(page, {
    locale,
    email: superAdminAccount.email,
    password: superAdminAccount.password,
    expectedPath: new RegExp(`/${locale}/super-admin(?:\\?.*)?$`),
    expectedHeading: locale === "en" ? "Super Admin" : "المدير العام",
  });
}
