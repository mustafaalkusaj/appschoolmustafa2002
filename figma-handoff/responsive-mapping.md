<!-- Generated: 2026-04-08 (v2) -->

# Responsive Mapping

## Overview

This document defines responsive behavior across three explicit breakpoints: **Desktop (1440px)**, **Tablet (768px)**, and **Mobile (390px)**. Each major screen is documented with layout changes, component behavior, and Tailwind breakpoint classes.

---

## Breakpoint Model

| Breakpoint | Width | Tailwind Class | Primary Use |
|------------|-------|----------------|-------------|
| **Desktop** | 1440px | `xl:` / `2xl:` | Full shell with persistent sidebar |
| **Tablet** | 768px | `md:` | Collapsed sidebar, condensed layouts |
| **Mobile** | 390px | Default / `sm:` | Hidden sidebar, stacked layouts |

### Breakpoint Scale

| Token | Width | Notes |
|-------|-------|-------|
| xs | 390px | Mobile viewport |
| sm | 640px | Large mobile / small tablet |
| md | 768px | Tablet viewport |
| lg | 1024px | Small desktop |
| xl | 1280px | Standard desktop |
| 2xl | 1536px | Large desktop |

---

## Global Layout Rules

### App Shell Structure

| Component | Desktop (1440) | Tablet (768) | Mobile (390) |
|-----------|----------------|--------------|--------------|
| **Sidebar** | Fixed 280px, visible | Overlay/drawer, toggle button | Hidden, drawer toggle |
| **Topbar** | Fixed 64px, full width | Fixed 64px, full width | Fixed 64px, full width |
| **Content Area** | `calc(100% - 280px)`, scroll | 100%, scroll | 100%, scroll |
| **Grid Columns** | 12-column | 8-column | 4-column |

### Grid Rules

| Container | Max Width | Gutters | Column Count |
|-----------|-----------|---------|--------------|
| Desktop | 1280px | 24px | 12 |
| Tablet | 768px | 16px | 8 |
| Mobile | 390px | 12px | 4 |

---

## Screen-by-Screen Responsive Mapping

---

### App Shell (Sidebar + Topbar)

#### Sidebar Behavior

| Viewport | Behavior | Tailwind Classes |
|----------|----------|------------------|
| Desktop | Fixed position, 280px width, always visible | `lg:block hidden` |
| Tablet | Hidden by default, overlay when toggled | `lg:hidden fixed inset-0 z-50` |
| Mobile | Hidden, slide-over drawer | `fixed inset-y-0 start-0 z-50 transform -translate-x-full` |

#### Topbar Behavior

| Viewport | Behavior | Tailwind Classes |
|----------|----------|------------------|
| Desktop | Fixed top, 64px height, sidebar offset | `fixed top-0 right-0 left-[280px] h-16` |
| Tablet | Fixed top, 64px height, full width | `fixed top-0 inset-x-0 h-16` |
| Mobile | Fixed top, 64px height, hamburger menu | `fixed top-0 inset-x-0 h-16` |

#### Toggle Button

| Viewport | Visibility | Position |
|----------|------------|----------|
| Desktop | Hidden | N/A |
| Tablet | Visible | Topbar left (RTL: right) |
| Mobile | Visible | Topbar left (RTL: right) |

---

### Login

#### Layout Changes

| Viewport | Layout | Hero | Form Card |
|----------|--------|------|-----------|
| Desktop | Split (60/40) | Left (RTL: right) | Right (RTL: left) |
| Tablet | Stacked | Top, reduced height | Below hero |
| Mobile | Single column | Hidden | Full height |

#### Tailwind Classes

```html
<!-- Container -->
<div class="min-h-screen xl:flex-row flex-col">
  
  <!-- Hero (hidden on mobile) -->
  <div class="xl:w-3/5 hidden xl:flex">...</div>
  
  <!-- Form Card -->
  <div class="xl:w-2/5 w-full flex items-center justify-center p-6">
    <div class="w-full max-w-md">...</div>
  </div>
</div>
```

#### RTL/LTR Differences

| Element | RTL | LTR |
|---------|-----|-----|
| Hero position | Right | Left |
| Form position | Left | Right |
| Text alignment | Right | Left |

---

