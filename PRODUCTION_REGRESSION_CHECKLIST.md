# قائمة فحص رجوع المشاكل — Production Regression Checklist

## قبل النشر (Pre-Deployment Guardrails)

### Mandatory Checks
```
- [ ] npm run typecheck → ✓ no errors
- [ ] npm run test → ✓ all passing
- [ ] npm run build → ✓ compiled
- [ ] npx vercel build --prod → ✓ successful
- [ ] rm -rf .next && npm run build (clean rebuild)
- [ ] .vercel/output folder ≤ 100MB (check for bloat)
```

### Generated Columns Check
```
- [ ] Verify: Import code DOES NOT send remaining_fee
- [ ] Verify: Import code DOES NOT send paid_fee
- [ ] Verify: API responses filter out generated columns
- [ ] Verify: Student update payload has no computed fields
```

### Financial Helper Check
```
- [ ] Verify: buildResolvedStudentFinancials() exports correctly
- [ ] Verify: resolveStudentFeeTotal() uses class_fees priority
- [ ] Verify: calculateStudentRemainingFee() includes discount
- [ ] Verify: No hardcoded formulas in components
```

### Environment Variables
```
- [ ] SUPABASE_URL exists and valid
- [ ] SUPABASE_ANON_KEY exists and valid
- [ ] SUPABASE_SERVICE_ROLE_KEY exists
- [ ] JWT_SECRET exists
- [ ] All env vars in Vercel dashboard match .env.local
```

### Schema Dependencies
```
- [ ] Verify: classes table has 'name' column (NOT name_ar)
- [ ] Verify: students table has 'remaining_fee' generated column
- [ ] Verify: payments table has 'status' column
- [ ] Verify: No code references old column names
```

---

## بعد النشر (Post-Deployment Guardrails)

### Immediate Checks (First 5 minutes)
```
- [ ] /ar/login loads (NOT blank page)
- [ ] /en/login loads (NOT blank page)
- [ ] /ar/students loads (table visible, NOT blank)
- [ ] /ar/payments loads (data visible, NOT blank)
- [ ] /ar/branch-overview loads (numbers visible, NOT blank)
- [ ] curl -I https://school-iraq.com/ar/login → HTTP 200
- [ ] No "Chunk not found" errors in browser console
- [ ] No HTTP 500 errors in Vercel logs
```

### Login Functionality Check
```
- [ ] /ar/login form appears with email input
- [ ] /ar/login form appears with password input
- [ ] /en/login form appears with email input
- [ ] /en/login form appears with password input
- [ ] RuntimeBrandingProvider did not crash (error boundary works)
- [ ] No blank page, form visible
- [ ] DevTools console shows NO red errors
```

### Protected Pages Check (Redirect, NOT Blank)
```
- [ ] Access /ar/students without session → redirect to /login (307, NOT 200 blank)
- [ ] Access /ar/payments without session → redirect to /login (307, NOT 200 blank)
- [ ] Access /ar/attendance without session → redirect to /login (307, NOT 200 blank)
- [ ] Access /ar/branch-overview without session → redirect to /login (307, NOT 200 blank)
- [ ] Each protected page shows data AFTER login (NOT blank)
```

### Student Management Check
```
- [ ] Transfer button appears for admin
- [ ] Suspend button appears for admin
- [ ] Delete button appears for admin
- [ ] Restore button appears in deleted tab
- [ ] Buttons have confirmation modals (NOT direct action)
- [ ] Transfer successful updates student status
- [ ] Suspend successful updates student status
- [ ] Delete soft deletes (can restore)
- [ ] Restore recovers student to active
```

### Payments Page Check
```
- [ ] Table loads with student data
- [ ] "Add Payment" button appears
- [ ] Payment form has all required fields
- [ ] Recording payment updates remaining_fee
- [ ] Remaining never shows negative
- [ ] Multiple payments update correctly
- [ ] Dashboard total matches Payments page total
```

### Branch Overview Check
```
- [ ] Dashboard loads (NOT blank)
- [ ] Total fees number visible
- [ ] Paid fees number visible
- [ ] Remaining fees number visible
- [ ] Numbers match Payments page totals
- [ ] Auto-updates when payment added
- [ ] Auto-updates when student added
- [ ] No data mismatch with Payments page
```

