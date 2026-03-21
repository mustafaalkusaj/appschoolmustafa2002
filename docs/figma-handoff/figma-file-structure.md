# Figma File Structure

اسم الملف المقترح:

`School SaaS Arabic RTL`

## الصفحات

### 00 Cover

- غلاف المشروع
- وصف قصير
- لقطات مصغرة للشاشات الرئيسية
- روابط مرجعية للكود

### 01 Foundations

- Color Variables
- Typography
- Spacing
- Radius
- Shadows
- Icon rules
- RTL rules
- Dark mode rules

### 02 Components

- `Logo`
- `Theme Toggle`
- `Sidebar`
- `Sidebar Item`
- `Topbar`
- `Metric Card`
- `Tabs`
- `Quick Filter Chip`
- `Button`
- `Input`
- `Select`
- `Textarea`
- `Table`
- `Status Badge`
- `Empty State`
- `Toast`
- `Modal`
- `Detail Drawer`

### 03 Auth & Gates

- `Login / Desktop`
- `Login / Mobile`
- `Access Denied`
- `Subscription Expired`
- `Not Found`

### 04 Workspace

- `Home / Launcher`
- `Dashboard`
- `Students`
- `Payments`
- `Attendance`
- `Expenses`
- `Reports`
- `Salaries`

### 05 Super Admin

- `Schools`
- `Subscriptions`
- `Super Admin Overview`
- `Super Admin / Schools Tab`
- `Super Admin / Users Tab`
- `Super Admin / Subscriptions Tab`

### 06 Prototype

- `Auth Flow`
- `Admin Daily Flow`
- `Employee Collection Flow`
- `Teacher Read-Only Flow`
- `Super Admin Flow`

### 99 Notes

- قرارات التصميم
- عناصر لم تنفذ بعد
- ملاحظات handoff

## تسمية الفريمات

استخدم النمط التالي:

- `SCR / Login / Desktop`
- `SCR / Dashboard / Default`
- `SCR / Students / Table`
- `SCR / Students / Add Modal`
- `SCR / Payments / Default`
- `SCR / Payments / Archive Detail`
- `SCR / Salaries / Daily Log Modal`
- `SCR / Super Admin / Overview`

## الـ Components Sets

### Buttons

- `Type`: Primary / Secondary / Success / Danger / Ghost
- `Size`: Sm / Md / Lg
- `State`: Default / Hover / Pressed / Disabled / Loading
- `Icon`: None / Leading / Trailing

### Nav Item

- `State`: Default / Hover / Active / Danger

### Metric Card

- `Variant`: Default / Success / Warning / Danger / Info

### Input

- `Type`: Text / Number / Date / Search / Password / Select
- `State`: Default / Focus / Error / Disabled / Filled

### Table Row

- `State`: Default / Hover / Selected / Empty

### Modal

- `Size`: Sm / Md / Lg / Xl
- `State`: Default / With Error / Loading

## Auto Layout Rules

- كل الـ frames `RTL`
- primary alignment من اليمين
- استخدم `hug contents` للأزرار والشارات
- استخدم `fill container` في الحقول والجداول
- لا تستخدم positioning يدوي إلا في overlay/floating actions

## Prototype Naming

- `FLOW / Login`
- `FLOW / Admin`
- `FLOW / Employee`
- `FLOW / Teacher`
- `FLOW / Super Admin`

