# تقرير شامل عن موقع School App

تاريخ المراجعة: 2026-04-03

## 1. الملخص التنفيذي

المشروع هو لوحة ويب إدارية متعددة المدارس مبنية على Next.js 16 + Supabase، وتغطي إدارة المدرسة، الطلاب، المدرسين، المدفوعات، الرواتب، التقارير، الإشعارات، والمراقبة. هذا الفرع ليس تطبيقاً عاماً للمستخدم النهائي؛ بل هو طبقة الإدارة والـ API والمنطق المشترك مع قاعدة البيانات.

في هذه الجولة تم تنفيذ إصلاحات فعلية على النقاط الحرجة الموجودة في الكود الحالي:

- نقل تسجيل الدخول إلى مسار خادمي محدود المعدل مع رسائل فشل غير كاشفة للتفاصيل.
- إضافة تحقق `zod` في مسارات الدخول الحرجة بدلاً من الاعتماد على parsing حر.
- معالجة اتساق الدفعات على مستوى قاعدة البيانات عبر trigger يعيد حساب `paid_fee` و `remaining_fee` تلقائياً.
- منع تكرار الرواتب المتزامن عبر deduplication + unique index على `(school_id, teacher_id, month)`.
- تقليل تسريب رسائل أخطاء Supabase في المسارات التي تم لمسها.
- تقوية سر جلسة RBAC في التطوير بحيث لا يعود fallback إلى سر JWT نفسه.

## 2. ما هو الموقع فعلياً

الدليل في [README.md](./README.md) يوضح أن هذا المستودع مخصص لـ:

- واجهة إدارة الويب.
- منطق الـ backend المشترك عبر `app/api/` و `lib/`.
- ترحيلات قاعدة البيانات وملفات RLS.

الصفحات الرئيسية الموجودة حالياً:

- تسجيل الدخول.
- Dashboard.
- Students.
- Teachers.
- Payments.
- Salaries.
- Reports.
- Attendance.
- Monitoring.
- Fee Notifications.
- Schools / Subscriptions.
- Super Admin.
- Users / Access Denied / Subscription Expired.

الأدوار الإدارية الظاهرة في الكود:

- `super_admin`
- `admin`
- `employee`

كما توجد حسابات مُدارة من داخل النظام للطلاب والمدرسين.

## 3. البنية التقنية

### الواجهة

- Next.js App Router.
- صفحات متعددة اللغة تحت `app/[locale]`.
- RTL/LTR مع `next-intl`.
- الجلسة تعتمد على Supabase SSR Browser Client وليس على تخزين توكنات مخصص داخل التطبيق.

### الخادم والـ API

- مسارات API ضمن `app/api/**`.
- التحقق من الصلاحيات يتم عبر `resolveSchoolScopedActorContext` و `routeUserHasPermission`.
- يوجد مسار RBAC Cookie منفصل للتطبيق الإداري.

### قاعدة البيانات

- Supabase / PostgreSQL.
- migrations متعددة خاصة بالفهارس، الحسابات المُدارة، الملخصات، والأرشفة.
- توجد إشارات واضحة إلى RLS وtenant scoping في المستودع و`SECURITY.md`.

### طبقة الحماية على الحافة

- الملف `proxy.ts` يضيف CSP ديناميكي مع nonce وهيدرّات حماية مثل `X-Frame-Options` و`Referrer-Policy` و`X-Content-Type-Options`.
- هذا دليل مضاد لفكرة أن المشروع يفتح CORS بشكل شامل؛ لم أجد `origin: true` أو middleware يفتح الـ API لأي origin في هذا الفرع.

## 4. مقارنة مباشرة مع النقاط التي ذكرتها

### 4.1 مشاكل تم تأكيدها وإصلاحها

#### F1. غياب gate خادمي حقيقي لمحاولات تسجيل الدخول

قبل التعديل كانت صفحة الدخول تستدعي `supabase.auth.signInWithPassword` مباشرة من المتصفح في [app/[locale]/login/page.tsx:38-106] قبل التعديل.

تم الإصلاح عبر:

