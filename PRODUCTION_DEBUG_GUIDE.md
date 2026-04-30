# دليل تصحيح خطأ remaining_fee في الإنتاج

## الخطأ
```
column "remaining_fee" can only be updated to DEFAULT
```

## السبب المحتمل
شيء واحد من هذه يحاول تعديل remaining_fee مباشرة:
1. **Trigger** - function تُستدعى عند UPDATE
2. **CHECK Constraint** - قاعدة تقيد التحديثات
3. **Function** - دالة PL/pgSQL تكتب عليه
4. **Column Definition** - تعريف العمود نفسه خاطئ

## الخطوات

### الخطوة 1: فتح Supabase SQL Editor
```
https://app.supabase.com/project/[project-id]/sql/new
```

### الخطوة 2: تشغيل الفحص الشامل
انسخ محتوى **DEEP_DB_AUDIT.sql** كاملًا والصقه في SQL Editor.

اضغط **Execute**.

### الخطوة 3: تحليل النتائج

ابحث عن:

#### ✗ إذا رأيت:
```
remaining_fee is GENERATED ALWAYS = ✓ GENERATED ALWAYS (correct)
Constraints = ✗ Found N constraints
Triggers on students = ✗ Found N triggers
```

معناه: يوجد trigger أو constraint يحاول كتابة remaining_fee.

#### الخطوة التالية:
في نتائج الفحص، ابحث عن أسماء الـ Triggers والـ Constraints.

مثال:
```
trigger_name: "trg_update_remaining_fee"
constraint_name: "check_remaining_fee_sync"
```

### الخطوة 4: حذف المشاكل

#### لحذف Trigger:
```sql
DROP TRIGGER IF EXISTS trg_update_remaining_fee ON public.students;
DROP TRIGGER IF EXISTS [trigger_name] ON public.students;
DROP TRIGGER IF EXISTS [trigger_name] ON public.payments;
```

#### لحذف CHECK Constraint:
```sql
ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS check_remaining_fee_sync;

ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS [constraint_name];
```

#### لحذف Function (إذا لم تُستخدم في مكان آخر):
```sql
DROP FUNCTION IF EXISTS [function_name] CASCADE;
```

### الخطوة 5: اختبار الإصلاح

```sql
-- اختبر UPDATE بسيط
UPDATE public.students
SET status = 'suspended'
WHERE id = (SELECT id FROM public.students LIMIT 1)
RETURNING id, status, remaining_fee;

-- يجب أن يعود صف واحد بدون خطأ
```

### الخطوة 6: تأكيد أن remaining_fee صحيح

```sql
-- تحقق أن remaining_fee محسوب تلقائيًا
SELECT
  id,
  total_fee,
  paid_fee,
  remaining_fee,
  (total_fee - paid_fee) as should_equal
FROM public.students
WHERE remaining_fee IS NOT NULL
LIMIT 5;

-- يجب أن تكون: remaining_fee = total_fee - paid_fee
```

## ملخص الأسباب المحتملة

### السبب 1: Trigger قديم
```sql
CREATE TRIGGER update_remaining_fee
AFTER INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION compute_remaining_fee();  -- ← يحاول SET remaining_fee
```

**الحل:** حذف الـ trigger
```sql
DROP TRIGGER update_remaining_fee ON public.students;
```

### السبب 2: CHECK Constraint
```sql
ALTER TABLE students
ADD CONSTRAINT check_remaining_fee
CHECK (remaining_fee = total_fee - paid_fee);
```

**الحل:** حذف القيد
```sql
ALTER TABLE public.students
DROP CONSTRAINT check_remaining_fee;
```

### السبب 3: Function يكتب remaining_fee
```sql
CREATE OR REPLACE FUNCTION sync_remaining_fee()
AS $$
UPDATE students SET remaining_fee = total_fee - paid_fee;
$$;
```

**الحل:** حذف الدالة أو تعديلها لعدم الكتابة على remaining_fee
```sql
DROP FUNCTION sync_remaining_fee() CASCADE;
```

### السبب 4: Column Definition خاطئ
```sql
-- ✗ خاطئ
ALTER TABLE students
ADD COLUMN remaining_fee numeric DEFAULT 0;

-- ✓ صحيح
ALTER TABLE students
ADD COLUMN remaining_fee numeric
GENERATED ALWAYS AS (total_fee - paid_fee) STORED;
```

**الحل:** إعادة تعريف العمود
```sql
-- نسخ الحالية
ALTER TABLE students
ADD COLUMN remaining_fee_new numeric
GENERATED ALWAYS AS (GREATEST(total_fee - paid_fee, 0)) STORED;

-- حذف القديم
ALTER TABLE students
DROP COLUMN remaining_fee;

-- إعادة تسمية
ALTER TABLE students
RENAME COLUMN remaining_fee_new TO remaining_fee;
```

## التحقق النهائي

```sql
-- 1. تأكد أن remaining_fee موجود
SELECT column_name, is_generated
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'remaining_fee';
-- يجب أن يكون: is_generated = ALWAYS

-- 2. تأكد أن لا توجد constraints
SELECT constraint_name
FROM information_schema.check_constraints
WHERE table_name = 'students';
-- يجب أن تكون النتيجة فارغة

-- 3. تأكد أن لا توجد triggers
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'students';
-- يجب أن تكون النتيجة فارغة

-- 4. اختبر UPDATE الحقيقي
UPDATE public.students
SET status = 'active'
WHERE id = (SELECT id FROM public.students LIMIT 1)
RETURNING id, status;
-- يجب أن يعود صف بدون خطأ
```

## إذا استمرت المشكلة

جرّب نقل migration جديد:
```sql
-- انسخ محتوى migrations/20260430_000000_fix_remaining_fee_constraint.sql
-- وشغّله في Supabase SQL Editor
```

## السؤال الأخير: هل تم الإصلاح؟

اختبر API:
```bash
curl -X PATCH https://school-iraq.com/api/web/students/[student-id] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{"school_id":"[school-id]","status":"suspended"}'
```

يجب أن تحصل على:
```json
{
  "ok": true,
  "student": {
    "id": "...",
    "status": "suspended",
    "remaining_fee": 1000
  }
}
```

بدون أي خطأ remaining_fee.
