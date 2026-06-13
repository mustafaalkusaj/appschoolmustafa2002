# API Runtime Audit

## Authentication

- `POST /api/auth/login`
  - Admin credentials: `200`, returned profile with role `admin` and school subscription data
  - Super-admin credentials: `200`, returned profile with role `super_admin`

## Health And Diagnostics

- `GET /api/health`
  - Initial validation during the session hit degraded behavior with a database timeout and `503`
  - Retest at `2026-04-10 04:46:56` local time returned `200 OK`
  - Current evidence: flaky, not reliably healthy

- `GET /api/ping`
  - Returned `200`
  - Body: `{"ok":false,...,"supabase":"error"}`
  - Result: broken diagnostic endpoint

## Confirmed Working Authenticated APIs

- `GET /api/web/reports/overview?schoolId=00000000-0000-0000-0000-000000000001`
  - `200`
  - Returned metrics including:
    - `studentsCount=30010`
    - `totalFees=11769234333`
    - `totalRemaining=5477445028`

- `GET /api/web/super-admin/overview`
  - `200`
  - Returned schools, subscriptions, users, infrastructure, and schema compatibility data

- `GET /api/web/expenses?schoolId=00000000-0000-0000-0000-000000000001&page=1&pageSize=20`
  - `200`
  - Returned an empty but valid result shape

- `GET /api/web/teacher-activity/meta?schoolId=00000000-0000-0000-0000-000000000001`
  - `200`
  - Meta endpoint itself is healthy even though the messages/homework datasets fail

- `GET /api/web/salaries/bootstrap?schoolId=00000000-0000-0000-0000-000000000001&scope=core`
  - `200`

## Confirmed Broken Authenticated APIs

- `GET /api/web/teacher-activity/messages?schoolId=...`
  - `500`
  - Error: missing table `public.dashboard_teacher_message_groups`

- `GET /api/web/teacher-activity/homework?schoolId=...`
  - `500`
  - Error: missing table `public.dashboard_homework_monitoring`

- `GET /api/web/fee-notifications?schoolId=...`
  - `500`
  - Error: missing table `public.fee_notifications`

## Unauthorized Handling

- `GET /api/web/reports/overview?schoolId=...` without auth
  - `401`
  - Body: `{"error":{"message":"يجب تسجيل الدخول أولاً."}}`

- `GET /api/web/teacher-activity/meta?schoolId=...` without auth
  - `401`
  - Body: `{"error":{"message":"يجب تسجيل الدخول أولاً."}}`

## Invalid Input Handling

- `GET /api/web/reports/dataset?schoolId=...` without `type`
  - `400`
  - Body: `{"error":{"message":"نوع التقرير المطلوب غير صالح."}}`
  - Assessment: good validation

- `GET /api/web/payments/students?schoolId=...&filter=__bogus__`
  - `200`
  - Returned the default student list instead of rejecting the invalid filter
  - Assessment: weak validation, silently ignores bad input

- `GET /api/web/payments/students?page=1&pageSize=10` without `schoolId`
  - `200`
  - Returned data using the current session school context
  - Assessment: implicit fallback behavior, not necessarily wrong, but not explicit

## Fragile Integrations

- Dashboard, monitoring, and fee-notification UX all depend on tables that are missing from the current runtime schema.
- `super-admin/overview` data contains:
  - duplicate active subscriptions for school `00000000-0000-0000-0000-000000000001`
  - a school `logo_url` that points to a local `file:///Users/...` path, which will not be portable

## Runtime-To-Code Correlation

- The missing-table failures line up with current server code in `lib/teacher-activity-server.ts`:
  - `dashboard_teacher_message_groups`
  - `dashboard_homework_monitoring`
  - `fee_notifications`

- Health probing is implemented in `app/api/health/route.ts`
- Ping probing is implemented in `app/api/ping/route.ts`
