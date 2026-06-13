# Figma Build Plan

## Overview

- Source of truth: frontend code in `/Users/musatafa/school-app`
- Primary localized routes inventoried: 19
- Distinct screen surfaces to reconstruct: 45
- Component files inventoried for componentization: 103
- Direct Figma API/plugin creation: unavailable in this environment, so this package is optimized for manual rebuild in Figma

## Product Structure

- Framework: Next.js 16 App Router + React 19
- Styling: Tailwind CSS v4 + large `globals.css` token layer + runtime CSS variables
- Localization: `next-intl`; Arabic-first with `/ar` default and English `/en`
- Theming: `next-themes` with light, dark, system
- Tenant branding: runtime per-school palette overrides and theme presets
- Charts: Recharts
- Icons: Lucide mapped through `AppIcon`
- Auth gating: `ProtectedRoute` + role and permission rules

## Reconstruction Strategy

1. Build Foundations, Tokens, and the shell template first.
2. Build shared components and table/filter primitives second.
3. Reconstruct auth and gate screens.
4. Reconstruct core academic and finance routes.
5. Reconstruct moderation and super-admin routes.
6. Add prototypes, overlays, and system/error states last.

## Recommended Figma Pages And Frames

### 1. Cover

- FRA / Cover / Overview Board / 1440x1024 / vertical auto layout / 80 padding / 32 gap / center-left alignment
- FRA / Cover / Route Map / 1440x900 / horizontal layout / 64 padding / 24 gap

### 2. Foundations

- FRA / Foundations / Color Primitives / 1600x1200 / grid
- FRA / Foundations / Typography / 1440x1200 / vertical auto layout
- FRA / Foundations / Radius Shadows Motion / 1440x900 / 48 padding
- FRA / Foundations / RTL Rules / 1440x900 / vertical auto layout

### 3. Tokens

- FRA / Tokens / Light Semantic / 1600x1400
- FRA / Tokens / Dark Semantic / 1600x1400
- FRA / Tokens / Runtime Branding Presets / 1920x1600 / wrap grid

### 4. Icons and Assets

- FRA / Assets / Lucide Mapping / 1600x1200
- FRA / Assets / Brand Lockups / 1440x900
- FRA / Assets / Chart Swatches / 1440x900

### 5. Components

- FRA / Components / Primitives / 1920x1600
- FRA / Components / Shell / 1920x1400
- FRA / Components / Tables and Filters / 1920x1800
- FRA / Components / Modals and Drawers / 1920x1800

### 6. Patterns

- FRA / Patterns / KPI Rows / 1600x1200
- FRA / Patterns / Data Management Header / 1600x1200
- FRA / Patterns / School Scope Banner / 1600x900
- FRA / Patterns / Gate Screens / 1600x900

### 7. Templates

- FRA / Templates / App Shell Desktop / 1440x1400 / fill container center
- FRA / Templates / App Shell Mobile / 390x844
- FRA / Templates / Legacy Admin List / 1440x1200

### 8. Screens - Auth

- SCR / Login / Desktop / 1440x1024
- SCR / Login / Mobile / 390x844
- SCR / Forgot Password / Desktop / 1440x1024
- SCR / Access Denied / Desktop / 1440x900
- SCR / Subscription Expired / Desktop / 1440x900
- SCR / Not Found / Desktop / 1440x900
- SCR / Error / Locale Boundary / 1440x900

### 9. Screens - Dashboard

- SCR / Home Launcher / Desktop / 1440x1024
- SCR / Dashboard / Default / 1440x1400
- SCR / Dashboard / Empty Operational Data / 1440x1400
- SCR / Dashboard / Super Admin Scoped / 1440x1400
- SCR / Dashboard / Classes Modal / 1440x1400 + overlay
- SCR / Dashboard / Fee Modal / 1440x1400 + overlay

### 10. Screens - Academic / Core App

- SCR / Students / Default / 1440x1400
- SCR / Students / Add Modal / 1440x1400 + overlay
- SCR / Teachers / Default / 1440x1400
- SCR / Attendance / Default / 1440x1400
- SCR / Attendance / Filtered / 1440x1400

### 11. Screens - Finance

- SCR / Payments / Default / 1440x1600
- SCR / Payments / Student Detail Panel / 1440x1600 + panel
- SCR / Expenses / Invoices Tab / 1440x1500
- SCR / Expenses / Types Tab / 1440x1500
- SCR / Salaries / Main / 1440x1600
- SCR / Salaries / Reports Section / 1440x1600

### 12. Screens - Reports / Monitoring

- SCR / Reports / Default / 1440x1500
- SCR / Monitoring / Messages / 1440x1600
- SCR / Monitoring / Detail Modal / 1440x1600 + overlay
- SCR / Fee Notifications / Composer / 1440x1600
- SCR / Fee Notifications / History Modal / 1440x1600 + overlay

### 13. Screens - Admin

- SCR / Schools / Legacy / 1440x1200
- SCR / Subscriptions / Legacy / 1440x1200

### 14. Screens - Super Admin

- SCR / Super Admin / Overview Tab / 1440x1600
- SCR / Super Admin / Schools Tab / 1440x1600
- SCR / Super Admin / Users Tab / 1440x1600
- SCR / Super Admin / Subscriptions Tab / 1440x1600
- SCR / Super Admin / Audit Tab / 1440x1600
- SCR / Super Admin / Roles Tab / 1440x1600
- SCR / Super Admin / Notifications Tab / 1440x1600
- SCR / Super Admin / Monitoring Tab / 1440x1600
- SCR / Super Admin / Branches Tab / 1440x1600
- SCR / Super Admin / School Form Modal / 1440x1600 + overlay
- SCR / Super Admin / User Form Modal / 1440x1600 + overlay

### 15. Prototypes / User Flows

- FLOW / Login
- FLOW / Admin Daily
- FLOW / Employee Collection
- FLOW / Super Admin Operations
- FLOW / School Scope Switching

### 16. Archive / Ambiguous / Inferred

- FRA / Ambiguous / Legacy Routes and Redirects
- FRA / Ambiguous / Runtime-only Data States
- FRA / Ambiguous / Verification Notes


## Frame Rules

- Desktop canonical shell frame: 1440x1400, vertical auto layout, content width 1600 max but framed inside 1440 for capture
- Tablet reference frame: 1024x1366, preserve sidebar collapse and stacked KPI behavior
- Mobile reference frame: 390x844, sidebar becomes overlay drawer, topbar compresses, hero sections collapse
- Direction: build all Arabic frames as RTL first, then derive LTR mirrors where the code exposes `/en`
- Constraints: sidebar fixed right in RTL, topbar pinned top, content fill container
- Resizing: cards and tables should use fill container, pills and badges use hug contents

## Verification Notes

- Live screenshots captured in this audit:
  - `/Users/musatafa/school-app/figma-handoff/screenshots/login-desktop.png`
  - `/Users/musatafa/school-app/figma-handoff/screenshots/login-mobile.png`
- Additional local manual-check screenshots inspected:
  - `/Users/musatafa/school-app/output/playwright/manual-check/dashboard.png`
  - `/Users/musatafa/school-app/output/playwright/manual-check/attendance.png`
- Payment and fee-notification manual screenshots already present locally appear blank, so those surfaces remain primarily code-derived.