### Dashboard

#### KPI Grid Changes

| Viewport | Grid Columns | Tailwind Classes |
|----------|--------------|------------------|
| Desktop | 4 columns | `xl:grid-cols-4` |
| Tablet | 2 columns | `md:grid-cols-2` |
| Mobile | 2 columns | `sm:grid-cols-2 grid-cols-1` |

#### Panel Layout

| Viewport | Layout | Tailwind Classes |
|----------|--------|------------------|
| Desktop | Side-by-side panels | `xl:grid-cols-2` |
| Tablet | Stacked panels | `md:grid-cols-1` |
| Mobile | Single column | `grid-cols-1` |

#### Charts

| Viewport | Behavior | Notes |
|----------|----------|-------|
| Desktop | Side-by-side (bar + pie) | `grid-cols-2` |
| Tablet | Stacked | `grid-cols-1` |
| Mobile | Stacked, reduced height | `grid-cols-1` |

#### Hidden/Shown Elements

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Sidebar | Visible | Overlay | Hidden |
| SchoolBrandingPanel | Visible (super-admin) | Visible | Visible |
| Chart legends | Full | Compact | Minimal |

---

### Students

#### Tabs

| Viewport | Tab Layout | Tailwind Classes |
|----------|------------|------------------|
| Desktop | Horizontal, inline | `flex gap-2` |
| Tablet | Horizontal, scrollable | `flex gap-2 overflow-x-auto` |
| Mobile | Horizontal, scrollable | `flex gap-1 overflow-x-auto` |

#### Table vs Cards

| Viewport | Display Mode | Tailwind Classes |
|----------|--------------|------------------|
| Desktop | Table | `hidden md:table` |
| Tablet | Table (horizontal scroll) | `overflow-x-auto` |
| Mobile | Card layout | `md:hidden block` |

#### Table Columns (Desktop)

| Column | Visibility |
|--------|------------|
| # | Visible |
| Name | Visible |
| Class | Visible |
| Phone | Visible |
| Status | Visible |
| Actions | Visible |

#### Mobile Card Content

| Field | Display |
|-------|---------|
| Name | Bold, primary |
| Class | Secondary text |
| Status badge | Pill |
| Quick actions | Icon buttons |

#### Filters

| Viewport | Layout | Tailwind Classes |
|----------|--------|------------------|
| Desktop | Horizontal row | `lg:flex-row flex-col` |
| Tablet | 2-column grid | `md:grid-cols-2` |
| Mobile | Stacked | `flex-col` |

---

### Teachers

Same responsive patterns as Students (table → cards, filters stack).

---

### Payments

#### Stats Cards

| Viewport | Grid | Tailwind Classes |
|----------|------|------------------|
| Desktop | 4 columns | `xl:grid-cols-4` |
| Tablet | 2 columns | `sm:grid-cols-2` |
| Mobile | 2 columns | `sm:grid-cols-2 grid-cols-1` |

#### Table

| Viewport | Display |
|----------|---------|
| Desktop | Full table (9 columns) |
| Tablet | Horizontal scroll |
| Mobile | Card layout |

#### Student Detail Panel (Drawer)

| Viewport | Behavior | Dimensions |
|----------|----------|------------|
| Desktop | Right slide-out drawer | 400px width |
| Tablet | Right slide-out drawer | 50% width |
| Mobile | Full-screen overlay | 100% width |

#### Tailwind Classes (Panel)

```html
<div class="fixed inset-y-0 end-0 w-full md:w-[400px] z-50 bg-white dark:bg-slate-900 shadow-xl">
  ...
</div>
```

---

### Salaries

#### Nested Sidebar (SalariesSidebar)

| Viewport | Behavior | Tailwind Classes |
|----------|----------|------------------|
| Desktop | Vertical sidebar, 200px | `lg:block hidden w-[200px]` |
| Tablet | Horizontal tab chips | `lg:hidden flex gap-2 overflow-x-auto` |
| Mobile | Horizontal scroll chips | `flex gap-2 overflow-x-auto` |

#### Section Layout

| Viewport | Layout |
|----------|--------|
| Desktop | Sidebar (left/right) + main content |
| Tablet | Top chips + content below |
| Mobile | Scrollable chips + stacked content |