### Import/Export Check
```
- [ ] Export current page works
- [ ] Export all works
- [ ] Excel file downloads
- [ ] Import page appears
- [ ] Import file accepts .xlsx
- [ ] Parse stage completes
- [ ] Validation stage shows results
- [ ] Import stage completes successfully
- [ ] No "class.name_ar" errors in import
- [ ] No schema validation failures
```

### Financial Calculations Check
```
- [ ] Student with class_fees gets correct total
- [ ] Student with students.total_fee (no class_fees) gets correct total
- [ ] Student with no fee gets status 'no_fee_configured'
- [ ] Remaining = total - paid (never negative)
- [ ] Status 'fully_paid' when remaining ≤ 0
- [ ] Status 'partially_paid' when 0 < remaining < total
- [ ] Status 'unpaid' when paid = 0 and total > 0
- [ ] Discount subtracted from remaining display
```

### Error Boundary Check
```
- [ ] If page crashes, error message appears (NOT blank)
- [ ] Error message shows component that failed
- [ ] Refresh works (F5 reloads page)
- [ ] No silent failures
- [ ] Console logs full error stack
```

### Network & Performance Check
```
- [ ] curl -w "TTFB: %{time_starttransfer}s" https://school-iraq.com/ar/login → < 1s
- [ ] Page load time < 2s (from browser DevTools)
- [ ] No failed network requests (Status 500)
- [ ] Vercel build time < 1min
- [ ] No timeouts on API calls
```

### Vercel Logs Check
```
- [ ] Deployment status = "Ready"
- [ ] Build logs show ✓ no errors
- [ ] Function logs show 0 HTTP 500
- [ ] Edge logs clean (if used)
- [ ] No "chunk not found" messages
- [ ] No "runtime error" messages
```

### Supabase Check
```
- [ ] Database connection active
- [ ] APIs responding (check Supabase status page)
- [ ] RLS policies enforced
- [ ] Realtime subscriptions working (if used)
```

---

## Regression Prevention Checklist

### Prevent Blank Page Regressions
```
- [ ] All pages wrapped in <ErrorBoundary>
- [ ] RuntimeBrandingProvider has fallback state
- [ ] Data fetches have loading states
- [ ] No unhandled promise rejections
- [ ] Console clean on load
```

### Prevent Chunk Mismatch Regressions
```
- [ ] Use npm run build (clean build)
- [ ] Test locally: npm run dev → all pages load
- [ ] Never use --prebuilt with old .vercel/output
- [ ] Before --prebuilt: rm -rf .vercel/output .next
- [ ] After deploy: test all pages load
- [ ] If chunk error: revert immediately
```

### Prevent Generated Column Regressions
```
- [ ] API filters out: remaining_fee
- [ ] API filters out: paid_fee
- [ ] Student update never sends these columns
- [ ] Database migration applied: 20260430_fix_remaining_fee_constraint
- [ ] remaining_fee ALWAYS generated (never computed by app)
```

### Prevent Financial Calculation Regressions
```
- [ ] All pages use: buildResolvedStudentFinancials()
- [ ] Fee resolution: class_fees priority > students.total_fee > 0
- [ ] Paid calculation: SUM(payments) scoped by school/branch
- [ ] Remaining: max(total - paid, 0)
- [ ] Status determination uses same logic everywhere
- [ ] Dashboard calls /api/web/payments/overview
- [ ] Payments page calls /api/web/payments/overview
```

### Prevent Import Schema Regressions
```
- [ ] Import code does NOT use: classes.name_ar
- [ ] Import code does NOT use: nameAr, nameEn
- [ ] Import code does NOT use: gradeLevel
- [ ] Import code does NOT use: academic_year_id
- [ ] Column mapping uses: 'Student name', 'Class', 'Section'
- [ ] Validation checks against actual DB schema
- [ ] Error messages clear when column missing
```

### Prevent Login Regressions
```
- [ ] /ar/login page loads (form appears)
- [ ] /en/login page loads (form appears)
- [ ] RuntimeBrandingProvider does not throw
- [ ] Try/catch wraps data fetches
- [ ] Fallback UI on error
- [ ] Console no red errors
```

