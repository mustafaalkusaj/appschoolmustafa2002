# برومت الاختبار الشامل — تطبيق المدرسة (school-app)

> **الهدف:** اختبار كل شيء في التطبيق — كل وحدة، كل API، كل صفحة، كل تدفق، كل عزل، كل ربط — بشكل معزول ومنظم.

---

## التعليمات العامة

أنت مطور اختبارات محترف. مطلوب منك كتابة وتنفيذ مجموعة اختبارات شاملة لتطبيق إدارة مدارس مبني بـ Next.js 16 + Supabase + Prisma + TypeScript.

**البيئة:**
- Unit tests: Vitest (`pnpm test`)
- E2E tests: Playwright (`pnpm test:e2e`)
- Type checking: `pnpm typecheck`
- الملفات في: `tests/` (unit) و `tests/e2e/` (e2e)
- Config: `vitest.config.ts` + `playwright.config.ts`
- الـ alias: `@/` → root

**أنماط الكتابة المتبعة:**
- Unit: `vi.mock()` + `vi.hoisted()` لعزل الوحدات
- E2E: Playwright مع `storageState` للـ auth
- اللغة الافتراضية: عربي (`/ar/`)
- كل mock يكون مستقل ومعزول تماماً

---

## الجزء 1: اختبارات الوحدات (Unit Tests — Vitest)

### 1.1 المصادقة والصلاحيات (Auth & RBAC)

```
ملف: tests/auth-rbac-comprehensive.test.ts

اختبر التالي:

□ تسجيل الدخول:
  - نجاح تسجيل الدخول بإيميل وباسوورد صحيحين → يرجع cookie + redirect
  - فشل بإيميل خطأ → 401 مع رسالة خطأ عربية
  - فشل بباسوورد خطأ → 401
  - إيميل فاضي أو غير صالح → 400 validation error
  - Rate limiting: بعد 5 محاولات فاشلة → 429
  - حساب معطل (isActive: false) → 403
  - حساب بدون مدرسة → خطأ مناسب
  - حساب بدون فرع → خطأ مناسب
  - حساب اشتراك منتهي → redirect لصفحة subscription-expired

□ RBAC Session:
  - بناء الـ payload: يحتوي userId, role, permissions, schoolId, branchId
  - توقيع الـ session: HMAC صحيح مع RBAC_COOKIE_SECRET
  - التحقق من الـ session: توقيع صالح → يرجع البيانات
  - session منتهي الصلاحية (8 ساعات) → يرفض
  - session بتوقيع خطأ → يرفض
  - الـ version field: v1, v2, v3 → backward compatibility

□ الأدوار والصلاحيات:
  - super_admin: وصول كامل لكل شيء
  - admin: وصول لمدرسته فقط
  - employee: وصول محدود حسب الصلاحيات
  - isSinglePageUser: يرى صفحة واحدة فقط
  - Deep permissions (5 مستويات): module → section → page → action → field
  - hierarchyLevel: مستخدم بمستوى 3 لا يرى مستخدمين بمستوى 1 أو 2

□ Mobile Auth (JWT):
  - إنشاء JWT token صالح
  - التحقق من JWT: صالح → يرجع user data
  - JWT منتهي → 401
  - JWT بدون Bearer prefix → 401
  - requireAuth middleware: بدون token → 401
  - requireRole middleware: role غير مسموح → 403
  - requireBranchAccess: فرع غير مسموح → 403
```

### 1.2 عزل المدارس والفروع (School & Branch Isolation)

```
ملف: tests/isolation-comprehensive.test.ts

اختبر التالي:

□ عزل المدرسة:
  - مدير مدرسة A لا يرى طلاب مدرسة B
  - مدير مدرسة A لا يرى مصروفات مدرسة B
  - مدير مدرسة A لا يرى رواتب مدرسة B
  - مدير مدرسة A لا يرى إيرادات مدرسة B
  - مدير مدرسة A لا يرى معلمين مدرسة B
  - super_admin يقدر يوصل لأي مدرسة
  - تغيير school_id في الطلب → يرفض (لغير super_admin)

□ عزل الفرع (داخل نفس المدرسة):
  - مستخدم فرع A لا يرى بيانات فرع B
  - مستخدم بعدة فروع [A,C] لا يرى فرع B
  - resolveBranchScope: فرع غير مسموح → {ok: false, status: 403}
  - resolveBranchScope: فرع مسموح → {ok: true, branchIds: [...]}
  - resolveBranchScope: بدون فرع محدد → يرجع كل الفروع المسموحة
  - group_admin: يرى كل الفروع في مدرسته

□ مستخدم واحد - مدارس متعددة:
  - resolveSchoolScopedActorContext يرفض school_id مختلف عن school المستخدم
  - super_admin يمرر school_id مختلف → ينجح
```

