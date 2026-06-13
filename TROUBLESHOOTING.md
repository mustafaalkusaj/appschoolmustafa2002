# دليل حل المشاكل — Troubleshooting Guide

## المشكلة 1: صفحة تسجيل الدخول فارغة (Blank Login Page)

### الأعراض
```
❌ تفتح صفحة /ar/login بيضاء تماماً
❌ لا يظهر نموذج التسجيل
❌ console لا يظهر أخطاء واضحة
```

### السبب
```
Error في RuntimeBrandingProvider قبل إعادة المحتوى
عادة: data fetch fail أو async error
```

### الحل
```bash
# الخطوة 1: تحديث الصفحة (F5)
تحديث بسيط يعيد محاولة fetch البيانات

# الخطوة 2: فتح DevTools
Ctrl+Shift+I → Console tab
ابحث عن أي error messages

# الخطوة 3: إذا استمرت المشكلة
npm run build
npm run dev
```

### الآلية (كيف حُلّت)
```
File: app/[locale]/login/page.tsx
Component: RuntimeBrandingProvider
Fix: أضيف try-catch wrapper مع fallback state
Result: error يُعرض بدل blank page
```

### التحقق من الحل
```
✅ صفحة تحميل تظهر نموذج بشكل صحيح
✅ إذا خطأ → رسالة خطأ واضحة (NOT blank)
```

---

## المشكلة 2: صفحة لوحة الفرع فارغة (Blank Branch Overview)

### الأعراض
```
❌ /ar/branch-overview يفتح بيضاء
❌ الملخص المالي لا يظهر
❌ قد تظهر أخطاء "Chunk not found"
```

### السبب
```
Chunk hash mismatch عند التحديث
حدث عند استخدام --prebuilt مع build قديم
Next.js لا يعثر على الـ chunk المطلوب
```

### الحل
```bash
# الحل السريع (3 خطوات)

# 1. امسح الكاش المحلي
rm -rf .vercel
rm -rf .next

# 2. rebuild من الصفر
npm run build

# 3. شغّل محلياً للتحقق
npm run dev
# تحقق: branch overview يظهر بشكل صحيح

# 4. deploy بدون --prebuilt
npx vercel deploy --prod
# (استخدم الطريقة العادية، ليس prebuilt)
```

### الآلية (كيف حُلّت)
```
Previous Solution:
- Clean rebuild مع حذف cache
- Fresh Vercel deploy
- تجنب --prebuilt flag عند chunk issues

Prevention:
- استخدم --prebuilt فقط بعد التأكد من build stability
- امسح .vercel قبل --prebuilt
```

### التحقق من الحل
```
✅ branch-overview يحمّل
✅ الأرقام المالية تظهر
✅ لا توجد "Chunk not found" errors
```

---

## المشكلة 3: Chunk Hash Mismatch Errors

### الأعراض
```
❌ رسالة error: "Chunk not found"
❌ بعض الصفحات تحميل، بعضها blank
❌ refreshing الصفحة يحل المشكلة مؤقتاً
```

### السبب
```
Build hash في Vercel ≠ Build hash محلي
حدث عند:
- استخدام --prebuilt مع build قديم
- تغيير dependencies بدون rebuild
- cache corruption في .vercel أو .next
```

### الحل
```bash
# الحل الشامل

# 1. حذف جميع الكاش
rm -rf .vercel .next node_modules

# 2. reinstall dependencies
npm install

# 3. fresh build
npm run build

# 4. verify محلياً
npm run dev
# جرّب كل الصفحات تحميل بشكل صحيح

# 5. deploy بطريقة نظيفة
npx vercel deploy --prod
# (لا تستخدم --prebuilt في هذه الحالة)

# اتنظر: Deployment يكتمل بنجاح
# اتحقق: الصفحات كلها تحميل بدون errors
```

### التجنب
```
✅ استخدم --prebuilt فقط عند التأكد من build stability
✅ لا تخلط بين build local وـ --prebuilt مع dependency changes
✅ امسح cache دائماً قبل fresh deploy
```

---

## المشكلة 4: Import فشل - Classes.name_ar غير موجود

### الأعراض
```
❌ استيراج طلاب يفشل
❌ Error: "classes.name_ar not found"
❌ جميع الصفوف تفشل في التحقق
```

