# Multi-Branch School Management System
## Complete System Design & Architecture Document

**Date:** April 20, 2026  
**Version:** 2.0 - Multi-Branch Edition  
**Status:** Design Ready for Implementation

---

## 1. SYSTEM OVERVIEW

### 1.1 Core Concept

A **hierarchical school management system** where:

```
School Master (المدرسة الأم)
│
├─ Branch A (فرع الابتدائية)
│  ├─ Fully Independent Operations
│  ├─ Own Students, Users, Finances, HR
│  └─ Isolated Data
│
├─ Branch B (فرع البنين)
│  ├─ Fully Independent Operations
│  ├─ Own Students, Users, Finances, HR
│  └─ Isolated Data
│
├─ Branch C (فرع البنات)
│  ├─ Fully Independent Operations
│  ├─ Own Students, Users, Finances, HR
│  └─ Isolated Data
│
└─ Investor/Founder Dashboard (لوحة المستثمر)
   ├─ View All Branches
   ├─ Aggregated Statistics
   ├─ Financial Summary
   └─ Global Reports
```

### 1.2 Key Principles

1. **Operational Independence**: Each branch operates completely independently
2. **Data Isolation**: No branch can access another branch's data
3. **Centralized Oversight**: Investor sees all branches in one dashboard
4. **Role-Based Granularity**: Permissions at system, school, branch, page, and action levels
5. **Single-Page Simplicity**: Special users access only one page after login
6. **Security First**: Every query filtered by school_id + branch_id

---

## 2. CORE PROBLEM DEFINITION

### 2.1 Problem Statement

A school network wants to:
- Manage multiple independent branches from one platform
- Let the investor see aggregate statistics without managing each branch separately
- Prevent branch managers from seeing other branches' data
- Create focused users (e.g., accountants) who see ONLY their assigned pages
- Support complex permission hierarchies while keeping the UI simple

### 2.2 Current Gaps (Why This Matters)

❌ **Without this system:**
- Each branch needs its own separate application
- Investor has no unified view of all branches
- No ability to create focused users
- Complex permission management across multiple apps
- Data silos without aggregation

✅ **With this system:**
- One application serves all branches
- Investor has unified dashboard with aggregates
- Focused users see only what they need
- Granular permission control
- Real-time aggregate statistics

### 2.3 Success Criteria

- ✅ Branch Manager can ONLY see their branch data
- ✅ Investor sees ALL branches + aggregates
- ✅ Single-page user sees ONLY their assigned page
- ✅ No data leakage between branches via API or UI
- ✅ Aggregate calculations are real-time
- ✅ Query performance remains acceptable

---

## 3. PROPOSED ARCHITECTURE

### 3.1 System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Next.js)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Investor   │  │    Branch    │  │  Single-Page │    │
│  │  Dashboard   │  │   Manager    │  │     User     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Layout Router (StandardLayout vs SinglePageLayout) │ │
│  │  - Investor: Full Sidebar + Navbar                  │ │
│  │  - Branch Mgr: Full Sidebar + Navbar                │ │
│  │  - Single-Page: Minimal UI (Lang + Theme only)      │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  API LAYER (Next.js Routes)                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Middleware Stack:                                  │ │
│  │  1. Auth Middleware (JWT Verification)              │ │
│  │  2. Role Middleware (RBAC Check)                    │ │
│  │  3. Branch Isolation Middleware (schoolId, branchId)│ │
│  │  4. Page Access Middleware (Single-page users)      │ │
│  │  5. Permission Middleware (Action: View/Create/etc) │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               SERVICE LAYER (Business Logic)               │
│  ┌─────────────────────┬─────────────────────────────────┐ │
│  │  School Service     │  Branch Service                 │ │
│  │  User Service       │  RBAC Service                   │ │
│  │  Student Service    │  Attendance Service             │ │
│  │  Finance Service    │  Report Service                 │ │
│  │  HR Service         │  Audit Service                  │ │
│  └─────────────────────┴─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              DATA ACCESS LAYER (Prisma ORM)                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Query Builder with Automatic Filtering:             │ │
│  │  - WHERE school_id = $schoolId                        │ │
│  │  - AND branch_id = $branchId                          │ │
│  │  - AND NOT deleted_at (soft deletes)                  │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            DATABASE LAYER (PostgreSQL/Supabase)            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Schools, Branches, Users, Roles, Permissions        │ │
│  │  Students, Classes, Attendance, Salaries             │ │
│  │  Accounts, Transactions, Reports, AuditLogs          │ │
│  └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow Examples

#### Example 1: Investor Accessing Dashboard
```
Investor Login
    ↓
JWT Token (role: INVESTOR, schoolId: sch_abc, branchId: null)
    ↓
GET /api/dashboard/investor
    ↓
Auth Middleware ✅ (JWT valid)
    ↓
Role Middleware ✅ (INVESTOR has access)
    ↓
Service queries:
    - SELECT * FROM branches WHERE school_id = sch_abc
    - SELECT COUNT(*) FROM students WHERE school_id = sch_abc
    - SELECT SUM(amount) FROM transactions WHERE school_id = sch_abc
    ↓
Return aggregated data for all branches
```

#### Example 2: Branch Manager Accessing Student List
```
Branch Manager Login
    ↓
JWT Token (role: BRANCH_MANAGER, schoolId: sch_abc, branchId: br_primary)
    ↓
GET /api/students?branchId=br_primary
    ↓
Auth Middleware ✅ (JWT valid)
    ↓
Role Middleware ✅ (BRANCH_MANAGER has access)
    ↓
Branch Isolation Middleware ✅
    - Verify branchId in JWT matches requested branch
    - Filter: WHERE school_id = sch_abc AND branch_id = br_primary
    ↓
Service queries with filters applied
    ↓
Return students for ONLY this branch
```

#### Example 3: Single-Page User (Accountant) Logging In
```
Accountant Login
    ↓
JWT Token (role: ACCOUNTANT, schoolId: sch_abc, branchId: br_primary, isSinglePageUser: true)
    ↓
Redirect to login callback
    ↓
Query: SELECT pages FROM user_page_access WHERE userId = acc_xyz
    ↓
Result: [{ pageCode: 'accounts', canView: true, canCreate: false, canUpdate: true, canDelete: false }]
    ↓
Redirect directly to /accounts (NOT to /dashboard)
    ↓
Render SinglePageLayout:
    - HIDE: Sidebar, Full Navbar, Dashboard
    - SHOW: Accounts page + minimal header (Language + Theme)
```

---

## 4. DATABASE DESIGN

### 4.1 Entity Relationship Diagram

