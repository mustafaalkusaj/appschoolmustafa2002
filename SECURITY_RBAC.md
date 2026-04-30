# نموذج الأدوار والصلاحيات — RBAC Model

## الهرمية الأساسية

```
Super Admin (Global Access)
    ↓
    ├─ Admin: School Level (School + All Branches)
    ├─ Admin: Branch Level (Branch Only)
    └─ Employee (Limited Actions Only)
```

---

## الأدوار الرئيسية (Main Roles)

### 1. Super Admin

**الوصول:**
```
✅ جميع المدارس
✅ جميع الفروع
✅ جميع الطلاب والدفعات
✅ إدارة النظام بالكامل
```

**الصلاحيات:**
```
✅ edit_students - تعديل بيانات الطالب
✅ delete_students - حذف الطالب
✅ create_payments - تسجيل دفعات
✅ view_attendance - عرض الحضور
✅ view_reports - عرض التقارير
✅ manage_users - إدارة المستخدمين
✅ manage_schools - إدارة المدارس والفروع
✅ view_system_settings - رؤية إعدادات النظام
```

**الصفحات المتاحة:**
```
✅ /ar/super-admin - لوحة تحكم Super Admin
✅ /ar/group - إدارة المدارس
✅ /ar/monitoring - مراقبة النظام
✅ /ar/subscriptions - إدارة الاشتراكات
✅ /ar/dashboard
✅ /ar/students
✅ /ar/payments
✅ /ar/attendance
✅ /ar/salaries
✅ /ar/expenses
✅ /ar/reports
✅ /ar/branch-overview
```

**الأزرار المتاحة:**
```
✅ كل الأزرار (إضافة، تعديل، حذف، نقل، توقيف، استعادة)
✅ استيراج/تصدير
✅ طباعة
✅ إنشاء تقارير
```

---

### 2. Admin (School/Branch Level)

#### School Admin
**الوصول:**
```
✅ جميع فروع مدرسته
✅ جميع الطلاب في فروعه
✅ جميع الدفعات في فروعه
❌ لا يرى مدارس أخرى
❌ لا يرى فروع مدارس أخرى
```

#### Branch Admin
**الوصول:**
```
✅ فرعه الواحد فقط
✅ طلاب فرعه فقط
✅ دفعات فرعه فقط
❌ لا يرى فروع أخرى في نفس المدرسة
❌ لا يرى مدارس أخرى
```

**الصلاحيات (كلا النوعين):**
```
✅ edit_students - تعديل بيانات الطالب
✅ delete_students - حذف الطالب
✅ create_payments - تسجيل دفعات
✅ view_attendance - عرض الحضور
✅ view_reports - عرض التقارير
❌ manage_users - لا يستطيع إضافة/حذف مستخدمين
❌ manage_schools - لا يستطيع إدارة مدارس
❌ view_system_settings - لا يرى الإعدادات العامة
```

**الصفحات المتاحة:**
```
✅ /ar/dashboard
✅ /ar/students
✅ /ar/payments
✅ /ar/attendance
✅ /ar/salaries
✅ /ar/expenses
✅ /ar/reports
✅ /ar/branch-overview
❌ /ar/super-admin (محظور)
❌ /ar/group (محظور)
❌ /ar/monitoring (محظور)
❌ /ar/subscriptions (محظور)
```

**الأزرار المتاحة:**
```
✅ إضافة طالب
✅ تعديل طالب
✅ حذف/استعادة طالب
✅ نقل طالب
✅ توقيف طالب
✅ استيراج الطلاب
✅ تصدير الطلاب
✅ إضافة دفعة
✅ حذف دفعة
✅ تصدير الدفعات
✅ طباعة البطاقات
✅ إنشاء تقارير
```

---

### 3. Employee

**الوصول:**
```
✅ بيانات الطلاب (قراءة فقط)
✅ تسجيل الدفعات
✅ عرض الحضور
❌ لا يستطيع تعديل الطالب
❌ لا يستطيع حذف الطالب
❌ لا يستطيع نقل الطالب
```