- إضافة مسار جديد [app/api/auth/login/route.ts:48-194].
- إضافة rate limit على المحاولات [app/api/auth/login/route.ts:56-64].
- جعل الأخطاء المرجعة منطقية (`invalid_credentials`, `inactive_account`, `server_config`) بدلاً من تمرير رسائل Supabase كما هي [app/api/auth/login/route.ts:23-35].
- تحويل صفحة الدخول لاستخدام هذا المسار الخادمي [app/[locale]/login/page.tsx:43-105].

#### F2. ضعف التحقق المنهجي من المدخلات في المسارات الحرجة

كان التحقق في بعض المسارات يعتمد على parsing يدوي بسيط. تم إنشاء ملف schemas مركزي جديد:

- [lib/api-schemas.ts:69-120]

ويشمل:

- `loginRequestSchema`
- `createPaymentSchema`
- `deletePaymentSchema`
- `salaryPaymentSchema`
- `dashboardOverviewQuerySchema`

وتم ربطه بـ:

- [app/api/auth/login/route.ts:48-54]
- [app/api/web/payments/records/route.ts:9-26]
- [app/api/web/payments/records/[paymentId]/route.ts:13-19]
- [app/api/web/salaries/pay/route.ts:9-24]
- [app/api/web/dashboard/overview/route.ts:19-27]

#### F3. Race condition في الدفعات

المسار القديم كان يُدخل الدفعة ثم يعيد حساب مجموع دفعات الطالب في التطبيق. هذه الآلية قابلة لمشاكل تنافسية تحت الضغط.

تم الإصلاح عبر migration جديدة:

- [migrations/20260403_000000_payment_consistency_and_salary_uniqueness.sql:3-75]

ما الذي أضافته:

- دالة `recompute_student_payment_totals`.
- Trigger على جدول `payments` بعد insert/update/delete.
- تحديث جماعي للحالة الحالية لكل الطلاب لحظة تطبيق migration.

كما تم تبسيط المسارات لتقرأ الرصيد بعد العملية بدلاً من إعادة الحساب في التطبيق:

- [app/api/web/payments/records/route.ts:97-130]
- [app/api/web/payments/records/[paymentId]/route.ts:78-112]

#### F4. Race condition / duplicate salary records

المسار القديم كان يحاول اكتشاف التكرار بعد الإدخال، ثم يحذف الصفوف الزائدة. هذا أسلوب تعافٍ متأخر وليس حماية صحيحة.

تم الإصلاح عبر:

- deduplication على البيانات الحالية + unique index في [migrations/20260403_000000_payment_consistency_and_salary_uniqueness.sql:77-96]
- تعديل مسار الرواتب ليعتبر `23505` تعارضاً طبيعياً ويرجع `409` بدل إجراء حذف لاحق [app/api/web/salaries/pay/route.ts:98-110]

#### F5. Error messages كانت تُرجع تفاصيل داخلية في بعض المسارات الحرجة

تمت إضافة helpers جديدة:

- [lib/route-utils.ts](./lib/route-utils.ts)

وتطبيقها في:

- login
- payments create/delete
- salaries pay
- dashboard overview

النتيجة:

- التفاصيل تذهب إلى `console.error` داخلياً.
- المستخدم يأخذ رسالة عامة وآمنة.

#### F6. ربط سر RBAC التطويري بسر JWT لم يعد مناسباً

في `lib/rbac-session.ts` كان هناك fallback إلى `SUPABASE_JWT_SECRET` في التطوير. هذا ليس نفس الشيء الذي ذكرتَه حرفياً (`dev_secret_change_me` غير موجود هنا)، لكنه مع ذلك coupling أمني غير مرغوب.

تم الإصلاح في:

- [lib/rbac-session.ts:20-48]

بحيث:

- الإنتاج يفرض `RBAC_COOKIE_SECRET`.
- التطوير يستخدم secret عابر ephemeral خاص بالعملية نفسها.

### 4.2 نقاط ذكرتها ولم أستطع إثباتها في هذا الفرع

#### N1. CORS مفتوح للكل

