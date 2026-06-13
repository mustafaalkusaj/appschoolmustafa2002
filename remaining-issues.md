# Remaining Issues

| Severity | Route / Screen / Area | Blocker Reason | Recommended Next Action |
| --- | --- | --- | --- |
| Medium | Repo-wide linting | `npm run lint` fails with 35 errors and 71 warnings across unrelated UI files, generated outputs, and backup directories not addressed in this stabilization pass | Clean the lint backlog or exclude generated/backup paths from the active lint target |
| Medium | Offline / weak-network behavior | Offline reload of `/ar/dashboard` falls through to `chrome-error://chromewebdata/` with `ERR_INTERNET_DISCONNECTED`; there is no app-level recovery UI or queueing | Add offline-aware fallback UI, retry affordances, and explicit unsupported-state handling |
| Medium | Students bilingual completeness | Student action/menu and operation feedback paths still contain hardcoded Arabic in code and were not fully reworked in this pass | Move remaining student strings into locale files and add live regression coverage |
| Medium | Cold-load performance | Heavy routes still take multiple seconds on first hit in dev, especially dashboard/monitoring/reports/expenses | Reduce initial request fan-out and profile slow API/server paths |
| Low | Long combined Playwright run stability | When long heavy-route specs run after other browser specs in dev, cold-start timeouts can still hit the suite | Keep the higher spec timeouts, shard slow suites, or separate route sweeps from shorter smoke checks |
| Low | Student credential/access-card print sign-off | Extra late-pass probing for this specific flow was blocked by students-page timeouts under heavy concurrent dev load | Add a dedicated students-credentials print Playwright spec and rerun on a quieter dev session |