**الصلاحيات:**
```
✅ create_payments - تسجيل دفعات فقط
✅ view_attendance - عرض الحضور (قراءة فقط)
❌ edit_students - محظور
❌ delete_students - محظور
❌ view_reports - محظور (حسب الإعدادات)
❌ manage_users - محظور
```

**الصفحات المتاحة:**
```
✅ /ar/dashboard (عرض فقط)
✅ /ar/students (عرض فقط - لا تعديل)
✅ /ar/payments (إضافة دفعات فقط)
✅ /ar/attendance (عرض فقط)
❌ /ar/salaries (محظور)
❌ /ar/expenses (محظور)
❌ /ar/reports (محظور)
❌ /ar/branch-overview (محظور)
```

**الأزرار المتاحة:**
```
✅ البحث والفلترة
✅ إضافة دفعة
❌ إضافة طالب
❌ تعديل طالب
❌ حذف طالب
❌ نقل طالب
❌ توقيف طالب
❌ استيراج/تصدير
❌ طباعة
```

---

## مصفوفة الصلاحيات (Permission Matrix)

| Permission | Super Admin | School Admin | Branch Admin | Employee |
|------------|:-----------:|:------------:|:------------:|:--------:|
| **edit_students** | ✅ | ✅ | ✅ | ❌ |
| **delete_students** | ✅ | ✅ | ✅ | ❌ |
| **create_payments** | ✅ | ✅ | ✅ | ✅ |
| **view_attendance** | ✅ | ✅ | ✅ | ✅ |
| **view_reports** | ✅ | ✅ | ✅ | ❌ |
| **manage_users** | ✅ | ❌ | ❌ | ❌ |
| **manage_schools** | ✅ | ❌ | ❌ | ❌ |
| **view_system_settings** | ✅ | ❌ | ❌ | ❌ |
| **create_salary** | ✅ | ✅ | ✅ | ❌ |
| **view_salary** | ✅ | ✅ | ✅ | ❌ |
| **create_expense** | ✅ | ✅ | ✅ | ❌ |
| **view_expense** | ✅ | ✅ | ✅ | ❌ |

---

## آليات الحماية (Protection Mechanisms)

### Layer 1: Route Level Protection

**Mechanism:**
```typescript
// Components/ProtectedRoute.tsx
<ProtectedRoute requiredRole="admin">
  <Page />
</ProtectedRoute>
```

**كيف يعمل:**
```
1. User يحاول دخول صفحة
2. System يتحقق: user logged in?
3. System يتحقق: role >= required role?
4. إذا لا → Redirect إلى /login
5. إذا نعم → تحميل الصفحة
```

**الصفحات المحمية:**
```
✅ /ar/super-admin → requiresRole: super_admin
✅ /ar/group → requiresRole: super_admin
✅ /ar/monitoring → requiresRole: super_admin
✅ /ar/students → requiresRole: admin
✅ /ar/payments → requiresRole: admin
✅ /ar/attendance → requiresRole: admin
✅ /ar/branch-overview → requiresRole: admin
```

---

### Layer 2: API Level Permission Checks

**Mechanism:**
```typescript
// app/api/web/students/[studentId]/route.ts
async function handleUpdate(req, params) {
  // 1. Verify user authenticated
  const user = await getSessionUser();

  // 2. Check permission
  await requireStudentPermission(user, 'edit_students');

  // 3. Check scope (school/branch isolation)
  const student = await getStudent(params.studentId);
  if (student.school_id !== user.school_id) {
    return 403 Forbidden;
  }

  // 4. Execute update
  return updateStudent(student, data);
}
```

**الفحوصات:**
```
✅ Authentication: user has valid session
✅ Authorization: user has permission
✅ Scope: user's school/branch matches data
✅ Data validation: input is safe
```