```
School (master entity)
    │
    ├─── Branch (1:N) ─────┐
    │                      │
    ├─── User (1:N) ────┐  │
    │                   │  │
    ├─── Role (1:N)     │  │
    │                   │  │
    └─── Permission (1:N)  │
                           │
                   ┌──────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
    Student                   Attendance
    ├─ Class (via FK)            ├─ Student (FK)
    │                            ├─ Branch (FK)
    ├─ Attendance (1:N)          └─ School (FK)
    └─ Transfers (1:N)
                              Employee
                              ├─ Branch (FK)
                              ├─ Salary (1:N)
                              └─ School (FK)

UserPageAccess ◄────── User
├─ PageCode
├─ CanView, CanCreate, CanUpdate, CanDelete
└─ School (FK), Branch (FK)

Account ◄─────────── Transaction
├─ Branch (FK)       ├─ Account (FK)
├─ School (FK)       ├─ Branch (FK)
└─ Transaction (1:N) └─ School (FK)

Salary
├─ Employee (FK)
├─ Branch (FK)
└─ School (FK)
```

### 4.2 Core Tables & Schema

```sql
-- 1. SCHOOL MASTER (Top-level entity)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nameAr VARCHAR(255) NOT NULL,
  nameEn VARCHAR(255) NOT NULL,
  address TEXT,
  phoneNumber VARCHAR(20),
  currency VARCHAR(3) DEFAULT 'IQD',
  logoUrl TEXT,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  deletedAt TIMESTAMP
);

-- 2. BRANCHES (Independent operational units)
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  nameAr VARCHAR(255) NOT NULL,
  nameEn VARCHAR(255) NOT NULL,
  branchCode VARCHAR(50) UNIQUE NOT NULL,
  addressAr TEXT,
  addressEn TEXT,
  phoneNumber VARCHAR(20),
  principalName VARCHAR(255),
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  deletedAt TIMESTAMP
);
CREATE INDEX idx_branches_school_id ON branches(schoolId);

-- 3. USERS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  branchId UUID REFERENCES branches(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  fullNameAr VARCHAR(255) NOT NULL,
  fullNameEn VARCHAR(255) NOT NULL,
  roleId UUID NOT NULL REFERENCES roles(id),
  -- Key field: identifies single-page users
  isSinglePageUser BOOLEAN DEFAULT false,
  isActive BOOLEAN DEFAULT true,
  lastLoginAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  deletedAt TIMESTAMP
);
CREATE INDEX idx_users_school_id ON users(schoolId);
CREATE INDEX idx_users_branch_id ON users(branchId);
CREATE INDEX idx_users_email ON users(email);

-- 4. ROLES
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL, -- INVESTOR, BRANCH_MANAGER, ACCOUNTANT, etc
  nameAr VARCHAR(255) NOT NULL,
  nameEn VARCHAR(255) NOT NULL,
  hierarchyLevel INT, -- 1 = highest (Investor), 10 = lowest
  description TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  UNIQUE(schoolId, code)
);

-- 5. PERMISSIONS
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL, -- students.view, accounts.create, etc
  resource VARCHAR(50) NOT NULL, -- students, accounts, attendance, salaries
  action VARCHAR(20) NOT NULL, -- view, create, update, delete
  description TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  UNIQUE(schoolId, code)
);

-- 6. ROLE_PERMISSIONS (Many-to-Many)
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roleId UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permissionId UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  createdAt TIMESTAMP DEFAULT now(),
  UNIQUE(roleId, permissionId)
);

-- 7. USER_PAGE_ACCESS (Single-page user assignments)
CREATE TABLE user_page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pageCode VARCHAR(50) NOT NULL, -- students, accounts, attendance, salaries
  -- Action-level permissions for single-page users
  canView BOOLEAN DEFAULT false,
  canCreate BOOLEAN DEFAULT false,
  canUpdate BOOLEAN DEFAULT false,
  canDelete BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  UNIQUE(userId, pageCode)
);

-- 8. STUDENTS
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  branchId UUID NOT NULL REFERENCES branches(id),
  classId UUID REFERENCES classes(id),
  registrationNumber VARCHAR(50) UNIQUE NOT NULL,
  fullNameAr VARCHAR(255) NOT NULL,
  fullNameEn VARCHAR(255) NOT NULL,
  dateOfBirth DATE,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, transferred, graduated
  parentName VARCHAR(255),
  parentPhone VARCHAR(20),
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  deletedAt TIMESTAMP
);
CREATE INDEX idx_students_school_branch ON students(schoolId, branchId);

-- 9. CLASSES
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branchId UUID NOT NULL REFERENCES branches(id),
  gradeLevel INT NOT NULL,
  nameAr VARCHAR(255) NOT NULL,
  nameEn VARCHAR(255) NOT NULL,
  capacity INT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);

-- 10. ATTENDANCE
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  branchId UUID NOT NULL REFERENCES branches(id),
  studentId UUID NOT NULL REFERENCES students(id),
  attendanceDate DATE NOT NULL,
  status VARCHAR(20) NOT NULL, -- present, absent, excused, late
  notes TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  UNIQUE(studentId, attendanceDate)
);
CREATE INDEX idx_attendance_school_branch ON attendance(schoolId, branchId, attendanceDate);

-- 11. ACCOUNTS
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  branchId UUID NOT NULL REFERENCES branches(id),
  accountCode VARCHAR(50) NOT NULL,
  accountNameAr VARCHAR(255) NOT NULL,
  accountNameEn VARCHAR(255) NOT NULL,
  accountType VARCHAR(50) NOT NULL, -- student, expense, income, salary
  balance DECIMAL(15,2) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  UNIQUE(branchId, accountCode)
);

-- 12. TRANSACTIONS
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  branchId UUID NOT NULL REFERENCES branches(id),
  accountId UUID NOT NULL REFERENCES accounts(id),
  transactionDate DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transactionType VARCHAR(20) NOT NULL, -- debit, credit
  description TEXT,
  referenceNumber VARCHAR(100),
  createdBy UUID NOT NULL REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_transactions_school_branch ON transactions(schoolId, branchId);

-- 13. EMPLOYEES
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  branchId UUID NOT NULL REFERENCES branches(id),
  employeeCode VARCHAR(50) NOT NULL,
  fullNameAr VARCHAR(255) NOT NULL,
  fullNameEn VARCHAR(255) NOT NULL,
  position VARCHAR(100) NOT NULL,
  baseSalary DECIMAL(15,2) NOT NULL,
  hireDate DATE NOT NULL,
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  UNIQUE(branchId, employeeCode)
);

-- 14. SALARIES
CREATE TABLE salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  branchId UUID NOT NULL REFERENCES branches(id),
  employeeId UUID NOT NULL REFERENCES employees(id),
  month INT NOT NULL,
  year INT NOT NULL,
  baseSalary DECIMAL(15,2) NOT NULL,
  deductions DECIMAL(15,2) DEFAULT 0,
  bonus DECIMAL(15,2) DEFAULT 0,
  netSalary DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid
  paidDate TIMESTAMP,
  notes TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP DEFAULT now(),
  UNIQUE(employeeId, month, year)
);

-- 15. STUDENT_TRANSFERS
CREATE TABLE student_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  fromBranchId UUID NOT NULL REFERENCES branches(id),
  toBranchId UUID NOT NULL REFERENCES branches(id),
  studentId UUID NOT NULL REFERENCES students(id),
  transferDate DATE NOT NULL,
  reason VARCHAR(255),
  createdAt TIMESTAMP DEFAULT now()
);

-- 16. AUDIT_LOGS
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schoolId UUID NOT NULL REFERENCES schools(id),
  branchId UUID REFERENCES branches(id),
  userId UUID NOT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, EXPORT
  resource VARCHAR(50) NOT NULL, -- students, accounts, users, etc
  resourceId UUID,
  oldValues JSONB,
  newValues JSONB,
  ipAddress INET,
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT now()
);
CREATE INDEX idx_audit_logs_school ON audit_logs(schoolId, createdAt);
```

