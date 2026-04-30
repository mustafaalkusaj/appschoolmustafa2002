# قواعد الحسابات المالية — Financial Rules

## مصدر قسط الطالب (Student Fee Source)

### الأولويات

```
الأولوية 1: class_fees.total_fee
├─ إذا > 0
├─ مثل: صف 4-أ له رسوم 500 دينار

الأولوية 2: students.total_fee
├─ إذا class_fees < 0 أو غير موجود
├─ الرسوم المسجلة مع الطالب نفسه

الأولوية 3: 0 (لا توجد رسوم)
└─ إذا كل المصادر = 0 أو null
```

### أمثلة

#### مثال 1: class_fees موجود
```
Scenario:
- Student: أحمد علي, Class: 4-أ
- class_fees (4-أ): 500
- students.total_fee: 100 (قيمة قديمة)

النتيجة:
total_fee = 500 (يأخذ من class_fees لأنه > 0)
```

#### مثال 2: class_fees غير موجود
```
Scenario:
- Student: فاطمة حسن, Class: 5-ب
- class_fees (5-ب): لا يوجد
- students.total_fee: 400

النتيجة:
total_fee = 400 (يأخذ من students)
```

#### مثال 3: لا توجد رسوم
```
Scenario:
- Student: علي محمد, Class: 6-أ
- class_fees (6-أ): 0 أو null
- students.total_fee: 0 أو null

النتيجة:
total_fee = 0 (لا توجد رسوم)
Status = 'no_fee_configured'
```

### المكان في الكود

```
File: lib/students/financials.ts
Function: resolveStudentFeeTotal()

Migration: 20260429_fix_payment_fee_resolution.sql
```

---

## ربط class_fees مع الطالب

### كيف يعمل

```
1. الطالب له: class_name, section, school_id, branch_id

2. قاعدة البيانات تبحث عن:
   class_fees WHERE
   - class_fees.class_name = student.class_name
   - class_fees.section = student.section
   - class_fees.school_id = student.school_id
   - class_fees.branch_id = student.branch_id

3. إذا وُجد: استخدم class_fees.total_fee
   إذا لم يُوجد: استخدم students.total_fee
```

### مثال عملي

```
Database:
┌─────────────────────────────────┐
│ class_fees table                │
├──────────────┬──────┬──────┬────┤
│ class_name   │ sect │ school_id│
├──────────────┼──────┼──────┤
│ 4 - أ        │ أ    │ ... │
│ 5 - ب        │ ب    │ ... │
└─────────────────────────────────┘

┌────────────────────────────────────┐
│ students table                     │
├──────┬────────────┬───────────────┤
│ name │ class_name │ class_fee_id  │
├──────┼────────────┼───────────────┤
│ أحمد │ 4 - أ      │ (found above) │
│ علي  │ 5 - ب      │ (found above) │
└────────────────────────────────────┘

النتيجة:
أحمد ← class_fees(4-أ) = 500
علي  ← class_fees(5-ب) = 400
```

---

## المدفوع (Paid Fee)

### التعريف

```
paid_fee = مجموع كل الدفعات للطالب في نفس الفرع
```

### الصيغة

```sql
SUM(payments.amount)
WHERE student_id = ?
  AND school_id = targetSchoolId
  AND branch_id = targetBranchId
  AND status != 'deleted'
```

### أمثلة

#### مثال 1: دفعة واحدة
```
الطالب: أحمد
القسط الإجمالي: 500

الدفعات:
- 01/01/2026: 300 دينار

paid_fee = 300
remaining = 500 - 300 = 200
```

#### مثال 2: دفعات متعددة
```
الطالب: فاطمة
القسط الإجمالي: 500

الدفعات:
- 01/01/2026: 200 دينار
- 15/01/2026: 150 دينار
- 01/02/2026: 150 دينار

paid_fee = 200 + 150 + 150 = 500
remaining = 500 - 500 = 0
```

