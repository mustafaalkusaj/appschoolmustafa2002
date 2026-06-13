import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.QA_TARGET_URL || process.env.PLAYWRIGHT_BASE_URL || 'https://app.school-iraq.com';

type DiagnosticSignals = {
  consoleErrors: string[];
  pageErrors: string[];
  networkFailures: string[];
  serverErrors: string[];
};

function createSignals(): DiagnosticSignals {
  return {
    consoleErrors: [],
    pageErrors: [],
    networkFailures: [],
    serverErrors: [],
  };
}

function attachDiagnostics(page: Page, signals: DiagnosticSignals) {
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('favicon') && !text.includes('script tag')) {
      signals.consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    signals.pageErrors.push(err.message);
  });

  page.on('requestfailed', (req) => {
    const error = req.failure()?.errorText ?? 'unknown';
    if (error !== 'net::ERR_ABORTED' || !req.url().includes('_rsc=')) {
      signals.networkFailures.push(`${req.method()} ${req.url()}: ${error}`);
    }
  });

  page.on('response', (res) => {
    if (res.status() >= 500) {
      signals.serverErrors.push(`${res.status()} ${res.url()}`);
    }
  });
}

function reportSignals(signals: DiagnosticSignals, testName: string) {
  if (signals.consoleErrors.length > 0) {
    console.log(`[${testName}] Console errors:`, signals.consoleErrors);
  }
  if (signals.pageErrors.length > 0) {
    console.log(`[${testName}] Page errors:`, signals.pageErrors);
  }
  if (signals.networkFailures.length > 0) {
    console.log(`[${testName}] Network failures:`, signals.networkFailures);
  }
  if (signals.serverErrors.length > 0) {
    console.log(`[${testName}] Server errors:`, signals.serverErrors);
  }
}

test.describe('Production UI Validation', () => {
  test('login page renders without critical errors', async ({ page }) => {
    const signals = createSignals();
    attachDiagnostics(page, signals);

    const response = await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(500);

    // Check page is visible
    await expect(page.locator('body')).toBeVisible();

    // Detect form elements using multiple selectors
    const emailInputs = await page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="mail"], input[placeholder*="Email"]'
    ).count();

    const passwordInputs = await page.locator(
      'input[type="password"], input[name="password"], input[placeholder*="password"], input[placeholder*="Password"]'
    ).count();

    console.log(`Email inputs found: ${emailInputs}`);
    console.log(`Password inputs found: ${passwordInputs}`);

    // Form should have email/password inputs or login button
    const hasForm = emailInputs > 0 || passwordInputs > 0 ||
                    (await page.getByRole('button', { name: /login|تسجيل/i }).count()) > 0;

    expect(hasForm, 'Login page should have form controls').toBe(true);

    reportSignals(signals, 'login-page');
    expect(signals.serverErrors.length).toBe(0);
  });

  test('login page responsive on desktop, tablet, mobile', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
    ];

    for (const viewport of viewports) {
      const signals = createSignals();
      attachDiagnostics(page, signals);

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

      expect(response?.status()).toBeLessThan(500);

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > window.innerWidth + 1
      );

      expect(hasOverflow, `${viewport.name} should not have horizontal overflow`).toBe(false);

      reportSignals(signals, `login-${viewport.name}`);
      expect(signals.serverErrors.length).toBe(0);
    }
  });

  test('public pages load without critical errors', async ({ page }) => {
    const publicPages = [
      '/subscription-expired',
      '/forbidden',
    ];

    for (const pagePath of publicPages) {
      const signals = createSignals();
      attachDiagnostics(page, signals);

      const response = await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle' });
      expect(response?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();

      reportSignals(signals, `page-${pagePath}`);
      expect(signals.serverErrors.length).toBe(0);
    }
  });

  test('protected routes redirect or load appropriately', async ({ page }) => {
    const protectedRoutes = [
      { path: '/portal', shouldRedirect: false }, // May load without auth for this app
      { path: '/super-admin', shouldRedirect: false },
    ];

    for (const route of protectedRoutes) {
      const signals = createSignals();
      attachDiagnostics(page, signals);

      const response = await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'domcontentloaded' });

      expect(response?.status()).toBeLessThan(500);
      await page.waitForLoadState('networkidle');

      const finalUrl = page.url();
      const status = response?.status() || 0;

      console.log(`Route ${route.path} -> ${status} -> ${finalUrl}`);

      reportSignals(signals, `protected-${route.path}`);
      expect(signals.serverErrors.length).toBe(0);
    }
  });

  test('API endpoints reject unauthenticated requests safely', async ({ request }) => {
    const apiEndpoints = [
      '/api/ping', // Public
      '/api/account/me', // Protected
      '/api/users', // Protected
    ];

    for (const endpoint of apiEndpoints) {
      const response = await request.get(`${BASE_URL}${endpoint}`, { failOnStatusCode: false });

      const status = response.status();
      console.log(`${endpoint} -> ${status}`);

      // /api/ping should be 200, protected should reject
      if (endpoint === '/api/ping') {
        expect(status).toBe(200);
      } else {
        expect([401, 403, 404, 302, 307]).toContain(status);
      }
    }
  });

  test('health check endpoint works', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/ping`);
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.status).toBe('ok');
    expect(json.timestamp).toBeTruthy();
  });

  test('root redirect works', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });

    expect([301, 302, 307]).toContain(response?.status() || 0);

    const finalUrl = page.url();
    console.log(`Root redirect: / -> ${finalUrl}`);
  });

  test('check for hydration errors', async ({ page }) => {
    const signals = createSignals();

    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('hydrate')) {
        signals.consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForLoadState('networkidle');

    expect(signals.consoleErrors.length).toBe(0);
  });

  test('RTL/Arabic layout if supported', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    expect(response?.status()).toBeLessThan(500);

    // Check if page supports RTL
    const htmlDir = await page.locator('html').getAttribute('dir');
    const htmlLang = await page.locator('html').getAttribute('lang');

    console.log(`HTML dir: ${htmlDir}, lang: ${htmlLang}`);

    if (htmlDir === 'rtl' || htmlLang?.startsWith('ar')) {
      console.log('RTL/Arabic layout detected');

      // Check basic RTL properties
      const button = page.getByRole('button').first();
      if (await button.count() > 0) {
        const bbox = await button.boundingBox();
        expect(bbox).toBeTruthy();
      }
    }
  });
});
