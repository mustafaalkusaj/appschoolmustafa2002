# Redesign Changed Files

Generated: 2026-04-10  
Scope: files changed in the April 10 final stabilization + verification pass

## Foundations

| File | Why it changed | Affects |
|---|---|---|
| [`app/layout.tsx`](/Users/musatafa/school-app/app/layout.tsx) | moved Cairo and Inter to `next/font` so fonts load under CSP | global typography |
| [`app/[locale]/globals.css`](/Users/musatafa/school-app/app/[locale]/globals.css) | completed missing semantic tokens, fixed font-variable wiring, added shell utility button styles | all pages and shared shell |
| [`components/AppShellTopbar.tsx`](/Users/musatafa/school-app/components/AppShellTopbar.tsx) | exposed visible language/theme controls in the authenticated shell | all authenticated routes |
| [`components/LanguageToggle.tsx`](/Users/musatafa/school-app/components/LanguageToggle.tsx) | localized language labels and compact rendering | auth shell, topbar |
| [`components/ThemeModeToggle.tsx`](/Users/musatafa/school-app/components/ThemeModeToggle.tsx) | localized theme labels and cleaned compact rendering | auth shell, topbar |

## Login

| File | Why it changed | Affects |
|---|---|---|
| [`app/[locale]/login/page.tsx`](/Users/musatafa/school-app/app/[locale]/login/page.tsx) | added visible language/theme controls and moved visible copy to locale messages | login |

## Dashboard Resilience

| File | Why it changed | Affects |
|---|---|---|
| [`app/[locale]/dashboard/page.tsx`](/Users/musatafa/school-app/app/[locale]/dashboard/page.tsx) | removed fragile page-wide loading gate and rendered widgets independently | dashboard |
| [`app/[locale]/dashboard/_hooks/useDashboardData.ts`](/Users/musatafa/school-app/app/[locale]/dashboard/_hooks/useDashboardData.ts) | added retryable error state for overview data | dashboard stats and finance widgets |
| [`app/[locale]/dashboard/_hooks/useRecentActivity.ts`](/Users/musatafa/school-app/app/[locale]/dashboard/_hooks/useRecentActivity.ts) | added isolated error state and `Promise.allSettled` resilience | recent activity widget |
| [`app/[locale]/dashboard/_hooks/useNotifications.ts`](/Users/musatafa/school-app/app/[locale]/dashboard/_hooks/useNotifications.ts) | added isolated error state and disabled-table handling | notifications widget |
| [`app/[locale]/dashboard/_components/StatisticsCards.tsx`](/Users/musatafa/school-app/app/[locale]/dashboard/_components/StatisticsCards.tsx) | added loading and error states | dashboard stats |
| [`app/[locale]/dashboard/_components/ClassFeesTable.tsx`](/Users/musatafa/school-app/app/[locale]/dashboard/_components/ClassFeesTable.tsx) | added loading and error states | dashboard fees table |
| [`app/[locale]/dashboard/_components/RecentPaymentsPanel.tsx`](/Users/musatafa/school-app/app/[locale]/dashboard/_components/RecentPaymentsPanel.tsx) | added loading and error states plus locale-safe navigation cue | dashboard recent payments |
| [`app/[locale]/dashboard/_components/OverdueStudentsPanel.tsx`](/Users/musatafa/school-app/app/[locale]/dashboard/_components/OverdueStudentsPanel.tsx) | added loading and error states plus locale-safe navigation cue | dashboard overdue panel |
| [`app/[locale]/dashboard/_components/RecentActivityPanel.tsx`](/Users/musatafa/school-app/app/[locale]/dashboard/_components/RecentActivityPanel.tsx) | added skeletons, localized statuses, and isolated error state | dashboard activity |
| [`app/[locale]/dashboard/_components/NotificationsPanel.tsx`](/Users/musatafa/school-app/app/[locale]/dashboard/_components/NotificationsPanel.tsx) | added skeletons and isolated error state | dashboard notifications |

