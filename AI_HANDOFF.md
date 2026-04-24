# AI_HANDOFF.md

Project: appschoolmustafa2002

Current server:
http://localhost:3000

NEXT_STAGE=CLAUDE_REVIEW

---

## Stage 1 - Audit Report

Status: Completed by Codex on 2026-04-24.
Rule followed: audit only. No application fixes were made.

### Confirmed Broken

1. `npm run lint` fails.
   - Severity: High.
   - Evidence: command exited 1 with 2 errors and 18 warnings.
   - Errors:
     - `lib/dashboard-admin-server.ts:45:10` unused `normalizeDashboardEntityKey`.
     - `lib/managed-users/context.ts:23:41` unused `authHeader`.
   - Notes: `npm run check` will fail because it runs lint first.

2. `npx playwright test` fails before running tests.
   - Severity: High.
   - Evidence: command exited 1 with `Error: Timed out waiting 240000ms from config.webServer.`
   - Config evidence: `playwright.config.ts:43-49` starts `npm run build && npm run start -- --hostname 127.0.0.1 --port 3000` and does not reuse an existing server unless `PLAYWRIGHT_USE_DEV_SERVER=1`.
   - Output evidence: `output/playwright/test-results/.last-run.json` says `{ "status": "failed", "failedTests": [] }`, so tests did not actually execute.
   - Local server evidence: after the failure, the existing listener on `localhost:3000` returned `500` for `/`, `/ar/login`, `/api/ping`, and `/api/health`.
   - Isolation check: `npm run start -- --hostname 127.0.0.1 --port 3032` served `/ar/login` and `/en/login` with `200`, `/api/ping` with `ok: true`, and `/ar/dashboard` redirected to login. That points to the current `3000` process / Playwright webServer flow as broken or flaky, not the compiled app itself.

3. Legacy Prisma-backed API routes are still exposed in the built app while `lib/prisma.ts` is a stub.
   - Severity: Critical for any caller using these endpoints.
   - Evidence: `lib/prisma.ts:3-9` says the app uses Supabase and exports a proxy stub.
   - Affected examples:
     - `app/api/auth/register/route.ts:10,48` calls `registerUser`, which uses `lib/services/auth-service.ts` and Prisma.
     - `app/api/auth/change-password/route.ts:10-11,56-60` uses old JWT auth and `updatePassword`, also Prisma-backed.
     - `app/api/core/accounts/route.ts:11,14,53,60,150,161,179,196` uses `createIsolatedPrismaClient` and `prisma.*`.
     - Similar Prisma usage exists in `/api/core/students`, `/api/core/employees`, `/api/core/attendance`, `/api/core/salaries`, `/api/core/transactions`, `/api/branches`, and `/api/dashboard/investor`.
   - Runtime expectation: unauthenticated requests may be blocked by proxy/RBAC first, but authenticated or public calls such as `/api/auth/register` can hit the stubbed data layer.

4. `POST /api/core/accounts` attempts to read the request body twice.
   - Severity: High for that route.
   - Evidence: body read at `app/api/core/accounts/route.ts:120`, then read again at `app/api/core/accounts/route.ts:141`.
   - Expected runtime behavior: `Body is unusable` / empty body on the second read if the branchId path is reached.

5. Database migration `migrations/20260419_multi_branch.sql` contains PostgreSQL/Supabase-incompatible policy syntax.
   - Severity: Critical for applying migrations.
   - Evidence: `CREATE POLICY IF NOT EXISTS` at lines 36 and 51. Supabase/PostgreSQL supports `DROP POLICY IF EXISTS`, not `CREATE POLICY IF NOT EXISTS`.
   - Additional risk: line 24 alters `attendance`, while the active web attendance code uses `attendance_records`.

6. Salary-related API code queries tables that are not created by the repo SQL migrations.
   - Severity: Medium to High, depending on production DB state.
   - Evidence: `app/api/web/salaries/bootstrap/route.ts:101-128` queries `job_titles`, `lesson_times`, `lecture_prices`, and `salary_archives`.
   - Evidence from search: no `CREATE TABLE` migration was found for `job_titles`, `lesson_times`, `lecture_prices`, `deductions`, `daily_lectures`, `weekly_schedule`, or `salary_archives`; the SQL only adds indexes if some of them already exist.
   - Behavior: some salary endpoints use `Promise.allSettled` and warnings, so this can degrade silently instead of failing hard.

7. `/users` is not a users page.
   - Severity: Medium if user management is expected at `/users`.
   - Evidence: `app/users/page.tsx:3-4` redirects to `/ar/teachers`; `app/[locale]/users/page.tsx:8-9` redirects to `/{locale}/teachers`.
   - Build still lists `/[locale]/users` and `/users`, but they are redirects.

### Partial / Flaky

