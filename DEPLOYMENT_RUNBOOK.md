# دليل النشر — Deployment Runbook

## قبل النشر (Pre-Deployment)

### الفحوصات الإلزامية

```bash
# 1. Type safety
npm run typecheck
Expected: ✓ Types generated successfully

# 2. Tests
npm run test
Expected: ✓ 391/391 tests passing

# 3. Build locally
npm run build
Expected: ✓ Compiled successfully in X seconds

# 4. Vercel build (simulate production)
npx vercel build --prod
Expected: ✓ Build successful
```

### Checklist

- [ ] لا توجد أخطاء TypeScript
- [ ] جميع الاختبارات تمر
- [ ] البناء محلي يعمل
- [ ] Vercel build يعمل
- [ ] لا توجد أخطاء في Git status
- [ ] جميع التعديلات مُلتزمة (committed)

---

## طرق النشر

### الطريقة 1: Push إلى Git (الأسهل)

```bash
git add .
git commit -m "fix: brief description"
git push origin main
```

**النتيجة:**
- Vercel تكتشف التغيير تلقائياً
- تبدأ عملية البناء
- ينشر تلقائياً إلى production

**الوقت:** ~1-2 دقيقة

### الطريقة 2: Vercel Deploy (مباشر)

```bash
npx vercel deploy --prod
```

**النتيجة:**
- نشر مباشر بدون Git
- Vercel تبني وتنشر

**الوقت:** ~1-2 دقيقة

### الطريقة 3: Prebuilt Deploy (سريع جداً)

```bash
# بعد البناء المحلي
npm run build

# نشر التي بنيناها
npx vercel deploy --prebuilt --prod
```

**المميزات:**
- ✅ أسرع (بدون rebuild على Vercel)
- ✅ أكثر أماناً (تحكم محلي)

**الوقت:** ~30 ثانية

**متى تستخدمها:**
- إذا البناء يأخذ وقت طويل
- إذا كنت متأكد من البناء
- للنشرات العاجلة

---

## خطوات النشر الصحيحة

### النشر الموصى به (Git Method)

```bash
# 1. فحص الحالة
git status
# لا يجب أن يكون هناك تعديلات إضافية

# 2. تشغيل الفحوصات
npm run typecheck
npm run test
npm run build

# كل الفحوصات تمرت؟ استمر.

# 3. إضافة التعديلات
git add .

# 4. كتابة وصف التغيير
git commit -m "fix: brief description of change"
# مثال: "fix: prevent login page blank screen"

# 5. النشر
git push origin main

# 6. تحقق من Vercel
# اذهب إلى: https://vercel.com/projects
# شوف: التبويب "Deployments"
# انتظر: "Ready" (أخضر)
```

**الوقت الإجمالي:** 3-5 دقائق

---

## بعد النشر (Post-Deployment)

### الفحوصات الفورية

```bash
# 1. جرّب الموقع
curl -I https://school-iraq.com/ar/login
Expected: HTTP 200

# 2. تحقق من الأداء
curl -w "TTFB: %{time_starttransfer}s\n" https://school-iraq.com/ar/login
Expected: < 1 second

# 3. افتح في المتصفح
https://school-iraq.com/ar/login
Expected: form يظهر (ليس blank)
```

### الفحوصات بعد دقائق

- [ ] اذهب إلى `/ar/login` - form يظهر؟
- [ ] اذهب إلى `/ar/students` - جدول يظهر؟
- [ ] اذهب إلى `/ar/payments` - بيانات تظهر؟
- [ ] اذهب إلى `/ar/branch-overview` - ملخص يظهر؟
- [ ] جرّب إضافة دفعة - تعمل؟
- [ ] جرّب البحث - يعمل؟

### الفحوصات في Vercel

```bash
# افتح Vercel dashboard
https://vercel.com → Projects → appschoolmustafa2002

# تحقق من:
✓ Deployment status = "Ready"
✓ Build time = معقول (~20s)
✓ No HTTP 500 in logs
```

---

## قواعد أمان النشر (Deploy Safety Rules)

### متى تستخدم --prebuilt؟

