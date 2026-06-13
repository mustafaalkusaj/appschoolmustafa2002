# PHASE 1 — Baseline Performance Report
**Date:** April 30, 2026
**Status:** Pre-optimization measurement

---

## A. HTTP Performance Metrics

### Request Times (curl)
| Page | TTFB | Total | DNS | CONNECT | Size |
|------|------|-------|-----|---------|------|
| /ar/login | **602ms** | **854ms** | 8.5ms | 86ms | 51.9 KB |
| /ar/students | 256ms (redirects) | 256ms | - | - | 15B |
| /ar/payments | 334ms (redirects) | 334ms | - | - | 15B |
| /ar/branch-overview | 248ms (redirects) | 248ms | - | - | 15B |
| /ar/attendance | 295ms (redirects) | 295ms | - | - | 15B |

**Analysis:**
- Login page: 602ms TTFB is slow. Should be <400ms
- Protected pages return 15B (HTTP 307 redirects for auth check) - normal for curl without credentials
- Total load time acceptable but room for improvement

---

## B. Bundle Analysis

### Top 15 Largest JavaScript Chunks

| Size | File | Type | Content |
|------|------|------|---------|
| 912 KB | 210f6791 | **Dynamic** | **recharts library** |
| 452 KB | 7451 | Dynamic | Payments/calculations |
| 392 KB | main | Framework | Next.js main bundle |
| 380 KB | 8817 | Dynamic | Students table/operations |
| 272 KB | 5471 | Dynamic | Reports/complex data |
| 196 KB | 0a44649a | Dynamic | Theme/branding |
| 188 KB | framework | Framework | React/framework |
| 120 KB | 2c0f1efb | Dynamic | Complex component |
| 112 KB | polyfills | Framework | Browser polyfills |

**Total Top 9 Chunks: ~3.5 MB (uncompressed)**

### Bundle Size Distribution
```
Framework/Runtime:  ~700 KB (Next.js, React, polyfills)
Dynamic chunks:     ~2.8 MB (page-specific code)
Total JS:           ~3.5 MB (uncompressed)
Gzipped est.:       ~900-1000 KB
```

---

## C. Heavy Library Imports

### Recharts (912 KB)
**Location:** `app/[locale]/group/_components/SchoolManagerComparisonChart.tsx`

```typescript
"use client";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";  // ← 912 KB loaded
```

**Usage:** Only used in `/ar/group` (branch overview dashboard)
**Impact:** Loads for every visitor to group page
**Optimization:** ❌ Not dynamic - loads immediately

### XLSX/ExcelJS
**Locations:**
- `app/[locale]/payments/_components/PaymentsArchive.tsx`
- `app/[locale]/payments/_hooks/usePaymentsPage.ts`
- `app/[locale]/expenses/page.tsx`
- `app/[locale]/salaries/page.tsx`
- `app/[locale]/teachers/_hooks/useTeachersData.ts`
- `app/[locale]/students/` (multiple files)

**Usage:** Import/export Excel files
**Implementation:** ✅ **Good** - Uses dynamic `import("exceljs")` in `lib/xlsx-loader.ts`
**Impact:** Only loaded when user clicks import/export button

**Status:** No optimization needed - already lazy loaded

---

## D. Page-Specific Analysis

### /ar/login
**HTTP Performance:**
- TTFB: 602ms ⚠️ (Target: <400ms)
- Total: 854ms
- Size: 51.9 KB

**Bundle included:**
- Next.js framework
- React context providers
- Theme system (RuntimeBrandingProvider)
- Form components
- Auth module

**Slow components:**
1. RuntimeBrandingProvider - fetches schema compatibility from Supabase
2. ThemeProviders - dynamic import with fallback
3. Form rendering

### /ar/students
**HTTP Performance:**
- Returns 15B (auth redirect)
- User not authenticated in curl

**Expected when authenticated:**
- Heavy students table
- Bulk import modal
- Student actions (suspend/delete/transfer)
- Advanced filters
- Pagination loading

### /ar/payments
**HTTP Performance:**
- Returns 15B (auth redirect)

**Expected when authenticated:**
- Large payments table (452 KB chunk)
- Payment calculations
- Archive/export functionality
- Detailed payment records

### /ar/branch-overview (Group Dashboard)
**HTTP Performance:**
- Returns 15B (auth redirect)

