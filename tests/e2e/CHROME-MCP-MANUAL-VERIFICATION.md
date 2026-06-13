# Chrome MCP Manual Verification Guide

## Overview

This guide walks you through manually verifying every section of the school app using Claude's Chrome MCP browser tools. Run this AFTER the Playwright automated test to visually confirm UI behavior, animations, toasts, and edge cases that headless automation might miss.

## Prerequisites

1. App running at `http://localhost:3000`
2. Claude desktop with Chrome MCP extension connected
3. QA seed data already in the database (run `npx tsx scripts/seed-qa-e2e.ts` if not)

## Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `qa.superadmin@example.test` | (see `.env.e2e.local`) |
| School Admin A | `qa.schooladmin.a@example.test` | (see `.env.e2e.local`) |

---

## Phase 1: Super Admin Verification

### 1.1 Login as Super Admin

```
Navigate to: http://localhost:3000/ar/login
Fill email: qa.superadmin@example.test
Fill password: [from .env.e2e.local]
Click: تسجيل الدخول
Verify: Redirected to /ar/super-admin
```

### 1.2 Branding / Dashboard

```
Navigate to: /ar/dashboard?school=[QA_E2E_SCHOOL_A_ID]
Verify: School logo upload control visible
Verify: Color pickers or branding form visible
Click: حفظ الهوية (Save Branding)
Verify: Toast "تم تحديث الشعار" or "حُفظت الألوان محلياً" appears
```

### 1.3 Branches Page

```
Navigate to: /ar/super-admin (or /ar/branches)
Verify: Branches table or cards visible
Verify: School A and School B branches listed
Verify: Edit button available on each branch row
```

### 1.4 Logout

```
Click: Profile menu trigger (top-right avatar/name)
Click: تسجيل الخروج
Verify: Redirected to /ar/login
```

---

## Phase 2: School Admin Verification

### 2.1 Login as School Admin

```
Navigate to: http://localhost:3000/ar/login
Fill email: qa.schooladmin.a@example.test
Fill password: [from .env.e2e.local]
Click: تسجيل الدخول
Verify: Redirected to /ar/dashboard or /ar/group
```

### 2.2 Students — Create

```
Navigate to: /ar/students
Click: إضافة طالب (Add Student)
Verify: Multi-step modal opens with title "إضافة طالب جديد"

Step 1 - Basic Info:
  Fill #full_name: MANUAL_TEST_STUDENT_[timestamp]
  Select #class_name: (first available class)
  Fill #section: TEST_SEC
  Click: التالي (Next)

Step 2 - Contact:
  Fill #address: MANUAL_TEST_ADDRESS
  Fill #phone: 07700000000
  Click: التالي (Next)

Step 3 - Fees:
  Fill #total_fee: 500000
  Fill #paid_fee: 0
  Fill #discount_value: 0
  Click: حفظ الطالب (Save Student)

Verify: Toast "تم إضافة الطالب وإنشاء حساب التطبيق" appears
Verify: Student appears in list when searched
```

### 2.3 Students — Edit

```
Search for the created student
Click: خيارات الطالب (Student options dropdown)
Click: تعديل (Edit)
Verify: Edit modal opens with "تعديل بيانات الطالب"
Change address field to: MANUAL_EDITED_ADDRESS
Click: حفظ التعديلات (Save Changes)
Verify: Toast "تم تحديث البيانات" appears
```

### 2.4 Students — Transfer/Suspend/Delete

```
Find student row → Click: خيارات الطالب
Try each action if visible:
  - نقل الطالب (Transfer) → verify modal and class selection
  - توقيف الطالب (Suspend) → verify confirmation dialog
  - حذف الطالب (Delete) → verify confirmation dialog

Check tabs:
  - المنقولون (Transferred tab)
  - الموقوفون (Suspended tab)
  - المحذوفون (Deleted tab)
```

### 2.5 Teachers — Create

```
Navigate to: /ar/teachers
Click: إضافة أستاذ (Add Teacher)
Verify: Dialog opens

Fill:
  Name: MANUAL_TEST_TEACHER_[timestamp]
  Phone: 07700000001
  Email: manual.teacher@qa-test.local
  Subject: MANUAL_SUBJECT
  Select class (first available)
  
Click: إنشاء الحساب (Create Account)
Verify: Toast "تم إنشاء حساب الأستاذ بنجاح" appears
```

### 2.6 Teachers — Edit

```
Search for created teacher
Click: تعديل (Edit)
Change name to: MANUAL_TEST_TEACHER_EDITED
Click: حفظ التعديلات
Verify: Toast "تم تحديث الحساب بنجاح" appears
```

### 2.7 Expenses — Create Type + Record

