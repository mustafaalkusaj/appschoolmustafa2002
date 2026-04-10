# Performance And Load Report

## Method

- Browser route timings came from `output/playwright/live-audit/live-audit.json`
- Query and route stress came from `artifacts/reliability-audit/load-audit.json`
- Local HTTP pressure came from `k6 run load-test.js`
- Offline resilience came from the live-audit resilience probes

## Route-Speed Findings

### Faster Admin Routes

- `/ar/dashboard` about `443ms` navigation duration
- `/ar/payments` about `478ms`
- `/en/dashboard` about `537ms`

### Slower Admin Routes

- `/ar/super-admin` about `4247ms`, with repeated `403` calls
- `/ar/fee-notifications` about `2780ms`, with `500` API failure
- `/ar/monitoring` about `2643ms`, with `500` API failure
- `/en/super-admin` about `2648ms`

### Observations

- Payments felt comparatively light in both locales.
- Monitoring and fee notifications were slow and broken at the same time.
- Reports and salaries rendered, but both hit `networkidle timeout` in the broad route sweep.

## Load Audit Findings

- Stable stages:
  - `low-dashboard-queries`: 0 failures, p95 about `1260ms`
  - `low-students-query`: 0 failures, p95 about `1179ms`
  - `moderate-dashboard-queries`: 0 failures, p95 about `2225ms`
  - `moderate-reports-queries`: 0 failures, p95 about `2173ms`
  - `high-students-query`: 0 failures, p95 about `1077ms`
  - `login-cycle`: 0 failures, p95 about `1743ms`

- Heavier but stable stages:
  - `moderate-teachers-api`: 0 failures, avg about `3165ms`, p95 about `5158ms`
  - `high-salaries-queries`: 0 failures, avg about `1124ms`, p95 about `4476ms`
  - `burst-teachers-api`: 0 failures, avg about `2847ms`, p95 about `4099ms`

- Reliability issues during warmup / direct route fetching:
  - `low-super-admin-routes`: 3 failures, all `fetch failed`
  - `low-teachers-api`: 4 failures, all `fetch failed`

## k6 Results

- Scenario:
  - 10 → 25 → 75 VUs over 2 minutes
  - 4880 HTTP requests
  - 609 completed iterations

- Threshold results:
  - `http_req_failed` threshold failed: actual `12.50%`
  - `http_req_duration p95<1500ms` threshold failed: actual `1.71s`
  - `http_req_duration p99<3000ms` passed: actual `1.88s`

- Likely source of the 12.5% failure rate:
  - each k6 iteration calls eight URLs
  - one of those is `/api/ping`
  - `/api/ping` is currently broken
  - one broken request out of eight equals `12.5%`

## Search And Table Practical Limits

- High-volume student queries were materially better than the teachers API under load.
- Teachers API latency was the clearest stress hotspot.
- Salary queries were stable but showed a long p95 tail.
- Data-heavy pages with broken APIs were slower and noisier at the same time, especially monitoring and fee notifications.

## Weak-Network And Offline Findings

- Offline reload behavior failed completely for:
  - admin Arabic dashboard
  - admin English dashboard
  - super-admin Arabic dashboard
  - super-admin English dashboard

- All four offline probes ended at `chrome-error://chromewebdata/` with `net::ERR_INTERNET_DISCONNECTED`
- No in-app offline page, draft retention, retry queue, or graceful degraded mode was observed

## Practical Bottlenecks

- Teachers API under concurrency
- Salary query tail latency
- Broken dashboard/monitoring/fee-notification data sources
- Inconsistent route stability on `/ar/attendance`

## Recommendations

1. Fix `/api/ping` or remove it from production-style load thresholds.
2. Profile the teachers API path first; it has the clearest latency problem under pressure.
3. Resolve missing-table failures before attempting further UX tuning on dashboard, monitoring, or fee notifications.
4. Add a real offline boundary or user-facing retry state if weak-network support matters.