### 4.3 Key Design Decisions

| Decision | Reasoning |
|----------|-----------|
| **school_id + branch_id on every table** | Enables efficient filtering and prevents accidental data leaks |
| **user_page_access table** | Maps single-page users to specific pages with action-level permissions |
| **isSinglePageUser flag** | Allows conditional UI rendering and layout selection |
| **branchId nullable on users** | Investors have no branch, branch managers have one branch |
| **Hierarchical roles** | Supports inheritance and permission delegation |
| **Soft deletes (deletedAt)** | Maintains audit trail while enabling logical deletion |
| **UNIQUE constraints** | (schoolId, code) on roles ensures no duplicate role codes per school |

---

## 5. ROLES AND PERMISSIONS SYSTEM

### 5.1 Role Hierarchy

```
INVESTOR / FOUNDER (Hierarchy Level: 1) ← HIGHEST
│
├─ View all branches
├─ View all users
├─ View all financial data (aggregated + per branch)
├─ View all student data (aggregated)
├─ Manage roles and permissions
├─ View global reports
└─ Approve/reject branch operations

ADMIN / SCHOOL_DIRECTOR (Hierarchy Level: 2)
│
├─ Manage all branches (if multi-school investor)
├─ View all branch data
├─ Manage users at school level
├─ Approve transactions over limit
└─ View school-wide reports

BRANCH_MANAGER (Hierarchy Level: 3)
│
├─ View only own branch data
├─ Manage students in own branch
├─ Manage employees in own branch
├─ View financial accounts
├─ Approve transactions under limit
└─ View branch reports

ACCOUNTANT (Hierarchy Level: 4)
│
├─ View only own branch
├─ Access ONLY accounts/financial pages
├─ Create/edit transactions
├─ View financial reports
└─ Cannot delete transactions (audit trail)

ATTENDANCE_OFFICER (Hierarchy Level: 5)
│
├─ View only own branch
├─ Access ONLY attendance pages
├─ Record attendance
├─ View attendance reports
└─ Cannot modify past attendance (without approval)

STUDENT_AFFAIRS_OFFICER (Hierarchy Level: 6)
│
├─ View only own branch
├─ Access ONLY student pages
├─ Manage student registrations
├─ View student transfers
└─ Cannot access financial data

HR_OFFICER (Hierarchy Level: 7)
│
├─ View only own branch
├─ Access ONLY HR/salary pages
├─ Manage employees
├─ Process salaries
└─ Cannot access student/financial data

CUSTOM_ROLE (Hierarchy Level: 8-10) ← LOWEST
│
└─ Single page user
   ├─ No sidebar
   ├─ No navbar (minimal header)
   ├─ Only assigned page visible
   └─ Action-level permissions (View/Create/Update/Delete)
```

### 5.2 Permission Matrix

#### Permission Code Naming Convention
```
Format: {resource}.{action}

Examples:
students.view          → Can view student list
students.create        → Can create new student
students.update        → Can edit student data
students.delete        → Can delete student
accounts.view          → Can view accounts
accounts.create        → Can create account
attendance.view        → Can view attendance
attendance.mark        → Can mark attendance
salaries.view          → Can view salaries
salaries.approve       → Can approve salary
reports.view           → Can view reports
reports.export         → Can export reports
users.manage           → Can manage users
roles.manage           → Can manage roles
permissions.manage     → Can manage permissions
```

#### Role-Permission Assignments

| Role | Resource | Permissions |
|------|----------|-------------|
| **INVESTOR** | students | view, export, reports |
| | accounts | view, reports |
| | salaries | view, reports, approve |
| | users | view, create, update, delete |
| | roles | manage |
| | branches | view, manage |
| | reports | view, export, custom-reports |
| **BRANCH_MANAGER** | students | view, create, update, delete, transfer |
| | accounts | view, export |
| | attendance | view, export |
| | salaries | view, approve |
| | employees | view, create, update |
| | reports | view, export |
| | users | view, manage-own-branch |
| **ACCOUNTANT** | accounts | view, create, update |
| | transactions | create, view, update |
| | reports | view, export |
| | (NONE other) | — |
| **ATTENDANCE_OFFICER** | attendance | view, create, update, export |
| | reports | view, export |
| | (NONE other) | — |
| **STUDENT_AFFAIRS** | students | view, create, update, transfer |
| | classes | view, create, update |
| | reports | view, export |
| | (NONE other) | — |

### 5.3 Single-Page User Permission Model

```typescript
interface UserPageAccess {
  userId: string;
  pageCode: string;      // 'students', 'accounts', 'attendance', etc
  canView: boolean;      // View data
  canCreate: boolean;    // Add new records
  canUpdate: boolean;    // Edit existing records
  canDelete: boolean;    // Remove records
}

// Examples:
{
  userId: 'user_acc001',
  pageCode: 'accounts',
  canView: true,
  canCreate: true,
  canUpdate: true,
  canDelete: false        // Accountants can't delete for audit trail
}

{
  userId: 'user_att001',
  pageCode: 'attendance',
  canView: true,
  canCreate: true,
  canUpdate: true,
  canDelete: false
}

{
  userId: 'user_student001',
  pageCode: 'students',
  canView: true,
  canCreate: true,
  canUpdate: true,
  canDelete: false
}
```

### 5.4 Branch Isolation Rules