```
Navigate to: /ar/expenses
Click: إضافة نوع مصروف (Add Expense Type) — if visible
  Fill type name: MANUAL_EXPENSE_TYPE
  Click: حفظ
  
Click: إضافة مصروف (Add Expense)
  Select type: (first available or created type)
  Fill amount: 50000
  Fill recipient: MANUAL_RECIPIENT
  Fill receipt: MANUAL_RECEIPT_001
  Fill notes: Manual test expense
  Click: حفظ المصروف
  
Verify: Toast confirms creation
Verify: Record appears in expenses list
```

### 2.8 Incomes — Create Type + Record

```
Navigate to: /ar/incomes
Click: إضافة نوع إيراد (Add Income Type) — if visible
  Fill type name: MANUAL_INCOME_TYPE
  Click: حفظ

Click: إضافة إيراد (Add Income)
  Select type: (first available)
  Fill amount: 100000
  Fill source: MANUAL_SOURCE
  Fill receipt: MANUAL_RECEIPT_002
  Fill notes: Manual test income
  Click: حفظ الإيراد
  
Verify: Toast confirms creation
Verify: Record appears in incomes list
```

### 2.9 Payments

```
Navigate to: /ar/payments
Verify: Payment records table visible
Try search filter: Type "QA" in search field
Click: تصدير إكسل (Export Excel) — if visible
Verify: Download starts (XLSX file)

Try recording a payment if UI allows:
  Search for student
  Fill amount
  Click: تسجيل الدفعة
  Verify: Toast confirms payment recorded
```

### 2.10 Salaries

```
Navigate to: /ar/salaries
Verify: Page loads with salary records or empty state
Check for: salary table, filter controls, month selector
```

### 2.11 Grades

```
Navigate to: /ar/grades
Verify: Page loads with grade input grid or class selector
Check for: class/section dropdowns, grade input fields, save button
If fields visible: enter a test grade and save
```

### 2.12 Calendar

```
Navigate to: /ar/calendar
Verify: Calendar view renders (month/week/day)
Click: إضافة حدث (Add Event) — or click on a date
Fill title: MANUAL_EVENT_[timestamp]
Fill description: Manual test event
Click: حفظ (Save)
Verify: Event appears on calendar
```

### 2.13 Notifications

```
Navigate to: /ar/notifications
Click: إرسال إشعار (Send Notification)
Fill title: MANUAL_NOTIF_TEST
Fill body: This is a manual test notification
Select recipients: (all or specific class)
Click: إرسال (Send)
Verify: Toast confirms notification sent
```

### 2.14 Attendance

```
Navigate to: /ar/attendance
Select class and date
Verify: Student list appears with attendance buttons
Click: حاضر (Present) for first student
Click: حفظ التغييرات (Save Changes)
Verify: Toast confirms attendance saved
```

### 2.15 Reports

```
Navigate to: /ar/reports
Verify: Report cards/charts load
Click: تصدير الكل إكسل (Export All Excel)
Verify: XLSX download starts
Check different report tabs if available
```

### 2.16 Settings

```
Navigate to: /ar/settings
Verify: Settings page loads
Check for: school info, academic year, notification preferences
```

---

## Phase 3: Visual & UX Checks

For each page visited above, also verify:

- [ ] RTL layout renders correctly (right-aligned text, correct margins)
- [ ] Toast notifications appear and auto-dismiss
- [ ] Loading spinners show during API calls
- [ ] Empty states display meaningful messages
- [ ] Modals/dialogs close with X button or إلغاء (Cancel)
- [ ] Form validation shows error messages for required fields
- [ ] Responsive layout works (try resizing browser)
- [ ] Sidebar navigation highlights current page
- [ ] Breadcrumbs or page titles update correctly

---

## Phase 4: Edge Cases

### 4.1 Duplicate Prevention
```
Try creating a student with the same name twice
Verify: Error message or prevention mechanism
```

### 4.2 Required Field Validation
```
Try submitting forms with empty required fields
Verify: Validation errors appear in Arabic
```

### 4.3 Session Expiry
```
Wait or manually clear cookies
Try navigating to a protected page
Verify: Redirected to login
```

### 4.4 Permission Boundaries
```
As school_admin_a, try accessing school_b data
Verify: Access denied or data not visible
```

---

## Cleanup

After verification, remove test data:
- Search for records with prefix `MANUAL_TEST_` or `QA_TEST_`
- Delete or mark as inactive
- Or re-run the seed script to reset QA data

---

## Running the Automated Test

```bash
# Start the dev server
npm run dev

# In another terminal, run the comprehensive Playwright test (headed)
PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test comprehensive-browser-test --headed

# View HTML report
npx playwright show-report output/playwright/report
```

The automated test generates a JSON report at:
`output/playwright/comprehensive-test/comprehensive-test-report.json`
