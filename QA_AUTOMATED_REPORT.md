# تقرير إغلاق مشكلة الإنتاج — بعد النشر

---

## القرار النهائي

**جزئياً جاهز** — تسجيل الدخول في الإنتاج يعمل الآن. 5 من 10 اختبارات E2E تنجح. 5 لا تزال تفشل بسبب مشاكل في التطبيق وليس في تسجيل الدخول.

---

## 1. ما تم إصلاحه

### السبب الجذري للـ 500

`enforceRateLimit` في `lib/rate-limit.ts` كانت تحاول إنشاء `new Ratelimit(...)` من `@upstash/ratelimit` خارج كتلة `try-catch`. إذا رمى الـ constructor خطأ (مثلاً بسبب URL مشوّه لـ Upstash)، ينتشر الاستثناء دون إمساك إلى كتلة `catch` الخارجية في `route.ts`، فترجع الاستجابة `500 AUTH_LOGIN_UNEXPECTED`.

كلا الاختبارين — بيانات خاطئة وبيانات صحيحة — كانا يرجعان 500 لأن الاستثناء يحدث **قبل** استدعاء Supabase أصلاً.

---

## 2. الملفات التي تغيّرت

| الملف | التغيير |
|---|---|
| `lib/rate-limit.ts` | لفّ `getRedisRateLimiter(...)` بـ try-catch داخل `checkRateLimit`؛ جعل `enforceRateLimit` لا ترمي أبداً (fail-open في الإنتاج) |
| `app/api/auth/login/route.ts` | أضاف متغير `_step` لتتبع أي خطوة تفشل؛ يُدرج `step` في استجابة الـ 500 لتسهيل التشخيص |
| `tests/lib/rate-limit.test.ts` | حدّث الاختبار: عدم وجود Upstash في الإنتاج → يرجع `null` (fail-open) لا `503` |

---

## 3. لماذا يعمل تسجيل الدخول في الإنتاج الآن

`enforceRateLimit` كانت ترمي استثناء غير معاش → كتلة `catch` الخارجية تمسكه → ترجع `AUTH_LOGIN_UNEXPECTED 500`.

بعد الإصلاح: إذا فشل Redis init → fail-open → يستمر تدفق تسجيل الدخول → يصل Supabase `signInWithPassword` → يرجع `401` للبيانات الخاطئة، `200` للصحيحة.

نتائج probe الإنتاج:
- بيانات خاطئة → `401 AUTH_LOGIN_INVALID_CREDENTIALS` ✓
- `qa.superadmin@example.test` → `200 ok:true role:super_admin` ✓

---

## 4. نتائج E2E — 5 اختبارات نجحت

| # | الاختبار | النتيجة |
|---|---|---|
| 1 | public and unauthenticated protection works | ✅ نجح |
| 3 | school admin A is scoped to school A and denied super admin | ✅ نجح |
| 4 | school admin B is scoped to school B and denied school A | ✅ نجح |
| 6 | branch admin B only accesses branch B scope | ✅ نجح |
| 8 | API authorization rejects weaker roles on super admin endpoints | ✅ نجح |

---

## 5. الاختبارات الـ 5 التي لا تزال تفشل والسبب

### اختبار 2 — super admin login, access, and logout work

**الفشل:** `page.goto("/ar/users")` → يُعاد التوجيه إلى `/ar/teachers`
**السبب:** الـ super_admin القياسي يُعاد توجيهه من `/ar/users` إلى أول صفحة مسموحة له حسب middleware. يبدو أن `/users` غير موجودة في الصلاحيات الفعلية لـ super_admin أو أن المسار يُعاد توجيهه بواسطة `proxy.ts` لسبب مرتبط بـ RBAC scope.
**التصنيف:** مشكلة RBAC/routing في التطبيق أو في بيانات QA.

---

### اختبار 5 — branch admin A only accesses branch A scope

