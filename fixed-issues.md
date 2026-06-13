# Fixed Issues

| Route / Screen / Area | Root Cause | Files Changed | Live Verification |
| --- | --- | --- | --- |
| Login + protected routes | RBAC session sync blocked render and could race with login settlement, causing blank screens or redirect churn | `hooks/useRole.tsx`, `lib/auth.ts`, `lib/authorized-api.ts` | Logged in with admin and super-admin, then reached dashboard and super-admin routes repeatedly in browser |
| Localized login page | Dev CSP blocked inline script execution | `proxy.ts` | `/ar/login` and `/en/login` rendered without the earlier CSP console failure path blocking the page |
| Authenticated locale switch | Dashboard locale button did not reliably change locale in the authenticated shell | `components/LanguageToggle.tsx` | `authenticated-locale-switch.smoke.spec.ts` passed live |
| Monitoring / fee notifications / dashboard activity widgets | Missing schema objects could crash the teacher activity and fee-notification endpoints instead of degrading gracefully | `lib/teacher-activity-server.ts` | `/ar/monitoring` and `/ar/fee-notifications` loaded live and the related API calls returned `200` in server logs |
| English payments detail drawer | Drawer UI strings were hardcoded in Arabic | `app/[locale]/payments/_components/StudentDetailPanel.tsx`, `messages/en.json`, `messages/ar.json` | Opened `/en/payments`, opened a student drawer, and captured `/Users/musatafa/school-app/output/playwright/critical-routes/payments-detail-en.png` |
| English salaries print modal | Modal UI strings were hardcoded in Arabic | `app/[locale]/salaries/_components/PrintModal.tsx`, `messages/en.json`, `messages/ar.json` | Opened `/en/salaries`, opened the print modal, and captured `/Users/musatafa/school-app/output/playwright/critical-routes/salaries-print-modal-en.png` |
| Playwright auth helper stability | Login helper timeouts were too tight for cold dev compiles | `tests/e2e/helpers/auth.ts` | Login-based Playwright specs passed after the helper update |
| Route sweep reliability | Long authenticated route sweeps needed higher timeout headroom | `tests/e2e/critical-route-coverage.smoke.spec.ts` | `critical-route-coverage.smoke.spec.ts` passed in a full live run |
| Missing regression coverage for localized interactive print flows | The earlier suite did not protect the English payments/salaries interactive regressions | `tests/e2e/interactive-locale-and-print.smoke.spec.ts` | New spec passed live and verified print iframe initialization |