```
┌──────────────────────────────────────────────────────┐
│ CRITICAL ISOLATION RULES                             │
└──────────────────────────────────────────────────────┘

Rule 1: Every Query Must Filter
├─ If user has branchId → WHERE school_id = ? AND branch_id = ?
├─ If user is Investor → WHERE school_id = ?
└─ Never allow queries without these filters

Rule 2: User's Context
├─ JWT contains: { userId, schoolId, branchId, role }
├─ branchId is NULL for Investors
├─ branchId is required for Branch-level roles
└─ API middleware injects this into request

Rule 3: Cross-Branch Access Prevention
├─ Branch Manager requesting /api/students?branchId=OTHER_BRANCH
├─ Middleware compares: requested branchId vs user's branchId
├─ If mismatch → Return 403 Forbidden
└─ Logs incident in audit_logs

Rule 4: Aggregation Queries (Investors Only)
├─ SELECT SUM(amount) FROM transactions WHERE school_id = ?
├─ SELECT COUNT(*) FROM students WHERE school_id = ?
├─ These aggregate across ALL branches automatically
└─ No individual branch results exposed

Rule 5: Single-Page User Restrictions
├─ User has isSinglePageUser = true
├─ Middleware checks: SELECT * FROM user_page_access
├─ WHERE userId = ? AND pageCode = ?
├─ If no record → 403 Forbidden
└─ If record exists, check action (view/create/etc)
```

---

## 6. SINGLE-PAGE USER LOGIC

### 6.1 Concept Illustration

#### Traditional User (Branch Manager)
```
LOGIN
  ↓
JWT Token (role: BRANCH_MANAGER, branchId: br_primary)
  ↓
Redirect to /dashboard
  ↓
RENDER: StandardLayout
├─ Sidebar (full navigation)
├─ Navbar (profile, notifications)
├─ Dashboard content
└─ Access to: Students, Accounts, Attendance, Salaries, Reports
```

#### Single-Page User (Accountant)
```
LOGIN
  ↓
JWT Token (role: ACCOUNTANT, isSinglePageUser: true, branchId: br_primary)
  ↓
Query user_page_access → Result: pageCode='accounts'
  ↓
Redirect directly to /accounts (NOT /dashboard)
  ↓
RENDER: SinglePageLayout
├─ Minimal Header with:
│  ├─ Page Title ("Accounts")
│  ├─ Language Switcher (عربي / English)
│  └─ Theme Toggle (Light / Dark)
├─ Main Content Area (Accounts page ONLY)
├─ No Sidebar
├─ No Full Navbar
├─ No Links to Other Pages
└─ Simple Footer with Logout button
```

### 6.2 Implementation Strategy

#### Step 1: Layout Selection

```typescript
// middleware.ts or in getLayout pattern

export async function getLayout(userId: string) {
  const user = await getUserProfile(userId);
  
  if (user.isSinglePageUser) {
    return 'SinglePageLayout'; // Minimal
  }
  return 'StandardLayout';      // Full UI
}
```

#### Step 2: Redirect After Login

```typescript
// lib/auth/redirectAfterLogin.ts

export function getRedirectPath(user: User): string {
  if (user.isSinglePageUser) {
    // Get assigned page
    const pages = await getUserPages(user.id);
    if (pages.length > 0) {
      return `/${pages[0].pageCode}`; // e.g., '/accounts'
    }
  }
  // Default for normal users
  return '/dashboard';
}
```

#### Step 3: Minimal Layout Component

```typescript
// components/SinglePageLayout.tsx

export function SinglePageLayout({ children }: Props) {
  return (
    <div className="single-page-layout">
      {/* Minimal Header */}
      <header className="minimal-header">
        <div className="header-left">
          <h1>{pageTitle}</h1>
        </div>
        <div className="header-right">
          <LanguageSwitcher />
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      {/* Main Content - ONLY the assigned page */}
      <main className="page-content">
        {children}
      </main>

      {/* Optional: Simple Footer */}
      <footer className="minimal-footer">
        <p>© 2026 School Management System</p>
      </footer>
    </div>
  );
}
```

#### Step 4: Page Access Middleware

```typescript
// lib/middleware/pageAccessMiddleware.ts

export async function enforcePageAccess(
  userId: string,
  requestedPage: string,
  action: 'view' | 'create' | 'update' | 'delete'
): Promise<{ allowed: boolean; error?: string }> {
  const user = await getUserProfile(userId);

  // Non-single-page users: allow all
  if (!user.isSinglePageUser) {
    return { allowed: true };
  }

  // Single-page users: strict checking
  const pageAccess = await db.userPageAccess.findUnique({
    where: {
      userId_pageCode: { userId, pageCode: requestedPage }
    }
  });

  if (!pageAccess) {
    return { allowed: false, error: 'No access to this page' };
  }

  // Check action permission
  const actionAllowed = pageAccess[`can${capitalize(action)}`];
  if (!actionAllowed) {
    return { 
      allowed: false, 
      error: `You cannot ${action} on this page` 
    };
  }

  return { allowed: true };
}
```

### 6.3 Security Considerations

```
┌──────────────────────────────────────────────────────┐
│ SECURITY: Single-Page User Protection                │
└──────────────────────────────────────────────────────┘

Threat 1: User manually navigates to /students
├─ Prevention: Middleware check on page load
├─ Response: Redirect to authorized page
└─ Logs: Audit log entry for unauthorized access attempt

Threat 2: User tries to call /api/students endpoint
├─ Prevention: API middleware checks user_page_access
├─ Response: 403 Forbidden
└─ Logs: Blocked API access attempt

Threat 3: User modifies JWT to claim different branch
├─ Prevention: JWT signature verification
├─ Response: Token rejected
└─ No vulnerability

Threat 4: User tries DELETE when only VIEW allowed
├─ Prevention: Action-level permission check in middleware
├─ Response: 403 Forbidden
└─ Logs: Unauthorized action attempt
```

---

## 7. DASHBOARD DESIGN FOR INVESTOR

### 7.1 Investor Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ SCHOOL MANAGEMENT SYSTEM - INVESTOR DASHBOARD               │
├─────────────────────────────────────────────────────────────┤
│ [Logo] School Master | Welcome, Ahmed | [Notifications] [🔔] │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ QUICK STATS (Today)                                     │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │ │
│ │ │ Total        │ │ Today's      │ │ Present      │    │ │
│ │ │ Students     │ │ Revenue      │ │ Students     │    │ │
│ │ │              │ │              │ │              │    │ │
│ │ │ 2,450        │ │ 45,000 IQD   │ │ 2,180        │    │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ BRANCHES OVERVIEW                                       │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Branch Name        │ Students │ Employees │ Balance    │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ✓ Primary School   │   850    │    45     │ 45,000    │ │
│ │   Attendance: 95%  │          │           │           │ │
│ │   Revenue (Month): 180,000 IQD│           │           │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ✓ Boys School      │   950    │    52     │ 52,000    │ │
│ │   Attendance: 92%  │          │           │           │ │
│ │   Revenue (Month): 190,000 IQD│           │           │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ ✓ Girls School     │   650    │    38     │ 38,000    │ │
│ │   Attendance: 94%  │          │           │           │ │
│ │   Revenue (Month): 130,000 IQD│           │           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ AGGREGATE STATISTICS                                    │ │
│ ├──────────────────┬──────────────────┬──────────────────┤ │
│ │ STUDENTS         │ FINANCE          │ HR & PAYROLL     │ │
│ ├──────────────────┼──────────────────┼──────────────────┤ │
│ │ Total: 2,450     │ Total Revenue:   │ Total Employees: │ │
│ │ Avg Age: 14.2    │ 500,000 IQD      │ 135              │ │
│ │ Active: 2,400    │ Total Expenses:  │ Monthly Payroll: │ │
│ │ Graduated: 50    │ 350,000 IQD      │ 85,000 IQD       │ │
│ │ Transferred: 15  │ Net Balance:     │ Pending Pay: 12  │ │
│ │                  │ 150,000 IQD      │ Employees        │ │
│ └──────────────────┴──────────────────┴──────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ RECENT ACTIVITIES                                       │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ • Student transfer: Ahmed to Boys School (2 hours ago) │ │
│ │ • New employee: Fatima (Accountant) - Girls School (5h)│ │
│ │ • Salary approved: 10 employees - Primary (1 day ago) │ │
│ │ • Equipment purchase: 2,000 IQD - Boys School (2 days) │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [View Detailed Reports] [Export Data] [Settings]        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Branch-Specific Cards (Within Investor Dashboard)

