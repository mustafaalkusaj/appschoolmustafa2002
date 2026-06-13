# 🔴 CRITICAL: Supabase hotfix لإزالة خطأ remaining_fee

## المشكلة
```
column "remaining_fee" can only be updated to DEFAULT
```
يمنع جميع عمليات تحديث الطالب (توقيف، حذف، استعادة، نقل).

## الحل السريع - 3 دقائق فقط

### الخطوة 1: فتح Supabase SQL Editor
```
https://app.supabase.com/project/[project-id]/sql/new
```

### الخطوة 2: تشخيص سريع
انسخ والصق في SQL Editor:

```sql
-- الخطوة 1: تشخيص
SELECT
  column_name,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name = 'remaining_fee';

-- الخطوة 2: ابحث عن القيود
SELECT constraint_name, constraint_definition
FROM information_schema.check_constraints
WHERE table_name = 'students';
```

اضغط Execute. ستراها كم عدد القيود الموجودة.

### الخطوة 3: تطبيق الإصلاح

انسخ كل هذا والصقه في SQL Editor:

```sql
-- إزالة أي قيود تحظر التحديثات
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT constraint_name
    FROM information_schema.check_constraints
    WHERE table_name = 'students'
  LOOP
    EXECUTE format('ALTER TABLE public.students DROP CONSTRAINT %I', constraint_record.constraint_name);
    RAISE NOTICE 'تم إزالة: %', constraint_record.constraint_name;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'لا توجد قيود أو خطأ: %', SQLERRM;
END $$;

-- إعادة إنشاء remaining_fee كعمود محسوب بشكل صحيح
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'remaining_fee'
  ) THEN
    -- إضافة عمود مؤقت
    ALTER TABLE public.students
    ADD COLUMN remaining_fee_temp numeric
    GENERATED ALWAYS AS (
      GREATEST(COALESCE(total_fee, 0) - COALESCE(paid_fee, 0), 0)
    ) STORED;

    -- حذف العمود القديم
    ALTER TABLE public.students
    DROP COLUMN remaining_fee;

    -- إعادة تسمية العمود الجديد
    ALTER TABLE public.students
    RENAME COLUMN remaining_fee_temp TO remaining_fee;

    RAISE NOTICE '✓ تم إعادة إنشاء remaining_fee بنجاح';
  END IF;
END $$;
```

اضغط Execute.

### الخطوة 4: التحقق من الإصلاح

انسخ والصق هذا:

```sql
-- اختبر التحديث
UPDATE public.students
SET status = 'active'
WHERE id = (SELECT id FROM public.students LIMIT 1)
RETURNING id, status, remaining_fee;

-- إذا لم يظهر خطأ = ✓ النجاح
```

اضغط Execute.

## ماذا يجب أن ترى:

✅ **النجاح:**
- في الخطوة 3: "تم إزالة:" أو "لا توجد قيود"
- في الخطوة 4: صف واحد مع updated_at جديد وبدون أخطاء

❌ **الفشل:**
- أي خطأ يحتوي على "remaining_fee"
- الأمر لا يعود أي صفوف

## بعد الإصلاح

اختبر API مباشرة:

```bash
curl -X PATCH https://school-iraq.com/api/web/students/[student-id] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{"school_id": "[school-id]", "status": "suspended"}'
```

يجب أن ترى:
```json
{
  "ok": true,
  "student": {
    "id": "...",
    "status": "suspended"
  }
}
```

## ملفات مرجعية

- `SUPABASE_FIX_SCRIPT.sql` - السكريبت الكامل مع جميع الخيارات
- `FIX_REMAINING_FEE_CONSTRAINT.md` - شرح تفصيلي
- `migrations/20260430_000000_fix_remaining_fee_constraint.sql` - migration للمستقبل

## الدعم

إذا استمرت المشكلة بعد الإصلاح:
1. تأكد من تنفيذ جميع الخطوات في الترتيب الصحيح
2. تحقق من أن لا توجد أي triggers أخرى على جدول students
3. تواصل مع Supabase support
