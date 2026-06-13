#!/usr/bin/env node

/**
 * Production Smoke Test
 * Safe endpoint checks without authentication
 * No data modifications - read-only verification only
 */

import process from 'process';

const baseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

const endpoints = [
  { path: '/', name: 'Root', expectedStatus: 200 },
  { path: '/ar/login', name: 'Login AR', expectedStatus: 200 },
  { path: '/en/login', name: 'Login EN', expectedStatus: 200 },
  { path: '/ar/students', name: 'Students Protected', expectedStatus: [307, 308] }, // redirect
  { path: '/ar/payments', name: 'Payments Protected', expectedStatus: [307, 308] },
  { path: '/ar/branch-overview', name: 'Branch Overview Protected', expectedStatus: [307, 308] },
  { path: '/ar/attendance', name: 'Attendance Protected', expectedStatus: [307, 308] },
];

async function checkEndpoint(url, expectedStatuses) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      timeout: 5000
    });

    const isExpected = Array.isArray(expectedStatuses)
      ? expectedStatuses.includes(response.status)
      : response.status === expectedStatuses;

    return {
      status: response.status,
      ok: isExpected,
      redirectUrl: response.headers.get('location')
    };
  } catch (error) {
    return {
      status: null,
      ok: false,
      error: error.message
    };
  }
}

async function runSmokeTests() {
  console.log(`🧪 Production Smoke Test Starting...`);
  console.log(`📍 Base URL: ${baseUrl}\n`);

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const endpoint of endpoints) {
    const fullUrl = `${baseUrl}${endpoint.path}`;
    console.log(`⏳ Testing: ${endpoint.name}...`);

    const result = await checkEndpoint(fullUrl, endpoint.expectedStatus);

    if (result.ok) {
      console.log(`  ✅ ${endpoint.name} - Status ${result.status}`);
      passCount++;
    } else {
      console.log(`  ❌ ${endpoint.name} - Expected ${endpoint.expectedStatus}, got ${result.status}`);
      if (result.error) console.log(`     Error: ${result.error}`);
      failCount++;
    }

    results.push({
      endpoint: endpoint.name,
      path: endpoint.path,
      expected: endpoint.expectedStatus,
      actual: result.status,
      redirect: result.redirectUrl,
      passed: result.ok
    });
  }

  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed\n`);

  if (failCount > 0) {
    console.log('❌ SMOKE TEST FAILED');
    console.log('\nFailed endpoints:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.endpoint}: expected ${r.expected}, got ${r.actual}`);
    });
    process.exit(1);
  } else {
    console.log('✅ SMOKE TEST PASSED');
    process.exit(0);
  }
}

runSmokeTests().catch(error => {
  console.error('💥 Smoke test error:', error);
  process.exit(1);
});
