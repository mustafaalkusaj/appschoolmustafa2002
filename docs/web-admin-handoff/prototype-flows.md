# Prototype Flows

## تحديث QA الحي 2026-04-09

تم استخدام flow مصادقة حي في Playwright بدل الاكتفاء بالتصفح غير المحمي:

1. `Login`
2. تسجيل دخول بحساب `admin@schoolapp.com`
3. فتح route محمي
4. التبديل بين العربية والإنجليزية داخل الهيدر
5. التحقق من استمرار الوصول والاتجاه الصحيح

الملفات المرتبطة:

- `tests/e2e/login.smoke.spec.ts`
- `tests/e2e/authenticated-locale-switch.smoke.spec.ts`
- `tests/e2e/redesign-visual-capture.spec.ts`

## Flow 1: Authentication

1. `Login`
2. نجاح تسجيل الدخول
3. توجيه حسب الدور:
   - `super_admin` → `Super Admin`
   - `admin` → `Dashboard`
   - `employee` → `Dashboard`

حالات بديلة:

- بيانات خاطئة → error داخل `Login`
- لا صلاحية → `Access Denied`
- اشتراك منتهي أو مدرسة غير فعالة → `Subscription Expired`

## Flow 2: Admin Daily Workflow

1. `Home`
2. `Dashboard`
3. `Students`
4. `Payments`
5. `Attendance`
6. `Reports`

التفريعات:

- من `Students`:
  - `Add Student Modal`
  - `Edit Student Modal`
  - `Import Excel Modal`
- من `Payments`:
  - `Add Payment Modal`
  - `Invoice Detail Drawer`
  - `Archive Detail Modal`

## Flow 3: Employee Collection Workflow

1. `Dashboard`
2. `Students`
3. `Payments`
4. `Add Payment Modal`
5. `Receipt Print`

هدف هذا flow:

- البحث عن الطالب
- تسجيل دفعة
- مراجعة المتبقي
- طباعة الإيصال

## Flow 4: Super Admin Operations

1. `Super Admin`
2. `Schools`
3. `Subscriptions`
4. `Super Admin / Users`
5. `Super Admin / Schools`
6. `Super Admin / Subscriptions`

التفريعات:

- تجديد اشتراك
- تفعيل / إيقاف مدرسة
- إضافة مستخدم
- تخصيص صلاحيات

## الربط بين الشاشات

### Global Links

- `Sidebar` يربط كل modules حسب الدور
- `Theme Toggle` يغيّر الثيم فقط
- `Logo` من صفحات auth/gates يرجع حسب السياق:
  - في login لا يحتاج nav
  - في app shell يمكن أن يرجع إلى `Home`

### Modal Links

- أي button `إضافة` يفتح modal فوق نفس الشاشة
- أي button `تفاصيل` يفتح drawer أو detail modal
- أي button `تصدير` أو `طباعة` يبقى داخل نفس الـ frame مع overlay feedback

## Prototype Rules داخل Figma

- استخدم `Open overlay` للمودالات
- استخدم `Swap overlay` بين مودالات مترابطة
- استخدم `Navigate to` بين الشاشات الأساسية
- transition المقترح:
  - `Smart Animate`
  - `200ms`
  - `Ease Out`

## Start Points

- `Start / Public`: `Login`
- `Start / Admin`: `Dashboard`
- `Start / Employee`: `Payments`
- `Start / Super Admin`: `Super Admin`
