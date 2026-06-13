# UI/UX Redesign Master Report

Generated: 2026-04-10  
Repository: `/Users/musatafa/school-app`  
Active app verified at: `http://localhost:3000`

## Current Outcome

This redesign pass materially improved the live root Next.js app and verified the result in the browser. The most meaningful completed work is:

- repaired the shared light-theme token contract in [`app/[locale]/globals.css`](/Users/musatafa/school-app/app/[locale]/globals.css)
- replaced CSP-blocked font imports with `next/font` loading in [`app/layout.tsx`](/Users/musatafa/school-app/app/layout.tsx)
- exposed visible language and theme controls in the auth shell and authenticated topbar
- made dashboard widgets resilient with per-widget loading, error, and retry states instead of fragile page-wide failures
- localized the visible login, dashboard, payments, and salaries route shells more consistently for Arabic and English
- added authenticated Playwright coverage and regenerated live screenshots for the priority routes
- stabilized all print flows behind a shared hidden iframe helper so receipts, reports, and credential cards print from the current page instead of opening a new popup tab

## Highest-Impact Problems Found

1. The root app already had a partial redesign, but the token contract was incomplete. Shared UI referenced tokens such as `--bg-base`, `--surface-card`, and `--text-muted` before they were consistently defined.
2. Cairo and Inter were requested through blocked external CSS, so the live UI did not reliably load the intended bilingual typography.
3. Dashboard widgets failed too broadly on API `500` responses. The page needed isolated widget resilience, not a single fragile loading/failure gate.
4. The language switch existed but was not prominent enough in the live shell. It did not feel like a core product control.
5. The visible English `payments` and `salaries` routes still showed substantial hardcoded Arabic UI copy.
6. Large route groups such as `fee-notifications` and `monitoring` still carry older dark/slate-heavy styling and unresolved localization debt.

## Redesign Principles Used

- white or near-white surfaces remain the primary visual direction
- one semantic token vocabulary for shell, cards, tables, forms, and feedback states
- bilingual UI is treated as a first-class product feature, not a translation overlay
- shared shell controls stay visible in both authenticated and unauthenticated contexts
- route-level UX favors resilient partial rendering over all-or-nothing loading and failure
- changes stay inside the root app and preserve routing, RBAC, Supabase flows, and current features

## Shared Foundations Changed

- [`app/[locale]/globals.css`](/Users/musatafa/school-app/app/[locale]/globals.css): added missing runtime tokens, stabilized light/dark semantic aliases, and added shared shell utility button styles
- [`app/layout.tsx`](/Users/musatafa/school-app/app/layout.tsx): switched to self-hosted `Inter` and `Cairo` through `next/font/google`
- [`components/AppShellTopbar.tsx`](/Users/musatafa/school-app/components/AppShellTopbar.tsx): visible language switcher and theme mode controls added to the authenticated shell
- [`components/LanguageToggle.tsx`](/Users/musatafa/school-app/components/LanguageToggle.tsx): localized labels and compact rendering support
- [`components/ThemeModeToggle.tsx`](/Users/musatafa/school-app/components/ThemeModeToggle.tsx): localized theme labels and cleaner compact behavior

## Button / Shell / Navigation Changes

- the shared button system already existed; this pass normalized its use in topbar and auth utility controls instead of adding more one-off styles
- the authenticated topbar now visibly exposes language and theme switching
- the login page now exposes the same controls so bilingual mode is discoverable before sign-in
- the shell remains light-first, with dark mode verified as a regression pass rather than the default design direction

## Dashboard Resilience Pattern Applied

Dashboard API-backed widgets now follow a stricter pattern:

- loading skeleton or loading placeholder per widget
- isolated `ErrorState` per failing widget
- retry action for overview, notifications, and recent activity panels
- no page-wide collapse when one API source fails

Files updated:

