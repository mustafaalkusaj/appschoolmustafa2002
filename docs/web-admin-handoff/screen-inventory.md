# Screen Inventory

هذا الملف يجرد كل الشاشات الحالية ويحولها إلى مواصفات قابلة للبناء في Figma.

## Auth & Gates

### 1. Login

- Route: `/ar/login`
- Source: `app/[locale]/login/page.tsx`
- Roles: public
- Purpose: تسجيل الدخول
- Main blocks:
  - glass card centered
  - logo + subtitle
  - email field
  - password field + show/hide
  - error alert
  - primary login CTA
  - footer note

### 2. Access Denied

- Route: `/ar/access-denied`
- Source: `app/[locale]/access-denied/page.tsx`
- Purpose: منع الوصول
- Blocks:
  - centered icon state
  - title
  - description
  - secondary back button
  - primary dashboard button

### 3. Subscription Expired

- Route: `/ar/subscription-expired`
- Source: `app/[locale]/subscription-expired/page.tsx`
- Purpose: إيقاف الوصول عند انتهاء الاشتراك
- Blocks:
  - warning icon
  - title + description
  - contact hint panel
  - sign-out CTA

## Home

### 4. Home / Launcher

- Route: `/ar`
- Source: `app/[locale]/page.tsx`
- Roles:
  - `super_admin`
  - `admin`
  - `employee`
- Blocks:
  - top header with logo and current user
  - responsive cards grid
  - card title + description + icon
- Prototype behavior:
  - كل بطاقة تفتح module مختلف حسب الدور

## Core Workspace

### 5. Dashboard

- Route: `/ar/dashboard`
- Source: `app/[locale]/dashboard/page.tsx`
- Roles:
  - `super_admin`
  - `admin`
  - `employee`
- Main blocks:
  - app shell
  - topbar with title + school context
  - metrics
  - finance charts
  - class fees management
  - classes/sections management
  - multiple management modals

### 6. Students

- Route: `/ar/students`
- Source: `app/[locale]/students/page.tsx`
- Roles:
  - `super_admin`
  - `admin`
  - `employee`
- Main blocks:
  - topbar + total count
  - status tabs
  - filter/search strip
  - students table
  - row actions menu
  - add student modal
  - edit student modal
  - delete confirm modal
  - import from excel modal
  - printable student sheet

### 7. Payments

- Route: `/ar/payments`
- Source: `app/[locale]/payments/page.tsx`
- Roles:
  - `super_admin`
  - `admin`
  - `employee`
- Main blocks:
  - topbar + active students count
  - 4 KPI cards
  - operations card
  - quick filter chips
  - advanced filters
  - search toolbar
  - student invoices table
  - payment detail drawer
  - add payment modal
  - archive summary section
  - archive cards
  - archive detail modal
  - receipt print state

### 8. Attendance

- Route: `/ar/attendance`
- Source: `app/[locale]/attendance/page.tsx`
- Roles:
  - `super_admin`
  - `admin`
  - `employee`
- Main blocks:
  - topbar + helper subtitle
  - date/class/section/status filters
  - batch action buttons
  - attendance KPI row
  - editable attendance table
  - two-week history summary block

### 9. Expenses

- Route: `/ar/expenses`
- Source: `app/[locale]/expenses/page.tsx`
- Roles:
  - `super_admin`
  - `admin`
- Main blocks:
  - topbar + count
  - stats cards
  - actions section
  - invoices/types tabs
  - filters
  - expenses table
  - expense types table
  - add/edit expense modal
  - add/edit type modal

### 10. Reports

- Route: `/ar/reports`
- Source: `app/[locale]/reports/page.tsx`
- Roles:
  - `super_admin`
  - `admin`
- Main blocks:
  - topbar + subtitle
  - summary KPIs
  - report category cards
  - financial summary cards
  - export buttons
  - print flows
  - full printable report layout

## Super Admin

### 12. Schools

- Route: `/ar/schools`
- Source: `app/schools/page.tsx`
- Roles:
  - `super_admin`
- Main blocks:
  - topbar area with title
  - 3 KPI cards
  - schools list
  - status toggle action
  - renew subscription action

### 13. Subscriptions

- Route: `/ar/subscriptions`
- Source: `app/subscriptions/page.tsx`
- Roles:
  - `super_admin`
- Main blocks:
  - title + subtitle
  - 3 KPI cards
  - subscriptions list
  - plan label
  - active/expired badge
  - renew action

### 14. Super Admin Console

- Route: `/ar/super-admin`
- Source: `app/[locale]/super-admin/page.tsx`
- Roles:
  - `super_admin`
- Main blocks:
  - elevated shell
  - topbar
  - section tabs:
    - overview
    - schools
    - users
    - subscriptions
  - overview cards
  - management tables
  - create/edit user modal
  - create/edit school modal
  - create/edit subscription modal

## Shared Views

### 15. Sidebar

- Source: `components/AppSidebar.tsx`
- Behavior:
  - role-based items
  - active state
  - logout action

### 16. Theme Toggle

- Source: `components/ThemeModeToggle.tsx`
- Behavior:
  - fixed floating pill
  - light/dark toggle

### 17. Logo

- Source: `components/UltrathinkLogo.tsx`
- Use:
  - login
  - home
  - sidebar / admin surfaces

## ملاحظات wireframe

- كل شاشة في مساحة العمل تبنى على shell واحد:
  - sidebar
  - topbar
  - content
- كل شاشة تعرّف variants للحالات التالية:
  - `loading`
  - `empty`
  - `success`
  - `error`
  - `default`
