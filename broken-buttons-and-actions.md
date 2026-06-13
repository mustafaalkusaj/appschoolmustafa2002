# Broken Buttons And Actions

## Confirmed Broken

- `Dashboard widget refresh / retry context` on `/ar/dashboard` and `/en/dashboard`
  - Result: the page shell loads, but the teacher-activity and fee-notification widgets keep failing because their APIs return `500`.
  - Evidence: `output/playwright/live-audit/live-audit.json`

- `Monitoring page primary data load` on `/ar/monitoring` and `/en/monitoring`
  - Result: the route opens, but the core dataset request returns `500`, so the main monitoring experience is broken for admins.
  - Endpoint: `/api/web/teacher-activity/messages?...`

- `Fee notifications page primary data load` on `/ar/fee-notifications` and `/en/fee-notifications`
  - Result: the route opens, but the main notifications request returns `500`, so the feature is broken for admins.
  - Endpoint: `/api/web/fee-notifications?...`

- `Super-admin route access` for admin users on `/ar/super-admin`
  - Result: the page stays on the super-admin URL, produces repeated `403` calls, and does not present a usable access-denied state.

- `Users route` for super-admins on `/ar/users` and `/en/users`
  - Result: both routes resolve to teachers management instead of a users screen.
  - Status: wrong route target / misleading navigation

## Confirmed Partial Or Flaky

- `Authenticated dashboard locale switch smoke`
  - Result: the Playwright smoke test timed out waiting for the Arabic dashboard heading after login.
  - Status: flaky authenticated flow, not stable enough for CI confidence

- `Teacher account-card print` button
  - Route: `/ar/teachers`
  - Result: button click was exercised, but the dedicated print audit did not observe a printable iframe within 6 seconds.
  - Status: partially verified, likely brittle

- `Reports summary print` button
  - Route: `/ar/reports`
  - Result: button click was exercised, but the dedicated print audit did not observe a printable iframe within 6 seconds.
  - Status: partially verified, likely brittle

- `Salaries all-teachers print` button
  - Route: `/ar/salaries`
  - Result: button click was exercised, but the dedicated print audit did not observe a printable iframe within 6 seconds.
  - Status: partially verified, likely brittle

- `Students filtered print` button
  - Route: `/ar/students`
  - Result: the print path was exercised, but the preview iframe never exposed a readable content frame for capture.
  - Status: partially verified, not release-grade from a QA perspective

## Verified Working During This Audit

- `+ إضافة طالب` opened the add-student modal.
- `إضافة أستاذ` opened on teachers and salaries pages.
- `بطاقة الدخول` opened the teacher account-card modal.
- `+ إضافة فاتورة` opened the payments modal.
- `عرض التفاصيل` on payments opened the student detail drawer.
- `دفع` on salaries opened the pay-salary modal.

## Not Marked Broken Because Evidence Was Inconclusive

- Student row-menu `تعديل`, `حذف`, and row-level `طباعة`
  - The first automation pass hit selector drift against the student modals.
  - The second, narrower rerun produced screenshots but did not flush a fresh JSON report before the browser session hung.
  - These actions should be rechecked manually in a headed browser before release, but I am not marking them confirmed-broken from the current evidence alone.
