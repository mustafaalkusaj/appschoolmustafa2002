# Bilingual RTL LTR Audit

## Verified Correct

- Arabic pages used `dir=rtl` across the full route sweep.
- English pages used `dir=ltr` across the full route sweep.
- `/ar/login` and `/en/login` both resolved correctly.
- Core English headings that were correct:
  - `/en/dashboard`
  - `/en/students`
  - `/en/teachers`
  - `/en/payments`
  - `/en/salaries`
  - `/en/reports`
  - `/en/super-admin`

## Confirmed Localization Issues

- English routes with Arabic headings:
  - admin `/en/attendance` → `إدارة الحضور`
  - admin `/en/expenses` → `المصروفات`
  - admin `/en/monitoring` → `صفحة مراقبة نشاط الأساتذة`
  - admin `/en/fee-notifications` → `تنبيهات الأقساط`
  - super-admin `/en/schools` → `إدارة المدارس`
  - super-admin `/en/subscriptions` → `الاشتراكات`
  - super-admin `/en/attendance` → `إدارة الحضور`
  - super-admin `/en/expenses` → `المصروفات`

- Routes with missing headings in both locales:
  - super-admin `/monitoring`
  - super-admin `/fee-notifications`

## RTL LTR Layout Findings

- No shell-level direction reversal bug was observed in the captured Arabic and English route screenshots.
- Sidebar and topbar composition held together visually in both directions.
- Payments and salaries drawers opened and remained usable in Arabic during the targeted action audit.

## Locale Switching Findings

- Locale routing itself is wired correctly:
  - `/` redirects to `/ar`
  - direct `/ar/...` and `/en/...` routes work

- Live manual navigation proved that an authenticated English salary route can load from Arabic context.

- The automated authenticated locale-switch smoke failed:
  - it timed out waiting for the Arabic dashboard heading after login
  - treat locale switching as flaky until that smoke is made reliable

## Mixed-Language And Numeric Rendering

- Directionality for identifiers and numbers looked intentional in the implemented print/card code paths, with explicit `dir=ltr` on login identifiers and similar fields.
- Full printed-output verification was not possible because the print preview could not be captured reliably.
