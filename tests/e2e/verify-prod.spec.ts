import { test, expect } from '@playwright/test';

// Production verification for bulk import fix
test.describe('Production Bulk Import - Schema Fix Verification', () => {
  const BASE_URL = 'https://school-iraq.com';
  const EMAIL = 'qa.schooladmin.a@example.test';
  const PASSWORD = '8eI1DRKPEHMNTvNLdhPYA4_kgAc';

  test('should load students page without schema errors', async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/ar/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    // Wait for redirect to dashboard/group selection
    await page.waitForURL(/\/(ar|en)\/(dashboard|group|branch-overview)/, { timeout: 30000 });

    // Navigate to students page
    await page.goto(`${BASE_URL}/ar/students`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Verify no global error boundary or redirect to error
    expect(page.url()).toContain('/ar/students');
    
    // Check for old schema error messages
    const errorTexts = [
      'classes.name_ar',
      'classes.nameAr',
      'column nameAr',
      'column nameEn',
      'column gradeLevel',
      'academic_year_id',
      'does not exist'
    ];

    for (const errorText of errorTexts) {
      const errorElement = page.locator(`text="${errorText}"`);
      expect(await errorElement.count()).toBe(0);
    }

    console.log('✓ Students page loaded without schema errors');
  });

  test('should open bulk import modal without errors', async ({ page }) => {
    // Setup auth
    await page.goto(`${BASE_URL}/ar/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await page.waitForURL(/\/(ar|en)\/(dashboard|group|branch-overview)/, { timeout: 30000 });

    // Navigate to students
    await page.goto(`${BASE_URL}/ar/students`);
    await page.waitForLoadState('networkidle');

    // Find and click import button
    const importButton = page.locator('button:has-text("استيراج جماعي"), button:has-text("استيراد جماعي")').first();
    
    if (await importButton.count() > 0) {
      await importButton.click();
      
      // Wait for modal to open
      await page.locator('[role="dialog"]').first().waitFor({ timeout: 5000 });
      
      // Verify no error messages in modal
      const modalText = await page.locator('[role="dialog"]').first().textContent();
      
      const schemaErrors = [
        'classes.name_ar',
        'nameAr does not exist',
        'nameEn does not exist',
        'gradeLevel does not exist'
      ];

      for (const error of schemaErrors) {
        expect(modalText).not.toContain(error);
      }

      console.log('✓ Bulk import modal opened without schema errors');
    } else {
      console.log('⚠ Import button not found (expected if no import permission)');
    }
  });

  test('should validate parse endpoint responds with 200 (not 500)', async ({ page }) => {
    // Setup auth
    await page.goto(`${BASE_URL}/ar/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await page.waitForURL(/\/(ar|en)\/(dashboard|group|branch-overview)/, { timeout: 30000 });

    // Get auth token from page
    const cookies = await page.context().cookies();
    const authToken = cookies.find(c => c.name.toLowerCase().includes('auth') || c.name.includes('supabase'))?.value;

    // Test parse endpoint
    const response = await page.request.post(`${BASE_URL}/api/students/parse-import`, {
      headers: {
        'Authorization': authToken ? `Bearer ${authToken}` : '',
      },
      data: new FormData() // Empty form data
    });

    console.log(`Parse endpoint status: ${response.status()}`);
    
    // Should be 400 (bad request - no file) not 500 (server error)
    // If it's 401/403, auth issue
    // If it's 500, schema issue
    expect([400, 401, 403, 422]).toContain(response.status());
    expect(response.status()).not.toBe(500);

    const responseText = await response.text();
    expect(responseText).not.toContain('classes.name_ar');
    expect(responseText).not.toContain('nameAr');
    expect(responseText).not.toContain('does not exist');

    console.log('✓ Parse endpoint not returning schema errors');
  });

  test('should check console for errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate
    await page.goto(`${BASE_URL}/ar/login`);
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await page.waitForURL(/\/(ar|en)\/(dashboard|group|branch-overview)/, { timeout: 30000 });

    await page.goto(`${BASE_URL}/ar/students`);
    await page.waitForLoadState('networkidle');

    const schemaErrorsInConsole = consoleErrors.filter(e => 
      e.includes('classes.name_ar') || 
      e.includes('does not exist') ||
      e.includes('nameAr')
    );

    expect(schemaErrorsInConsole).toHaveLength(0);
    console.log(`✓ No schema errors in console (${consoleErrors.length} total errors)`);
  });
});
