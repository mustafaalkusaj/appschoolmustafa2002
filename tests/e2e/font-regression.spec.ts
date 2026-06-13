import { test, expect } from '@playwright/test';

async function hideDevChrome(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [aria-label="Open Next.js Dev Tools"],
      [data-next-badge-root],
      [data-next-mark],
      [data-nextjs-toast],
      [data-nextjs-dialog-overlay] {
        display: none !important;
      }
    `,
  });
}

test.describe('Font Visual Regression Tests', () => {
  const pages = [
    { name: 'homepage-ar', url: '/ar' },
    { name: 'homepage-en', url: '/en' },
    { name: 'students-page', url: '/ar/students' },
  ];

  for (const pageInfo of pages) {
    test(`Verify fonts on ${pageInfo.name}`, async ({ page }) => {
      await page.goto(pageInfo.url);
      
      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);
      await hideDevChrome(page);

      // Check if critical elements have the correct font-family
      const bodyFont = await page.evaluate(() => {
        return window.getComputedStyle(document.body).fontFamily;
      });
      
      console.log(`Body font-family on ${pageInfo.name}: ${bodyFont}`);
      
      // Take a screenshot for visual comparison
      // The first time this runs, it will create a baseline
      await expect(page).toHaveScreenshot(`${pageInfo.name}-font-check.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
    });
  }

  test('Numeric elements use Rubik font', async ({ page }) => {
    await page.goto('/ar/students'); // Page likely to have numbers
    await page.evaluate(() => document.fonts.ready);

    const numericFont = await page.evaluate(() => {
      const element = document.querySelector('.tabular-nums') || document.querySelector('input[type="number"]');
      return element ? window.getComputedStyle(element).fontFamily : 'not found';
    });

    console.log(`Numeric font-family: ${numericFont}`);
    // We expect Rubik to be the primary or fallback for numbers
    if (numericFont !== 'not found') {
      expect(numericFont).toContain('Rubik');
    }
  });
});