لم أجد أي إعداد من نوع `origin: true` أو `cors()` في هذا الفرع. الموجود فعلياً هو:

- headers/CSP في [proxy.ts:44-123]
- مسارات API same-origin داخل Next.js

لذلك هذه الملاحظة لا تنطبق على الكود الحالي كما هو.

#### N2. JWT secret افتراضي ثابت من نوع `dev_secret_change_me`

لم أجد هذه القيمة في المستودع الحالي. الأقرب لها كان fallback تطويري في `RBAC_COOKIE_SECRET` وقد تم تحسينه كما ذُكر أعلاه.

#### N3. SQL injection في backup عبر table name interpolation

لم أجد route backup/raw SQL بهذا الشكل في هذا الفرع. توجد export/archive APIs، لكن لا يوجد query خام يبني اسم جدول من الطلب بالشكل الذي وصفته.

#### N4. Token في `localStorage`

لم أجد تخزين auth token في `localStorage` داخل التطبيق.

الدليل:

- Supabase client يُنشأ عبر `createBrowserClient` في [lib/supabase.ts:1-21]
- الاستخدامات التي ظهرت لـ `localStorage` تخص branding فقط [lib/brand/palette.ts:213-229]
- والـ `sessionStorage` يستخدم للكاش والـ scope فقط [hooks/usePagedSupabaseList.ts:50-100] و [hooks/useSchoolScope.tsx:38-61]

بالتالي هذا البند لا ينطبق على هذا الفرع بصيغته الحالية.

### 4.3 نقاط كانت موجودة سابقاً لكنها مُعالجة جزئياً قبل هذه الجولة

#### P1. Pagination

الـ pagination موجودة فعلاً في بعض الواجهات الأساسية، مثلاً:

- [app/api/dashboard/users/route.ts:522-585]
- [hooks/usePagedSupabaseList.ts:12-120]

لذلك الملاحظة "لا توجد pagination نهائياً" ليست دقيقة لهذا الفرع.

#### P2. Dashboard ينفذ 5 queries منفصلة

الواجهة حالياً تستدعي endpoint واحداً للـ dashboard:

- [app/[locale]/dashboard/_hooks/useDashboardData.ts:38-64]

أما endpoint نفسه فينفذ 3 استعلامات رئيسية فقط داخل `Promise.allSettled`:

- الطلاب
- آخر الدفعات
- رسوم الصفوف

وذلك في [app/api/web/dashboard/overview/route.ts:57-83]

#### P3. لا توجد indexes على foreign keys

هذا صحيح جزئياً تاريخياً، لكنه ليس دقيقاً حالياً لأن هناك migrations موجودة بالفعل:

- [migrations/20260324_000000_reliability_performance_indexes.sql:1-23]
- [migrations/20260330_000000_add_missing_indexes.sql:1-10]

وقد أضفت فوقها قيد uniqueness جديداً للرواتب في migration 2026-04-03.

## 5. الملفات التي تغيّرت في هذه الجولة

- `app/api/auth/login/route.ts`
- `app/[locale]/login/page.tsx`
- `app/api/web/payments/records/route.ts`
- `app/api/web/payments/records/[paymentId]/route.ts`
- `app/api/web/salaries/pay/route.ts`
- `app/api/web/dashboard/overview/route.ts`
- `lib/api-schemas.ts`
- `lib/route-utils.ts`
- `lib/rate-limit.ts`
- `lib/rbac-session.ts`
- `migrations/20260403_000000_payment_consistency_and_salary_uniqueness.sql`
- `package.json`
- `package-lock.json`

## 6. تقييم الحالة الحالية بعد الإصلاح

### الأمن

أفضل من قبل هذه الجولة بشكل واضح، خصوصاً في:

- تسجيل الدخول.
- سلامة رسائل الفشل.
- اتساق الدفعات.
- منع ازدواج صرف الراتب.
- تقليل coupling بين أسرار RBAC وJWT.

### الأداء

الحالة متوسطة إلى جيدة:

- هناك pagination في أجزاء مهمة.
- توجد فهارس موجودة مسبقاً للمدفوعات والرواتب وبعض الجداول الرئيسية.
- الـ dashboard يستهلك endpoint واحد من الواجهة.

