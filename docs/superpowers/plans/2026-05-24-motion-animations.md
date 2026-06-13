# Motion Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** إضافة animations شاملة لكل المكونات في التطبيق باستخدام framer-motion المثبت مسبقاً.

**Architecture:** ننشئ ملف variants مشترك `lib/motion-variants.ts` يحتوي كل animation configs، ثم نطبقها على المكونات واحداً تلو الآخر. كل المكونات تستخدم `usePrefersReducedMotion` hook للحفاظ على accessibility.

**Tech Stack:** framer-motion `^12.38.0` (مثبت)، CSS variables موجودة (`--transition-base`, `--transition-spring`)، `AnimatePresence` + `motion` components.

---

## ملاحظات مهمة قبل البدء

- `framer-motion` مثبت بالفعل — لا تثبّت شيء جديد
- `usePrefersReducedMotion` hook موجود في `components/ui/modal.tsx` — انسخه لـ `lib/motion-variants.ts`
- Modal لديه animations جيدة بالفعل — سنحسّنها فقط
- `StudentsTable.tsx` يستورد `motion` بالفعل
- RTL مدعوم — استخدم `x: isRTL ? 10 : -10` عند الحاجة

---

## Task 1: Shared Motion Variants

**Files:**
- Create: `lib/motion-variants.ts`

- [ ] **Step 1: Create the shared variants file**

```typescript
// lib/motion-variants.ts
"use client";

import { Variants, Transition } from "framer-motion";

// ── Transitions ────────────────────────────────────────────────────────────────

export const spring: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
};

export const springBouncy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 20,
};

export const ease200: Transition = { duration: 0.2, ease: "easeOut" };
export const ease150: Transition = { duration: 0.15, ease: "easeOut" };

// ── Item Variants (for stagger children) ─────────────────────────────────────

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { ...spring } },
  exit: { opacity: 0, y: -8, transition: ease150 },
};

export const itemVariantsX: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { ...spring } },
  exit: { opacity: 0, x: 12, transition: ease150 },
};

// ── Container Variants (stagger) ───────────────────────────────────────────────

export function containerVariants(staggerMs = 0.05): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerMs,
        delayChildren: 0.05,
      },
    },
  };
}

// ── Card Variants ─────────────────────────────────────────────────────────────

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...spring } },
};

// ── Fade Variants ─────────────────────────────────────────────────────────────

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: ease200 },
  exit: { opacity: 0, transition: ease150 },
};

// ── Scale Pop (for badges, avatars, icons) ─────────────────────────────────────

export const scalePopVariants: Variants = {
  hidden: { opacity: 0, scale: 0.75 },
  visible: { opacity: 1, scale: 1, transition: { ...springBouncy } },
  exit: { opacity: 0, scale: 0.75, transition: ease150 },
};

// ── Shake (for errors) ─────────────────────────────────────────────────────────

export const shakeVariants: Variants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.4 },
  },
  idle: { x: 0 },
};

// ── Slide Down (for dropdowns) ─────────────────────────────────────────────────

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...spring } },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: ease150 },
};

// ── Reduced Motion helper ──────────────────────────────────────────────────────

import { useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

// ── No-op variants for reduced motion ─────────────────────────────────────────

export const noMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
  exit: { opacity: 1 },
};

export function getVariants<T extends Variants>(reduced: boolean, variants: T): T | Variants {
  return reduced ? noMotionVariants : variants;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/motion-variants.ts
git commit -m "feat(motion): add shared animation variants and utilities"
```

---

## Task 2: StatsCard — Stagger + Hover Animation

**Files:**
- Modify: `components/ui/stats-card.tsx`
- Modify: `app/[locale]/dashboard/_components/StatisticsCards.tsx`

- [ ] **Step 1: Add motion to StatsCard**

في `components/ui/stats-card.tsx`، أضف الاستيراد وغيّر `Card` لـ `motion.div`:

```typescript
// أضف هذا الاستيراد في أول الملف
import { motion } from "framer-motion";
import { cardVariants } from "@/lib/motion-variants";
```

غيّر `StatsCard` component:

```typescript
export const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ label, value, icon: Icon, description, trend, variant = "neutral", className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
        className={cn(
          "relative overflow-hidden",
          "rounded-[var(--radius-xl)] border border-[var(--card-border)]",
          "bg-[var(--card-bg)] p-5",
          "shadow-sm",
          className
        )}
        {...props}
      >
        {/* باقي محتوى الكارد بدون تغيير */}
```

