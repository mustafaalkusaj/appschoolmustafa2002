# تقرير الفحص الشامل — school-app
# Comprehensive Security & Quality Audit Report

**التاريخ:** 2026-05-07
**النطاق:** أمان، عزل فروع، قاعدة بيانات، API، واجهة، جاهزية إنتاج
**الحالة:** قراءة فقط — لم يُعدَّل أي كود

---

## ملخص عام

المشروع يتمتع بأساس أمني جيد في النظام الحديث (RBAC Cookie + Supabase RLS + Zod validation)، لكنه يحمل **طبقة قديمة خطيرة** (JWT Service + Prisma stub + core API) لا تزال قابلة للوصول في الإنتاج. أخطر المشاكل: مفتاح JWT مكشوف، Cache-Control عامة على بيانات مصادق عليها، وعدم وجود حماية من السباق في عمليات الدفع.

**الإحصائيات:**
- إجمالي نقاط API: 128 route
- ملفات @ts-nocheck: 17 ملف
- ملفات اختبار: 97 ملف
- سياسات RLS: 20+ سياسة
- مشاكل حرجة: 7 | عالية: 16 | متوسطة: 14 | منخفضة: 8

---

## 🔴 مشاكل حرجة (Critical) — يجب إصلاحها قبل الإطلاق

---

### C-1. مفتاح JWT افتراضي مكشوف

**الخطورة:** 🔴 Critical
**الفئة:** Security
**الملف:** `lib/services/jwt.ts:21`

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**السبب:** لا يوجد فحص بيئة الإنتاج. إذا لم يُضبط `JWT_SECRET` كمتغير بيئة، يُستخدم نص معروف.

**التأثير:** أي مهاجم يقرأ الكود المصدري يستطيع تزوير JWT tokens لأي مستخدم بما في ذلك super_admin، والوصول لجميع endpoints المحمية بـ `requireAuth` (الرواتب، الطلاب، المعاملات المالية).

**الحل:**
```typescript
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET is not set in production.');
  }
  return 'dev-only-insecure-key';
}
const JWT_SECRET = getJWTSecret();
```

أيضاً أضف `JWT_SECRET` إلى `requiredEnvKeys` في `scripts/predeploy-check.mjs`.

**الاختبار:** شغّل التطبيق في production بدون JWT_SECRET — يجب أن يتوقف فوراً.

---

### C-2. Cache-Control عامة على بيانات مصادق عليها — تسريب بيانات بين المستخدمين

**الخطورة:** 🔴 Critical
**الفئة:** Security / API
**الملف:** `lib/cache-strategies.ts:33-75`

```typescript
// كل استراتيجيات الكاش تستخدم:
public: true,
sMaxAge: 300, // CDN يخزن 5 دقائق
```

**السبب:** `Cache-Control: public, s-maxage=300` يأمر CDN (Vercel Edge) بتخزين الاستجابات وتقديمها لأي مستخدم.

**التأثير:** بيانات أقساط المستخدم A قد تُقدَّم من CDN cache للمستخدم B. يشمل: `payments-list`, `students-list`, `expenses-list`, `budgets-list`.

**الحل:**
```typescript
// تغيير كل الاستراتيجيات إلى:
public: false,
// أو حذف s-maxage واستخدام:
// Cache-Control: private, max-age=300
```

**الاختبار:** بعد التعديل، تحقق أن header يحتوي `private` وليس `public`.

---

### C-3. سباق في عمليات الدفع — لا يوجد قفل أو مفتاح تفرد

**الخطورة:** 🔴 Critical
**الفئة:** Database / API
**الملف:** `app/api/web/payments/records/route.ts`

**السبب:** عملية الدفع تتبع نمط check-then-act:
1. قراءة `authoritativePaidFee` (سطر 98)
2. التحقق `remainingBeforePayment > 0` (سطر 128)
3. إدراج الدفعة (سطر 168)

لا يوجد `SELECT ... FOR UPDATE`، ولا idempotency key، ولا unique constraint.

**التأثير:** طلبان متزامنان يقرآن نفس paid_fee → كلاهما يمر → دفع مزدوج → فساد البيانات المالية.