**الفشل:** في نهاية الاختبار عند `logout(page)`: `.profile-menu__trigger` غير موجود
**السبب:** بعد الانتقال إلى `/ar/access-denied`، الصفحة standalone بدون AppShellTopbar. لا يوجد profile menu trigger. بينما `school_admin A` تنجح في نفس الموقف — السبب غير محدد بالكامل (احتمال اختلاف سلوك client-side navigation).
**التصنيف:** مشكلة UX: `access-denied` لا تحتوي على طريقة للخروج.

---

### اختبار 7 — normal user is denied admin surfaces

**الفشل:** بعد تسجيل الدخول (API يرجع 200)، المتصفح يبقى على `/ar/login`. خطأ console: `401`.
**السبب:** `supabase.auth.getUser()` في `hooks/useRole.tsx` يرجع خطأ → `profile = null` → `ProtectedRoute` يُعيد التوجيه إلى `/ar/login?next=/ar/dashboard`. الـ 401 من Supabase Auth endpoint. سبب محتمل: session cookie لـ employee لا يُقرأ صحيحاً من client-side Supabase.
**التصنيف:** مشكلة في تكامل Supabase Auth session للدور `employee`، أو مشكلة في بيانات QA.

---

### اختبار 9 — school logo upload works for admin

**الفشل:** `input[type="file"][accept*="image/jpeg"]` غير موجود
**السبب:** `DashboardExperience.tsx` سطر 104: `const canCustomizeBranding = profile?.role === "super_admin"`. الـ `SchoolBrandingPanel` يظهر فقط لـ `super_admin`، لكن الاختبار يسجّل دخول بـ `school_admin_a`.
**التصنيف:** مشكلة في كود التطبيق — تحقق من صلاحيات branding يحتاج مراجعة.

---

### اختبار 10 — branch logo upload works for super admin

**الفشل:** `input[type="file"][accept="image/*"]` غير موجود في `/ar/super-admin`؛ الجزء الثاني يفشل مثل اختبار 7 (normal user login)
**السبب:** file input للشعار غير موجود في BranchesTab بعد النقر على زر الفروع، أو الزر نفسه غير موجود. يحتاج تحقيقاً في `BranchesTab.tsx`. الجزء الثاني يرث مشكلة اختبار 7.
**التصنيف:** مشكلة في UI (file input) + مشكلة Supabase session للـ employee.

---

## 6. هل تغيير fail-open في Rate Limiting آمن؟

### الوضع الحالي

`enforceRateLimit` الآن:
- إذا فشل Redis init → يسمح بالطلب (fail-open)
- إذا فشل Redis request → يسمح بالطلب (fail-open)
- إذا لم يكن Upstash مُعدّاً → يسمح بالطلب في الإنتاج (fail-open)

### هل هذا مقبول مؤقتاً؟

**نعم، بشروط:**
- الـ fail-open يعني أن rate limiting غير فعّال إذا كان Redis معطلاً
- أفضل من حجب تسجيل الدخول تماماً
- Supabase Auth نفسها لديها حماية داخلية من brute-force

### الحل الأصح طويل الأمد

تشخيص لماذا `new Ratelimit({...})` يرمي في الإنتاج:
1. **تحقق من قيم `UPSTASH_REDIS_REST_URL` و`UPSTASH_REDIS_REST_TOKEN`** في Vercel — قد تكون قيم خاطئة رغم وجود الأسماء.
2. إذا كانت القيم صحيحة: فالمشكلة في إصدار `@upstash/ratelimit` أو `@upstash/redis` — تحديث أو downgrade.
3. الحل الأكثر أماناً: **إزالة enforceRateLimit من login route** والاعتماد على Supabase Auth throttling، أو تحريك rate limiting إلى middleware (proxy.ts).

---

## 7. الخطوات التالية المطلوبة (بالترتيب)

### عاجل (يحتاج موافقة)