ابحث عن محتوى الـ Card الداخلي في الملف (السطور بعد `forwardRef`) وأبقِه كما هو — فقط غيّر العنصر الخارجي من `<Card>` أو `<div>` إلى `<motion.div variants={cardVariants}>`.

- [ ] **Step 2: Wrap KPIGrid in stagger container**

في `app/[locale]/dashboard/_components/StatisticsCards.tsx`:

```typescript
import { motion } from "framer-motion";
import { containerVariants, usePrefersReducedMotion, getVariants, cardVariants } from "@/lib/motion-variants";
```

غيّر الـ return:

```typescript
const reduced = usePrefersReducedMotion();
const cVariants = getVariants(reduced, containerVariants(0.06));
const cCardVariants = getVariants(reduced, cardVariants);

return (
  <div className="space-y-6">
    {/* Primary KPI Grid */}
    <motion.div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      variants={cVariants}
      initial="hidden"
      animate="visible"
    >
      <StatsCard variants={cCardVariants} ... />
      {/* باقي الكروت بنفس الطريقة */}
    </motion.div>

    {/* Secondary Grid */}
    <motion.div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
      variants={cVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ... */}
    </motion.div>
  </div>
);
```

> **ملاحظة:** `StatsCard` يقبل `variants` prop بسبب `...props` الموجود فيه.

- [ ] **Step 3: Commit**

```bash
git add components/ui/stats-card.tsx app/[locale]/dashboard/_components/StatisticsCards.tsx
git commit -m "feat(motion): stagger + hover animation for stats cards"
```

---

## Task 3: Dashboard Panels — List Stagger

**Files:**
- Modify: `app/[locale]/dashboard/_components/RecentActivityPanel.tsx`
- Modify: `app/[locale]/dashboard/_components/RecentPaymentsPanel.tsx`
- Modify: `app/[locale]/dashboard/_components/OverdueStudentsPanel.tsx`
- Modify: `app/[locale]/dashboard/_components/NotificationsPanel.tsx`

**Pattern موحّد لكل الـ panels:**

- [ ] **Step 1: Apply to RecentActivityPanel**

```typescript
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";
```

في الـ return، ابحث عن قائمة الـ activities (`activities.map(...)`) وغلّفها:

```typescript
const reduced = usePrefersReducedMotion();
const cVar = getVariants(reduced, containerVariants(0.07));
const iVar = getVariants(reduced, itemVariants);

// داخل return، اغلق div القائمة بـ motion.div:
<motion.div
  variants={cVar}
  initial="hidden"
  animate="visible"
  className="divide-y divide-[var(--border)]"
>
  {activities.map((activity) => (
    <motion.div
      key={activity.id}
      variants={iVar}
      className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--surface-soft)] transition-colors group"
    >
      {/* محتوى الـ activity item بدون تغيير */}
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 2: Apply same pattern to RecentPaymentsPanel**

نفس الخطوة — غلّف `payments.map(...)` بـ `motion.div` مع `containerVariants(0.07)` وكل item بـ `motion.div` مع `itemVariants`.

- [ ] **Step 3: Apply same pattern to OverdueStudentsPanel**

نفس الخطوة للـ overdue students list.

- [ ] **Step 4: Apply same pattern to NotificationsPanel**

نفس الخطوة للـ notifications list. أضف `pulse` animation للـ badge العدد:

```typescript
// badge الإشعارات غير المقروءة
<motion.span
  animate={{ scale: [1, 1.15, 1] }}
  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
  className="..." // الكلاسات الموجودة
>
  {unreadCount}
</motion.span>
```

- [ ] **Step 5: Commit**

```bash
git add app/[locale]/dashboard/_components/RecentActivityPanel.tsx \
        app/[locale]/dashboard/_components/RecentPaymentsPanel.tsx \
        app/[locale]/dashboard/_components/OverdueStudentsPanel.tsx \
        app/[locale]/dashboard/_components/NotificationsPanel.tsx