### السبب
```
قاعدة البيانات لا تحتوي على column name_ar في جدول classes
أو: import code يبحث عن name_ar لكن الـ schema يستخدم اسم مختلف
```

### الحل
```bash
# الخطوة 1: تحقق من الـ schema الفعلي
# في Supabase dashboard:
# - اذهب إلى SQL Editor
# - شغّل: SELECT * FROM information_schema.columns WHERE table_name='classes' LIMIT 5;

# الخطوة 2: تحقق من import code
# File: lib/api/student-import.ts
# ابحث عن: .name_ar
# استبدل بالاسم الصحيح (مثلاً: name, className)

# الخطوة 3: اختبر استيراج مرة أخرى
```

### الآلية (كيف حُلّت)
```
في الواقع: classes جدول يحتوي على:
- id
- name (الاسم بالعربية)
- school_id
- branch_id

Import code يجب أن يستخدم: name (ليس name_ar)
```

---

## المشكلة 5: Remaining Fee Generated Column Constraint Error

### الأعراض
```
❌ Error عند إضافة طالب أو تسجيل دفعة
❌ رسالة: "CHECK constraint violation on remaining_fee"
❌ Payments page لا يحدث
```

### السبب
```
remaining_fee كان COMPUTED column مع CHECK constraint
Formula في constraint كانت بطيئة أو خاطئة
Migration جديدة لم تُطبّق
```

### الحل
```bash
# الخطوة 1: تطبيق الـ Migration الصحيحة
# في Supabase SQL Editor:

# Migration: 20260430_000000_fix_remaining_fee_constraint.sql
# تغيير remaining_fee إلى GENERATED ALWAYS column

# إذا لم تُطبّق:
# 1. اذهب Supabase dashboard
# 2. SQL Editor
# 3. انسخ محتوى Migration
# 4. شغّل

# الخطوة 2: تحقق من Column Definition
SELECT column_default, is_generated FROM information_schema.columns
WHERE table_name='students' AND column_name='remaining_fee';
# يجب: is_generated = YES

# الخطوة 3: تحديث Vercel
npx vercel deploy --prod
```

### الآلية (كيف حُلّت)
```
Before:
remaining_fee GENERATED AS (total_fee - paid_fee)
  WITH CHECK (remaining_fee >= 0)
Problem: Constraint evaluates recursively, causes error

After:
remaining_fee GENERATED ALWAYS AS (GREATEST(total_fee - paid_fee, 0))
Advantage: Uses GREATEST, no recursive check needed
```

---

## المشكلة 6: Supabase Environment Variables غير موجودة

### الأعراض
```
❌ صفحات تحميل لكن لا تظهر بيانات
❌ Console error: "Supabase connection failed"
❌ Payments/Students pages blank
```

### السبب
```
SUPABASE_URL أو SUPABASE_ANON_KEY غير مُعرّفة في Vercel
عادة حدث بعد migration إلى بيئة جديدة أو إعادة بناء
```

### الحل
```bash
# الخطوة 1: تحقق من Environment Variables محلياً
cat .env.local | grep SUPABASE
# يجب أن تظهر:
# SUPABASE_URL=https://...
# SUPABASE_ANON_KEY=eyJ...

# الخطوة 2: تحقق من Vercel Dashboard
# 1. اذهب: vercel.com → Projects → appschoolmustafa2002
# 2. Settings → Environment Variables
# 3. يجب أن تكون موجودة:
#    ✓ SUPABASE_URL
#    ✓ SUPABASE_ANON_KEY
#    ✓ SUPABASE_SERVICE_ROLE_KEY
#    ✓ JWT_SECRET
#    ✓ (+ others)

# الخطوة 3: إضافة missing variables
# 1. في Vercel settings
# 2. أضيف المتغيرات الناقصة
# 3. أعد deploy:
npx vercel deploy --prod

# الخطوة 4: تحقق من Production
# افتح صفحة students/payments
# يجب أن تحميل البيانات
```

### الآلية (التحقق)
```
Variables الضرورية:
✅ SUPABASE_URL - رابط Supabase project
✅ SUPABASE_ANON_KEY - مفتاح عام للبيانات
✅ SUPABASE_SERVICE_ROLE_KEY - مفتاح للعمليات الإدارية
✅ JWT_SECRET - سر التشفير للجلسات
```