#### مثال 3: دفع زائد (لا يحدث عادة)
```
الطالب: علي
القسط الإجمالي: 500

الدفعات:
- 01/01/2026: 500 دينار
- 15/01/2026: 100 دينار (خطأ أو دفع للعام القادم)

paid_fee = 500 + 100 = 600

لكن:
remaining = MAX(500 - 600, 0) = 0
لا يصير سالب
```

### المكان في الكود

```
File: lib/payments-server.ts
Function: resolveAuthoritativeStudentPaidFee()
```

---

## المتبقي (Remaining Fee)

### التعريف

```
remaining_fee = max(total_fee - paid_fee, 0)
```

### الحساب

```
1. خذ total_fee (من class_fees أو students)
2. اطرح paid_fee (مجموع الدفعات)
3. الفرق هو المتبقي
4. لا يكون سالباً (استخدم max)
```

### أمثلة

```
Case 1:
total = 500, paid = 200
remaining = max(500 - 200, 0) = 300

Case 2:
total = 500, paid = 500
remaining = max(500 - 500, 0) = 0

Case 3:
total = 500, paid = 0
remaining = max(500 - 0, 0) = 500
```

### ملاحظة مهمة ⚠️

**الخصم (Discount) في الحساب:**

```
Database (Generated Column):
remaining_fee = total_fee - paid_fee
(لا يعتبر الخصم)

Client (Frontend):
remaining = total_fee - paid_fee - discount
(يعتبر الخصم)

الفرق:
- DB يستخدم للـ index والأداء
- Client يستخدم للعرض والمنطق الفعلي
- النظام يعرض الرقم الصحيح (من Client)

مثال:
total = 500
paid = 100
discount = 50
displayed_remaining = 500 - 100 - 50 = 350 ✅ (صحيح)
db_remaining = 500 - 100 = 400 ⚠️ (للـ index فقط)
```

### المكان في الكود

```
Database:
File: migrations/20260430_000000_fix_remaining_fee_constraint.sql
Column: GENERATED ALWAYS AS (GREATEST(...))

Client:
File: lib/students/financials.ts
Function: calculateStudentRemainingFee()
```

---

## الخصم (Discount)

### التعريف

```
discount = مبلغ خصم إضافي يُطرح من الرسوم
```

### الاستخدام

```
يُدخل عند:
- إضافة طالب (حقل: discount_value)
- تعديل طالب

مثال:
total_fee = 500
discount = 50
يدفع الطالب: 500 - 50 = 450 فقط
```

### التأثير على الحالة المالية

```
الحالة تُحسب بعد الخصم:

total = 500
paid = 200
discount = 50

العملية:
فعلي_المستحق = 500 - 50 = 450
المتبقي = 450 - 200 = 250
```

---

## حالات الطالب المالية

### الحالة الأولى: fully_paid (مسدد بالكامل)

```
الشروط:
remaining <= 0 AND total > 0

معنى:
الطالب دفع كل التزاماته

أمثلة:
1) total=500, paid=500, remaining=0 ✅
2) total=500, paid=600, remaining=0 ✅ (دفع زيادة)
```

### الحالة الثانية: partially_paid (مسدد جزئياً)

```
الشروط:
paid > 0 AND remaining > 0

معنى:
الطالب دفع جزء من التزاماته

أمثلة:
1) total=500, paid=200, remaining=300 ✅
2) total=500, paid=1, remaining=499 ✅
```

### الحالة الثالثة: unpaid (غير مسدد)

```
الشروط:
paid = 0 AND total > 0

معنى:
الطالب لم يدفع شيء

أمثلة:
1) total=500, paid=0, remaining=500 ✅
2) total=100, paid=0, remaining=100 ✅
```

### الحالة الرابعة: no_fee_configured (بدون رسوم)

```
الشروط:
total = 0 (لا توجد رسوم)

معنى:
لم تُدرج رسوم للطالب

أمثلة:
1) total=0, paid=0 ✅
2) class_fees لا توجد
   و students.total_fee = 0 ✅
```

### جدول الحالات

