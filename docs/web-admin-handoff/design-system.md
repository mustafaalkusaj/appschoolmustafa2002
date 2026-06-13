# Design System

## تحديث حالة التنفيذ 2026-04-09

- التطبيق الحي تحوّل فعليًا إلى اتجاه `white / near-white` في shell المشترك
- `Cairo` و`Inter` أصبحا محمّلين من التطبيق نفسه بدل الاعتماد على CSS خارجي محجوب
- مفتاح اللغة ومفتاح الثيم أصبحا جزءًا ظاهرًا من الـ auth shell والـ app shell
- هذا الملف يبقى مرجع النظام البصري، لكن حالة التنفيذ الحي موثقة أيضًا في `ui-ux-redesign-master-report.md`

## الاتجاه البصري

المنتج هو نظام SaaS عربي لإدارة المدارس، لذلك الاتجاه المقترح:

- `RTL-first`
- إدارة أعمال تعليمية
- احترافي وواضح أكثر من كونه زخرفيًا
- تباين قوي في البيانات والجداول
- حواف دائرية ناعمة
- ظلال خفيفة
- هوية ألوان أساسية: `Indigo / Purple / Sky`

## الطبقات

اعتمد هيكل توكنز ثلاثي:

1. `Primitive`
2. `Semantic`
3. `Component`

## الألوان

### Primitive

- `indigo-950`: `#1F1547`
- `indigo-800`: `#4C2F9E`
- `indigo-700`: `#6C4AB6`
- `indigo-400`: `#9B7EDC`
- `sky-700`: `#1D4ED8`
- `sky-600`: `#2563EB`
- `sky-400`: `#60A5FA`
- `sky-200`: `#BFDBFE`
- `surface-0`: `#FFFFFF`
- `surface-25`: `#FAFAFE`
- `surface-50`: `#F8F6FF`
- `surface-75`: `#F5F3FF`
- `surface-100`: `#F0EEFF`
- `app-bg`: `#F6F8FC`
- `text-950`: `#0F172A`
- `text-700`: `#334155`
- `text-500`: `#64748B`
- `text-400`: `#94A3B8`
- `success-700`: `#065F46`
- `success-500`: `#10B981`
- `success-100`: `#D1FAE5`
- `warning-700`: `#92400E`
- `warning-500`: `#F59E0B`
- `warning-100`: `#FEF3C7`
- `danger-700`: `#991B1B`
- `danger-500`: `#EF4444`
- `danger-100`: `#FEE2E2`
- `info-700`: `#1E40AF`
- `info-100`: `#DBEAFE`

### Semantic

- `color.bg.canvas`: `app-bg`
- `color.bg.surface`: `surface-0`
- `color.bg.subtle`: `surface-50`
- `color.bg.sidebar`: `linear(#EDE8FA -> #E0D8F8)`
- `color.bg.primary`: `indigo-800`
- `color.bg.primary-hover`: `indigo-700`
- `color.bg.brand`: `linear(#2563EB -> #1D4ED8)`
- `color.text.primary`: `text-950`
- `color.text.secondary`: `text-500`
- `color.text.inverse`: `#FFFFFF`
- `color.text.brand`: `indigo-800`
- `color.border.default`: `rgba(108, 74, 182, 0.12)`
- `color.border.soft`: `rgba(108, 74, 182, 0.08)`
- `color.state.success.bg`: `success-100`
- `color.state.success.text`: `success-700`
- `color.state.warning.bg`: `warning-100`
- `color.state.warning.text`: `warning-700`
- `color.state.danger.bg`: `danger-100`
- `color.state.danger.text`: `danger-700`

### Dark Mode

- `dark.bg.canvas`: `#0F1220`
- `dark.bg.surface`: `#171C2C`
- `dark.bg.sidebar`: `linear(#1A2133 -> #171E2F)`
- `dark.bg.subtle`: `#1F2638`
- `dark.text.primary`: `#F2F4FF`
- `dark.text.secondary`: `#A8B0C8`
- `dark.border.default`: `rgba(169, 139, 239, 0.24)`

## الخطوط

### Font Family

- الأساسي: `Manrope`
- fallback: `Segoe UI`, `sans-serif`

### Text Styles