```
┌──────────────────────────────────────────────────┐
│ PRIMARY SCHOOL (فرع الابتدائية)                  │
├──────────────────────────────────────────────────┤
│ Location: Al-Mansur District                     │
│ Principal: Dr. Mohammed Ali                      │
│                                                  │
│ STUDENTS: 850                                    │
│ ├─ Registered: 845                              │
│ ├─ Active: 840                                  │
│ ├─ Absent: 5                                    │
│ └─ Transferred: 5                               │
│                                                  │
│ FINANCES (Monthly):                             │
│ ├─ Revenue: 180,000 IQD                         │
│ ├─ Expenses: 140,000 IQD                        │
│ ├─ Net: 40,000 IQD                              │
│ └─ Balance: 45,000 IQD                          │
│                                                  │
│ ATTENDANCE: 95.2%                               │
│ PAYROLL: 35 employees, 28,000 IQD/month         │
│                                                  │
│ [View Details] [Edit] [Reports]                 │
└──────────────────────────────────────────────────┘
```

### 7.3 Reports Available to Investor

- **Consolidated Student Report** (all branches)
- **Consolidated Financial Report** (all branches, searchable by date range)
- **Consolidated Attendance Report** (all branches)
- **Consolidated Salary Report** (all branches)
- **Branch Comparison Report** (which branch performs best)
- **Monthly Trends** (student growth, revenue trends)
- **Export to Excel** (all data, all branches)

---

## 8. BRANCH-LEVEL ISOLATION IMPLEMENTATION

### 8.1 Isolation Points

```
POINT 1: Authentication Layer
├─ JWT contains: schoolId, branchId
├─ Middleware extracts and validates
└─ Invalid combinations → 401 Unauthorized

POINT 2: API Route Middleware
├─ Every route checks: user.branchId == requested.branchId
├─ Mismatch → 403 Forbidden
└─ Logged as unauthorized access attempt

POINT 3: Database Query Layer (Prisma)
├─ Custom middleware wraps Prisma client
├─ Automatically adds WHERE clauses:
│  ├─ school_id = $userSchoolId
│  └─ branch_id = $userBranchId (if applicable)
└─ Zero chance of cross-branch data leakage

POINT 4: Frontend Navigation
├─ Sidebar links filtered by user.isSinglePageUser
├─ Links to other branches hidden/disabled
├─ Attempting to navigate → Redirect to allowed page
└─ Audit log: navigation attempt tracking

POINT 5: Export/Report Generation
├─ All exports filtered by user's school/branch
├─ Excel exports include only user's accessible data
└─ Investor gets consolidated reports (all branches)
```

### 8.2 Code Example: Query Isolation

```typescript
// Before: Vulnerable
const students = await prisma.student.findMany({
  where: { branchId: req.query.branchId }
});
// ❌ What if user from Branch A requests Branch B data?

// After: Protected
const students = await prisma.student.findMany({
  where: {
    schoolId: authContext.schoolId,
    branchId: authContext.branchId // ← Enforced by context
  }
});
// ✅ Even if frontend sends branchId=WRONG,
//    API enforces correct branchId from JWT

// Better: Middleware wrapper
const isolatedPrisma = createIsolatedPrismaClient(authContext);
const students = await isolatedPrisma.student.findMany({
  where: { /* no need to specify schoolId/branchId */ }
});
// ✅ Automatic filtering applied globally
```

### 8.3 Example Scenarios & Responses

| Scenario | User Context | Request | Response | Status |
|----------|--------------|---------|----------|--------|
| Branch Manager viewing own students | branchId=A | GET /api/students | 200 OK + Data | ✅ |
| Branch Manager viewing other branch | branchId=A | GET /api/students?branchId=B | 403 Forbidden | 🚫 |
| Investor viewing all branches | branchId=null | GET /api/students/summary | 200 OK + Aggregates | ✅ |
| Single-page user accessing accounts | pageCode=accounts | GET /api/accounts | 200 OK | ✅ |
| Single-page user accessing students (unauthorized) | pageCode=accounts | GET /api/students | 403 Forbidden | 🚫 |
| Hacker with modified JWT | (signature invalid) | Any request | 401 Unauthorized | 🚫 |

---

## 9. USER FLOW & INTERACTION DIAGRAMS

### 9.1 User Registration Flow

```
┌─────────────────────────────────────────────┐
│ ADMIN CREATES NEW USER                      │
└─────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│ Select User Type                            │
├─────────────────────────────────────────────┤
│ ○ Normal User (Full access per role)        │
│ ○ Single-Page User (Access one page only)   │
└─────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   NORMAL USER          SINGLE-PAGE USER
        │                     │
        ▼                     ▼
┌─────────────────────┐ ┌──────────────────────┐
│ Fill Basic Info     │ │ Fill Basic Info      │
│ ├─ Email            │ │ ├─ Email             │
│ ├─ Full Name        │ │ ├─ Full Name         │
│ ├─ Branch           │ │ ├─ Branch            │
│ └─ Password         │ │ └─ Password          │
│                     │ │                      │
│ Select Role         │ │ (Role set as)        │
│ ├─ Branch Manager   │ │ CUSTOM_PAGE_ACCESS   │
│ ├─ Accountant       │ │                      │
│ ├─ Attendance Off.  │ │ Select Page(s)       │
│ └─ HR Officer       │ │ ├─ [ ] Students      │
│                     │ │ ├─ [ ] Accounts      │
│ System sets:        │ │ ├─ [ ] Attendance    │
│ ├─ isSinglePageUser │ │ ├─ [ ] Salaries      │
│ │  = false          │ │ └─ [ ] Reports       │
│ └─ branchId         │ │                      │
│    = selected       │ │ Set Permissions      │
│                     │ │ ├─ Can View     [ ]  │
└─────────────────────┘ │ ├─ Can Create    [ ]  │
        │               │ ├─ Can Update    [ ]  │
        ▼               │ └─ Can Delete    [ ]  │
   CREATE IN DB         │                      │
        │               │ System sets:         │
        │               │ ├─ isSinglePageUser  │
        │               │ │  = true            │
        │               │ └─ branchId = sel.   │
        │               │                      │
        │               └─ CREATE IN DB        │
        │                    │                 │
        └────────┬───────────┘                 │
                 ▼                             │
         SEND EMAIL INVITE                    │
         ├─ Temp Password                     │
         ├─ Login Link                        │
         └─ "Please change password"          │
                 │                            │
                 ▼                            │
         USER CLICKS LINK                     │
         └─ Logs in successfully              │
              │ (NORMAL)                      │
              │ ├─ Sees Dashboard            │
              │ ├─ Full Sidebar              │
              │ └─ All menus visible         │
              │                              │
              │ (SINGLE-PAGE)                │
              │ ├─ Redirected to PAGE        │
              │ ├─ Minimal layout            │
              │ └─ Only assigned page        │
              │                              │
              ▼                              │
    FIRST LOGIN SUCCESSFUL ←────────────────┘
```