---

## المشكلة 7: Vercel Rate Limiting

### الأعراض
```
❌ Error: "429 Too Many Requests"
❌ requests تفشل عشوائياً
❌ Bulk operations (import/export) تبطأ جداً
```

### السبب
```
صفحة واحدة تطلب عدد requests كبير جداً
مثلاً: import 500 طالب = 500 request
Vercel rate limiter يحجب requests الإضافية
```

### الحل
```bash
# الخطوة 1: قلل حجم الـ Bulk Operations
# استيراج الطلاب على دفعات:
# - Batch 1: 100 طالب
# - Batch 2: 100 طالب
# - إلخ

# الخطوة 2: انتظر بين batches
# - أضيف delay 2-3 ثواني بين batches

# الخطوة 3: استخدم pagination للعمليات الكبيرة

# الخطوة 4: إذا استمرت المشكلة
# اتصل بـ Vercel support:
# - أخبر عن استخدام الـ bandwidth
# - اطلب increase في rate limit
```

### التجنب
```
✅ لا تطلب 500+ requests في operation واحدة
✅ استخدم batching (50-100 per batch)
✅ أضيف delays بين batches
✅ استخدم pagination
```

---

## المشكلة 8: Class Fees غير مرتبطة بالطالب

### الأعراض
```
❌ طالب له "no_fee_configured" بالرغم من وجود class_fees
❌ remaining_fee = 0 بينما يجب أن يكون أكبر
❌ Payments page لا يعرض القسط الصحيح
```

### السبب
```
class_fees موجودة لكن لا تطابق student الصفوف/الشعب
مثلاً:
- class_fees: "4 - أ" (class_name="4 - أ")
- student: class_name="4-أ" (بدون مسافات)
الـ matching logic لا يجد الـ match
```

### الحل
```bash
# الخطوة 1: تحقق من class_fees vs student data
# في Supabase:
SELECT DISTINCT class_name FROM class_fees;
SELECT DISTINCT class_name FROM students WHERE school_id='...' LIMIT 10;
# قارن: هل الـ formatting متطابق؟

# الخطوة 2: إذا formatting مختلف
# اختر واحدة من:
#   أ) update class_fees إلى نفس format الـ students
#   ب) update students إلى نفس format الـ class_fees

# Example fix:
UPDATE class_fees SET class_name = TRIM(class_name) WHERE school_id='...';

# الخطوة 3: تحديث الصفحة
# /ar/students يجب أن يعرض القسط الصحيح

# الخطوة 4: verify matching
# File: lib/students/financials.ts
# Function: resolveStudentFeeTotal()
# يجب أن يجد الـ match بشكل صحيح
```

### الآلية (matching logic)
```
system يربط class_fees مع student عند:
- class_fees.class_name = student.class_name (بالضبط)
- class_fees.section = student.section (إذا كانا موجودين)
- class_fees.school_id = student.school_id
- class_fees.branch_id = student.branch_id

إذا أي واحدة لا تطابق → fallback إلى students.total_fee
```

---

## المشكلة 9: Student Actions لا تعمل (Transfer/Suspend/Delete/Restore)

### الأعراض
```
❌ زر "نقل الطالب" موجود لكن لا يعمل
❌ زر "توقيف الطالب" لا يفعل شيء
❌ delete/restore لا تعمل
```

### السبب
```
RBAC permissions غير صحيحة
User role = employee لا يملك صلاحيات edit/delete
أو: API endpoint يرفض request بدون authorization
```

### الحل
```bash
# الخطوة 1: تحقق من دورك
# في Supabase (profiles table):
SELECT role FROM profiles WHERE auth.uid() = user_id;
# يجب أن يكون: admin أو super_admin

# الخطوة 2: إذا role=employee
# اطلب من admin أن يرفع صلاحياتك إلى admin

# الخطوة 3: تحقق من API permissions
# File: lib/api/permissions.ts
# Function: requireStudentPermission()
# تأكد:
#   ✓ delete_students permission موجودة
#   ✓ edit_students permission موجودة

# الخطوة 4: تحديث
npm run dev
# جرّب الأزرار مرة أخرى
```

