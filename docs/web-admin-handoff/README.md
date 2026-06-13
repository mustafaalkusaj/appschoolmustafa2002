# Web Admin Figma Handoff

## ملاحظة تنفيذية بتاريخ 2026-04-09

هذه الحزمة لم تعد مجرد spec قبل التنفيذ. الواجهة الحية داخل `school-app` تحتوي الآن على تنفيذ فعلي يجب اعتباره مرجعًا بصريًا مع هذه الملفات:

- `login` و`dashboard` تم التحقق منهما بصريًا
- `payments` و`salaries` لديهما الآن shell حي أفضل في العربية والإنجليزية
- اللغة والثيم أصبحا ظاهرين في الهيدر الحي
- ما زالت هناك فجوات في `fee-notifications` و`monitoring` وبعض المودالات الداخلية

لذلك:

- عند وجود تعارض بين هذه الحزمة والواجهة الحية، اعتمد الكود الحي أولًا
- ارجع أيضًا إلى:
  - `ui-ux-redesign-master-report.md`
  - `bilingual-ui-review.md`
  - `live-visual-verification.md`

هذه الحزمة تحوّل واجهة الويب الإدارية الحالية في `school-app` إلى مرجع تصميم جاهز لإعادة البناء داخل `Figma`.

المحتوى الموجود هنا يغطي 3 أشياء طلبتها:

1. `Figma handoff package`
2. `Design System` كامل
3. ترتيب جميع الشاشات والربط بينها كـ wireframe/spec

## مكان الحقيقة

مصدر هذه الحزمة هو الكود الحالي في المشروع:

- `app/[locale]` للشاشات الأساسية
- `app/schools/page.tsx` و`app/subscriptions/page.tsx` لشاشات المدير العام
- `components/AppSidebar.tsx` و`components/UltrathinkLogo.tsx` و`components/ThemeModeToggle.tsx`
- `app/[locale]/globals.css` للثيم العام والدعم الليلي
- `types/roles.ts` للصلاحيات والتنقل وربط الشاشات

## الملفات

- `design-system.md`
  وصف النظام البصري، التوكنز، حالات العناصر، والمكونات المشتركة
- `figma-file-structure.md`
  كيف تبني ملف Figma نفسه: الصفحات، الفريمات، الـ components، والـ variants
- `screen-inventory.md`
  جرد كل الشاشات الحالية مع البلوكات الرئيسية والمودالات والهدف من كل شاشة
- `prototype-flows.md`
  ربط الشاشات والـ user flows حسب الدور
- `tokens/figma-design-tokens.json`
  ملف توكنز جاهز كمرجع عند إنشاء `Variables` و`Styles` داخل Figma

## مقاسات الفريمات المقترحة

- `Desktop App Shell`: `1440 x 1024`
- `Desktop Wide`: `1600 x 1200`
- `Tablet`: `1024 x 768`

## ترتيب العمل داخل Figma

1. أنشئ ملف جديد باسم:
   `School SaaS Arabic RTL`
2. أنشئ الصفحات حسب `figma-file-structure.md`
3. أنشئ `Variables` من `tokens/figma-design-tokens.json`
4. أنشئ `Text Styles` و`Effects`
5. ابنِ `Components` الأساسية أولًا:
   `Sidebar / Topbar / KPI Card / Button / Input / Table / Modal / Empty State / Toast`
6. بعد ذلك ابنِ الشاشات حسب `screen-inventory.md`
7. أخيرًا اربط الـ prototype حسب `prototype-flows.md`

## ملاحظات مهمة

- التطبيق عربي بالكامل و`RTL` افتراضي، لذلك كل Auto Layout في Figma يجب أن يبنى `Right-to-Left`.
- الكود الحالي يستخدم `AppIcon` مع رموز متنوعة؛ داخل Figma الأفضل استبدالها بـ icon set موحد مثل `Lucide` أو `Material Symbols Rounded`.
- توجد لغتان بصريتان خفيفتان في المشروع الحالي:
  - هوية زرقاء/سماوية في شاشة الدخول والهوية العامة
  - هوية بنفسجية/نيليّة في مساحة العمل الإدارية
  الحزمة هنا توحّدها ضمن نظام واحد: `Indigo + Sky`.
- الحزمة لا تنشئ ملف `.fig` فعليًا، لكنها جاهزة لبنائه بسرعة عالية وبدون تخمين.

## تسلسل الصفحات المقترح في Figma

1. `00 Cover`
2. `01 Foundations`
3. `02 Components`
4. `03 Auth & Gates`
5. `04 Workspace`
6. `05 Finance & Operations`
7. `06 Super Admin`
8. `07 Prototype`
9. `99 Notes`