- Local `http://localhost:3000` is unreliable in this audit. It returned `500` after Playwright failed, while the same built app worked on temporary port `3032`.
- `.env.local` contains a `NODE_ENV` entry. During local production start, responses included production headers such as HSTS. This can make local dev and E2E behavior differ from expected development mode.
- `npm ls --depth=0` exits 0, but reports several extraneous native/wasm packages. No `npm install` was required because `node_modules` and `package-lock.json` are present and normal commands ran.
- Playwright setup is brittle: `tests/e2e/auth.setup.ts:7-9` writes storage state under `/Users/musatafa/school-app/artifacts/reliability-audit` rather than a repo-local output path, and relies on fixed admin/super-admin credentials from `tests/e2e/helpers/auth.ts`.
- Runtime button/modal/print verification was not completed because Playwright never got past webServer startup on port 3000. Static inspection found handlers and components wired, but not browser-confirmed.

### Working

- `npm run build` succeeded on Next.js 16.2.3 and generated 139 app routes/pages.
- `npm run typecheck` succeeded after `npx next typegen`.
- `npm test` succeeded: 23 test files, 78 tests passed.
- Temporary production server on port `3032` served:
  - `/` -> `307` to `/ar`.
  - `/ar/login` -> `200`.
  - `/en/login` -> `200`.
  - `/api/ping` -> `ok: true`.
  - `/ar/dashboard` -> `307` to `/ar/login?next=%2Far%2Fdashboard`.
- Supabase environment keys are present in `.env.local` (values not copied): public URL, anon key, service role key, RBAC cookie secret, health token.
- Supabase-first auth/session path exists:
  - `/api/auth/login` signs into Supabase and writes RBAC cookie.
  - `/api/rbac/session` refreshes and reads RBAC session.
  - `proxy.ts` guards page/API access with RBAC cookie.
- Arabic and English routing exists via `next-intl` with `ar` default and `en` supported.
- Locale switch preserves current path/search/hash and switches between `/ar/...` and `/en/...` (`components/LanguageToggle.tsx:19-38`).
- Access rules exist for dashboard, students, teachers, attendance, payments, expenses, salaries, reports, monitoring, fee-notifications, schools, subscriptions, super-admin (`types/roles.ts:255-330`).
- Key pages compile for dashboard, students, teachers, attendance, payments, expenses, salaries, reports, monitoring, fee-notifications, schools, subscriptions, super-admin, branch-overview, group, login, forgot-password.

### API errors

- `localhost:3000` current listener returned `500` for `/api/ping`; the same endpoint returned `ok: true` on temporary port `3032`.
- `/api/health` returns `404 {"ok":false,"message":"Not found."}` without a health token in production mode. This is intentional hiding logic in `app/api/health/route.ts`, but it makes unauthenticated local health checks look broken.
- `/api/auth/register` is public in proxy but uses the legacy Prisma-backed `registerUser` service. Likely runtime result: `DATABASE_ERROR` or `500` unless that legacy layer is restored.
- `/api/auth/change-password` uses custom JWT middleware and Prisma-backed password storage, while the active login/session flow is Supabase + RBAC cookie.
- `/api/core/*`, `/api/branches`, and `/api/dashboard/investor` are built but use the legacy Prisma/JWT stack.

### Database errors

- Invalid policy syntax in `migrations/20260419_multi_branch.sql` as noted above.
- Base business tables such as `students`, `payments`, `expenses`, `salaries`, and `class_fees` are mostly assumed to pre-exist; the repo SQL often alters or indexes them but does not consistently create them.
- Active app code uses Supabase table/column names like `students.full_name`, `students.class_name`, `payments.amount`, `salaries.gross_salary`, while `prisma/schema.prisma` defines a separate camelCase/cuid-era model (`nameAr`, `schoolId`, `branchId`, etc.). This reinforces that Prisma routes are stale.
- RLS exists for tenant-scoped tables in `database_setup.sql`, managed mobile tables, super-admin infrastructure, group alerts, RBAC tables, storage objects, and school archives, but live DB policy state was not directly verified.

### Auth errors

- Current local server on `3000` returned `500` for login and ping during audit.
- Active web auth is Supabase + RBAC cookie, but legacy routes still expect custom HMAC JWT tokens (`lib/services/jwt.ts`) and Prisma users/password hashes.
- RBAC secret is required in production. `.env.local` has the key present; without it `/api/auth/login` and `/api/rbac/session` can fail server_config.
- E2E login depends on fixed default credentials and an external artifact directory.

### Route problems

- `/users` and `/{locale}/users` redirect to teachers, not a user-management view.
- There is no standalone `/classes` route; class/section management is inside the dashboard modal.
- Root `/` always redirects to `/ar`; English users must enter `/en/...` or use the locale switch.
- Current `localhost:3000` route responses are broken (`500`) even though the same built app works on a temporary port.

### Button problems

- Browser-confirmed button testing did not run because Playwright timed out before tests.
- Static inspection found handlers for major actions:
  - Students: add/edit/delete/import/bulk import/account card/print.
  - Teachers: create/edit/toggle/delete/export/import/print/copy credentials.
  - Dashboard/classes: open classes modal, add/edit/delete class/section, close modal.
  - Payments: add payment/export/delete/receipt/archive/detail modal.
  - Salaries: teacher modal/pay salary/export/print/daily log/settings.
  - Reports: export and print helpers.
  - Monitoring/fee-notifications: detail modals, edit/delete/send/history actions.