- [`app/[locale]/dashboard/page.tsx`](/Users/musatafa/school-app/app/[locale]/dashboard/page.tsx)
- [`app/[locale]/dashboard/_hooks/useDashboardData.ts`](/Users/musatafa/school-app/app/[locale]/dashboard/_hooks/useDashboardData.ts)
- [`app/[locale]/dashboard/_hooks/useNotifications.ts`](/Users/musatafa/school-app/app/[locale]/dashboard/_hooks/useNotifications.ts)
- [`app/[locale]/dashboard/_hooks/useRecentActivity.ts`](/Users/musatafa/school-app/app/[locale]/dashboard/_hooks/useRecentActivity.ts)
- widget components under [`app/[locale]/dashboard/_components`](/Users/musatafa/school-app/app/[locale]/dashboard/_components)

## Bilingual / RTL-LTR Changes

- language switching is now visible on login and in the authenticated topbar
- login, dashboard, payments, and salaries all use locale messages for their visible route shell text in Arabic and English
- English captures confirm LTR layout on the verified routes
- Arabic captures confirm RTL layout on the verified routes

## Priority Route Status

Status legend:

- `Verified`: live route updated and screenshot captured
- `Partial`: live route updated and verified, but not all hardcoded UI copy or edge states are migrated
- `Pending`: route group still needs the full redesign/migration pass

| Route group | Status | Notes |
|---|---|---|
| Auth and entry surfaces | Partial | `login` verified in Arabic and English with visible language/theme controls; other auth/gate pages still need the same level of bilingual/system cleanup |
| Dashboard | Verified | resilient widget loading/error/retry states are live and screenshot-backed |
| Students | Partial | live screenshots captured in both locales and dark mode, but this pass did not finish a full students audit |
| Payments | Partial | route shell, filters, table, archive summary, pagination, and delete dialog localized; nested modals and export/print helpers still carry hardcoded copy |
| Salaries | Partial | route shell, sub-sidebar, quick actions, summary cards, default table, and archive confirmation localized; deeper sections and modal flows still need migration |
| Teachers | Pending | not completed in this pass |
| Attendance | Pending | not completed in this pass |
| Expenses | Pending | not completed in this pass |
| Reports | Pending | not completed in this pass |
| Monitoring | Pending | still one of the highest style-debt pages |
| Fee Notifications | Pending | still one of the highest style and localization debt pages |
| Super Admin / Schools / Subscriptions / Users | Pending | not completed in this pass |

## Final Print Stabilization

- print content now uses a shared iframe helper in [`lib/print/branding.ts`](/Users/musatafa/school-app/lib/print/branding.ts)
- receipts, reports, salary slips, and student/teacher credential cards no longer rely on `window.open`
- the print shell keeps logo branding and now tightens print margins and table spacing to reduce awkward page breaks
- long table reports still need a real printer spot-check to confirm the exact browser/driver behavior

## Accessibility Notes

- visible shell controls have localized labels and accessible button text
- keyboard-safe button controls remain intact
- dashboard error states now provide retry actions instead of silent widget failure
- the redesigned surfaces keep strong contrast on white backgrounds

## Definition Of Done Review

Completed for the verified routes in this pass:

- live UI visibly reflects the redesign
- root app served from the correct implementation at `http://localhost:3000`
- Arabic and English are both live on verified routes
- light theme is clearly the primary direction
- dark mode screenshots exist for the priority routes already covered by Playwright

Not yet complete product-wide:

- no hardcoded UI copy across all route groups
- no undefined token usage across all route groups
- shared shell/header/table/form patterns fully adopted across the whole app
- screenshot-backed verification for every route group
- runtime branding preset spot checks for this pass
- one manual print-preview spot check on a long report and a receipt in the target browser/printer setup

## Manual Review Still Needed

- finish localization migration in nested `payments` and `salaries` modals, drawers, exports, and print helpers
- redesign and localize `fee-notifications`
- redesign and localize `monitoring`
- complete the remaining route groups under the same token and shell rules
- run representative runtime-branding preset checks in the live app and document any preset-specific regressions
- resolve broader repo-wide lint debt outside the files touched in this pass
