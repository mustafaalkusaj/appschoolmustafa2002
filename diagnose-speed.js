#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "https://school-iraq.com";
const PAGES = [
  { url: `/ar/login`, name: "Login (AR)" },
  { url: `/ar`, name: "Dashboard (AR)" },
  { url: `/ar/students`, name: "Students (AR)" },
  { url: `/ar/payments`, name: "Payments (AR)" },
  { url: `/ar/branch-overview`, name: "Branch Overview (AR)" },
];

const results = [];

async function measurePage(browser, pageUrl, pageName) {
  const context = await browser.newContext();
  const page = await context.newPage();

  const metrics = {
    page: pageName,
    url: pageUrl,
    ttfb: null,
    domContentLoaded: null,
    timeToFirstVisibleText: null,
    timeToLoginFormVisible: null,
    timeToCardVisible: null,
    bodyTextLength: {},
    inputCount: {},
    buttonCount: {},
    headingCount: {},
    errors: [],
    failedRequests: [],
    responses: {},
    blankPageAt1s: false,
    screenshots: [],
  };

  const startTime = Date.now();

  // Listen to events
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      metrics.errors.push(`console.error: ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    metrics.errors.push(`pageerror: ${err.message}`);
  });

  page.on("requestfailed", (req) => {
    metrics.failedRequests.push({
      url: req.url(),
      error: req.failure()?.errorText || "unknown",
    });
  });

  page.on("response", (res) => {
    const url = res.url();
    if (res.status() >= 400) {
      metrics.responses[url] = `${res.status()}`;
    }
  });

  try {
    // Navigate with domcontentloaded
    const navigationStart = Date.now();
    await page.goto(`${BASE_URL}${pageUrl}`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    metrics.domContentLoaded = Date.now() - navigationStart;

    // Measure TTFB (rough estimate from navigation start to first response)
    metrics.ttfb = metrics.domContentLoaded;

    // Try to detect first visible text
    try {
      await page.waitForSelector("body *:visible", { timeout: 3000 }).catch(() => {});
      metrics.timeToFirstVisibleText = Date.now() - startTime;
    } catch (e) {
      metrics.timeToFirstVisibleText = null;
    }

    // Check for login form if login page
    if (pageUrl.includes("login")) {
      try {
        await page.waitForSelector('input[type="email"], input[type="password"], button:has-text("تسجيل")', {
          timeout: 3000,
        }).catch(() => {});
        metrics.timeToLoginFormVisible = Date.now() - startTime;
      } catch (e) {
        metrics.timeToLoginFormVisible = null;
      }
    }

    // Check for dashboard cards/tables
    if (!pageUrl.includes("login")) {
      try {
        await page.waitForSelector('[class*="card"], [role="table"], table, [class*="Card"]', {
          timeout: 3000,
        }).catch(() => {});
        metrics.timeToCardVisible = Date.now() - startTime;
      } catch (e) {
        metrics.timeToCardVisible = null;
      }
    }

    // Measure body text at various intervals
    for (const ms of [1000, 3000, 5000, 8000]) {
      await page.waitForTimeout(ms === 1000 ? ms : 2000);
      const bodyText = await page.locator("body").innerText().catch(() => "");
      const inputCount = await page.locator("input").count().catch(() => 0);
      const buttonCount = await page.locator("button").count().catch(() => 0);
      const headingCount = await page.locator("h1, h2, h3").count().catch(() => 0);

      metrics.bodyTextLength[ms] = bodyText.length;
      metrics.inputCount[ms] = inputCount;
      metrics.buttonCount[ms] = buttonCount;
      metrics.headingCount[ms] = headingCount;

      if (ms === 1000 && bodyText.length < 50) {
        metrics.blankPageAt1s = true;
      }

      // Take screenshot
      try {
        const screenshotPath = path.join(
          __dirname,
          `perf-${pageUrl.replace(/\//g, "-")}-${ms}ms.png`
        );
        await page.screenshot({ path: screenshotPath, fullPage: false });
        metrics.screenshots.push(`${ms}ms: ${screenshotPath}`);
      } catch (e) {
        console.error(`Failed to take screenshot: ${e.message}`);
      }
    }
  } catch (err) {
    metrics.errors.push(`Navigation error: ${err.message}`);
  }

  await page.close();
  await context.close();

  return metrics;
}

async function main() {
  console.log(`\n📊 Performance Diagnostic Report\n`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Pages to measure: ${PAGES.length}`);
  console.log(`Starting measurements...\n`);

  const browser = await chromium.launch();

  for (const page of PAGES) {
    console.log(`⏱️ Measuring: ${page.name} (${page.url})`);
    const result = await measurePage(browser, page.url, page.name);
    results.push(result);
    console.log(
      `  ✓ DOMContentLoaded: ${result.domContentLoaded}ms, Body text at 1s: ${result.bodyTextLength[1000]} chars`
    );
    console.log(
      `  ✓ Blank page at 1s: ${result.blankPageAt1s ? "YES ⚠️" : "NO ✓"}`
    );
    if (result.errors.length > 0) {
      console.log(`  ✓ Errors: ${result.errors.length}`);
    }
  }

  await browser.close();

  // Generate report
  const reportPath = path.join(__dirname, "speed-diagnostic-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Report saved to: ${reportPath}`);

  // Print summary table
  console.log(`\n📈 Summary:\n`);
  console.table(
    results.map((r) => ({
      Page: r.page,
      "DOM (ms)": r.domContentLoaded,
      "1s Text": r.bodyTextLength[1000],
      "5s Text": r.bodyTextLength[5000],
      "Blank@1s": r.blankPageAt1s ? "⚠️" : "✓",
      Errors: r.errors.length,
      "Failed Reqs": r.failedRequests.length,
    }))
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