### 1.3 إدارة الطلاب (Students)

```
ملف: tests/students-comprehensive.test.ts

اختبر التالي:

□ محرك الاستيراد (Import Engine):
  - ملف Excel صالح → يرجع بيانات محللة صحيحة
  - ملف بأعمدة ناقصة → خطأ validation واضح
  - ملف بأرقام تسجيل مكررة → يكتشف التكرار (dedup)
  - ملف بفصول غير موجودة → خطأ مع أسماء الفصول
  - ملف فاضي → خطأ مناسب
  - ملف بصيغة خطأ (ليس Excel) → خطأ مناسب
  - حقول عربية (اسم الطالب بالعربي) → يقبل
  - أرقام هواتف بصيغ مختلفة → normalization صحيح
  - استيراد 500+ طالب → يشتغل بدون timeout

□ حالات الطالب (Status):
  - active → inactive: ينجح
  - active → transferred: ينجح
  - active → graduated: ينجح
  - inactive → active: إعادة تفعيل تنجح
  - graduated → active: ما ينفع (أو حسب القاعدة)
  - تغيير الحالة يُسجل في audit log

□ الترقية السنوية (Year Promotion):
  - ترقية طلاب فصل → ينتقلون للفصل التالي
  - طالب بحالة inactive → ما يترقى
  - ترقية لسنة أكاديمية غير موجودة → خطأ
  - الحسابات المالية تنتقل مع الطالب

□ المالية (Student Financials):
  - حساب الرصيد: مجموع المدفوعات - مجموع الرسوم
  - طالب بدون دفعات → رصيد = -الرسوم
  - طالب دفع كل شيء → رصيد = 0
  - طالب دفع أكثر → رصيد موجب
```

### 1.4 النظام المالي (Financial System)

```
ملف: tests/financial-comprehensive.test.ts

اختبر التالي:

□ المدفوعات (Payments):
  - إنشاء دفعة لطالب → ينجح + يُحدث الرصيد
  - دفعة بمبلغ سالب → يرفض
  - دفعة بمبلغ 0 → يرفض
  - دفعة لطالب غير موجود → 404
  - دفعة لطالب في مدرسة أخرى → 403
  - قائمة المدفوعات مع فلاتر (تاريخ، فصل، حالة)
  - تصدير Excel: البيانات مطابقة
  - أرشفة المدفوعات القديمة

□ المصروفات (Expenses):
  - إنشاء مصروف مع نوع → ينجح
  - مصروف بدون نوع → validation error
  - مصروف بتاريخ مستقبلي → ينجح (أو يرفض حسب القاعدة)
  - قائمة المصروفات مع فلاتر
  - مجموع المصروفات لفترة معينة

□ الإيرادات (Incomes):
  - إنشاء إيراد مع نوع → ينجح
  - أنواع الإيرادات: CRUD كامل
  - مجموع الإيرادات لفترة معينة

□ الرواتب (Salaries):
  - إنشاء كشف رواتب شهري → ينجح
  - حساب الراتب: الأساسي - الخصومات + البدلات
  - خصومات الراتب: حساب صحيح (salary-effective-deductions)
  - دفع الرواتب: حالة pending → approved → paid
  - دفع راتب مدفوع مسبقاً → يرفض
  - المحاضرات (lectures): حساب إضافي على الراتب
  - السلف (advances): خصم من الراتب
  - كشف رواتب لموظف غير موجود → خطأ

□ الميزانيات (Budgets):
  - إنشاء ميزانية لفترة → ينجح
  - تتبع الصرف مقابل الميزانية
  - تنبيه عند تجاوز الميزانية
```

### 1.5 الحضور والغياب (Attendance)

```
ملف: tests/attendance-comprehensive.test.ts

اختبر التالي:

□ تسجيل الحضور:
  - تسجيل حضور طالب ليوم → ينجح
  - تسجيل مكرر لنفس الطالب ونفس اليوم → يحدث (upsert) ولا يكرر
  - حالات: present, absent, excused, late
  - تسجيل حضور لطالب غير نشط → يرفض أو تحذير
  - تسجيل حضور بتاريخ مستقبلي → يرفض

□ استعلامات:
  - نسبة حضور طالب لفترة معينة
  - نسبة حضور فصل ليوم
  - تصدير بيانات الحضور Excel
  - فلترة بالتاريخ والفصل والحالة
```