### 9.2 Login & Redirect Flow (Different User Types)

```
ALL USERS
   │
   ▼
LOGIN FORM
├─ Email: user@school.com
├─ Password: ••••••••
└─ [Login Button]
   │
   ▼
VALIDATE CREDENTIALS
├─ Check email exists: ✓
├─ Check password: ✓
└─ Create JWT Token
   │
   ▼
JWT PAYLOAD CREATED
├─ userId: user_123
├─ schoolId: sch_abc
├─ branchId: br_primary (or null for investor)
├─ role: BRANCH_MANAGER (or INVESTOR, ACCOUNTANT, etc)
├─ isSinglePageUser: false/true
└─ exp: (24 hours from now)
   │
   ┌──────────────────────┬──────────────────────┐
   ▼                      ▼                      ▼
INVESTOR          BRANCH_MANAGER       SINGLE-PAGE USER
(isSP: false)     (isSP: false)        (isSP: true)
│                 │                     │
▼                 ▼                     ▼
Query DB:         Redirect to:          Query DB:
SELECT *          /dashboard            SELECT pages
FROM branches     │                      FROM user_page_access
WHERE schoolId    ▼                      WHERE userId
= sch_abc         RENDER:                = user_123
│                 StandardLayout         │
▼                 ├─ Full Sidebar       ▼
Load:             ├─ Navbar              pageCode: 'accounts'
├─ All students   ├─ Dashboard           │
├─ All employees  └─ Access:             ▼
├─ All accounts   │  - Students          Redirect to:
├─ All transfers  │  - Accounts          /accounts
└─ Show           │  - Attendance        │
   aggregates     │  - Salaries          ▼
   │              │  - Reports           RENDER:
   ▼              └─ Reports             SinglePageLayout
RENDER:           │                      ├─ Minimal Header
StandardLayout    ▼                      ├─ Language
├─ Full Sidebar   SHOW:                  ├─ Theme
├─ Navbar         ├─ Own branch data     ├─ Accounts page
├─ Dashboard      ├─ Branch reports      ├─ Logout btn
└─ Show:          ├─ Transfer mgmt       └─ NO:
   ├─ All         └─ Salary approval     │  - Sidebar
   │  branches                           │  - Full Navbar
   ├─ Summary                            │  - Dashboard
   ├─ Aggregates                         │  - Other pages
   └─ Comparison                         │
      cards                              ▼
                                         USER SEES:
                                         Only /accounts page
                                         Can:
                                         ├─ View accounts
                                         ├─ Create (if allowed)
                                         ├─ Update (if allowed)
                                         └─ Switch language/theme
```

### 9.3 Creating & Managing Branches Flow

```
INVESTOR DASHBOARD
   │
   ▼
[+ ADD NEW BRANCH] Button
   │
   ▼
BRANCH CREATION FORM
├─ School: Auto-selected
├─ Branch Name (AR): فرع القادسية
├─ Branch Name (EN): Al-Khadisiyah Branch
├─ Branch Code: br_kadisiyah (unique)
├─ Address (AR): الكاظمية، بغداد
├─ Address (EN): Al-Kadhimiya, Baghdad
├─ Principal Name: Dr. Ahmed Khalid
├─ Phone Number: +964771234567
├─ Currency: IQD
└─ [Create] [Cancel]
   │
   ▼
VALIDATE & INSERT
├─ Check branch code unique: ✓
├─ Insert into branches table
├─ Create default accounts:
│  ├─ Students Account
│  ├─ Expense Account
│  └─ Income Account
├─ Create audit log entry
└─ Redirect to branch detail
   │
   ▼
BRANCH CREATED SUCCESSFULLY
├─ Show: Branch Dashboard
├─ Allow: Manage students, employees, finances
└─ Next: Add Branch Manager
   │
   ▼
[+ ASSIGN BRANCH MANAGER]
   │
   ▼
CREATE NEW USER
├─ Email: manager@branch.com
├─ Password: (auto-generated)
├─ Full Name (AR): محمد علي
├─ Full Name (EN): Mohammed Ali
├─ Role: BRANCH_MANAGER (auto-set)
├─ Branch: This Branch (auto-set)
├─ isSinglePageUser: false (auto-set)
└─ [Create] [Cancel]
   │
   ▼
USER CREATED
└─ Email sent with login credentials
   │
   ▼
INVESTOR NOW SEES:
┌─ Branch Card:
│  ├─ Branch Name: Al-Khadisiyah
│  ├─ Manager: Mohammed Ali
│  ├─ Students: 0 (will grow)
│  ├─ Status: Active ✓
│  └─ [View] [Edit] [Delete]
└─ Can repeat for other branches
```

---

## 10. SECURITY & PRIVACY RULES

### 10.1 Critical Security Rules

```
RULE 1: NEVER Trust Client Input for Scope
├─ Client sends: ?branchId=br_xyz
├─ Server MUST verify from JWT: branchId = br_abc
├─ If mismatch → 403 Forbidden
└─ Always log the attempt

RULE 2: Database Queries MUST Include Filters
├─ WRONG: SELECT * FROM students WHERE id = 123
├─ RIGHT: SELECT * FROM students 
│         WHERE id = 123 AND branchId = $userBranchId
└─ Add automatic filtering layer in ORM

RULE 3: API Responses Must Be Filtered
├─ Single-page user requesting /api/students
├─ Even if they have role="BRANCH_MANAGER" elsewhere
├─ If pageAccess.pageCode != 'students' → 403
└─ Action-level permissions matter

RULE 4: JWT Validation on Every Request
├─ Check signature: HMACSHA256(...) == token.signature
├─ Check expiration: now < token.exp
├─ Check issuer: token.iss == our_system
├─ Invalid → 401 Unauthorized, clear cookie, redirect to login
└─ Expired → 401 with refresh token option

RULE 5: Sensitive Operations Require Audit Logs
├─ User login/logout
├─ Data creation/modification/deletion
├─ Permission changes
├─ Report generation/export
├─ Failed auth attempts
└─ Suspicious patterns (multiple failed logins, etc)

RULE 6: Password Security
├─ Minimum 8 characters, mixed case, number, special char
├─ Never store plaintext → PBKDF2 + salt
├─ Reset links expire after 24 hours
├─ Require change on first login
└─ Prevent reuse of last 5 passwords

RULE 7: Frontend Must Enforce Server Restrictions
├─ Don't send requests user shouldn't make
├─ Hide UI elements user doesn't have access to
├─ BUT: Never trust frontend checks alone
└─ Server MUST always validate
```