## Payments

| File | Why it changed | Affects |
|---|---|---|
| [`app/[locale]/payments/page.tsx`](/Users/musatafa/school-app/app/[locale]/payments/page.tsx) | localized visible route shell, summary labels, empty state, section header, and delete dialog | payments |
| [`app/[locale]/payments/_components/PaymentsStats.tsx`](/Users/musatafa/school-app/app/[locale]/payments/_components/PaymentsStats.tsx) | localized KPI labels | payments |
| [`app/[locale]/payments/_components/PaymentsToolbar.tsx`](/Users/musatafa/school-app/app/[locale]/payments/_components/PaymentsToolbar.tsx) | localized search and result count | payments |
| [`app/[locale]/payments/_components/PaymentsFilters.tsx`](/Users/musatafa/school-app/app/[locale]/payments/_components/PaymentsFilters.tsx) | localized actions, quick filters, and sort/filter labels | payments |
| [`app/[locale]/payments/_components/PaymentsTable.tsx`](/Users/musatafa/school-app/app/[locale]/payments/_components/PaymentsTable.tsx) | localized visible table labels, statuses, actions, and pagination | payments |
| [`app/[locale]/payments/_components/PaymentsArchive.tsx`](/Users/musatafa/school-app/app/[locale]/payments/_components/PaymentsArchive.tsx) | localized archive summary UI and controls | payments |

## Salaries

| File | Why it changed | Affects |
|---|---|---|
| [`app/[locale]/salaries/page.tsx`](/Users/musatafa/school-app/app/[locale]/salaries/page.tsx) | localized visible route shell, summary cards, default tabs, unpaid warning, loading state, and archive confirmation | salaries |
| [`app/[locale]/salaries/_components/SalariesSidebar.tsx`](/Users/musatafa/school-app/app/[locale]/salaries/_components/SalariesSidebar.tsx) | localized internal payroll sidebar | salaries |
| [`app/[locale]/salaries/_components/QuickAccessGrid.tsx`](/Users/musatafa/school-app/app/[locale]/salaries/_components/QuickAccessGrid.tsx) | localized quick-action labels and show more/less control | salaries |
| [`app/[locale]/salaries/_components/TeachersTable.tsx`](/Users/musatafa/school-app/app/[locale]/salaries/_components/TeachersTable.tsx) | localized visible teacher table labels and actions | salaries |

## Locale Catalogs

| File | Why it changed | Affects |
|---|---|---|
| [`messages/en.json`](/Users/musatafa/school-app/messages/en.json) | added `common.language`, `common.theme`, dashboard resilience strings, payments route strings, and salaries route strings | English UI |
| [`messages/ar.json`](/Users/musatafa/school-app/messages/ar.json) | added matching Arabic strings for the same namespaces | Arabic UI |

## Authenticated QA And Visual Verification

| File | Why it changed | Affects |
|---|---|---|
| [`tests/e2e/helpers/auth.ts`](/Users/musatafa/school-app/tests/e2e/helpers/auth.ts) | reusable admin login helper for authenticated route verification | Playwright QA |
| [`tests/e2e/login.smoke.spec.ts`](/Users/musatafa/school-app/tests/e2e/login.smoke.spec.ts) | aligned login selectors and assertions with the redesigned auth page | Playwright QA |
| [`tests/e2e/authenticated-locale-switch.smoke.spec.ts`](/Users/musatafa/school-app/tests/e2e/authenticated-locale-switch.smoke.spec.ts) | verifies protected-route language switching after login | Playwright QA |
| [`tests/e2e/redesign-visual-capture.spec.ts`](/Users/musatafa/school-app/tests/e2e/redesign-visual-capture.spec.ts) | captures screenshot proof for priority routes in light/dark modes | Playwright verification |
| [`scripts/capture-redesign-verification.mjs`](/Users/musatafa/school-app/scripts/capture-redesign-verification.mjs) | added a reusable script-based capture path for redesign verification | verification tooling |