### Prevent Button Wiring Regressions
```
- [ ] Transfer button has onClick handler
- [ ] Transfer button calls transferStudent() API
- [ ] transferStudent() updates database
- [ ] Suspend button has onClick handler
- [ ] Suspend button calls suspendStudent() API
- [ ] Delete button has onClick handler
- [ ] Delete button shows confirmation modal
- [ ] Restore button visible only in deleted tab
```

### Prevent Protected Routes Regressions
```
- [ ] /ar/students protected by <ProtectedRoute>
- [ ] /ar/payments protected by <ProtectedRoute>
- [ ] /ar/attendance protected by <ProtectedRoute>
- [ ] /ar/branch-overview protected by <ProtectedRoute>
- [ ] Unauth access redirects to /login (NOT blank page)
- [ ] All API endpoints check requireStudentPermission()
- [ ] Scope filter present on all queries
```

---

## Daily Regression Prevention Habit

```
Morning Check (5 minutes):
✅ npm run typecheck
✅ npm run test
✅ Open https://school-iraq.com/ar/login
✅ Open https://school-iraq.com/ar/students
✅ Open https://school-iraq.com/ar/payments
✅ Open https://school-iraq.com/ar/branch-overview
✅ Check Vercel logs for errors
✅ Check Supabase status

If any fails:
❌ STOP - do not proceed
❌ Investigate issue
❌ Document in TROUBLESHOOTING.md
❌ Contact dev team
```

---

## Automated Checks (When Running npm run build)

Should output:
```
✓ TypeScript: 0 errors
✓ Tests: 391/391 passing
✓ Build: Compiled in Xs
✓ ESLint: No errors
✓ No deprecated APIs used
✓ No console.error in startup
```

If any fails:
```
STOP: Fix before deploying
```

---

## Deployment Safety Checklist (Before npx vercel deploy)

```
- [ ] Clean rebuild: rm -rf .next && npm run build
- [ ] All checks pass:
      npm run typecheck ✓
      npm run test ✓
      npm run build ✓
- [ ] If using --prebuilt:
      rm -rf .vercel/output first
      Build locally was successful
- [ ] Vercel build passes: npx vercel build --prod
- [ ] Deployment command ready:
      git push (recommended), or
      npx vercel deploy --prod (if git push unavailable)
```

---

## Post-Deployment Verification (Mandatory After Deploy)

**Within 5 minutes:**
```
- [ ] Deployment shows "Ready" in Vercel
- [ ] /ar/login loads with form (test this URL in browser)
- [ ] /ar/students loads with table
- [ ] /ar/payments loads with data
- [ ] /ar/branch-overview loads with numbers
- [ ] Vercel logs: 0 HTTP 500 errors
```

**If any fails:**
```
REVERT IMMEDIATELY:
1. Vercel Dashboard → Deployments
2. Previous deployment (last "Ready" status)
3. Click "Promote to Production"
4. Wait for revert complete
5. Verify pages load again
6. Document in TROUBLESHOOTING.md
7. Contact dev team
```

**If all pass:**
```
✅ Deployment successful
✅ Continue monitoring for 30 minutes
✅ Test key workflows (add student, add payment)
```

---

## Troubleshooting Quick Links

| Issue | Solution | File |
|-------|----------|------|
| Blank login page | Clear cache, F5, check error boundary | TROUBLESHOOTING.md #1 |
| Blank branch-overview | Clean build, revert deployment | TROUBLESHOOTING.md #2 |
| Chunk mismatch error | rm -rf .vercel .next, rebuild, deploy | TROUBLESHOOTING.md #3 |
| Import fails | Verify column names, check schema | TROUBLESHOOTING.md #4 |
| Remaining fee error | Verify migration applied | TROUBLESHOOTING.md #5 |
| Env vars missing | Check Vercel dashboard | TROUBLESHOOTING.md #6 |
| Rate limiting | Batch requests, add delays | TROUBLESHOOTING.md #7 |
| Class fees unlinked | Fix formatting, verify matching | TROUBLESHOOTING.md #8 |
| Buttons not working | Check permissions, verify API | TROUBLESHOOTING.md #9 |
| Data mismatch | Use same API endpoint | TROUBLESHOOTING.md #10 |