---

### Expenses

#### Dual Tab Interface

| Viewport | Tab Layout |
|----------|------------|
| Desktop | Horizontal buttons |
| Tablet | Horizontal buttons |
| Mobile | Horizontal buttons, compact |

#### Tables

| Viewport | Display |
|----------|---------|
| Desktop | Full table |
| Tablet | Horizontal scroll |
| Mobile | Card layout |

---

### Attendance

#### Stats Grid (6 metrics)

| Viewport | Grid | Tailwind Classes |
|----------|------|------------------|
| Desktop | 6 columns | `lg:grid-cols-6` |
| Tablet | 3 columns | `md:grid-cols-3` |
| Mobile | 2 columns | `sm:grid-cols-2 grid-cols-2` |

#### Attendance Table

| Viewport | Display |
|----------|---------|
| Desktop | Spreadsheet table with inline status buttons |
| Tablet | Horizontal scroll table |
| Mobile | Card layout with stacked status buttons |

#### Status Buttons

| Viewport | Layout |
|----------|--------|
| Desktop | Inline horizontal (4 buttons) |
| Tablet | Horizontal, wrapped |
| Mobile | Vertical stack or wrapped |

---

### Reports

#### Report Cards Grid

| Viewport | Grid | Tailwind Classes |
|----------|------|------------------|
| Desktop | 4 columns | `xl:grid-cols-4` |
| Tablet | 2 columns | `md:grid-cols-2` |
| Mobile | 1 column | `grid-cols-1` |

#### Financial Summary Strip

| Viewport | Layout |
|----------|--------|
| Desktop | Horizontal row |
| Tablet | Horizontal row, compact |
| Mobile | Stacked cards |

---

### Monitoring

#### Filters Grid (6 columns)

| Viewport | Grid | Tailwind Classes |
|----------|------|------------------|
| Desktop | 6 columns | `xl:grid-cols-6` |
| Tablet | 2 columns | `md:grid-cols-2` |
| Mobile | 1 column | `grid-cols-1` |

#### Detail Modal

| Viewport | Behavior | Dimensions |
|----------|----------|------------|
| Desktop | Centered modal | `max-w-5xl` |
| Tablet | Centered modal | `max-w-3xl` |
| Mobile | Full-height sheet | `h-[100vh] w-full` |

---

### Fee Notifications

#### 2-Column Layout

| Viewport | Layout | Tailwind Classes |
|----------|--------|------------------|
| Desktop | History (1fr) + Composer (460px) | `xl:grid-cols-[minmax(0,1fr)_460px]` |
| Tablet | Stacked | `grid-cols-1` |
| Mobile | Stacked | `grid-cols-1` |

#### Student Selection Grid

| Viewport | Max Height | Tailwind Classes |
|----------|------------|------------------|
| All | 220px scrollable | `max-h-[220px] overflow-y-auto` |

---

### Super Admin

#### Tab Navigation

| Viewport | Layout | Tailwind Classes |
|----------|--------|------------------|
| Desktop | Horizontal tab rail | `flex gap-1` |
| Tablet | Horizontal scroll | `flex gap-1 overflow-x-auto` |
| Mobile | Horizontal scroll | `flex gap-1 overflow-x-auto` |

#### Content Grid

| Viewport | Grid |
|----------|------|
| Desktop | Multi-column responsive |
| Tablet | 2-column |
| Mobile | 1-column |

#### Form Modals

| Viewport | Behavior | Dimensions |
|----------|----------|------------|
| Desktop | Centered modal | `max-w-[500px]` |
| Tablet | Centered modal | `max-w-[90%]` |
| Mobile | Full-screen | `w-full h-full` |

---

## Modal Sizing

### Standard Modal

| Viewport | Width | Height | Tailwind Classes |
|----------|-------|--------|------------------|
| Desktop | `max-w-lg` (512px) | `max-h-[88vh]` | `rounded-[28px]` |
| Tablet | `max-w-[90%]` | `max-h-[90vh]` | `rounded-[24px]` |
| Mobile | `w-[95%]` | `max-h-[95vh]` | `rounded-[20px]` |

### Large Modal (Detail views)