| Status | total | paid | remaining | Scenario |
|--------|-------|------|-----------|----------|
| fully_paid | 500 | 500 | 0 | دفع كل التزاماته |
| fully_paid | 500 | 600 | 0 | دفع أكثر |
| partially_paid | 500 | 200 | 300 | دفع جزء |
| unpaid | 500 | 0 | 500 | لم يدفع |
| no_fee_configured | 0 | 0 | 0 | لا توجد رسوم |

---

## التوازن بين الصفحات

### consistency

جميع الصفحات تستخدم نفس الصيغ:

```
Pages:
✅ Students page
✅ Payments page
✅ Branch dashboard
✅ Reports

All use:
→ lib/students/financials.ts
→ buildResolvedStudentFinancials()
→ calculateStudentRemainingFee()
```

### Guarantee

```
إذا:
- أضفت طالباً بـ 500 رسوم
- سجلت دفعة 200

ستأتي النتائج متطابقة:
- Students page: remaining = 300
- Payments page: remaining = 300
- Branch dashboard: يعتبرها في الإجمالي
- Reports: نفس الأرقام
```

---

## الأمثلة الكاملة

### مثال 1: طالب جديد

```
Step 1: إضافة طالب
- الاسم: أحمد علي
- الصف: 4-أ
- القسط: 500

Database:
students {
  name: "أحمد علي",
  class_name: "4-أ",
  total_fee: null,
  paid_fee: 0,
  discount_value: 0
}

Resolution:
class_fees(4-أ) = 500 ✅
total_fee = 500
paid_fee = 0
remaining = 500
status = "unpaid"

UI Display:
┌────────────────────┐
│ أحمد علي          │
│ القسط: 500        │
│ المدفوع: 0        │
│ المتبقي: 500      │
│ الحالة: غير مسدد  │
└────────────────────┘
```

### مثال 2: دفعة أولى

```
Step 2: تسجيل دفعة
- المبلغ: 200
- التاريخ: 01/01/2026

Database:
payments {
  student_id: "...",
  amount: 200,
  date: "01/01/2026"
}

Calculation:
total_fee = 500 (من قبل)
paid_fee = 0 + 200 = 200
remaining = 500 - 200 = 300
status = "partially_paid"

UI Display:
┌────────────────────┐
│ أحمد علي          │
│ القسط: 500        │
│ المدفوع: 200      │
│ المتبقي: 300      │
│ الحالة: مسدد جزئي │
└────────────────────┘
```

### مثال 3: دفعة نهائية

```
Step 3: تسجيل دفعة ثانية
- المبلغ: 300
- التاريخ: 15/02/2026

Database:
payments {
  ...
  amount: 300
}

Calculation:
total_fee = 500 (من قبل)
paid_fee = 200 + 300 = 500
remaining = 500 - 500 = 0
status = "fully_paid"

UI Display:
┌────────────────────┐
│ أحمد علي          │
│ القسط: 500        │
│ المدفوع: 500      │
│ المتبقي: 0        │
│ الحالة: مسدد       │
└────────────────────┘
```

---

## الفحوصات المالية

### تحقق من التوازن

```
✅ Students page total = Payments page total
✅ Branch dashboard total = Payments page total
✅ Remaining = total - paid (يجب أن تتطابق)
✅ Status يعكس الأرقام الفعلية
```

### اكتشاف الأخطاء

```
❌ Remaining سالب؟ → خطأ في البيانات
❌ Paid > Total؟ → دفعات غير صحيحة
❌ Status ≠ الأرقام؟ → تحديث قد لم يحدث

إذا حدث:
1. تحديث الصفحة (F5)
2. تحقق من Supabase
3. اتصل بالدعم
```

---

## الخلاصة

```
الصيغة النهائية:

1. total_fee = class_fees OR students.total_fee OR 0

2. paid_fee = SUM(payments.amount)
             WHERE student_id = ? AND school_id = ?

3. remaining = max(total_fee - paid_fee, 0)
             (ملاحظة: Client يضيف الخصم أيضاً)

4. discount = discount_value (إن وُجد)

5. status = الحالة بناءً على الأرقام أعلاه
```