**Expected when authenticated:**
- Recharts graphs (912 KB) ⚠️
- Dashboard metrics
- Financial calculations
- Multiple data requests

---

## E. Cache Headers Analysis

```
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
x-vercel-cache: MISS
```

**Analysis:**
- No caching for any page
- Correct for authenticated content
- **But** login page should have public cache (e.g., `public, max-age=3600, s-maxage=3600`)

---

## F. Response Headers

```
Server: Vercel
Content-Type: text/html; charset=utf-8
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
x-vercel-enable-rewrite-caching: 1
```

**Good:**
- ✅ Vercel server (optimal deployment)
- ✅ Rewrite caching enabled
- ✅ RSC/next-router hints

**Concerns:**
- No precompression indication (likely gzipped but not indicated in headers)

---

## G. Root Causes of Slow Performance

### 1. **Recharts Bundle (912 KB)** ⚠️ HIGH IMPACT
- Not dynamically imported
- Only used in group page
- Loaded for every dashboard visitor
- **Fix:** Convert to dynamic import

### 2. **Login Page 602ms TTFB** ⚠️ MEDIUM IMPACT
- RuntimeBrandingProvider calls `detectAppSchemaCompat()` (database call)
- Theme provider dynamic import
- **Fix:** Cache or optimize database call, reduce CSS-in-JS overhead

### 3. **Large Students Chunk (380 KB)** ⚠️ MEDIUM IMPACT
- Heavy table rendering
- Bulk operations
- **Fix:** Virtualize table, lazy load components

### 4. **Large Payments Chunk (452 KB)** ⚠️ MEDIUM IMPACT
- Payment calculations
- Complex filtering
- Archive operations
- **Fix:** Split into separate chunks, lazy load archive

### 5. **Large Reports Chunk (272 KB)** ⚠️ MEDIUM IMPACT
- Report generation
- Data processing
- **Fix:** Move heavy processing to server routes

### 6. **No Caching on Login Page** ⚠️ LOW-MEDIUM IMPACT
- Public page should be cached
- Reduces response time for repeat visitors
- **Fix:** Add cache headers to login page

---

## H. Identified Optimization Opportunities

| Priority | Component | Size | Issue | Effort |
|----------|-----------|------|-------|--------|
| **HIGH** | Recharts | 912 KB | Not dynamic | Low |
| **HIGH** | Login TTFB | - | 602ms | Medium |
| **MEDIUM** | Students table | 380 KB | Large chunk | High |
| **MEDIUM** | Payments calc | 452 KB | Heavy operations | Medium |
| **MEDIUM** | Reports | 272 KB | Data processing | High |
| **LOW** | Login cache | - | No cache headers | Low |
| **LOW** | Bundle polyfills | 112 KB | Unused poly fills | Low |

---

## I. Recommended PHASE 2-12 Actions

1. **Dynamic Import Recharts** - immediately reduce group page bundle by 912 KB
2. **Cache Login Page** - set proper Cache-Control headers
3. **Optimize RuntimeBrandingProvider** - reduce TTFB on login
4. **Lazy Load Import/Export Modals** - already done (XLSX good), check others
5. **Virtualize Large Tables** - students/payments/attendance
6. **Split Heavy Chunks** - payments, reports, teachers
7. **Check for N+1 Queries** - especially in students/payments APIs
8. **Add Pagination** - for large data sets
9. **Optimize Images** - if used in forms
10. **Cache API Responses** - branch-level data, school data

---

## J. Next Steps

→ PHASE 2: Bundle and JavaScript Analysis (detailed)
→ PHASE 3: API/Supabase Query Optimization
→ PHASE 4: Students/Payments Page Optimization
→ ... (continue through PHASE 12)

---

## Baseline Snapshot (Pre-Optimization)

**Login Page Performance:**
- TTFB: 602ms
- Total Load: 854ms
- HTTP Status: 200
- Size: 51.9 KB

**Bundle Status:**
- Largest chunk: 912 KB (recharts)
- Total JS (top 9): ~3.5 MB (uncompressed)
- Gzipped estimate: ~900-1000 KB

**Cache Status:**
- Login: No cache
- Protected pages: No cache (correct)

**Console Status:**
- Need to verify in browser

**Conclusion:** ✅ **System is functional** but has measurable performance issues in:
1. TTFB on login (target <400ms, current 602ms)
2. Bundle size (recharts not lazy loaded)
3. Caching strategy (login page not cached)

