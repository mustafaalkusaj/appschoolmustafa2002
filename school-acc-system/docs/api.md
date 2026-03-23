# School Accounting Management API

Base URL: `/api`

## Auth
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/users` (Admin)

## Students
- `GET /students?name=&class_id=&payment_status=`
- `POST /students`
- `PUT /students/:id`
- `DELETE /students/:id`

## Classes & Sections
- `GET /classes`
- `POST /classes`
- `PUT /classes/:id`
- `DELETE /classes/:id`
- `GET /sections?class_id=`
- `POST /sections`
- `PUT /sections/:id`
- `DELETE /sections/:id`

## Fees
- `GET /fees/structures`
- `POST /fees/structures`
- `PUT /fees/structures/:id`
- `DELETE /fees/structures/:id`
- `POST /fees/assign`

## Invoices & Payments
- `GET /invoices?status=&student_id=`
- `GET /invoices/:id`
- `POST /invoices`
- `GET /payments?invoice_id=`
- `POST /payments`

## Expenses
- `GET /expenses`
- `POST /expenses`

## Dashboard & Reports
- `GET /dashboard`
- `GET /reports/summary?range=daily|monthly|yearly&date=YYYY-MM-DD`

## Notifications
- `GET /notifications`
- `POST /notifications/unpaid`

## Backup
- `GET /backup/export`
- `POST /backup/import`