### الآلية (permission checking)
```
Layers of enforcement:
1. Frontend: buttons ظاهرة فقط إذا user لديه permission
2. API: endpoint يتحقق من permission قبل update
3. Database: RLS policies تمنع update بدون صلاحيات

إذا واحدة من هذه layers تفشل → operation لا يعمل
```

---

## المشكلة 10: Dashboard/Payments Data Mismatch

### الأعراض
```
❌ Dashboard يعرض: Total=500,000, Paid=300,000
❌ Payments page يعرض: Total=450,000, Paid=280,000
❌ الأرقام لا تتطابق بين الصفحات
```

### السبب
```
Dashboard و Payments pages تستخدم APIs مختلفة
أو: queries مختلفة بـ WHERE clauses مختلفة
أو: pagination/filtering مختلف
```

### الحل
```bash
# الخطوة 1: تحقق من مصدر البيانات
# File: app/[locale]/branch/page.tsx (Dashboard)
# API call يجب أن يستخدم: /api/web/payments/overview

# File: app/[locale]/payments/page.tsx (Payments page)
# API call يجب أن يستخدم: نفس /api/web/payments/overview

# الخطوة 2: تأكد أنهما يستخدمان نفس API
# في كلا الملفات:
const { data } = await fetch('/api/web/payments/overview')

# الخطوة 3: تحقق من الـ Filter/Pagination
# Dashboard: يعرض جميع الطلاب (active فقط)
# Payments: يعرض جميع الطلاب (حسب التبويب المختار)
# تأكد: نفس الـ scope (school_id, branch_id)

# الخطوة 4: فرض consistency
# استخدم نفس helper function في كلا الصفحتين:
# Function: buildResolvedStudentFinancials()
# File: lib/students/financials.ts

# الخطوة 5: تحديث
npm run build
npm run dev
# جرّب الصفحتين: الأرقام يجب أن تتطابق
```

### الآلية (consistency guarantee)
```
Guarantee:
- Dashboard uses: buildResolvedStudentFinancials()
- Payments uses: buildResolvedStudentFinancials()
- Both use same formula for calculations
- Result: Numbers always match

If they don't:
1. Check which API each page calls
2. Verify both call the same endpoint
3. Ensure scope (school_id, branch_id) is identical
```

---

## General Troubleshooting Steps

### Step 1: Refresh & Basic Checks
```bash
# كل المشاكل قد تُحل بـ refresh:
1. F5 (refresh صفحة)
2. Ctrl+Shift+Delete (clear cache)
3. جرّب متصفح مختلف
```

### Step 2: Logs & Diagnostics
```bash
# افتح DevTools (F12)
# → Console tab
# ابحث عن error messages

# تحقق من:
- Network tab (requests failing?)
- Application tab (cookies/storage OK?)
- Performance tab (slow loads?)
```

### Step 3: Vercel Logs
```bash
# في Vercel dashboard:
# 1. Projects → appschoolmustafa2002
# 2. Deployments → latest
# 3. Logs → Functions/Edge/Build
# ابحث عن 500 errors أو exceptions
```

### Step 4: Supabase Status
```bash
# في Supabase dashboard:
# 1. Home → Status
# 2. تحقق: Database OK?
# 3. تحقق: API OK?
# 4. تحقق: Edge Functions OK?

# إذا status = red:
# اتنتظر restore أو اتصل بـ support
```

### Step 5: Escalation
```bash
إذا الخطوات أعلاه لم تحل المشكلة:
1. لا تحاول تعديل الكود بدون فهم
2. لا تحذف بيانات
3. اجمع logs:
   - Screenshot of error
   - Browser console error
   - Vercel deployment logs
   - API response (if available)
4. اتصل بـ الدعم التقني مع جميع المعلومات
```

---

## Contact & Escalation

### When to Contact Support
```
✅ Issues not resolved by troubleshooting above
✅ Database connection failures (repeated 500 errors)
✅ Security concerns
✅ Data corruption (numbers don't add up despite trying solutions)
```

### Information to Provide
```
- Exact error message
- Screenshot or console output
- Steps to reproduce
- When did it start happening
- Recent changes made to system (if any)
```

