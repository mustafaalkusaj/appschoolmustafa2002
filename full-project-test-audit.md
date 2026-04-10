# Full Project Test Audit

## Executive Summary

- Scope audited: the active root Next.js app at `/Users/musatafa/school-app`, served on `http://127.0.0.1:3000`.
- Environment validation passed: `/` redirected to `/ar` with `307`, and both `/ar/login` and `/en/login` returned `200` with locale alternates and critical assets present.
- Live evidence captured:
  - 50 route screenshots in `output/playwright/live-audit/screenshots`
  - 27 targeted action screenshots in `output/playwright/critical-flows/screenshots`
  - 26 Playwright critical-route screenshots in `output/playwright/critical-routes`
  - 4 offline reload probes in `output/playwright/live-audit/live-audit.json`
- Automated validation:
  - `npm run lint`: failed with 34 errors and 71 warnings
  - `npm run typecheck`: passed
  - `npm test`: passed, 5 files and 16 tests
  - Playwright smoke: public login and auth redirect smoke passed; authenticated locale-switch smoke failed; admin critical-route sweep failed on `/ar/attendance`; isolated super-admin critical-route sweep passed
- Load/performance validation:
  - `scripts/load-audit.mjs`: most query stages were stable, but initial super-admin-route and teachers-api fetch stages flaked
  - `k6 load-test.js`: failed thresholds with `http_req_failed=12.50%` and `p95=1.71s`

## What Works Well

- Admin and super-admin login both worked in Arabic and English using the supplied credentials.
- Core shell routes for students, teachers, payments, salaries, reports, expenses, and attendance rendered in both locales.
- Locale direction was correct in all captured routes:
  - Arabic pages used `dir=rtl`
  - English pages used `dir=ltr`
- RBAC generally worked:
  - unauthenticated API calls returned `401` with a clear Arabic message
  - admin access to the English super-admin route redirected to `/en/access-denied`
- Partial failure isolation exists:
  - the dashboard still rendered even when widget APIs returned `500`
- Type generation and unit/API tests were healthy:
  - `npm run typecheck` passed
  - `npm test` passed
- Local database-query load held up reasonably well:
  - high-students-query p95 was about `1077ms`
  - login-cycle p95 was about `1743ms`

## Confirmed Broken Behavior

- Admin dashboard widgets are broken in both locales because live widget endpoints return `500`:
  - `/api/web/teacher-activity/messages?...`
  - `/api/web/teacher-activity/homework?...`
  - `/api/web/fee-notifications?...`
- Admin monitoring is broken functionally:
  - the page shell renders, but `/api/web/teacher-activity/messages?...` returns `500`
- Admin fee notifications are broken functionally:
  - the page shell renders, but `/api/web/fee-notifications?...` returns `500`
- English localization is incomplete on multiple routes:
  - `/en/attendance`
  - `/en/expenses`
  - `/en/monitoring`
  - `/en/fee-notifications`
  - `/en/schools`
  - `/en/subscriptions`
- The super-admin `/users` route is misrouted:
  - `/ar/users` resolved to `/ar/teachers`
  - `/en/users` resolved to `/en/teachers`
- Admin Arabic unauthorized handling for `/ar/super-admin` is broken:
  - the route stayed on `/ar/super-admin`
  - the heading was `null`
  - the page generated repeated `403` calls instead of showing a clean access-denied screen
- Data integrity is broken on the students screen:
  - the “active” filter returned withdrawn, graduated, and archived students
  - students summary counts do not match students list counts or payments counts
- `/api/ping` is broken as a diagnostic endpoint:
  - it returned `200`, but `{"ok":false,"supabase":"error"}`

## Partially Broken Or Flaky Behavior

- `/api/health` was unreliable during the audit:
  - it returned degraded `503` earlier in the session
  - it later returned healthy `200 OK` at `2026-04-10 04:46:56` local time with `database=true`
- Reports and salaries rendered, but both hit `networkidle timeout` during the broad live route capture.
- `/ar/attendance` rendered during the live route audit, but the admin Playwright critical-route sweep later timed out on the same route after 4 minutes. That makes the page flaky or unusually heavy under automation.
- The authenticated locale-switch Playwright smoke failed waiting for the Arabic dashboard heading after login, even though manual browser navigation and direct English/Arabic route loads worked elsewhere. Treat this as a real stability problem until the smoke becomes reliable.
- Print flows are only partially verified:
  - buttons were clicked in the live app
  - the app uses hidden iframe-based printing
  - the dedicated print audit could not consistently capture a readable print-preview frame

## Biggest Risks

- Billing and reporting trust is at risk because visible student totals disagree across screens and the active-student filter is not respected.
- Admin monitoring and fee-notification features are effectively unusable until the missing database objects are restored.
- English admin usability is degraded by untranslated route headings and mixed-language UI.
- Route behavior around super-admin access is inconsistent between Arabic and English.
- Print functionality is difficult to verify and appears brittle under automation.

## Strongest Parts Of The System

- Authentication and primary role separation are fundamentally working.
- Core CRUD shells for students, teachers, payments, and salaries remain accessible.
- The app does not collapse completely when one dashboard widget API fails.
- Query-heavy local audit stages mostly completed without data-layer errors once the app was warm.

## Route-By-Route Findings

### Admin