**API Endpoints المحمية:**
```
POST /api/web/students [CREATE]
  → requiresPermission: edit_students

PUT /api/web/students/[id] [UPDATE]
  → requiresPermission: edit_students

DELETE /api/web/students/[id] [DELETE]
  → requiresPermission: delete_students

POST /api/web/payments [CREATE]
  → requiresPermission: create_payments

DELETE /api/web/payments/[id] [DELETE]
  → requiresPermission: create_payments
```

---

### Layer 3: Query Level Scope Isolation

**Mechanism:**
```sql
-- في جميع الـ queries:
SELECT * FROM students
WHERE school_id = ?  -- فلترة بالمدرسة
  AND branch_id = ?  -- فلترة بالفرع
  AND (status = 'active' OR status = 'transferred');
```

**كيف يعمل:**
```
1. API gets user's school_id و branch_id من session
2. جميع queries تضيف WHERE clause:
   - school_id = user.school_id (للـ school admins)
   - branch_id = user.branch_id (للـ branch admins)
3. Database فقط ترجع data من scope user

مثال:
- Super Admin: no filter (يرى الكل)
- School Admin: WHERE school_id = his_school_id
- Branch Admin: WHERE school_id = his_school_id AND branch_id = his_branch_id
```

**الجداول المحمية:**
```
✅ students
✅ payments
✅ attendance_records
✅ class_fees
✅ salaries
✅ expenses
```

---

### Layer 4: Database Level (RLS Policies)

**PostgreSQL Row Level Security:**
```sql
-- مثال: students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_school_isolation ON students
  USING (school_id = current_user_school_id());

CREATE POLICY student_branch_isolation ON students
  USING (branch_id = current_user_branch_id());
```

**النتيجة:**
```
✅ حتى لو endpoint خطأ في الفلترة
✅ Database نفسه سيرفع query result
✅ Double protection
```

---

## Scope Isolation Details

### Super Admin Scope
```
✅ يرى: جميع المدارس
✅ يرى: جميع الفروع
✅ يرى: جميع الطلاب والدفعات والحضور

الفلترة في البيانات:
WHERE 1=1 (بدون فلترة - يرى الكل)
```

### School Admin Scope
```
✅ يرى: مدرسته فقط
✅ يرى: جميع فروع مدرسته
✅ يرى: طلاب/دفعات جميع فروعه

الفلترة في البيانات:
WHERE school_id = user.school_id
```

### Branch Admin Scope
```
✅ يرى: فرعه فقط
✅ يرى: طلاب فرعه فقط
✅ يرى: دفعات فرعه فقط

الفلترة في البيانات:
WHERE school_id = user.school_id
  AND branch_id = user.branch_id
```

### Employee Scope
```
✅ يرى: بيانات قراءة فقط
✅ يمكنه: تسجيل دفعات فقط
✅ يمكنه: عرض الحضور فقط

الفلترة:
WHERE school_id = user.school_id
  AND branch_id = user.branch_id
وفقط الـ queries المسموحة فقط
```

---

## UI-Level Permission Controls

### متى تظهر الأزرار؟

**زر "إضافة طالب"**
```
يظهر إذا:
✅ user.role = admin أو super_admin
✅ user.permissions includes 'edit_students'
❌ يختفي إذا user.role = employee
```

**زر "حذف"**
```
يظهر إذا:
✅ user.role = admin أو super_admin
✅ user.permissions includes 'delete_students'
✅ student.status = active أو transferred
❌ يختفي إذا student.status = deleted
❌ يختفي إذا user.role = employee
```

**زر "نقل الطالب"**
```
يظهر إذا:
✅ user.role = admin أو super_admin
✅ user.permissions includes 'edit_students'
✅ student.status = active أو transferred
```

**زر "توقيف الطالب"**
```
يظهر إذا:
✅ user.role = admin أو super_admin
✅ student.status = active (not suspended/transferred)
```

**زر "استعادة"**
```
يظهر إذا:
✅ user.role = admin أو super_admin
✅ student.status = deleted
❌ يختفي إذا student.status = active/suspended/transferred
```