✅ **استخدم --prebuilt إذا:**
```
1. Local build نجح 100%
2. npm run build بدون أخطاء
3. لم تغيّر node_modules قبلاً
4. لم يكن هناك errors في الخطوة السابقة
```

❌ **لا تستخدم --prebuilt إذا:**
```
1. قبل ساعات تعديلات dependencies
2. Local build لم تختبره بنفسك
3. آخر deploy حدث فيه chunk mismatch
4. شكّ: استخدم npx vercel deploy --prod بدلاً منه
```

### تجنب Chunk Mismatch

```bash
# الطريقة الآمنة:
1. فراغ البداية
   rm -rf .vercel/output
   rm -rf .next
   rm -rf node_modules/.cache

2. build نظيف
   npm run build

3. اختبر محلياً
   npm run dev
   افتح كل الصفحات الرئيسية

4. verify لا توجد أخطاء
   npm run typecheck
   npm run test

5. deploy آمن
   npx vercel deploy --prod
   (لا تستخدم --prebuilt في هذه الحالة)
```

### Cache Cleanup Script

```bash
#!/bin/bash
# script: clean-deploy.sh

echo "🧹 Cleaning build cache..."
rm -rf .vercel/output
rm -rf .next
rm -rf node_modules/.cache

echo "🔨 Fresh build..."
npm run build

echo "✅ Build complete"
echo "📤 Ready for deployment"
echo "Run: npx vercel deploy --prod"
```

---

## المشاكل الشائعة والحلول

### مشكلة 1: Chunk Mismatch (blank pages)

**الأعراض:**
```
❌ Login page blank بعد النشر
❌ Branch overview blank
❌ Error: "Chunk not found"
```

**الحل:**
```bash
# هذا يحدث عادة عند استخدام --prebuilt قديم

# 1. حذف الكاش القديم
rm -rf .vercel

# 2. rebuild من الصفر
npm run build

# 3. نشر بدون --prebuilt
npx vercel deploy --prod
```

### مشكلة 2: Build يفشل

**الأعراض:**
```
❌ npm run build fails
❌ TypeScript errors
```

**الحل:**
```bash
# 1. افحص الأخطاء
npm run typecheck
# اقرأ الأخطاء

# 2. صحح الكود
# (راجع الخطأ المحدد)

# 3. أعد المحاولة
npm run build
```

### مشكلة 3: Env Variables Missing

**الأعراض:**
```
❌ Supabase connection fails
❌ Auth not working
```

**الحل:**
```bash
# تحقق من Vercel env vars:
# 1. Vercel dashboard
# 2. Project settings
# 3. Environment variables

# يجب تكون:
✓ SUPABASE_URL
✓ SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY
✓ JWT_SECRET
✓ (+ others)
```

---

## التحقق النهائي

### Checklist بعد النشر

```
✅ Deployment succeeded
✅ Status = "Ready" في Vercel
✅ Login page shows form
✅ Students page loads
✅ Payments page loads
✅ Branch overview loads
✅ Can add student
✅ Can add payment
✅ Can export
✅ No HTTP 500 in logs
✅ Performance OK (TTFB < 1s)
```

---

## الإرجاع (Rollback)

### إذا حدثت مشكلة بعد النشر

```bash
# الخيار 1: الرجوع إلى آخر نسخة صحيحة
# في Vercel dashboard:
# 1. Deployments → Previous version
# 2. Promote to Production

# أو من الـ CLI:
npx vercel promote <deployment-id>
```

**الوقت:** ~1 دقيقة

---

## جدول النشرات الموصى بها

```
الوقت الموصى به: بعد 5:00 PM (إذا كان من يعمل بالمدرسة)
الأيام الموصى بها: أيام الأسبوع (ليس الجمعة)
الوقت المتوقع: 3-5 دقائق
التحقق: فوري بعد النشر
```

---

## ملاحظات أمنية

```
⚠️ لا تنشر:
❌ بدون اختبارات تمر
❌ بدون TypeScript checks
❌ بدون build محلي
❌ بدون تحقق post-deployment

✅ انشر فقط:
✅ بعد كل الفحوصات تمر
✅ من main branch
✅ مع وصف واضح
✅ مع تحقق بعد النشر
```