### 1.6 الدرجات والتقييم (Grades)

```
ملف: tests/grades-comprehensive.test.ts

اختبر التالي:

□ إدخال الدرجات:
  - إدخال درجة لطالب في مادة → ينجح
  - درجة أعلى من الحد الأقصى → يرفض
  - درجة سالبة → يرفض
  - نظام التقييم المرن (flexible entry)

□ حساب المعدلات:
  - حساب معدل الطالب من درجاته
  - الشارات (badges) بناءً على الأداء
  - تحليل AI (Anthropic SDK): at-risk detection
  - تقرير الطالب PDF (report card)

□ مخططات التقييم (Grade Schemes):
  - إنشاء مخطط تقييم → ينجح
  - ربط مخطط بفصل → ينجح
  - تعديل مخطط مستخدم → ينجح مع audit
```

### 1.7 الإشعارات (Notifications)

```
ملف: tests/notifications-comprehensive.test.ts

اختبر التالي:

□ إشعارات داخلية (In-App):
  - إرسال إشعار لمستخدم → يظهر في قائمته
  - تحديد كمقروء → ينجح
  - إعلان عام (announcement) → يصل لكل المستخدمين المستهدفين

□ Telegram Bot:
  - أوامر: /start, /help, /finance, /schools
  - أمر مالي → يرجع ملخص مالي
  - أمر غير معروف → رسالة مساعدة
  - Webhook verification → يقبل فقط من Telegram

□ WhatsApp:
  - إرسال إشعار WhatsApp → يستدعي API بشكل صحيح
  - فشل الإرسال → يسجل الخطأ ولا يوقف التطبيق
```

### 1.8 العمليات والمراقبة (Ops & Monitoring)

```
ملف: tests/ops-comprehensive.test.ts

اختبر التالي:

□ Health Checks:
  - /api/health → 200 + status ok
  - /api/ping → 200
  - /api/ops/health-check → معلومات مفصلة
  - /api/ops/deepcheck → فحص عميق (DB, Redis, etc.)

□ Error Capture:
  - التقاط خطأ client → يسجل في Sentry
  - التقاط خطأ server → يسجل في Sentry
  - خطأ بدون stack trace → يعالج بدون crash

□ Rate Limiting:
  - enforceRateLimit: تحت الحد → يمر
  - enforceRateLimit: فوق الحد → يرفض مع 429
  - buildAuthRateLimitIdentifier: يبني identifier فريد من IP + email hash
  - normalizeRateLimitEmail: يوحد صيغة الإيميل

□ Audit Logs:
  - إنشاء سجل → ينجح مع timestamp
  - يحفظ oldValues و newValues
  - فلترة بالمستخدم والتاريخ والإجراء

□ التقارير الآلية:
  - daily-report: يولد تقرير يومي
  - weekly-report: يولد تقرير أسبوعي
  - التقارير ترسل عبر Telegram
```

### 1.9 مكتبات مساعدة (Library Functions)

```
ملف: tests/lib-comprehensive.test.ts

اختبر التالي:

□ Email Service:
  - إرسال بيانات صحيحة → ينجح
  - إيميل فارغ → يرفض
  - Template rendering → صحيح

□ Server Cache:
  - set → ينجح
  - get بعد set → يرجع القيمة
  - get بعد انتهاء TTL → يرجع null
  - invalidate → يمسح

□ Schema Validation (Zod):
  - بيانات صالحة → يمر
  - بيانات ناقصة → errors واضحة
  - أنواع خطأ → رسائل مفيدة

□ Branch Scope:
  - كل السيناريوهات المذكورة في 1.2

□ School Manager Overview:
  - بيانات مالية صحيحة لمجموعة المدارس
  - إجماليات مطابقة للتفاصيل
```

### 1.10 Regression Tests

```
ملف: tests/regression-comprehensive.test.ts

اختبر التالي:

□ Financial Helper:
  - حسابات مالية معروفة → نتائج مطابقة
  - أرقام كبيرة → لا overflow
  - عملات مختلفة → تعامل صحيح

□ Generated Columns:
  - الأعمدة المحسوبة في DB تعمل صحيح

□ Import Schema:
  - schema الاستيراد متوافق مع الإصدارات السابقة
```