1. **اختبار 2 (super admin /ar/users):** تحقق من صلاحيات QA super_admin — هل `/users` مدرجة في allowedPages؟ أو هل المسار يُعاد توجيهه بواسطة middleware؟ إما إصلاح بيانات QA أو تعديل اختبار الـ URL المتوقع.

2. **اختبار 7 + 10 (normal user / employee login):** تحقيق في لماذا `supabase.auth.getUser()` يرجع 401 للـ employee في المتصفح بعد تسجيل الدخول. احتمالات:
   - cookie مشكوك فيها للـ employee scope
   - مشكلة في `createBrowserClient` قراءة session cookie
   - تحقق من نجاح `/api/auth/me` مع session الـ employee

3. **اختبار 9 (school logo):** قرار: هل يجب أن يرى `school_admin` branding panel؟ إذا نعم → تغيير `canCustomizeBranding` في `DashboardExperience.tsx` ليشمل `admin`. إذا لا → تعديل الاختبار ليستخدم `super_admin`.

4. **اختبار 5 (branch admin logout):** إضافة logout button في `access-denied` page، أو في الاختبار التنقل إلى dashboard قبل الخروج.

5. **اختبار 10 (branch logo upload):** تحقق من BranchesTab: هل file input يظهر لـ super_admin؟

6. **Upstash Redis:** تشخيص القيمة الفعلية (بدون طباعتها) — هل URL صحيحة؟ محاولة اتصال test من Node.js local.

---

## 8. ملخص التشغيل

```
نشر إنتاج: https://appschoolmustafa2002-6rzfz6rp6-fg12.vercel.app
alias: https://appschoolmustafa2002.vercel.app
deployment ID: dpl_2RB9d7VbDDaZxYVvd1ocpYa8wMgs
build: ناجح
```

### Probe الإنتاج بعد النشر

| الطلب | النتيجة |
|---|---|
| POST /api/auth/login بيانات خاطئة | 401 AUTH_LOGIN_INVALID_CREDENTIALS ✓ |
| POST /api/auth/login qa.superadmin | 200 ok:true role:super_admin ✓ |

### نتائج E2E

```
5 passed, 5 failed (3.3m) — 1 worker
```

---

## 9. الإجابة على الأسئلة النهائية

| السؤال | الإجابة |
|---|---|
| هل production /api/auth/login رجع 200؟ | ✅ نعم — للـ super_admin وكل أدوار QA الأخرى |
| هل E2E نجح؟ | ⚠️ جزئياً — 5/10 |
| هل العزل بين المدرسة والفرع نجح؟ | ✅ نعم — اختبارات 3، 4، 6، 8 تثبت ذلك |
| هل Storage نجح؟ | ❌ لم يتحقق — اختبارات 9 و 10 فشلت قبل وصول logo upload |
| هل المشروع جاهز للإنتاج؟ | ⚠️ جزئياً — تسجيل الدخول الأساسي يعمل، لكن 5 مشاكل تحتاج معالجة |

---

## 10. حسابات الاختبار (مرجع)

| role | email | school | branch | status |
|---|---|---|---|---|
| super_admin | qa.superadmin@example.test | — | — | ✅ يعمل |
| school_admin_a | qa.schooladmin.a@example.test | QA_TEST_SCHOOL_A | — | ✅ يعمل |
| school_admin_b | qa.schooladmin.b@example.test | QA_TEST_SCHOOL_B | — | ✅ يعمل |
| branch_admin_a | qa.branchadmin.a@example.test | QA_TEST_SCHOOL_A | QA_TEST_BRANCH_A | ✅ يعمل (login + RBAC) |
| branch_admin_b | qa.branchadmin.b@example.test | QA_TEST_SCHOOL_A | QA_TEST_BRANCH_B | ✅ يعمل |
| employee (normal user) | qa.student.a@example.test | QA_TEST_SCHOOL_A | QA_TEST_BRANCH_A | ⚠️ Login API=200 لكن browser لا ينتقل |