**زر "إضافة دفعة"**
```
يظهر إذا:
✅ user.role = admin أو super_admin أو employee
✅ user.permissions includes 'create_payments'
```

---

## File Locations

### Code Files:

**Permission Helpers:**
```
lib/api/permissions.ts
├─ requireStudentPermission()
├─ requirePaymentPermission()
├─ checkUserScope()
└─ verifySchoolAccess()
```

**Route Protection:**
```
components/ProtectedRoute.tsx
├─ <ProtectedRoute requiredRole="admin">
└─ redirects if role insufficient
```

**API Route Protection:**
```
app/api/web/students/[studentId]/route.ts
app/api/web/payments/route.ts
app/api/web/attendance/route.ts
├─ all start with: await requireStudentPermission(user, 'action')
├─ all add: WHERE school_id = ... AND branch_id = ...
└─ all verify: student.school_id === user.school_id
```

**Button Visibility Logic:**
```
app/[locale]/students/_components/StudentsTable.tsx
├─ shows buttons based on user.permissions
└─ hides buttons if insufficient permission

app/[locale]/students/_components/StudentDetailPanel.tsx
├─ shows action buttons conditionally
└─ disables if user lacks permission
```

---

## Security Verification Checklist

### Daily Verification
```
✅ Do all pages require login?
   - Check: /ar/students without session → /login

✅ Do admins only see their scope?
   - Check: Branch admin sees branch data only
   - Check: School admin sees school + branches

✅ Do employees have limited access?
   - Check: Employee can view students but not edit
   - Check: Employee can create payments

✅ Do all buttons have permissions?
   - Check: Delete button only shows for admin
   - Check: Transfer button only shows for admin
```

### API Security Verification
```
✅ Do all endpoints check authentication?
   - Test: Call API without session → 401 Unauthorized

✅ Do all endpoints check permissions?
   - Test: Call with employee role → 403 Forbidden

✅ Do all endpoints filter by scope?
   - Test: Branch admin gets students only from branch
   - Test: Employee gets limited data
```

### Database Security Verification
```
✅ Do RLS policies exist?
   SELECT * FROM pg_policies;
   Should show policies for students, payments, etc.

✅ Are RLS policies correct?
   Test: Select as branch_admin → returns branch data only
```

---

## Troubleshooting Permissions

### Issue: Button doesn't appear
```
Debug steps:
1. Check user.role in console: console.log(session.user.role)
2. Check user.permissions: console.log(session.user.permissions)
3. Expected: role='admin' and permissions.includes('edit_students')
4. If not: Contact admin to upgrade role
5. If yes: Check component code for correct permission check
```

### Issue: Button appears but action fails
```
Debug steps:
1. Open DevTools → Network tab
2. Click button and check API response
3. If 403 Forbidden: API permission check failed
   - Solution: Check API file for permission validation
4. If 500 Error: Database error or scope issue
   - Solution: Check WHERE clause includes school/branch IDs
```

### Issue: Employee can see data they shouldn't
```
Debug steps:
1. Check RLS policies in Supabase:
   SELECT * FROM pg_policies WHERE tablename='students';
2. Verify policies use correct user context
3. If policies missing: Create them (contact dev)
4. If policies present: Check WHERE clause in API query
```

---

## Best Practices

### For Developers:
```
✅ Always add permission check in API routes
✅ Always add scope filter (school_id, branch_id)
✅ Always add UI-level permission checks
✅ Always verify RLS policies exist on tables

❌ Don't skip any layer of protection
❌ Don't assume user has access based on role alone
❌ Don't remove WHERE clause "for simplicity"
```

### For Admins:
```
✅ Review role assignments monthly
✅ Revoke permissions when user leaves
✅ Audit who has delete_students permission
✅ Monitor scope isolation violations

❌ Don't give super_admin to non-super-admins
❌ Don't share admin credentials
❌ Don't bypass permission checks manually
```