---

## الجزء 2: اختبارات API Routes

### 2.1 كل API Route يُختبر

```
لكل route في /api/web/*, /api/mobile/*, /api/core/*, /api/v1/*:

□ Method validation: GET فقط يقبل GET، POST فقط يقبل POST
□ Auth: بدون auth → 401
□ Auth: role غير مسموح → 403
□ Validation: body/params خطأ → 400 مع تفاصيل
□ Success: بيانات صحيحة → 200/201 + response shape صحيح
□ School isolation: طلب لمدرسة أخرى → 403
□ Branch isolation: طلب لفرع غير مسموح → 403
□ Error handling: خطأ DB → 500 مع logging (بدون تسريب تفاصيل)
```

### 2.2 API Routes الحرجة

```
□ POST /api/auth/login — كل سيناريوهات 1.1
□ GET /api/rbac/session — كل سيناريوهات RBAC
□ GET /api/web/students — pagination, filters, branch scope
□ POST /api/web/students — create مع validation كامل
□ POST /api/web/payments — create مع تحديث الرصيد
□ POST /api/web/expenses — create مع validation
□ POST /api/web/salaries/pay — دفع مع تغيير الحالة
□ GET /api/web/dashboard — overview بيانات مجمعة صحيحة
□ POST /api/web/grades/entry — إدخال درجات
□ GET /api/web/attendance — بيانات حضور مع فلاتر
□ POST /api/web/calendar — أحداث التقويم
□ GET /api/web/reports — تقارير مالية وأكاديمية
□ POST /api/mobile/auth/login — JWT auth
□ GET /api/mobile/student/dashboard — بيانات الطالب
□ GET /api/mobile/teacher/dashboard — بيانات المعلم
□ POST /api/v1/roles — إنشاء دور مع صلاحيات
□ GET /api/v1/permissions/tree — شجرة الصلاحيات كاملة
□ POST /api/ops/telegram-webhook — Telegram commands
□ GET /api/ops/daily-report — cron job
□ GET /api/ops/health — health check
□ GET /api/verify/receipt/[token] — التحقق من إيصال
```

---

## الجزء 3: اختبارات E2E (Playwright)

### 3.1 تدفقات المصادقة

```
ملف: tests/e2e/flows/auth-comprehensive.flow.spec.ts

□ صفحة تسجيل الدخول تظهر صحيح (عربي)
□ تسجيل دخول ناجح → redirect للوحة التحكم
□ تسجيل دخول فاشل → رسالة خطأ ظاهرة
□ نسيت كلمة المرور → النموذج يعمل
□ تبديل اللغة (AR ↔ EN) → يعمل بدون crash
□ وصول لصفحة محمية بدون auth → redirect لـ login
□ تسجيل خروج → cookie يُمسح + redirect لـ login
```

### 3.2 لوحة التحكم (Dashboard)

```
ملف: tests/e2e/flows/dashboard-comprehensive.flow.spec.ts

□ الصفحة تحمل بدون أخطاء
□ البطاقات الإحصائية تظهر (عدد الطلاب، الإيرادات، المصروفات)
□ الرسوم البيانية تظهر (Recharts)
□ القائمة الجانبية (Sidebar) تعمل — كل رابط يوصل لصفحته
□ الإعدادات: أرشفة، ويدجتات، نهاية السنة
□ البراندينج: شعار المدرسة والألوان
```

### 3.3 إدارة الطلاب

```
ملف: tests/e2e/flows/students-comprehensive.flow.spec.ts

□ صفحة الطلاب تحمل مع جدول/قائمة
□ زر إضافة طالب → نموذج يظهر
□ إضافة طالب: تعبئة كل الحقول → حفظ → يظهر في القائمة
□ تعديل طالب: فتح → تعديل اسم → حفظ → يتحدث
□ البحث عن طالب بالاسم → نتائج صحيحة
□ فلترة بالفصل → فقط طلاب الفصل
□ فلترة بالحالة (active/inactive) → صحيح
□ استيراد من Excel: رفع ملف → معاينة → تأكيد → يُضاف
□ تصدير إلى Excel → ملف يُحمل
□ بطاقات الطلاب (QR): طباعة
□ صفحة تفاصيل الطالب: بيانات + مالية + حضور
```

### 3.4 المدفوعات