- `/ar/dashboard`, `/en/dashboard`: rendered, but both locales logged six failed widget requests and multiple console errors.
- `/ar/students`, `/en/students`: rendered and were interactive; data integrity issues remain.
- `/ar/teachers`, `/en/teachers`: rendered and major actions opened.
- `/ar/attendance`, `/en/attendance`: rendered in the live audit; admin Playwright sweep later hung on `/ar/attendance`.
- `/ar/payments`, `/en/payments`: rendered and key modal/drawer actions opened.
- `/ar/expenses`, `/en/expenses`: rendered; English heading remained Arabic.
- `/ar/salaries`, `/en/salaries`: rendered and action modals opened; broad audit saw `networkidle timeout` on Arabic salaries.
- `/ar/reports`, `/en/reports`: rendered; Arabic reports hit `networkidle timeout`.
- `/ar/monitoring`, `/en/monitoring`: rendered, but the main dataset request failed with `500`.
- `/ar/fee-notifications`, `/en/fee-notifications`: rendered, but the main dataset request failed with `500`.
- `/ar/super-admin`: broken unauthorized state.
- `/en/super-admin`: correctly redirected to `/en/access-denied`.

### Super Admin

- `/ar/super-admin`, `/en/super-admin`: rendered.
- `/ar/schools`, `/en/schools`: rendered; English heading remained Arabic.
- `/ar/subscriptions`, `/en/subscriptions`: rendered; English heading remained Arabic.
- `/ar/users`, `/en/users`: wrong final route, both resolved to teachers management.
- `/ar/dashboard`, `/en/dashboard`: rendered.
- `/ar/students`, `/en/students`: rendered.
- `/ar/teachers`, `/en/teachers`: rendered.
- `/ar/attendance`, `/en/attendance`: rendered; English heading remained Arabic.
- `/ar/payments`, `/en/payments`: rendered.
- `/ar/expenses`, `/en/expenses`: rendered; English heading remained Arabic.
- `/ar/salaries`, `/en/salaries`: rendered.
- `/ar/reports`, `/en/reports`: rendered.
- `/ar/monitoring`, `/en/monitoring`: route rendered, but heading was `null`.
- `/ar/fee-notifications`, `/en/fee-notifications`: route rendered, but heading was `null`.

## API Findings

- Working authenticated APIs:
  - `POST /api/auth/login` for admin and super-admin
  - `GET /api/web/reports/overview?schoolId=...`
  - `GET /api/web/super-admin/overview`
  - `GET /api/web/expenses?schoolId=...`
  - `GET /api/web/teacher-activity/meta?schoolId=...`
  - `GET /api/web/salaries/bootstrap?schoolId=...&scope=core`
- Working unauthorized handling:
  - `GET /api/web/reports/overview?schoolId=...` without auth returned `401 {"error":{"message":"يجب تسجيل الدخول أولاً."}}`
  - `GET /api/web/teacher-activity/meta?schoolId=...` without auth returned the same `401` message
- Broken authenticated APIs:
  - `GET /api/web/teacher-activity/messages?...` returned `500` with missing-table errors
  - `GET /api/web/teacher-activity/homework?...` returned `500` with missing-table errors
  - `GET /api/web/fee-notifications?...` returned `500` with missing-table errors
- Weak validation:
  - `GET /api/web/reports/dataset?schoolId=...` without `type` returned `400` and a clear Arabic error
  - `GET /api/web/payments/students?...&filter=__bogus__` returned `200` and silently ignored the invalid filter

## Localization Findings

- Directionality was correct across the entire route sweep.
- English headings remained Arabic on multiple pages listed in the bilingual audit.
- English core routes that were translated correctly included dashboard, students, teachers, payments, salaries, and reports.

## Printing Findings

- Teacher account-card modal opens and shows the expected credential layout before print is attempted.
- Dedicated print capture could not observe stable printable content for:
  - teacher account card
  - reports summary
  - salaries all-teachers report
  - students filtered list
- Current evidence is strong enough to say print paths are not automation-friendly and need headed/manual confirmation before release.

## Performance Findings

- Fastest admin route captures by browser navigation timing:
  - `/ar/dashboard` about `443ms`
  - `/ar/payments` about `478ms`
  - `/en/dashboard` about `537ms`
- Slowest admin route captures:
  - `/ar/super-admin` about `4247ms`
  - `/ar/fee-notifications` about `2780ms`
  - `/ar/monitoring` about `2643ms`
- Load-audit hotspots:
  - teachers API under burst: p95 about `4099ms`, max about `4108ms`
  - moderate teachers API: p95 about `5158ms`
  - salaries query stage: p95 about `4476ms`
- `k6` run failed both major thresholds:
  - `http_req_failed` was `12.50%`
  - `http_req_duration p95` was `1.71s`

## Weak-Network Findings

- Offline reload behavior is poor:
  - all four offline reload probes went straight to `chrome-error://chromewebdata/`
  - no in-app offline UI was shown
  - no retry queue or draft-preservation behavior was observed
- This app should currently be treated as online-only.

## Priority Fix Recommendations

1. Restore or replace the missing database objects behind teacher activity and fee notifications, then re-run the dashboard, monitoring, and fee-notification screens.
2. Fix the students data pipeline so summary counts, tab counts, list totals, and status filters all agree.
3. Correct the English translations for attendance, expenses, monitoring, fee notifications, schools, and subscriptions.
4. Fix the `/users` super-admin route so it resolves to the intended screen instead of teachers management.
5. Normalize unauthorized handling so Arabic super-admin access failure matches the English access-denied path.
6. Fix or remove `/api/ping` from readiness and load scenarios until it reports real health.
7. Stabilize the authenticated locale-switch smoke and the `/ar/attendance` route under Playwright.
8. Add a deterministic printable preview mode or expose printable content in a testable way.

## Evidence

- Broad route audit: `output/playwright/live-audit/live-audit.json`
- Action-level audit: `output/playwright/critical-flows/critical-flow-audit.json`
- Print audit: `output/playwright/print-audit/print-audit.json`
- Load audit: `artifacts/reliability-audit/load-audit.json`
- Screenshot manifest: `screenshot-index.md`
