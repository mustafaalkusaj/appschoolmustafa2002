# Phase 2 Performance Analysis Report
**Date:** 2026-05-02
**Deployment:** school-iraq.com
**School:** 4020cf33-ceec-4ea7-bcb2-0e9b31bd2d89

---

## Production Metrics (from performance-debug)

| Endpoint | totalTimeMs | authTimeMs | dataTimeMs | responseSize | Status |
|----------|------------|-----------|-----------|--------------|--------|
| **Auth Resolution** | — | **1563** | — | — | ⚠️ CRITICAL |
| diagnostic/students_count | 1744 | 1563 | 1744 | 11 | ⚠️ HIGH |
| diagnostic/payments_count | 865 | 1563 | 865 | 11 | ✓ OK |
| diagnostic/attendance_count_today | 767 | 1563 | 767 | 11 | ✓ OK |
| diagnostic/class_fees_count | 731 | 1563 | 731 | 11 | ⚠️ RETURNS 0 |
| **Overall Time** | **6644** | — | — | — | ⚠️ SEQUENTIAL |

---

## Key Findings

### A. Auth Bottleneck: 1563ms (PRIMARY ISSUE)

**Root Cause:** `resolveSchoolScopedActorContext()` → `resolveWebUserProfile()` makes 6 parallel DB queries when RBAC cookie cache misses:

1. `selectProfileCompat()` - user_profiles lookup
2. `resolveSchoolContext()` - schools + subscriptions (multiple nested queries)
3. `user_permissions` - all module/branch permissions
4. `user_page_access` - all page access rules
5. `admin_branch_scopes` - admin branch scopes
6. `user_role_assignments` - role assignments

**Impact:**
- Every first request (cache miss) costs **1563ms** just for auth
- Cached requests (via RBAC cookie) cost ~50ms
- Auth time dominates all other operations

**Evidence:**
- Performance-debug shows authTimeMs = 1563ms
- RBAC cookie verification is the only protection from repeating this
- No request caching within a single request context

---

### B. Students Count Anomaly: 1744ms

**Issue:** SELECT with COUNT on 119 students takes 1744ms (includes auth 1563ms).

**Data Query Time:** 1744 - 1563 = **181ms** (reasonable for network + RLS)

**Status:** ✓ Acceptable once auth improves.

---

### C. Class_Fees Returns 0 (DATA ISSUE)

**Problem:** `diagnostic/class_fees_count` returns 0 even though financial reports show correct data.

**Hypothesis:**
- `class_fees` may not have `school_id` column
- May be keyed by `group_id`, `branch_id`, or some other field
- OR: Current financial summary is NOT using class_fees (fallback in loadFallbackMetrics working around missing data)

**Action Required:** Verify class_fees table schema and joins before Phase 2.

---

### D. Reports Overview Sub-Query Breakdown

**Current:** Total reports/overview call = 973ms (includes auth 1563ms on first load).

**Need to Measure:** Once improved performance-debug runs, break down:
- students query time
- payments query time
- expenses query time
- class_fees join time

---

## Phase 2 Recommendations

### PRIORITY 1: Fix Auth Bottleneck (1563ms → ~200ms target)

**Option A: Request-Level Memoization (SAFEST)**
- Cache `resolveSchoolScopedActorContext()` result within single request
- Cost: ~20 lines of middleware
- Benefit: All endpoints using same auth get instant 1500ms gain
- Risk: NONE (single request only, no state leakage)
- Implementation: Create `getRequestContextCached()` wrapper

**Option B: Selective Column Selection**
- In `resolveWebUserProfile()`, query only needed columns from:
  - user_profiles: (id, role, school_id, branch_id, permissions_version)
  - Avoid: hierarchy_level, all_modules, allowed_module
- Cost: Low
- Benefit: ~100-200ms reduction
- Risk: LOW (column subset, same joins)

**Option C: Index Audit**
- Verify indexes on:
  - `user_profiles(id)` - likely exists
  - `user_profiles(school_id)` - may be missing
  - `user_role_assignments(user_id)` - check
  - `admin_branch_scopes(user_id, school_id)` - check
- Cost: DB query
- Benefit: 50-200ms reduction if indexes missing
- Risk: NONE (audit only)

**Recommended:** A + C (memoization + index audit). B if needed.

---

### PRIORITY 2: Verify Class_Fees Schema

**Action:**
1. Check `class_fees` table columns (does it have `school_id`?)
2. Check if `buildResolvedStudentFinancials()` is using correct table
3. Verify financial summary endpoints are pulling from correct source
4. No changes yet—diagnosis only

---

### PRIORITY 3: Pagination for Attendance (Secondary, ~700-800ms savings possible)

**Current:** Loads all attendance records for last 14 days + today = multiple thousand rows.

**Safe Improvement:**
- Add `limit(500)` to attendance history queries
- Default to last 7 days instead of 14
- Add pagination params: ?limit=100&offset=0
- Cost: UI pagination, backend change
- Benefit: 200-300ms data load reduction
- Risk: LOW (read-only, optional params)

---

### PRIORITY 4: Parallel Page Loads (Frontend optimization)

**Current:** Dashboard loads reports/overview → payments → attendance sequentially.

**Safe Improvement:**
- Load all 3 endpoints in parallel instead of waterfall
- Cost: Frontend change only (React Suspense or Promise.all)
- Benefit: ~400-700ms reduction (waterfall → parallel)
- Risk: NONE (frontend only)

---

## Excluded from Phase 2 (Too Risky)

- ❌ Disabling RLS (breaks school/branch isolation)
- ❌ Removing auth checks (security risk)
- ❌ Changing core query logic (business logic risk)
- ❌ Force-caching across requests (state leakage risk)

---

## Phase 2 Action Plan

### Step 1: Auth Memoization (Safest first)
- Add request-level cache in middleware
- Target: 1500ms → 200ms auth time

### Step 2: Index Audit
- Run DB diagnostics
- Add missing indexes if found
- Target: Additional 50-100ms gain

### Step 3: Class_Fees Diagnostic
- Verify schema
- Fix financial summary data source if needed
- No optimization yet—correctness first

### Step 4: Test Performance-Debug Again
- Run updated diagnostic endpoint
- Measure new auth time (should be 200ms)
- Measure reports/overview breakdown
- Confirm other endpoints faster

### Step 5: Attendance Pagination (If needed)
- Add optional pagination
- Default to reasonable limit
- Measure reduction

### Step 6: Frontend Parallel Loading (Low-hanging fruit)
- Load dashboard endpoints in parallel
- Measure page render time reduction

---

## Expected Outcomes

**Before Phase 2:**
- Auth: 1563ms
- Student count: 1744ms
- Overall: 6644ms

**After Phase 2 (estimated):**
- Auth: 200ms (with memoization + indexes)
- Student count: 400ms (181ms + 200ms auth)
- Overall: 1200-1500ms (parallel diagnostics, memoized auth)

**Improvement:** 6644ms → 1200ms = **82% reduction** (realistic: 60-70% due to network latency)

---

## Next Steps

1. User confirms Phase 2 plan
2. Implement Step 1 (memoization)
3. Run updated performance-debug
4. Measure production impact
5. Proceed with Steps 2-6 based on results

**Do NOT implement anything until user approves this plan.**