```
ملف: tests/e2e/flows/payments-comprehensive.flow.spec.ts

□ صفحة المدفوعات تحمل
□ إضافة دفعة: اختيار طالب → مبلغ → حفظ
□ الرصيد يتحدث بعد الدفع
□ إيصال الدفع: طباعة/عرض
□ فلترة بالتاريخ والفصل
□ تصدير Excel
□ أرشفة مدفوعات قديمة
```

### 3.5 المصروفات والإيرادات

```
ملف: tests/e2e/flows/financial-comprehensive.flow.spec.ts

□ المصروفات: إضافة → تظهر في القائمة → المجموع يتحدث
□ الإيرادات: إضافة → تظهر في القائمة → المجموع يتحدث
□ أنواع المصروفات: CRUD
□ أنواع الإيرادات: CRUD
□ التقارير المالية: تظهر صحيح
```

### 3.6 الرواتب

```
ملف: tests/e2e/flows/salaries-comprehensive.flow.spec.ts

□ صفحة الرواتب تحمل
□ إنشاء كشف رواتب شهري
□ عرض تفاصيل الراتب (أساسي، خصومات، صافي)
□ دفع الراتب → الحالة تتغير
□ المحاضرات الإضافية
□ السلف
```

### 3.7 الحضور

```
ملف: tests/e2e/flows/attendance-comprehensive.flow.spec.ts

□ صفحة الحضور تحمل
□ تسجيل حضور فصل كامل
□ تغيير حالة طالب (حاضر ↔ غائب)
□ عرض تاريخ حضور طالب
□ تصدير
```

### 3.8 المعلمين

```
ملف: tests/e2e/flows/teachers-comprehensive.flow.spec.ts

□ قائمة المعلمين تحمل
□ إضافة معلم جديد
□ تعديل بيانات معلم
□ جدول المعلم
□ تقييم المعلم
□ إجازات المعلم
□ مستندات المعلم
```

### 3.9 الجدول والتقويم

```
ملف: tests/e2e/flows/schedule-calendar.flow.spec.ts

□ الجدول الدراسي: يعرض الفترات الزمنية
□ إضافة حصة → تظهر في الجدول
□ التقويم: يعرض الأحداث
□ إضافة حدث → يظهر
□ أيام العمل: تعديل → ينعكس على الجدول
```

### 3.10 Super Admin

```
ملف: tests/e2e/flows/super-admin-comprehensive.flow.spec.ts

□ تسجيل دخول كـ super_admin
□ قائمة المدارس → تظهر كل المدارس
□ إضافة مدرسة جديدة
□ إدارة الاشتراكات
□ انتحال شخصية (impersonation) → يدخل كمدير مدرسة
□ استيراد مدارس بالجملة
□ صفحة العمليات (ops dashboard)
```

### 3.11 RBAC في الواجهة

```
ملف: tests/e2e/rbac-ui-comprehensive.spec.ts

□ مستخدم بصلاحية "طلاب فقط" → لا يرى صفحات أخرى في السايدبار
□ isSinglePageUser → يرى صفحة واحدة فقط
□ زر محمي بصلاحية → لا يظهر لمن ليس لديه الصلاحية
□ PermissionGuard component → يخفي المحتوى من غير المصرح لهم
□ RoleGuard component → يخفي المحتوى من أدوار غير مسموحة
```

### 3.12 الترجمة (i18n)

```
ملف: tests/e2e/i18n-comprehensive.spec.ts

□ الصفحات بالعربي: كل النصوص عربية
□ التبديل لإنجليزي: كل النصوص تتغير
□ RTL (عربي): اتجاه الصفحة صحيح
□ LTR (إنجليزي): اتجاه الصفحة صحيح
□ رسائل الخطأ: بنفس اللغة المختارة
□ التنسيقات: أرقام وتواريخ حسب اللغة
```

---

## الجزء 4: اختبارات الأداء والأمان

### 4.1 الأمان

```
ملف: tests/security-comprehensive.test.ts

□ SQL Injection: حقول إدخال محمية
□ XSS: مخرجات معقمة (sanitized)
□ CSRF: cookies مع SameSite
□ Security Headers:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Referrer-Policy: strict-origin-when-cross-origin
  - HSTS (production)
  - Permissions-Policy
□ Rate Limiting يعمل على endpoints الحرجة
□ لا تسريب معلومات حساسة في الأخطاء (stack traces, DB details)
□ Authentication cookies: httpOnly, secure (prod), SameSite: lax
□ Password hashing: لا يُخزن كنص واضح
□ API keys لا تظهر في الـ client bundle
```