- Static risk: class/section delete buttons call delete handlers directly in `ClassesModal` without an obvious confirmation modal in that component.

### Commands run

- `test -f AI_HANDOFF.md && sed -n '1,220p' AI_HANDOFF.md || true` -> file existed, `NEXT_STAGE=CODEX_AUDIT`.
- `sed -n` on `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `playwright.config.ts`, `vitest.config.ts`.
- `command -v npx` -> available.
- `rg --files app`, `rg --files lib components hooks i18n messages prisma migrations tests scripts`.
- `rg` audits for Supabase/auth/Prisma/RLS/routes.
- `npm run build` -> passed.
- `npm run lint` -> failed with 2 errors, 18 warnings.
- `npm run typecheck` -> passed.
- `npm test` -> passed, 23 files / 78 tests.
- `npx playwright test` -> failed, webServer timeout after 240000ms.
- `npm ls --depth=0` -> passed, with extraneous packages listed.
- `curl` checks against `localhost:3000` -> 500 after Playwright failure.
- Temporary `npm run start -- --hostname 127.0.0.1 --port 3032` -> worked for login/ping checks; process was stopped after audit.
- `git status --short` -> only `AI_HANDOFF.md` is untracked.

### Evidence

- Build evidence: route list included `/[locale]/dashboard`, `/[locale]/students`, `/[locale]/teachers`, `/[locale]/payments`, `/[locale]/salaries`, `/[locale]/reports`, `/[locale]/monitoring`, `/[locale]/fee-notifications`, `/[locale]/users`, `/[locale]/super-admin`, and all major `/api/web/*` routes.
- Lint evidence: exact errors listed under Confirmed Broken.
- Playwright evidence: exact timeout listed under Confirmed Broken; `.last-run.json` status failed with no failed tests.
- Runtime evidence:
  - `3032 /ar/login` and `/en/login` returned 200.
  - `3032 /api/ping` returned `{"ok":true,...}`.
  - `3032 /ar/dashboard` redirected to login as unauthenticated.
  - `3000` returned 500 for key public endpoints after Playwright failure.
- Static evidence:
  - `lib/prisma.ts:3-9` stub.
  - `app/api/auth/register/route.ts:10,48`.
  - `app/api/auth/change-password/route.ts:10-11,56-60`.
  - `app/api/core/accounts/route.ts:11,14,53,60,120,141,150,161,179,196`.
  - `migrations/20260419_multi_branch.sql:20-24,36,51`.
  - `app/api/web/salaries/bootstrap/route.ts:101-128`.
  - `app/users/page.tsx:3-4` and `app/[locale]/users/page.tsx:8-9`.

### Severity

- Critical:
  - Legacy Prisma-backed routes exposed while Prisma is stubbed.
  - Invalid migration policy syntax.
- High:
  - Lint failure blocks `npm run check`.
  - Playwright cannot start/run on the configured port.
  - `/api/core/accounts` double body read.
  - Current `localhost:3000` serving 500s.
- Medium:
  - Missing/assumed salary support tables in repo migrations.
  - `/users` route redirects to teachers.
  - E2E setup uses hardcoded external artifact path and fixed credentials.
- Low:
  - `npm ls` extraneous packages.
  - Health endpoint returns 404 without token by design but may confuse local checks.

### Suggested fixes

1. Fix lint blockers first: remove/use `normalizeDashboardEntityKey`; rename or use `authHeader` in `readValidatedRbacSession`.
2. Decide the fate of legacy Prisma/JWT routes:
   - Remove/disable them if Supabase is the only supported backend.
   - Or restore a real Prisma client and align `prisma/schema.prisma` with the active database, then add tests.
3. Fix `POST /api/core/accounts` to read request JSON only once if that route remains.
4. Repair migrations:
   - Replace `CREATE POLICY IF NOT EXISTS` with `DROP POLICY IF EXISTS` + `CREATE POLICY`.
   - Verify `attendance` vs `attendance_records`.
   - Add explicit migrations for salary/reference tables used by the app, or make the API fully compatibility-gated.
5. Stabilize Playwright:
   - Avoid port 3000 conflicts.
   - Consider `PLAYWRIGHT_USE_DEV_SERVER=1` with `reuseExistingServer`, or configure an isolated test port.
   - Move E2E storage state output under repo-local `output/playwright`.
6. Clarify route intent:
   - Add a real `/users` page or remove it from expectations/docs.
   - Add `/classes` route or document that classes live inside Dashboard.
7. After fixes, rerun `npm run lint`, `npm run typecheck`, `npm test`, and `npx playwright test`.

---

## Stage 2 - Senior Review

Status: Not started yet.

---

## Stage 3 - QA Review

Status: Not started yet.

---

## Stage 4 - Fix Log

Status: Not started yet.

---

## Stage 5 - Final Verification

Status: Not started yet.