### 10.2 Data Privacy Rules

```
RULE 1: Single-Page Users Cannot Access Other Pages
├─ Tech: user_page_access table
├─ UI: Only assigned page visible
├─ API: Explicit permission check
├─ Logs: Track unauthorized attempts
└─ Response: 403 Forbidden + audit entry

RULE 2: Branch Managers Cannot See Other Branches
├─ Tech: JWT contains branchId
├─ UI: Sidebar filtered to own branch
├─ API: Middleware enforces branchId match
├─ Logs: Cross-branch access attempts
└─ Response: 403 Forbidden + incident log

RULE 3: Student Data Cannot Be Accessed Cross-School
├─ Tech: school_id on every query
├─ UI: Users see only their school
├─ API: Queries include WHERE school_id = $userSchoolId
├─ Logs: Cross-school access attempts (security threat)
└─ Response: 403 Forbidden + serious incident

RULE 4: Financial Data Visibility
├─ Investor: See ALL transactions, all branches
├─ Branch Manager: See only own branch transactions
├─ Accountant: See transactions they created + approved
├─ Sensitive fields (passwords, personal IDs): Never in logs
└─ Export: Include only authorized data per user

RULE 5: Audit Logs Are Immutable
├─ Insert-only table (no UPDATE, DELETE)
├─ Includes: user, action, resource, timestamp, IP, user agent
├─ Retention: Minimum 2 years
├─ Access: Only investors + admins can view
└─ Export: For compliance/investigation only
```

### 10.3 Example Attack Prevention

| Attack | Prevention |
|--------|-----------|
| **User A modifies JWT to claim User B's role** | Signature verification fails, token rejected, 401 |
| **User A tries to access /students?branchId=BRANCH_B** | Middleware compares JWT.branchId with request, mismatch, 403 |
| **User A (single-page) manually navigates to /salaries** | Frontend redirect + API rejects (no page access), 403 |
| **Attacker calls /api/students with no auth** | No JWT in header, 401 Unauthorized |
| **SQL injection in student filter** | Prisma ORM uses parameterized queries, injection fails |
| **XSS via export data** | Sanitize/escape all user input before rendering |
| **Brute force login** | Rate limit (5 attempts / 10 min), temporary lockout |
| **Session hijacking** | HTTPS enforced, secure cookies, signature verification |

---

## 11. SUGGESTED IMPLEMENTATION NOTES

### 11.1 Technology Stack (Recommended)

```
Backend:
├─ Next.js 16+ (API Routes + Middleware)
├─ Prisma ORM (Database abstraction)
├─ PostgreSQL/Supabase (Database)
├─ JWT (jsonwebtoken or Node.js crypto)
├─ PBKDF2 (Password hashing via crypto module)
└─ Zod (Input validation)

Frontend:
├─ React 19+ with TypeScript
├─ Next.js App Router (Pages)
├─ Tailwind CSS (Styling)
├─ React Hook Form (Forms)
├─ Zustand or Context (State management)
└─ SWR or TanStack Query (Data fetching)

DevOps:
├─ GitHub (Version control)
├─ Vercel (Deployment)
├─ PostgreSQL (Hosted on Supabase)
└─ GitHub Actions (CI/CD)

Monitoring:
├─ Sentry (Error tracking)
├─ LogRocket (Session replay)
└─ Datadog or New Relic (Performance)
```

### 11.2 Implementation Roadmap

#### Phase 1: Foundation (Week 1-2)
- [ ] Setup database schema with all tables
- [ ] Create Prisma migrations
- [ ] Implement authentication service (JWT, password hashing)
- [ ] Create auth API endpoints (login, register, me, refresh)
- [ ] Build auth middleware (JWT verification)
- [ ] Set up Prisma client with isolation wrapper

#### Phase 2: Core Features (Week 3-4)
- [ ] Implement RBAC system (roles, permissions, assignments)
- [ ] Create user management endpoints
- [ ] Build branch isolation middleware
- [ ] Implement single-page user logic
- [ ] Create investor dashboard structure
- [ ] Build branch manager dashboard

#### Phase 3: Data Management (Week 5-6)
- [ ] Student management (CRUD, transfers)
- [ ] Class management
- [ ] Employee management
- [ ] Financial accounts & transactions
- [ ] Attendance tracking
- [ ] Salary management

#### Phase 4: Reporting & UI (Week 7-8)
- [ ] Dashboard visualizations
- [ ] Report generation
- [ ] Export functionality
- [ ] Investor aggregate dashboards
- [ ] Mobile responsiveness
- [ ] Performance optimization

#### Phase 5: Polish & Deployment (Week 9+)
- [ ] Security audit
- [ ] Load testing
- [ ] Error handling & edge cases
- [ ] Documentation
- [ ] User testing
- [ ] Production deployment

### 11.3 Database Optimization Tips

```sql
-- Critical Indexes (create these first)
CREATE INDEX idx_students_school_branch ON students(schoolId, branchId);
CREATE INDEX idx_attendance_school_branch_date ON attendance(schoolId, branchId, attendanceDate);
CREATE INDEX idx_transactions_school_branch_date ON transactions(schoolId, branchId, transactionDate);
CREATE INDEX idx_salaries_school_branch_month ON salaries(schoolId, branchId, month, year);
CREATE INDEX idx_users_school_branch_email ON users(schoolId, branchId, email);

-- For aggregations
CREATE INDEX idx_students_school_status ON students(schoolId, status);
CREATE INDEX idx_transactions_school_type ON transactions(schoolId, transactionType);
CREATE INDEX idx_salaries_school_status ON salaries(schoolId, status);

-- For audit trail
CREATE INDEX idx_audit_logs_school_date ON audit_logs(schoolId, createdAt DESC);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(userId, createdAt DESC);
```

### 11.4 Common Pitfalls to Avoid