لكن ما زالت هناك فرص تحسين لاحقة، خصوصاً في بعض الـ tabs الثقيلة وqueries fallback الواسعة.

### الجودة الهندسية

المشروع منظم بوضوح من حيث boundaries:

- `app/[locale]` للويب.
- `app/api` للـ backend.
- `lib` للمنطق.
- `migrations` للبيانات.

لكن ما يزال هناك دين تقني واضح:

- warnings lint قديمة وكثيرة.
- مسارات طويلة وكبيرة جداً مثل `app/api/dashboard/users/route.ts`.
- لا توجد automated tests فعلية حالياً.

## 7. مخاطر متبقية يجب عدم تجاهلها

### R1. brute force على Supabase Auth ما زال يحتاج حماية عند المزود نفسه

رغم أن صفحة الويب الآن تمر عبر `/api/auth/login`، يبقى `NEXT_PUBLIC_SUPABASE_ANON_KEY` عاماً بطبيعته، وبالتالي يمكن نظرياً استهداف endpoint المصادقة في Supabase مباشرة من خارج التطبيق.

هذا يعني أن الحماية الكاملة تتطلب أيضاً واحداً أو أكثر من:

- إعدادات anti-abuse في Supabase Auth.
- CAPTCHA / bot protection.
- WAF / edge rate limiting.
- مراقبة login anomalies.

### R2. ما زالت هناك مسارات أخرى تعيد أخطاء داخلية مباشرة

المسارات التي لم ألمسها في هذه الجولة ما زال بعضها يرجع `error.message` من Supabase حرفياً، وأبرز مثال كبير يحتاج جولة ثانية:

- `app/api/dashboard/users/route.ts`

### R3. لا توجد اختبارات آلية تغطي السلوك الأمني أو التنافسي

هذا يجعل أي refactor لاحق عرضة لإرجاع نفس المشاكل.

### R4. تحذيرات lint الحالية ليست من هذه الجولة، لكنها مؤشر على تراكم technical debt

الـ `lint` مرّ بدون errors، لكن بعدد كبير من warnings القديمة.

## 8. التحقق الذي تم تشغيله

تم تنفيذ:

- `npm run typecheck` : ناجح
- `npm run lint` : ناجح مع تحذيرات قديمة موجودة مسبقاً
- `npm run build` : ناجح

## 9. الخطوات التالية الموصى بها

1. تطبيق migration الجديدة على Supabase قبل نشر الكود:
   - `migrations/20260403_000000_payment_consistency_and_salary_uniqueness.sql`

2. تنفيذ جولة ثانية مخصصة لتصفية أخطاء الـ API في المسارات غير المعدّلة:
   - خاصة `dashboard/users`, `archives`, `reports`

3. إضافة حماية خارج التطبيق لطبقة المصادقة:
   - Supabase anti-abuse
   - CAPTCHA
   - edge throttling

4. إضافة اختبارات على الأقل لـ:
   - login route
   - payment create/delete
   - salary duplicate protection
   - dashboard overview validation

5. تقسيم الملفات الكبيرة جداً في `app/api` و`lib` إلى وحدات أصغر وأسهل للمراجعة.

## 10. الخلاصة

الموقع حالياً منظم ويملك أساساً جيداً: App Router واضح، صلاحيات متعددة المدارس، طبقة API فعلية، وهيدرّات حماية على الحافة. المشاكل الأخطر الموجودة فعلاً في هذا الفرع كانت حول session/login hardening واتساق بيانات الدفعات والرواتب، وهذه تم معالجتها في هذه الجولة.

بالمقابل، بعض البنود التي ذكرتها لم تكن موجودة حرفياً في الكود الحالي، وكان الأصح هندسياً ألا أفرض إصلاحات عمياء عليها. لذلك هذا التقرير يفرّق بوضوح بين:

- ما كان موجوداً وتم إصلاحه فعلاً.
- ما لم أستطع إثباته في هذا الفرع.
- وما بقي كمخاطر تشغيلية أو تحسينات تالية.
