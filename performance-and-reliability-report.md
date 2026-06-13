# Performance And Reliability Report

## Speed Findings

- Cold dev loads are still expensive on the heaviest routes.
- Observed cold-hit timings from live server logs were roughly:
  - dashboard/activity widgets: about 6 to 11 seconds on first compile-heavy hits
  - monitoring / teacher-activity full lists: about 5 to 15 seconds depending on compile state
  - expenses / reports: about 6 to 12 seconds on cold hits
  - salaries bootstrap: about 3 to 6 seconds on cold hits
- Warmed route revisits were materially faster once Next.js compilation and data caches were warm.

## Slow Flows Fixed

- Authenticated boot no longer blocks on RBAC session synchronization.
- Authorized API requests no longer hard-wait indefinitely on Supabase session resolution.
- Missing teacher-activity / fee-notification schema objects no longer take down the surface.
- Locale switching in authenticated UI is now reliable instead of appearing stalled.

## Weak-Network Observations

- Offline reload probe on `/ar/dashboard` produced:
  - final URL: `chrome-error://chromewebdata/`
  - reload error: `ERR_INTERNET_DISCONNECTED`
- The app currently has no offline shell, no queueing, and no graceful disconnected reload recovery.

## Load And Repeated Navigation Observations

- Repeated authenticated navigation across admin and super-admin routes succeeded in live use after the auth/runtime fixes.
- Heavy route-sweep Playwright specs can still hit timeout pressure when bundled together in dev because cold page compiles stack up.
- Individual smoke specs and focused route sweeps passed after the fixes when run directly.

## Remaining Bottlenecks

- Cold-start compile overhead in dev
- API-heavy route fan-out on dashboard, monitoring, reports, and expenses
- Lack of offline/disconnected fallback behavior
- Repo-wide lint debt slowing down clean static validation at the project level