| Pitfall | Impact | Solution |
|---------|--------|----------|
| Forgetting `schoolId` in WHERE clause | Data leak across schools | Add to schema validation layer |
| Trusting `branchId` from request params | Branch isolation bypass | Enforce from JWT only |
| Hardcoding page names | Hard to manage roles | Use enum/constants |
| Not logging unauthorized attempts | Can't detect attacks | Add audit logging middleware |
| Aggregation queries without filter | Wrong calculations | Always include WHERE school_id |
| Caching without invalidation | Stale data shown | Use proper cache keys with school/branch |
| Exposing passwords in logs | Security issue | Never log sensitive data |
| Frontend-only access control | Easy to bypass | Always validate on server |

---

## 12. ARCHITECTURAL RISKS & MITIGATIONS

### 12.1 Identified Risks

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|-----------|
| **Cross-Branch Data Leak** | CRITICAL | Expose student/financial data | Middleware filtering, automated tests |
| **Investor Data Overload** | HIGH | Dashboard slow for 50+ branches | Pagination, caching, async queries |
| **Single-Page User Confusion** | MEDIUM | Users forget they're limited | Clear UI hints, session info display |
| **Orphaned Users** | MEDIUM | Deleted branch leaves users active | Cascade delete or soft delete + cleanup |
| **Permission Creep** | MEDIUM | Too many custom permissions | Standardize roles, audit periodically |
| **Performance at Scale** | HIGH | Slow queries with 1000s students | Proper indexing, query optimization |
| **Audit Log Storage** | MEDIUM | Audit logs grow indefinitely | Archive old logs, compress, retention policy |

### 12.2 Specific Mitigations

**Risk: Cross-Branch Data Leak**
```typescript
// ✅ Solution: Automatic Query Isolation
const withBranchIsolation = (prisma, user) => {
  const proxy = new Proxy(prisma, {
    get: (target, prop) => {
      const model = target[prop];
      if (typeof model.findMany === 'function') {
        return (query) => {
          return model.findMany({
            ...query,
            where: {
              ...query.where,
              schoolId: user.schoolId,
              ...(user.branchId && { branchId: user.branchId })
            }
          });
        };
      }
      return model;
    }
  });
  return proxy;
};
```

**Risk: Investor Dashboard Performance**
```typescript
// ✅ Solution: Pagination + Caching
export async function getBranchesForInvestor(schoolId: string, page: number) {
  const cacheKey = `branches:${schoolId}:page${page}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Database query
  const branches = await prisma.branch.findMany({
    where: { schoolId },
    take: 20,
    skip: (page - 1) * 20,
    select: {
      id: true,
      nameEn: true,
      nameAr: true,
      _count: {
        select: { students: true, employees: true }
      }
    }
  });
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(branches));
  return branches;
}
```

**Risk: Single-Page User Accidentally Sees Wrong Page**
```typescript
// ✅ Solution: Session-Level Hints
<header>
  <h1>{pageTitle}</h1>
  <div className="session-info">
    <span className="badge">Restricted Access</span>
    <span>Only viewing: {userPageCode}</span>
    <button onClick={logout}>Logout</button>
  </div>
</header>
```

---

## 13. ADDITIONAL RECOMMENDATIONS

### 13.1 Enhancements (Not Required but Valuable)

1. **Two-Factor Authentication (2FA)**
   - For Investors (high security)
   - Optional for others
   - TOTP via Google Authenticator

2. **Activity Timeline**
   - Show user what changed in system
   - Per branch, per school, per user
   - Helps with audit trail

3. **Bulk Operations**
   - Bulk student registration via CSV
   - Bulk salary processing
   - With action-level permissions

4. **Notifications**
   - System notifications (pending approvals, errors)
   - Email notifications for key events
   - Digest reports

5. **API Rate Limiting**
   - Per user, per route
   - Higher limits for admin, lower for regular users
   - Prevent abuse

6. **Data Export Policies**
   - What data can be exported
   - Who can export
   - Log all exports
   - Expiration (can't be shared forever)

### 13.2 Naming Conventions (Recommended)

```
Tables: snake_case, plural
  users, branches, audit_logs, user_page_access

Columns: snake_case
  full_name_ar, full_name_en, created_at

JWT Claims: camelCase
  { userId, schoolId, branchId, isSinglePageUser }

API Routes: kebab-case
  /api/students/list
  /api/accounts/transfer
  /api/user-page-access

Component Names: PascalCase
  StandardLayout, SinglePageLayout, StudentCard

Variables: camelCase
  const userBranchId = user.branchId;

Constants: UPPER_SNAKE_CASE
  const MAX_LOGIN_ATTEMPTS = 5;
  const JWT_EXPIRATION_MS = 86400000;

Enum Values: UPPER_SNAKE_CASE
  enum Role { INVESTOR, BRANCH_MANAGER, ACCOUNTANT }

Permissions: resource.action format
  students.view, accounts.create, salaries.approve
```

---

## 14. SUMMARY & NEXT STEPS

### What This Design Provides

✅ **Operational Independence**: Each branch is completely isolated  
✅ **Centralized Oversight**: Investor sees all branches at once  
✅ **Granular Permissions**: Role, page, and action-level control  
✅ **Single-Page Simplicity**: Focused users see only what they need  
✅ **Security**: Multi-layer isolation, audit logging, rate limiting  
✅ **Scalability**: Proper indexing, pagination, caching strategies  
✅ **Maintainability**: Clear naming, documented architecture  

### Implementation Ready?

This design is **100% implementation-ready**. It includes:
- Complete database schema
- API middleware architecture
- User flow diagrams
- Security rules
- Code examples
- Optimization strategies

### Estimated Development Time

- **Database Setup**: 2-3 days
- **Authentication**: 3-4 days
- **RBAC System**: 3-4 days
- **Core Features**: 10-12 days
- **Dashboard**: 5-6 days
- **Testing/Polish**: 3-4 days
- **Total**: 26-33 days (6-8 weeks)

---

## 15. QUICK REFERENCE CHECKLISTS

### Before Building
- [ ] Read entire design document
- [ ] Understand branch isolation concept
- [ ] Understand single-page user concept
- [ ] Review database schema
- [ ] Plan your environment variables

### During Development
- [ ] Add school_id + branch_id filters to every query
- [ ] Create middleware for JWT verification
- [ ] Create middleware for branch isolation
- [ ] Create middleware for page access checking
- [ ] Implement audit logging
- [ ] Add rate limiting to auth routes
- [ ] Test cross-branch access prevention
- [ ] Test single-page user flow

### Before Deployment
- [ ] Security audit complete
- [ ] All tests passing
- [ ] Load testing done
- [ ] Database indexes created
- [ ] Backup strategy in place
- [ ] Monitoring set up
- [ ] Documentation complete
- [ ] Team trained

---

**Document Version**: 2.0  
**Last Updated**: April 20, 2026  
**Status**: Ready for Implementation  
**Author**: Claude AI System Architect

---

*This is a comprehensive, production-ready design for a multi-branch school management system. Use it as your blueprint for implementation.*
