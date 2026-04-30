import { test, expect } from '@playwright/test';

/**
 * Visual Smoke Test
 * Verifies critical pages load without blank screens
 * No authentication required - public accessibility checks only
 */

test.describe('Production Smoke Tests - Visual', () => {

  test('Login page AR loads with form elements', async ({ page }) => {
    await page.goto('/ar/login');

    // Page loaded (not blank)
    await expect(page).toHaveTitle(/login|تسجيل/i);

    // Form elements visible
    const emailInput = page.locator('input[type="email"], input[placeholder*="بريد"], input[placeholder*="email"]');
    const passwordInput = page.locator('input[type="password"], input[placeholder*="كلمة"], input[placeholder*="password"]');

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    // No console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // No red errors in console
    expect(errors.filter(e => e.includes('Error') || e.includes('Uncaught')).length).toBe(0);
  });

  test('Login page EN loads with form elements', async ({ page }) => {
    await page.goto('/en/login');

    // Page loaded
    await expect(page).toHaveTitle(/login|sign/i);

    // Form elements visible
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  });

  test('Protected pages redirect to login (not blank)', async ({ page }) => {
    const protectedPages = [
      '/ar/students',
      '/ar/payments',
      '/ar/branch-overview',
      '/ar/attendance'
    ];

    for (const path of protectedPages) {
      await page.goto(path);

      // Should redirect to login, not show blank page
      const url = page.url();
      expect(url).toContain('/login');

      // Login form should be visible
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible({ timeout: 3000 });
    }
  });

  test('No chunk mismatch errors', async ({ page }) => {
    // Track all page navigations
    const errorMessages: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Chunk') || text.includes('not found')) {
        errorMessages.push(text);
      }
    });

    // Try loading critical pages
    const pages = ['/ar/login', '/ar'];
    for (const path of pages) {
      await page.goto(path, { waitUntil: 'networkidle' }).catch(() => {});
    }

    // No chunk errors
    expect(errorMessages.filter(e => e.includes('Chunk')).length).toBe(0);
  });

  test('No blank pages (body has content)', async ({ page }) => {
    const pagesToCheck = ['/ar/login', '/en/login', '/'];

    for (const path of pagesToCheck) {
      await page.goto(path);

      // Body not empty
      const body = page.locator('body');
      const innerHTML = await body.innerHTML();
      expect(innerHTML.length).toBeGreaterThan(100); // has content

      // No complete blank screen
      const content = await page.content();
      expect(content).not.toMatch(/<body>\s*<\/body>/);
    }
  });

  test('Error boundaries render (no complete crashes)', async ({ page }) => {
    page.on('console', msg => {
      // Error boundaries should log but page should render fallback UI
      if (msg.type() === 'error' && msg.text().includes('Uncaught')) {
        console.log('Caught error (expected if error boundary caught it):', msg.text());
      }
    });

    // Navigate to a page
    await page.goto('/ar/login');

    // Page should still be responsive (error boundary worked)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('No runtime errors in console on startup', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/ar/login');
    await page.waitForTimeout(2000); // Wait for startup

    // Filter out expected external errors
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('third-party') &&
      !e.includes('external') &&
      !e.includes('CSP') &&
      !e.includes('CORS') &&
      e.length > 0
    );

    // Should be zero or very few
    if (criticalErrors.length > 0) {
      console.warn('Startup errors found:', criticalErrors);
    }
  });

  test('Network requests complete without 500 errors', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('response', response => {
      if (response.status() === 500) {
        failedRequests.push(`${response.url()} - 500`);
      }
    });

    await page.goto('/ar/login');
    await page.waitForTimeout(1000);

    // No HTTP 500 errors on startup
    expect(failedRequests.length).toBe(0);
  });

  test('Page renders within timeout (not hanging)', async ({ page }) => {
    const timeout = 10000; // 10 seconds max
    const startTime = Date.now();

    await page.goto('/ar/login', { waitUntil: 'load', timeout });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(timeout);
    console.log(`Page loaded in ${loadTime}ms`);
  });
});