### 4.2 الأداء

```
ملف: tests/performance-comprehensive.test.ts

□ API response times < 500ms (p95)
□ صفحات تحمل بدون JavaScript errors
□ لا memory leaks في الصفحات الطويلة
□ Pagination يمنع تحميل كل البيانات مرة واحدة
□ Server cache يعمل ويقلل استعلامات DB
□ Optimized imports (lucide-react, recharts) → bundle size معقول
```

---

## الجزء 5: Smoke Tests (اختبارات سريعة للإنتاج)

```
ملف: tests/e2e/production-smoke-comprehensive.spec.ts

□ /ar/login → 200 + يظهر form
□ /en/login → 200 + يظهر form
□ /api/health → 200
□ /api/ping → 200
□ تسجيل دخول → dashboard يحمل
□ كل صفحة رئيسية (/ar/students, /ar/payments, ...) → 200 + لا console errors
□ Mobile API: /api/mobile/auth/login → يقبل POST
□ Cron endpoints: /api/ops/warm → يعمل
□ Static assets (CSS, JS, images) → يحمل
□ Fonts → تحمل بدون fallback
```

---

## الجزء 6: قواعد الكتابة والعزل

### كل ملف اختبار يجب أن يتبع:

```typescript
// 1. كل mock مستقل ومعزول
const mockState = vi.hoisted(() => ({
  // كل الدوال المُستبدلة هنا
}));

// 2. كل vi.mock في أعلى الملف
vi.mock("@/lib/...", () => ({...}));

// 3. beforeEach ينظف الحالة
beforeEach(() => {
  vi.clearAllMocks();
});

// 4. لا اعتماد على ترتيب الاختبارات
// كل test مستقل 100%

// 5. أسماء واضحة ووصفية
describe("module name", () => {
  describe("feature", () => {
    it("should do X when Y", () => {
      // Arrange → Act → Assert
    });
  });
});

// 6. لا اتصال حقيقي بالـ DB أو APIs خارجية
// كل شيء mocked

// 7. Assertions واضحة ومحددة
expect(result).toMatchObject({...}); // أفضل من toBeTruthy()
expect(result.status).toBe(200);     // أفضل من toBeOK()
```

---

## الجزء 7: أمر التشغيل الشامل

```bash
# 1. فحص الأنواع (Types)
pnpm typecheck

# 2. اختبارات الوحدات
pnpm test

# 3. اختبارات E2E
pnpm test:e2e

# 4. الكل معاً
pnpm test:all

# 5. اختبار ملف محدد
pnpm vitest run tests/auth-rbac-comprehensive.test.ts

# 6. E2E ملف محدد
pnpm playwright test tests/e2e/flows/students-comprehensive.flow.spec.ts

# 7. E2E مع واجهة
pnpm test:e2e:ui
```

---

## الجزء 8: قائمة التحقق النهائية

```
□ كل API route له اختبار unit واحد على الأقل
□ كل صفحة لها اختبار E2E واحد على الأقل
□ عزل المدرسة مُختبر لكل عملية بيانات
□ عزل الفرع مُختبر لكل عملية بيانات
□ RBAC مُختبر لكل role (super_admin, admin, employee)
□ Deep permissions مُختبرة (5 مستويات)
□ Auth: web (cookie) + mobile (JWT) مُختبر
□ Rate limiting مُختبر
□ Error handling لا يسرب معلومات حساسة
□ i18n: عربي وإنجليزي مُختبر
□ Audit logs تُسجل لكل عملية حرجة
□ Financial calculations صحيحة ومُختبرة
□ Import engine: كل سيناريو مُختبر
□ Cron jobs: يعملون بشكل صحيح
□ Telegram + WhatsApp: الإشعارات تعمل
□ Regression: الباقات القديمة لا تنكسر
□ لا console errors في أي صفحة
□ لا unhandled promise rejections
□ TypeScript: لا أخطاء أنواع (noImplicitAny: true)
□ Build ينجح بدون warnings حرجة
```

---

> **ملاحظة:** هذا البرومت مُصمم للمشروع الحالي (school-app) بناءً على هيكله الفعلي.
> كل قسم يمكن تنفيذه مستقلاً أو مع الأقسام الأخرى.
> الأولوية: الأمان والعزل → المالية → CRUD → UI.