| Viewport | Width | Height |
|----------|-------|--------|
| Desktop | `max-w-5xl` (1024px) | `max-h-[88vh]` |
| Tablet | `max-w-[95%]` | `max-h-[90vh]` |
| Mobile | Full-screen | `100vh` |

### Confirm Dialog

| Viewport | Width |
|----------|-------|
| Desktop | `max-w-[420px]` |
| Tablet | `max-w-[420px]` |
| Mobile | `w-[90%]` |

---

## RTL/LTR Responsive Differences

### Layout Mirroring

| Element | RTL Behavior | LTR Behavior |
|---------|--------------|--------------|
| Sidebar position | Fixed right (inset-inline-end) | Fixed left (inset-inline-start) |
| Panel position | Left (start) | Right (end) |
| Chevron icons | ChevronLeft → ChevronRight | ChevronRight → ChevronLeft |
| Breadcrumb separator | ◀ (reversed) | ▶ |
| Text alignment | `text-right` | `text-left` |
| Flex direction | `flex-row-reverse` | `flex-row` |
| Margin/padding | `ms-*`, `me-*` (logical) | `ms-*`, `me-*` (logical) |

### Tailwind RTL Utilities

```html
<!-- Use logical properties for RTL support -->
<div class="ms-4 pe-2">...</div>
<div class="text-start">...</div>
<div class="rounded-s-lg rounded-e-none">...</div>
```

### Icon Positioning

| Component | RTL | LTR |
|-----------|-----|-----|
| Button with leading icon | Icon on right | Icon on left |
| Input with trailing action | Action on left | Action on right |
| Back navigation | ChevronRight | ChevronLeft |

---

## Grid Behavior Summary

### Stats Cards

| Viewport | Columns | Gap | Tailwind |
|----------|---------|-----|----------|
| Desktop | 4-6 | 16px | `xl:grid-cols-4 lg:grid-cols-3` |
| Tablet | 2-3 | 12px | `md:grid-cols-2` |
| Mobile | 1-2 | 12px | `sm:grid-cols-2 grid-cols-1` |

### Form Grid

| Viewport | Columns | Tailwind |
|----------|---------|----------|
| Desktop | 2-3 | `lg:grid-cols-3 md:grid-cols-2` |
| Tablet | 2 | `md:grid-cols-2` |
| Mobile | 1 | `grid-cols-1` |

### Table Container

| Viewport | Behavior |
|----------|----------|
| Desktop | Full table visible |
| Tablet | `overflow-x-auto` |
| Mobile | Card layout or scroll |

---

## Hidden/Shown Elements Per Viewport

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| App sidebar | Visible | Overlay | Drawer |
| Sidebar toggle | Hidden | Visible | Visible |
| Login hero | Visible | Reduced | Hidden |
| Table header | Full | Compact | N/A (cards) |
| Filter labels | Full | Compact | Icons only |
| Pagination info | Full | Compact | Minimal |
| Bulk actions | Toolbar | Floating | FAB |

---

## Tailwind Breakpoint Classes Reference

### Common Patterns

```html
<!-- Responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">

<!-- Responsive flex -->
<div class="flex flex-col md:flex-row gap-4">

<!-- Responsive spacing -->
<div class="p-4 md:p-6 lg:p-8">

<!-- Responsive text -->
<h1 class="text-2xl md:text-3xl lg:text-4xl">

<!-- Show/hide -->
<div class="hidden lg:block">Desktop only</div>
<div class="lg:hidden">Mobile/tablet only</div>

<!-- Responsive width -->
<div class="w-full md:w-1/2 lg:w-1/3">
```

---

## Summary

| Screen | Desktop (1440) | Tablet (768) | Mobile (390) |
|--------|----------------|--------------|--------------|
| App Shell | Sidebar + Topbar | Overlay sidebar | Drawer |
| Login | Split layout | Stacked | Form only |
| Dashboard | 4-col KPI + panels | 2-col KPI + stacked | 1-2 col KPI |
| Students | Table view | Scroll table | Card view |
| Payments | Table + drawer | Table + overlay | Cards + fullscreen |
| Salaries | Nested sidebar | Tab chips | Scroll chips |
| Super Admin | Full tabs | Scroll tabs | Scroll tabs |
| Modals | Centered | Centered | Full-screen |