## Reports And Handoff Docs

| File | Why it changed | Affects |
|---|---|---|
| [`ui-ux-redesign-master-report.md`](/Users/musatafa/school-app/ui-ux-redesign-master-report.md) | replaced stale completion claims with live verified status | redesign reporting |
| [`redesign-changed-files.md`](/Users/musatafa/school-app/redesign-changed-files.md) | inventory of this pass | redesign reporting |
| [`remaining-style-violations.md`](/Users/musatafa/school-app/remaining-style-violations.md) | updated with current enforcement findings | style enforcement |
| [`bilingual-ui-review.md`](/Users/musatafa/school-app/bilingual-ui-review.md) | created bilingual/RTL-LTR review summary | localization QA |
| [`live-visual-verification.md`](/Users/musatafa/school-app/live-visual-verification.md) | created live route verification report with screenshot paths | live QA |
| [`figma-handoff/_REVISION_NOTES.md`](/Users/musatafa/school-app/figma-handoff/_REVISION_NOTES.md) | added current implementation delta note | handoff docs |
| [`docs/web-admin-handoff/README.md`](/Users/musatafa/school-app/docs/web-admin-handoff/README.md) | added current live implementation note | handoff docs |
| [`docs/web-admin-handoff/design-system.md`](/Users/musatafa/school-app/docs/web-admin-handoff/design-system.md) | added live design-system implementation status | handoff docs |
| [`docs/web-admin-handoff/screen-inventory.md`](/Users/musatafa/school-app/docs/web-admin-handoff/screen-inventory.md) | added verified-route status note | handoff docs |
| [`docs/web-admin-handoff/prototype-flows.md`](/Users/musatafa/school-app/docs/web-admin-handoff/prototype-flows.md) | added authenticated QA flow note | handoff docs |

## Final Print Stabilization Pass

| File | Why it changed | Affects |
|---|---|---|
| [`lib/print/branding.ts`](/Users/musatafa/school-app/lib/print/branding.ts) | added hidden-iframe printing and tighter print pagination defaults | all print flows |
| [`app/[locale]/students/_hooks/useStudentsPrint.ts`](/Users/musatafa/school-app/app/[locale]/students/_hooks/useStudentsPrint.ts) | moved student account and list printing off `window.open` and into the shared print helper | students print actions |
| [`app/[locale]/students/_utils.ts`](/Users/musatafa/school-app/app/[locale]/students/_utils.ts) | disabled auto-print in returned print HTML so the shared print helper controls launch timing | student credential cards |
| [`app/[locale]/teachers/_hooks/useTeachersData.ts`](/Users/musatafa/school-app/app/[locale]/teachers/_hooks/useTeachersData.ts) | moved teacher credential card printing off `window.open` and into the shared print helper | teachers print actions |
| [`app/[locale]/teachers/_utils.ts`](/Users/musatafa/school-app/app/[locale]/teachers/_utils.ts) | disabled auto-print in returned print HTML so the shared print helper controls launch timing | teacher credential cards |
| [`app/[locale]/payments/_hooks/usePaymentsPage.ts`](/Users/musatafa/school-app/app/[locale]/payments/_hooks/usePaymentsPage.ts) | moved receipt printing into the shared print helper and kept logo branding in the print shell | payment receipts |
| [`app/[locale]/reports/page.tsx`](/Users/musatafa/school-app/app/[locale]/reports/page.tsx) | moved report printing into the shared print helper and tightened table print sizing | reports print actions |
| [`app/[locale]/salaries/_hooks/usePrintFunctions.ts`](/Users/musatafa/school-app/app/[locale]/salaries/_hooks/usePrintFunctions.ts) | moved salary slip/report printing into the shared print helper | salaries print actions |
| [`app/[locale]/salaries/page.tsx`](/Users/musatafa/school-app/app/[locale]/salaries/page.tsx) | moved in-page salary report printing into the shared print helper | salaries print actions |