git commit -m "feat(motion): stagger list animations for dashboard panels"
```

---

## Task 4: QuickAccessPanel + DailyFinancialAnalysis

**Files:**
- Modify: `app/[locale]/dashboard/_components/QuickAccessPanel.tsx`
- Modify: `app/[locale]/dashboard/_components/DailyFinancialAnalysis.tsx`

- [ ] **Step 1: QuickAccessPanel — grid stagger**

```typescript
import { motion } from "framer-motion";
import { containerVariants, cardVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";
```

غلّف الـ grid:

```typescript
const reduced = usePrefersReducedMotion();

<motion.div
  className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
  variants={getVariants(reduced, containerVariants(0.08))}
  initial="hidden"
  animate="visible"
>
  {items.map((item) => (
    <motion.button
      key={item.href}
      variants={getVariants(reduced, cardVariants)}
      whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
      // ... باقي الـ props
    >
      {/* محتوى الـ button */}
    </motion.button>
  ))}
</motion.div>
```

- [ ] **Step 2: DailyFinancialAnalysis — Recharts animation**

في `DailyFinancialAnalysis.tsx`، تأكد أن الـ Recharts components تحتوي `isAnimationActive={true}` و `animationDuration={800}`:

```typescript
// مثال على Bar chart
<Bar
  dataKey="amount"
  isAnimationActive={!reduced}
  animationDuration={800}
  animationEasing="ease-out"
  // ... props أخرى
/>

// مثال على Line chart
<Line
  isAnimationActive={!reduced}
  animationDuration={1000}
  animationEasing="ease-out"
  // ... props أخرى
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/dashboard/_components/QuickAccessPanel.tsx \
        app/[locale]/dashboard/_components/DailyFinancialAnalysis.tsx
git commit -m "feat(motion): quick access grid stagger + chart animations"
```

---

## Task 5: AppSidebar — Collapse + Active Indicator

**Files:**
- Modify: `components/AppSidebar.tsx`

- [ ] **Step 1: Import motion**

```typescript
import { motion, AnimatePresence } from "framer-motion";
```

- [ ] **Step 2: Active nav item indicator**

ابحث عن الـ nav item rendering (عند `isActive`). أضف indicator متحرك:

```typescript
// داخل كل nav link، أضف:
{isActive && (
  <motion.span
    layoutId="sidebar-active-indicator"
    className="absolute inset-0 rounded-[var(--radius-lg)] bg-[var(--primary)]/10"
    transition={{ type: "spring", stiffness: 350, damping: 30 }}
  />
)}
```

`layoutId` يجعل الـ indicator ينزلق بين الـ links تلقائياً.

- [ ] **Step 3: Sidebar collapse/expand icon rotation**

ابحث عن زر الـ collapse (ChevronLeft/ChevronRight icon):

```typescript
<motion.div
  animate={{ rotate: isCollapsed ? 180 : 0 }}
  transition={{ duration: 0.2 }}
>
  <ChevronLeft size={16} />
</motion.div>
```

- [ ] **Step 4: Mobile backdrop fade**

ابحث عن الـ mobile overlay (backdrop). إن وُجد كـ `div` ثابت، حوّله:

```typescript
<AnimatePresence>
  {isMobileOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
      onClick={closeMobile}
    />
  )}