- `Display / 32 / 800`
- `Heading XL / 24 / 800`
- `Heading L / 20 / 800`
- `Heading M / 18 / 700`
- `Heading S / 16 / 700`
- `Body L / 16 / 500`
- `Body M / 14 / 500`
- `Body S / 12 / 500`
- `Label L / 14 / 700`
- `Label M / 12 / 700`
- `Label S / 11 / 700`
- `Data / 14 / 800`

### قواعد

- line-height للنصوص العادية: `150%`
- line-height للعناوين: `120% - 130%`
- استخدم `tabular numerals` داخل الجداول، المبالغ، العدادات، والتواريخ

## الشبكة والمسافات

### Spacing Scale

- `4`
- `8`
- `12`
- `16`
- `20`
- `24`
- `32`
- `40`
- `48`

### Layout

- `Sidebar Width`: `220`
- `Content Padding Desktop`: `24`
- `Section Gap`: `16`
- `Card Padding`: `16`
- `Modal Padding`: `24`

## الحواف والظلال

### Radius

- `sm`: `8`
- `md`: `10`
- `lg`: `12`
- `xl`: `14`
- `2xl`: `18`
- `pill`: `999`

### Shadows

- `shadow-sm`: `0 2px 8px rgba(108,74,182,0.06)`
- `shadow-md`: `0 8px 24px rgba(15,23,42,0.12)`
- `shadow-lg`: `0 20px 60px rgba(0,0,0,0.20)`

## مكونات النظام

### 1. App Shell

- Sidebar ثابتة يمين الواجهة
- Topbar أبيض أو Surface مرتفع
- Content منطقة scroll مستقلة
- Theme toggle ثابت أعلى اليمين

### 2. Sidebar Item

- ارتفاع تقريبي: `40 - 44`
- radius: `9`
- padding أفقي: `12 - 14`
- Default: نص بنفسجي
- Hover: خلفية بنفسجية شفافة
- Active: gradient indigo + white text
- Danger variant: نص أحمر وخلفية حمراء خفيفة

### 3. KPI Card

- خلفية بيضاء
- radius `12`
- border خفيف
- shadow-sm
- عنوان ثانوي صغير
- قيمة كبيرة ثقيلة

### 4. Buttons

- `Primary`
  background: `linear(indigo-700 -> indigo-800)`
  text: white
- `Secondary`
  background: white
  border soft indigo
  text: indigo-800
- `Success`
  background: `success-100`
  border: `success-500`
  text: `success-700`
- `Danger`
  background: `danger-100`
  text: `danger-700`

### 5. Inputs

- height: `40 - 44`
- background: `surface-50`
- border: soft indigo
- focus ring: indigo 16% alpha
- labels فوق الحقل دائمًا

### 6. Tables

- Header background: `surface-50`
- Header text: indigo-800
- Row hover: `surface-25`
- Numeric columns تستخدم `Data / 14 / 800`
- actions column ثابتة ومرئية

### 7. Modals

- overlay dark blur
- container radius `18 - 22`
- أقصى عرض `480`, `720`, `1120` حسب النوع
- header/actions واضحة
- زر إغلاق دائم

### 8. Empty / Success / Error States

- Empty: أيقونة + نص مختصر + CTA
- Success: أخضر فاتح
- Error: أحمر فاتح
- Warning / access gates: أصفر أو أحمر على خلفية داكنة

## المواصفات التفاعلية

- hover: `150ms - 200ms`
- modal / panel: `220ms`
- scale hover للبطاقات: `1.01`
- لا تعتمد على hover فقط، كل عنصر لازم يبقى usable بالضغط

## توصيات Figma

- أنشئ `Variables Collections`:
  - `Primitives`
  - `Semantic / Light`
  - `Semantic / Dark`
  - `Component Tokens`
- أنشئ `Component Sets`:
  - `Button`
  - `Nav Item`
  - `Tab`
  - `Input`
  - `Select`
  - `Status Badge`
  - `Table Cell`
  - `Metric Card`
  - `Modal`

## ملاحظة تنفيذية

في الكود هناك استخدام متكرر لرموز مثل `📊` و`💳` عبر `AppIcon`. داخل Figma لا تعتمد على emoji. استخدم مجموعة أيقونات موحدة:

- `Lucide`
أو
- `Material Symbols Rounded`

مع stroke موحد `1.75 - 2`.
