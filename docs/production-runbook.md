# Production Runbook

## Pre-release checks

- Confirm production env vars are present and valid:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `RBAC_COOKIE_SECRET`
  - `HEALTHCHECK_TOKEN`
- Confirm recommended production env vars:
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
- Run:

```bash
npm run predeploy:check
npm run check
npm test
npm run test:e2e
```

- Verify database migrations are applied before deploying the application build.
- Review Sentry project settings and ensure alert routing is active.
- Confirm the release owner and rollback owner.

## Deploy steps

```bash
npm ci
npm run build
npm run start
```

- If the platform performs build and runtime separately, ensure the same env set is available in both phases.
- For multi-instance deployments, do not ship without Upstash credentials unless you accept per-instance rate limiting behavior.

## Upstash activation

Set these variables on the production platform before scaling to multiple instances:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Then re-run:

```bash
npm run predeploy:check
```

Expected result:

- no warning about distributed rate limiting
- requests use the distributed limiter path instead of per-instance memory fallback

## Database verification

If you have direct Postgres access for the production or staging database, run:

```bash
psql "$DATABASE_URL" -f scripts/verify-production-db.sql
```

Review these outputs carefully:

- `school_reports_summary` exists
- `managed_user_profiles`, `managed_user_credentials`, and `teacher_assignments` exist
- RLS is enabled on the critical tables
- required policies are present
- required indexes are present

## Post-release validation

Run the smoke checks against the live URL:

```bash
APP_URL=https://your-domain.example \
HEALTHCHECK_TOKEN=... \
npm run postdeploy:smoke

node scripts/postdeploy-smoke.mjs https://your-domain.example <healthcheck-token>
node scripts/uptime-check.mjs https://your-domain.example
```

Validate these user paths manually or through Playwright on the live deployment:

- localized login
- admin dashboard
- students
- payments
- salaries
- language switching in Arabic and English

Review immediately after deploy:

- Sentry error volume
- server logs
- `/api/ping`
- `/api/health`

## Production load checks

For a quick low-risk baseline against the live app:

```bash
node scripts/uptime-check.mjs https://your-domain.example
APP_URL=https://your-domain.example HEALTHCHECK_TOKEN=... npm run postdeploy:smoke
```

For API throughput baseline:

```bash
npx --yes autocannon -c 10 -d 10 https://your-domain.example/api/ping
```

For the teachers endpoint using the authenticated browser session captured in `artifacts/reliability-audit/admin-storage-state.json`:

```bash
BENCH_URL='https://your-domain.example/api/dashboard/users?role=teacher&page=1&pageSize=25' \
node scripts/bench-dashboard-users.mjs
```

For a broader authenticated audit against a production-like environment:

```bash
AUDIT_BASE_URL=https://your-domain.example node scripts/load-audit.mjs
```

Interpretation guidance:

- `api/ping` should stay low-latency and high-throughput
- `dashboard/users?role=teacher` is the current bottleneck path to watch most closely
- compare uncached vs cached numbers, not only single requests

## Rollback triggers

Rollback immediately if any of these occur:

- login fails for admin or super admin
- protected routes redirect incorrectly or loop
- `/api/health` returns degraded without an expected dependency outage
- students, payments, or salaries pages fail to load
- recurring 5xx errors appear in Sentry or platform logs
- school or branch data isolation appears incorrect

## Rollback steps

1. Revert to the last known-good deployment artifact or platform release.
2. If a migration caused the issue, stop the rollout and evaluate database rollback safety before changing data.
3. Keep `HEALTHCHECK_TOKEN` and monitoring enabled during rollback validation.
4. Re-run:

```bash
APP_URL=https://your-domain.example \
HEALTHCHECK_TOKEN=... \
npm run postdeploy:smoke
```

## Annual maintenance plan

### Monthly

- Review Sentry issues and error trends.
- Review platform logs for repeated 4xx and 5xx failures.
- Check uptime probes and latency on `/api/ping` and `/api/health`.
- Review dependency drift and patch minor updates.

### Quarterly

- Run a focused security review on auth, RBAC, API exposure, and cache behavior.
- Verify Supabase RLS policies and high-risk tables still match application expectations.
- Re-test restore procedures for backups in a non-production environment.
- Review dashboards for performance regressions in the highest-traffic flows.

### Semiannual

- Rotate sensitive operational secrets where supported.
- Review Sentry sampling, alert thresholds, and ownership routing.
- Re-run full E2E coverage against production-like staging.

### Annual

- Execute a full release-readiness audit.
- Verify rollback steps still work with the current platform and database model.
- Review all environment variables, deployment docs, and incident contacts.
- Review hosting, monitoring, and backup costs against actual usage.