**الحل:** استخدم advisory lock أو دالة Postgres ذرية:
```sql
CREATE OR REPLACE FUNCTION create_payment_atomic(
  p_student_id UUID, p_amount NUMERIC, p_school_id UUID, ...
) RETURNS payments AS $$
DECLARE
  v_student students%ROWTYPE;
  v_payment payments%ROWTYPE;
BEGIN
  SELECT * INTO v_student FROM students WHERE id = p_student_id FOR UPDATE;
  IF v_student.remaining_fee <= 0 THEN
    RAISE EXCEPTION 'No remaining fee';
  END IF;
  INSERT INTO payments (...) VALUES (...) RETURNING * INTO v_payment;
  RETURN v_payment;
END;
$$ LANGUAGE plpgsql;
```

---

### C-4. تعارض أسماء الأدوار بين RLS وقيد CHECK

**الخطورة:** 🔴 Critical
**الفئة:** Database
**المصدر:** 2-A Database Audit

**السبب:** سياسات RLS على الجداول الحساسة (students, payments, expenses, salaries, attendance) تفحص أدوار `group_admin` و `branch_admin`. لكن قيد CHECK على `user_profiles.role` يسمح فقط بـ: `super_admin`, `admin`, `manager`, `accountant`, `owner`, `employee`.

**التأثير:** إذا لم يُعدَّل قيد CHECK ليشمل الأدوار الجديدة، فلن يمر أي مستخدم غير super_admin عبر سياسات RLS → حرمان من الوصول أو تجاوز عبر السياسات القديمة.

