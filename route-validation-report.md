# Route Validation Report

## Entry And Login Routes

- `/` returned `307` and redirected to `/ar`
- `/ar/login` returned `200`
- `/en/login` returned `200`
- Both login routes advertised locale alternates and loaded under the active root app

## Valid Routes Confirmed In The Live App

### Admin

- `/ar/students`
- `/en/students`
- `/ar/teachers`
- `/en/teachers`
- `/ar/attendance`
- `/en/attendance`
- `/ar/payments`
- `/en/payments`
- `/ar/expenses`
- `/en/expenses`
- `/ar/salaries`
- `/en/salaries`
- `/ar/reports`
- `/en/reports`

### Super Admin

- `/ar/super-admin`
- `/en/super-admin`
- `/ar/schools`
- `/en/schools`
- `/ar/subscriptions`
- `/en/subscriptions`
- `/ar/dashboard`
- `/en/dashboard`
- `/ar/students`
- `/en/students`
- `/ar/teachers`
- `/en/teachers`
- `/ar/attendance`
- `/en/attendance`
- `/ar/payments`
- `/en/payments`
- `/ar/expenses`
- `/en/expenses`
- `/ar/salaries`
- `/en/salaries`
- `/ar/reports`
- `/en/reports`

## Broken Or Partially Broken Routes

- `admin /ar/dashboard`
  - Route renders
  - Broken widget APIs: 6 failed requests

- `admin /en/dashboard`
  - Route renders
  - Broken widget APIs: 6 failed requests

- `admin /ar/monitoring`
  - Route renders
  - Main data request fails with `500`

- `admin /en/monitoring`
  - Route renders
  - Main data request fails with `500`

- `admin /ar/fee-notifications`
  - Route renders
  - Main data request fails with `500`

- `admin /en/fee-notifications`
  - Route renders
  - Main data request fails with `500`

- `admin /ar/super-admin`
  - Broken unauthorized behavior
  - Final URL stayed on `/ar/super-admin`
  - Heading was `null`
  - Three `403` overview calls were observed

- `admin /en/super-admin`
  - Final URL changed to `/en/access-denied`
  - This is correct RBAC behavior, not a defect

- `super_admin /ar/users`
  - Wrong final URL: `/ar/teachers`

- `super_admin /en/users`
  - Wrong final URL: `/en/teachers`

- `super_admin /ar/monitoring`
  - Final URL is correct
  - Heading was `null`

- `super_admin /en/monitoring`
  - Final URL is correct
  - Heading was `null`

- `super_admin /ar/fee-notifications`
  - Final URL is correct
  - Heading was `null`

- `super_admin /en/fee-notifications`
  - Final URL is correct
  - Heading was `null`

## Wrong Redirects Or Misroutes

- `/ar/users` as super-admin redirected or resolved to `/ar/teachers`
- `/en/users` as super-admin redirected or resolved to `/en/teachers`

## Locale-Specific Route Issues

- `/en/attendance` heading remained Arabic
- `/en/expenses` heading remained Arabic
- `/en/monitoring` heading remained Arabic
- `/en/fee-notifications` heading remained Arabic
- `/en/schools` heading remained Arabic
- `/en/subscriptions` heading remained Arabic

## Route Stability Issues

- Broad live capture succeeded on `/ar/attendance`
- The admin Playwright critical-route sweep later timed out on `/ar/attendance` after 4 minutes
- Treat `/ar/attendance` as flaky or too heavy for stable route-level automation