</AnimatePresence>
```

- [ ] **Step 5: Commit**

```bash
git add components/AppSidebar.tsx
git commit -m "feat(motion): sidebar active indicator, collapse icon, mobile backdrop"
```

---

## Task 6: NotificationBell — Bell Shake + Dropdown

**Files:**
- Modify: `components/NotificationBell.tsx`

- [ ] **Step 1: Read current state**

اقرأ `components/NotificationBell.tsx` لفهم البنية الحالية قبل التعديل.

- [ ] **Step 2: Bell shake on new notifications**

```typescript
import { motion, AnimatePresence } from "framer-motion";
import { shakeVariants, slideDownVariants, containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";
```

```typescript
const reduced = usePrefersReducedMotion();

// Bell icon wrapper — يهتز عند تغيير unreadCount
<motion.div
  key={unreadCount} // يعيد trigger الـ animation عند تغيير العدد
  animate={!reduced && unreadCount > 0 ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
  transition={{ duration: 0.5 }}
>
  <Bell size={20} />
</motion.div>
```

- [ ] **Step 3: Dropdown slide + item stagger**

```typescript
<AnimatePresence>
  {isOpen && (
    <motion.div
      variants={getVariants(reduced, slideDownVariants)}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute top-full mt-2 ..." // الكلاسات الموجودة
    >
      <motion.div
        variants={getVariants(reduced, containerVariants(0.06))}
        initial="hidden"
        animate="visible"
      >
        {notifications.map((n) => (
          <motion.div key={n.id} variants={getVariants(reduced, itemVariants)}>
            {/* محتوى الإشعار */}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 4: Commit**

```bash
git add components/NotificationBell.tsx
git commit -m "feat(motion): notification bell shake + dropdown stagger"
```

---

## Task 7: StudentsTable — Row Stagger + Hover

**Files:**
- Modify: `app/[locale]/students/_components/StudentsTable.tsx`

- [ ] **Step 1: Import variants**

```typescript
// motion already imported — add:
import { AnimatePresence } from "framer-motion";
import { containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";
```

- [ ] **Step 2: Desktop table row animation**

ابحث عن `<tbody>` أو الـ desktop table rows. غلّفها:

```typescript
const reduced = usePrefersReducedMotion();

// Table body wrapper
<motion.tbody
  variants={getVariants(reduced, containerVariants(0.04))}
  initial="hidden"
  animate="visible"
  key={page} // re-trigger stagger on page change
>
  {pagedStudents.map((s) => (
    <motion.tr
      key={s.id}
      variants={getVariants(reduced, itemVariants)}
      whileHover={!reduced ? { backgroundColor: "var(--surface-soft)", transition: { duration: 0.1 } } : {}}
      className="border-b border-[var(--border)] transition-colors"
    >
      {/* محتوى الـ row بدون تغيير */}
    </motion.tr>
  ))}
</motion.tbody>
```

- [ ] **Step 3: Mobile cards stagger**

ابحث عن `<div className="grid gap-4 md:hidden">` وغلّفها:

```typescript
<motion.div
  className="grid gap-4 md:hidden"
  variants={getVariants(reduced, containerVariants(0.06))}
  initial="hidden"
  animate="visible"
  key={page}
>
  {pagedStudents.map((s) => (
    <motion.div
      key={s.id}
      variants={getVariants(reduced, itemVariants)}
    >
      {/* Card content بدون تغيير */}
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/students/_components/StudentsTable.tsx
git commit -m "feat(motion): students table row stagger animation"
```

---

## Task 8: PaymentsTable + TeachersTable — Row Stagger

**Files:**
- Modify: `app/[locale]/payments/_components/PaymentsTable.tsx`
- Modify: `app/[locale]/salaries/_components/TeachersTable.tsx`

- [ ] **Step 1: Read both files first**

اقرأ كل ملف لفهم البنية قبل التعديل.

- [ ] **Step 2: Apply same pattern as Task 7 to PaymentsTable**

نفس النمط — `containerVariants(0.04)` على الـ container، `itemVariants` على كل row، `key={page}` لـ re-trigger عند تغيير الصفحة.

- [ ] **Step 3: Apply same pattern to TeachersTable**

نفس النمط.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/payments/_components/PaymentsTable.tsx \
        app/[locale]/salaries/_components/TeachersTable.tsx
git commit -m "feat(motion): payments + teachers table row stagger animation"
```

---

## Task 9: Modal — Enhanced Backdrop Blur

**Files:**
- Modify: `components/ui/modal.tsx`

الـ modal لديه animations جيدة بالفعل. سنحسّن الـ backdrop blur فقط.

- [ ] **Step 1: Enhance backdrop with blur**

في `components/ui/modal.tsx`، ابحث عن `<motion.div key="modal-backdrop" ...>` (السطر ~178):

```typescript
// غيّر الـ className ليشمل backdrop-blur:
className={cn(
  "fixed inset-0 z-[var(--z-modal)]",
  "flex items-center justify-center p-4",
  "bg-[var(--modal-backdrop)] backdrop-blur-sm"
)}
// غيّر الـ initial/animate/exit:
initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
transition={{ duration: 0.2 }}
```

- [ ] **Step 2: Better spring for modal panel**

ابحث عن `springTransition` (السطر ~171):

```typescript
const springTransition = { type: "spring" as const, stiffness: 380, damping: 28 };
```

وغيّر الـ panel initial/exit:

```typescript
initial={{ opacity: 0, scale: 0.93, y: 16 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.93, y: 16 }}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/modal.tsx
git commit -m "feat(motion): enhanced modal backdrop blur + better spring physics"
```

---

## Task 10: Buttons + Badges — Press + Pop

**Files:**
- Modify: `components/ui/button.tsx`
- Modify: `components/ui/badge.tsx`

- [ ] **Step 1: Read both files**

اقرأ `components/ui/button.tsx` و `components/ui/badge.tsx` أولاً.

- [ ] **Step 2: Button press feedback**

في `button.tsx`، للـ `<button>` الرئيسي، أضف `whileTap`:

```typescript
import { motion } from "framer-motion";

// إن كان Button يرجع <button> مباشرةً، حوّله لـ motion.button:
// أو أضف whileTap عبر ref إن كان يستخدم forwardRef

// الطريقة الأبسط — أضف هذا للـ className أو style:
// whileTap يعمل مع motion.button فقط
```

اقرأ الملف أولاً — إن كان `button.tsx` يستخدم `forwardRef` مع HTML button، غيّره لـ `motion.button`:

```typescript
import { motion } from "framer-motion";

// في الـ return:
<motion.button
  ref={ref}
  whileTap={!disabled && !loading ? { scale: 0.97 } : {}}
  // ... باقي الـ props
>
```

- [ ] **Step 3: Badge entrance animation**

في `badge.tsx`، أضف wrapper motion:

```typescript
import { motion } from "framer-motion";
import { scalePopVariants } from "@/lib/motion-variants";

// إن كانت Badge ترجع <span> أو <div>، حوّلها لـ motion:
<motion.span
  variants={scalePopVariants}
  initial="hidden"
  animate="visible"
  exit="exit"
  // ... الـ className الموجود
>
  {children}
</motion.span>
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/button.tsx components/ui/badge.tsx
git commit -m "feat(motion): button press feedback + badge pop-in animation"
```

---

## Task 11: Form Inputs — Focus Ring + Error Shake

**Files:**
- Modify: `app/[locale]/globals.css` (للـ CSS-based focus ring)
- أو Modify: `components/ui/input.tsx` (إن وُجد)

- [ ] **Step 1: Read input component**

اقرأ `components/ui/input.tsx` أو ابحث عن الـ input styles في `globals.css`.

- [ ] **Step 2: Enhanced focus ring (CSS)**

في `globals.css`، ابحث عن `--focus-ring` أو `.input:focus`. أضف:

```css
/* Enhanced focus ring */
input:focus, select:focus, textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent);
  transition: box-shadow var(--transition-base);
}
```

- [ ] **Step 3: Error shake (framer-motion)**

إن وُجد component للـ input، أضف shake عند error:

```typescript
import { motion, useAnimationControls } from "framer-motion";
import { shakeVariants } from "@/lib/motion-variants";

// في الـ component:
const controls = useAnimationControls();

useEffect(() => {
  if (error) {
    controls.start("shake");
  }
}, [error, controls]);

<motion.div
  variants={shakeVariants}
  animate={controls}
>
  <input ... />
</motion.div>
```

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/globals.css
git commit -m "feat(motion): enhanced focus ring + input error shake"
```

---

## Task 12: Empty States — Icon Bounce + Text Stagger

**Files:**
- Modify: `components/ui/empty-state.tsx` (أو أينما يقع الـ component)

- [ ] **Step 1: Find empty state component**

```bash
find . -name "empty-state.tsx" -not -path "*/node_modules/*"
```

- [ ] **Step 2: Read the component**

اقرأ الملف أولاً.

- [ ] **Step 3: Add entrance animations**

```typescript
import { motion } from "framer-motion";
import { springBouncy } from "@/lib/motion-variants";

// Icon:
<motion.div
  initial={{ opacity: 0, scale: 0.6 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ ...springBouncy, delay: 0 }}
>
  {icon && <Icon />}
</motion.div>

// Title:
<motion.p
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: 0.1 }}
>
  {title}
</motion.p>

// Description:
<motion.p
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: 0.18 }}
>
  {description}
</motion.p>

// CTA Button:
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: 0.26 }}
>
  {children}
</motion.div>
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/empty-state.tsx
git commit -m "feat(motion): empty state icon bounce + text stagger"
```

---

## Task 13: Dropdown Menus — Item Stagger

**Files:**
- Modify: `app/[locale]/students/_components/StudentDropdownMenu.tsx`
- Modify: `app/[locale]/salaries/_components/TeacherDropdownMenu.tsx`

- [ ] **Step 1: Read StudentDropdownMenu**

اقرأ الملف أولاً لفهم البنية.

- [ ] **Step 2: Add stagger to dropdown items**

```typescript
import { motion, AnimatePresence } from "framer-motion";
import { slideDownVariants, containerVariants, itemVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";

const reduced = usePrefersReducedMotion();

// Dropdown container:
<AnimatePresence>
  {isOpen && (
    <motion.div
      variants={getVariants(reduced, slideDownVariants)}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute ..." // الـ classes الموجودة
    >
      <motion.div
        variants={getVariants(reduced, containerVariants(0.05))}
        initial="hidden"
        animate="visible"
      >
        {items.map((item) => (
          <motion.button
            key={item.id}
            variants={getVariants(reduced, itemVariants)}
            // ... props أخرى
          >
            {item.label}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Step 3: Apply same to TeacherDropdownMenu**

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/students/_components/StudentDropdownMenu.tsx \
        app/[locale]/salaries/_components/TeacherDropdownMenu.tsx
git commit -m "feat(motion): dropdown menu item stagger animation"
```

---

## Task 14: Branch Overview + Payments Stats Panels

**Files:**
- Modify: `app/[locale]/branch-overview/_components/BranchDashboardExperience.tsx`
- Modify: `app/[locale]/payments/_components/PaymentsStats.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Apply containerVariants + cardVariants (same as Task 2 pattern)**

نفس نمط StatisticsCards — container بـ stagger، كل stat card بـ `cardVariants`.

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/branch-overview/_components/BranchDashboardExperience.tsx \
        app/[locale]/payments/_components/PaymentsStats.tsx
git commit -m "feat(motion): branch overview + payments stats stagger animations"
```

---

## Task 15: FinancialAnalysisPanel + ReportsSection Charts

**Files:**
- Modify: `app/[locale]/dashboard/_components/FinancialAnalysisPanel.tsx`
- Modify: `app/[locale]/salaries/_components/ReportsSection.tsx`

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Enable Recharts animations**

ابحث عن كل `<Bar>`, `<Line>`, `<Area>`, `<Pie>` في الملفين وأضف:

```typescript
const reduced = usePrefersReducedMotion();

<Bar
  isAnimationActive={!reduced}
  animationDuration={900}
  animationEasing="ease-out"
  ...
/>

<Line
  isAnimationActive={!reduced}
  animationDuration={1100}
  animationEasing="ease-in-out"
  ...
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/[locale]/dashboard/_components/FinancialAnalysisPanel.tsx \
        app/[locale]/salaries/_components/ReportsSection.tsx
git commit -m "feat(motion): enable recharts data animations"
```

---

## Verification

بعد كل الـ tasks:

- [ ] **1. شغّل الـ dev server**
```bash
pnpm dev
```

- [ ] **2. افتح dashboard** — تحقق من:
  - Stats cards تظهر بـ stagger
  - Hover يكبّرها قليلاً
  - Activity panel items تظهر بـ stagger

- [ ] **3. افتح Students page** — تحقق من:
  - Rows تظهر بـ stagger
  - Page change يعيد الـ animation
  - Empty state يظهر بـ bounce

- [ ] **4. افتح sidebar** — تحقق من:
  - Active indicator ينزلق بين الـ links
  - Collapse icon يدور

- [ ] **5. افتح أي modal** — تحقق من:
  - Backdrop blur
  - Modal يظهر بـ spring

- [ ] **6. تحقق من reduced motion** في macOS: System Settings → Accessibility → Reduce Motion → ON، ثم تحقق أن الـ animations تختفي.

- [ ] **7. تحقق من RTL** — ادخل للموقع بالعربية وتأكد أن الـ animations لا تعكس البصر.

---

## ملاحظة للـ Agent

- **لا تغيّر** البنية الداخلية لأي component — فقط أضف `motion.*` وـ `variants`.
- **اقرأ الملف أولاً** قبل تعديله — البنية الداخلية قد تختلف عن المتوقع.
- **كل task مستقلة** — يمكن تنفيذها بالتوازي إذا كانت الملفات مختلفة.
- إن كان ملف ما يستخدم `forwardRef`، تأكد أن `ref` يصل لـ `motion.*` component.