**التحقق:**
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass AND contype = 'c';
```

**الحل:** حدِّث قيد CHECK ليشمل `group_admin` و `branch_admin`، أو أزل السياسات الدقيقة إذا كان التطبيق يعتمد فقط على الأدوار القديمة.

---

### C-5. سياسات RLS مزدوجة تتجاوز عزل الفروع

**الخطورة:** 🔴 Critical
**الفئة:** Database / Security
**المصدر:** 2-A Database Audit

**السبب:** جدول `students` (وغيره) لديه سياستان:
1. `tenant_select_policy` (من database_setup.sql) — تفحص `school_id` فقط (بدون branch)
2. `students_select` (من fix_rls_policies.sql) — تفحص `school_id` + `branch_id`

PostgreSQL RLS permissive: إذا أي سياسة تسمح → الصف مرئي.

**التأثير:** `branch_admin` يمكنه رؤية جميع طلاب المدرسة (وليس فرعه فقط) لأن tenant_select_policy تمرره.

**الحل:** إما احذف tenant policies القديمة من الجداول التي لها سياسات دقيقة، أو اجعلها RESTRICTIVE:
```sql
ALTER POLICY tenant_select_policy ON students USING (...) AS RESTRICTIVE;
```

---

### C-6. طبقة Prisma/Core API ميتة لكنها قابلة للوصول

**الخطورة:** 🔴 Critical
**الفئة:** Security / Code Quality
**الملف:** `lib/prisma.ts`

**السبب:** `lib/prisma.ts` يُرجع Proxy يحل كل استدعاء إلى `Promise.resolve(null)`. جميع routes في `/api/core/*` تستورده — كل query تُرجع null، كل mutation لا تفعل شيئاً.

**التأثير:** 17 endpoint مكشوفة في الإنتاج تُرجع بيانات فارغة أو تفشل بصمت. مع المفتاح المكشوف (C-1)، يمكن للمهاجم الوصول لها.

**الحل:** أضف guard يمنع الوصول:
```typescript
// في كل /api/core/*/route.ts أو عبر middleware:
export async function GET() {
  return NextResponse.json({ error: "Endpoint disabled" }, { status: 410 });
}
```
أو احذف routes `/api/core/*` بالكامل إذا لم تُستخدم.

---

### C-7. `managed_user_credentials` بدون RLS

**الخطورة:** 🔴 Critical
**الفئة:** Database
**المصدر:** 2-A Database Audit

**السبب:** الجدول يحتوي على كلمات مرور مشفرة (hashes) ومعرفات تسجيل دخول. لا يوجد RLS مُفعَّل ولا سياسات.

**التأثير:** أي مستخدم مصادق عليه يمكنه الاستعلام عن بيانات اعتماد جميع المدارس عبر Supabase client.

**التحقق:**
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'managed_user_credentials';
```

**الحل:** فعِّل RLS وأضف سياسات تقيد الوصول بـ school_id.

---

## 🟠 مشاكل عالية (High)

---

### H-1. مقارنة توقيع JWT غير آمنة زمنياً

**الملف:** `lib/services/jwt.ts:99`
```typescript
// Timing-safe comparison  ← التعليق كاذب!
return expectedSignatureEncoded === signatureEncoded;
```
**التأثير:** هجوم timing side-channel لاستنتاج التوقيع حرفاً بحرف.
**الحل:** استخدم `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))`.

### H-2. مقارنة كلمة المرور غير آمنة زمنياً

**الملف:** `lib/services/password.ts:43`
```typescript
resolve(newHash === originalHash);
```
**الحل:** نفس الحل — `crypto.timingSafeEqual`.

### H-3. لا يوجد CSP — middleware.ts مفقود

**الملف:** لا يوجد `middleware.ts` في جذر المشروع
**التأثير:** لا Content-Security-Policy → XSS يُنفَّذ بلا قيود. لا session refresh على التنقل.
**الحل:** أنشئ `middleware.ts` مع CSP headers ونonces.

### H-4. لا يوجد rate limiting على التسجيل

**الملف:** `app/api/auth/register/route.ts`
**التأثير:** إنشاء حسابات غير محدود، user enumeration عبر 409 response.
**الحل:** أضف `enforceRateLimit` بـ 3 محاولات / 10 دقائق.

### H-5. لا يوجد rate limiting على تغيير كلمة المرور

**الملف:** `app/api/auth/change-password/route.ts`
**التأثير:** brute-force لكلمة المرور الحالية.
**الحل:** أضف rate limiting بـ 5 محاولات / 15 دقيقة.

### H-6. Rate limiting يفشل مفتوحاً

**الملف:** `lib/rate-limit.ts:455`
```typescript
const productionFailureMode = options.productionFailureMode ?? "fail-open";
```
**التأثير:** عند تعطل Redis، جميع rate limits تختفي.
**الحل:** غيِّر الافتراضي إلى `"fail-closed"` لنقاط auth على الأقل.

### H-7. نظام JWT المزدوج — المسار القديم نشط

**الملفات:** `lib/services/jwt.ts` + `lib/middleware/auth-middleware.ts`
**التأثير:** `/api/core/*` تستخدم JWT بالمفتاح المكشوف. `/api/web/*` تستخدم RBAC Cookie الآمن.
**الحل:** عطِّل أو أزل مسار JWT القديم.

### H-8. Dashboard يستخدم service_role_key متجاوزاً RLS

**الملف:** `app/api/web/dashboard/overview/route.ts:181`
**التأثير:** إذا كان هناك خطأ في فلترة التطبيق، تظهر بيانات جميع الفروع.
**الحل:** استخدم `actorSupabase` (user-scoped) بدلاً من service_role لاستعلامات البيانات.

### H-9. branchIds فارغة = لا فلتر على الفروع

**الملف:** `lib/branch-scope.ts:82-86`
```typescript
if (branchScope.branchIds.length > 0) {
  return scoped.in(column, branchScope.branchIds);
}
return query; // ← لا فلتر!
```
**التأثير:** مستخدم بـ allowedBranchIds فارغة يرى بيانات كل الفروع.
**الحل:** ارفض الوصول لغير super_admin عند branchIds فارغة.

### H-10. resolveBranchScope يتخطى الفحص عند actorBranchIds فارغة

**الملف:** `lib/branch-scope.ts:39-40`
```typescript
if (actorBranchIds.length > 0 && !actorBranchIds.includes(...))
```
**التأثير:** مستخدم بدون فروع مُعيَّنة يصل لأي فرع عبر requestedBranchId.

### H-11. Login يكشف وجود البريد الإلكتروني

**الملف:** `app/api/auth/login/route.ts:112-166`
**التأثير:** رموز خطأ مختلفة (401 vs 403) تكشف وجود حساب.
**الحل:** أرجع نفس رمز الخطأ العام لجميع حالات الفشل.

### H-12. دوال التقارير تشمل دفعات محذوفة

**الملفات:** `school_reports_summary`, `school_payments_summary`, `school_payment_students_page`
**التأثير:** التقارير تُظهر أرقام مبالغ فيها لأن `deleted_at IS NULL` مفقود.
**الحل:** أضف `AND deleted_at IS NULL` لكل queries الدفعات في هذه الدوال.

### H-13. `loadStudentPaymentRows` لا يُفلتر deleted_at

**الملف:** `lib/payments-server.ts:23-48`
**التأثير:** `recomputeStudentPaidFee` يشمل دفعات محذوفة في الحساب.

### H-14. `selectProfileCompat` — 16 استعلام متتابع

**الملف:** `lib/authorization/snapshot.ts:178-206`
**التأثير:** حتى 16 round-trip لقاعدة البيانات عند كل login/session refresh.
**الحل:** استعلم عن الأعمدة المتاحة مرة واحدة، ثم ابنِ SELECT واحد.

### H-15. IP spoofing عبر X-Forwarded-For

**الملف:** `lib/rate-limit.ts:173`
**التأثير:** المهاجم يتجاوز rate limits بتغيير header.
**الحل:** استخدم `req.ip` أو `x-real-ip` على Vercel.

### H-16. `Math.random()` لتوليد كلمات مرور مؤقتة

**الملف:** `lib/services/password.ts:58`
**التأثير:** كلمات مرور قابلة للتنبؤ.
**الحل:** استخدم `crypto.randomBytes()`.

---

## 🟡 مشاكل متوسطة (Medium)

---

### M-1. `registrationNumber` فريد عالمياً (يجب أن يكون per-school)

**الملف:** `prisma/schema.prisma` — Student model
**التأثير:** مدرسة B لا تستطيع استخدام نفس رقم تسجيل مدرسة A.
**الحل:** `@@unique([schoolId, registrationNumber])`.

### M-2. نسيان كلمة المرور يُخزن البريد بدون تشفير في Redis

**الملف:** `app/api/auth/forgot-password/route.ts:31`
**الحل:** استخدم `buildAuthRateLimitIdentifier` مثل Login.

### M-3. Audit logging من client-side قابل للتلاعب

**الملف:** `lib/audit.ts`
**التأثير:** مستخدم خبيث يمنع أو يزوّر سجلات التدقيق لعمليات super-admin.
**الحل:** انقل كل استدعاءات `logAction` إلى `writeAuditLog` (server-side).

### M-4. RestrictedLayout مُثبَّت على RTL

**الملف:** `components/RestrictedLayout.tsx:29`
```tsx
<div dir="rtl">
```
**التأثير:** المستخدم الإنجليزي يرى layout معكوس.

### M-5. صفحة الخطأ بالعربي فقط

**الملف:** `components/ui/feature-error-fallback.tsx`
**التأثير:** مستخدم إنجليزي لا يفهم رسائل الخطأ.

### M-6. المصروفات بدون فحص صلاحيات دقيق

**الملف:** `app/[locale]/expenses/page.tsx`
**التأثير:** أي employee يستطيع إضافة/تعديل/حذف مصروفات بدون `can("add_expenses")`.

### M-7. Core API بدون multi-branch scope

**الملف:** `app/api/core/students/route.ts:181`
**التأثير:** إذا `authContext.branchId` فارغ، لا فحص فرع.

### M-8. زر حذف الطالب بدون حالة loading

**الملف:** `app/[locale]/students/_components/DeleteConfirmModal.tsx`
**التأثير:** double-click أثناء API call بطيء.

### M-9. Payment delete يكشف تفاصيل خطأ DB

**الملف:** `app/api/web/payments/records/[paymentId]/route.ts:109-117`
**الحل:** أرجع رسالة عامة، سجِّل التفاصيل server-side.

### M-10. Logger يكتب على filesystem — يفشل على Vercel

**الملف:** `lib/logger.ts:78-86`
**التأثير:** صفر سجلات طلبات في الإنتاج.
**الحل:** استخدم `console.log` المنظم (Vercel log drain) أو Sentry breadcrumbs.

### M-11. In-memory cache بدون حد حجم

**الملف:** `lib/server-cache.ts`
**الحل:** أضف حد أقصى مع LRU eviction.

### M-12. Cache لا يُبطَل عند تعديل الطلاب

**الملف:** Student mutation endpoints
**التأثير:** طالب جديد لا يظهر حتى 5 دقائق.

### M-13. نسيان كلمة المرور يكشف وجود البريد

**الملف:** `app/api/auth/forgot-password/route.ts`
**الحل:** أرجع `{ ok: true }` دائماً.

### M-14. RBAC DELETE بدون فحص auth

**الملف:** `app/api/rbac/session/route.ts:124-137`
**التأثير:** محدود بسبب sameSite=lax.

---

## 🟢 مشاكل بسيطة (Low)

---

### L-1. لا يوجد constraint يمنع الدفع الزائد في DB
### L-2. فهرس جزئي مفقود على payments(deleted_at IS NULL)
### L-3. حساب paid_fee مكرر في trigger + application
### L-4. /api/ping يكشف timestamp الخادم
### L-5. debug endpoints في الإنتاج (محمية بأدوار)
### L-6. ProtectedRoute يُظهر شاشة فارغة أثناء التحميل
### L-7. 3 أخطاء lint في attendance page
### L-8. ioredis في package.json لكن غير مستخدم

---

## ✅ نقاط قوة المشروع

| المكوّن | الحالة |
|---------|--------|
| RBAC Cookie System | ممتاز — httpOnly, secure, sameSite, timing-safe, production guard |
| RLS Policies (الحديثة) | جيد — 20 سياسة على 5 جداول حساسة |
| Double Payment Fix | ممتاز — trigger SUM-based idempotent مع backfill |
| إزالة كلمات المرور النصية | ✅ تم |
| التحقق من رفع الملفات | ممتاز — magic bytes + حجم + sanitization |
| Zod Validation | جيد — 11+ schema تغطي المدخلات |
| لا يوجد dangerouslySetInnerHTML | ✅ نظيف |
| 97 ملف اختبار | جيد — تغطية واسعة |
| Sentry مع إخفاء PII | ✅ |
| أزرار الحفظ محمية من double-submit | ✅ |
| Responsive design + RTL sidebar | ✅ |
| Health endpoints محمية بـ token | ✅ |
| Upload validation (magic bytes) | ✅ |
| Audit logs append-only (DB triggers) | ✅ |

---

## 📋 خطة التنفيذ

### المرحلة 1 — الأسبوع الأول: إصلاحات حرجة (C-1 → C-7)

| # | المهمة | الجهد |
|---|--------|-------|
| C-1 | إضافة production guard لـ JWT_SECRET | 30 دقيقة |
| C-2 | تغيير cache-strategies إلى `public: false` | 15 دقيقة |
| C-3 | إنشاء دالة دفع ذرية في Postgres | 3 ساعات |
| C-4 | تحقق من قيد CHECK وتحديثه | 1 ساعة |
| C-5 | حذف أو تحويل tenant policies القديمة إلى RESTRICTIVE | 2 ساعة |
| C-6 | تعطيل /api/core/* endpoints | 1 ساعة |
| C-7 | تفعيل RLS على managed_user_credentials | 1 ساعة |

### المرحلة 2 — الأسبوع الثاني: تحسينات أمان (H-1 → H-16)

| # | المهمة | الجهد |
|---|--------|-------|
| H-1,2 | إصلاح timing-safe comparison في jwt.ts وpassword.ts | 30 دقيقة |
| H-3 | إنشاء middleware.ts مع CSP | 3 ساعات |
| H-4,5 | إضافة rate limiting لـ register + change-password | 30 دقيقة |
| H-6 | تغيير fail-open الافتراضي إلى fail-closed | 15 دقيقة |
| H-7 | تعطيل مسار JWT القديم | 2 ساعة |
| H-8 | استبدال service_role بـ actorSupabase في dashboard | 2 ساعة |
| H-9,10 | إضافة guard لـ empty branchIds | 1 ساعة |
| H-11 | توحيد رسائل خطأ Login | 30 دقيقة |
| H-12,13 | إضافة deleted_at IS NULL لدوال التقارير | 1 ساعة |
| H-14 | تبسيط selectProfileCompat | 3 ساعات |
| H-15 | استخدام x-real-ip بدل x-forwarded-for | 15 دقيقة |
| H-16 | استخدام crypto.randomBytes | 15 دقيقة |

### المرحلة 3 — الأسبوع 3-4: أداء + واجهة (M-1 → M-14)

- إصلاح RTL ولغة صفحات الخطأ
- إضافة فحص صلاحيات المصروفات
- استبدال filesystem logger
- إضافة cache invalidation للطلاب
- توحيد toast vs inline alerts
- إضافة loading state لأزرار الحذف

### المرحلة 4 — الأسبوع الخامس: اختبارات + مراقبة

- اختبارات سلبية لعزل الفروع
- اختبار race condition في الدفع
- اختبار RBAC session forgery
- إضافة coverage threshold في vitest.config.ts
- نقل audit logging إلى server-side
- إزالة @ts-nocheck تدريجياً (بدءاً بـ isolated-prisma.ts)

---

## ملاحظات ختامية

1. **الأولوية القصوى:** C-1 (JWT secret) + C-2 (cache public) + C-6 (core API) — يمكن إصلاحها في ساعة واحدة وتغلق أكبر ثغرات.
2. **النظام الحديث (RBAC + Supabase) آمن بشكل عام** — المشاكل الحرجة تأتي من الطبقة القديمة (JWT + Prisma stub).
3. **RLS يحتاج تنظيف** — السياسات المزدوجة خطيرة لأن PostgreSQL يعامل permissive policies بـ OR.
4. **17 ملف @ts-nocheck** — هذا دين تقني يجب سداده لمنع أخطاء صامتة في كود الأمان.
