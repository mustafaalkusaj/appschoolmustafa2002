# 📋 DETAILED QA TEST PLAN & CHECKLIST
**School Management Platform - school-iraq.com**
**Comprehensive Testing Checklist for Branch Isolation & Security**

---

## 🎯 TEST MATRIX - ACCOUNTS TO TEST

### Account 1: Branch Admin - Primary School (ابتدائية)
```
Email: zena3@school-iraq.com
Password: zena102030
Role: branch_admin (Branch Manager)
School: النخيل الأهلية (Al-Nakheel Private School)
Branch: ابتدائية (Primary)
Expected Behavior: Can ONLY see/manage primary school data
```

### Account 2: Branch Admin - Boys Secondary (ثانوية بنين)
```
Email: saif1@school-iraq.com
Password: saif102030
Role: branch_admin
School: النخيل الأهلية
Branch: ثانوية بنين (Boys Secondary)
Expected Behavior: Can ONLY see/manage boys secondary branch data
```

### Account 3: Branch Admin - Girls Secondary (ثانوية بنات)
```
Email: zena1@school-iraq.com
Password: zena102030
Role: branch_admin
School: النخيل الأهلية
Branch: ثانوية بنات (Girls Secondary)
Expected Behavior: Can ONLY see/manage girls secondary branch data
```

### Account 4: School Manager (Group Admin)
```
Email: dr.anmar@school-iraq.com
Password: anmar12345
Role: group_admin
School: النخيل الأهلية
Expected Behavior: Can see/manage ALL branches in the school
```

### Account 5: Super Admin
```
Email: super.admin@school-iraq.com
Password: Admin@School2026
Role: super_admin
Expected Behavior: Can access ALL schools and branches
```

---

## ✅ PHASE 1: AUTHENTICATION & SESSION TESTS

### Test 1.1: Login Success for Each Account
```
[  ] Primary Branch (zena3) - Verify login succeeds
[  ] Boys Secondary (saif1) - Verify login succeeds
[  ] Girls Secondary (zena1) - Verify login succeeds
[  ] School Manager (dr.anmar) - Verify login succeeds
[  ] Super Admin (super.admin) - Verify login succeeds

Evidence to Collect:
- ✓ Redirect to dashboard after login
- ✓ User email shown in top-right
- ✓ No 401/403 errors in console
- ✓ Session token present in localStorage
```

### Test 1.2: Session Persistence
```
[  ] After login, refresh page - user should stay logged in
[  ] Close tab and open new tab to same URL - should redirect to login
[  ] Access direct URL like /ar/students - should redirect if logged out
```

### Test 1.3: Logout Functionality
```
[  ] Click logout button
[  ] Redirect to login page
[  ] Session token removed from localStorage
[  ] Cannot access protected routes anymore
```

---

## 🔒 PHASE 2: BRANCH ISOLATION TESTS

### Test 2.1: Branch Admin - Cannot See Other Branches

**Account: zena3 (Primary Branch)**

**UI Tests:**
```
[  ] Open /ar/students
     Expected: Only students from Primary branch visible (121 students)
     
[  ] Search for a known student from Boys Secondary
     Expected: No results found (or marked as from different branch)
     
[  ] Check Fees & Payments tab
     Expected: Only fees from Primary students
     Expected Total Fees: 478,500,000 IQD (not inflated from other branches)
     
[  ] Open /ar/teachers
     Expected: Only teachers from Primary branch visible
     
[  ] Check salaries
     Expected: Only Primary branch salaries
```

**API Tests (Network Tab):**
```
[  ] When page loads, check API request: GET /api/core/students
     Expected Payload:
     {
       "page": 1,
       "limit": 50,
       "filters": {...}
       // No explicit branchId in query (should be in header or implicit)
     }
     
     Expected Response Header or Auth:
     - Authorization: Bearer {token}
     - Contains branch_id in JWT payload
     
     Expected Response:
     - Only students with branch_id matching zena3's branch
     - Data shows students.branch_id = {UUID of Primary}
```

### Test 2.2: Attempt Cross-Branch Access

**Account: zena3 (Primary Branch)**

**Malicious Test:**
```
[  ] Try to manually navigate to another branch via URL
     Attempt: /ar/students?branchId=<boys-secondary-uuid>
     
     Expected: Either:
     Option A: No change (branch selector prevents it)
     Option B: 403 Forbidden response
     Option C: Ignore query param and show Primary data
     
     ✗ FAIL if: Boys secondary data appears
     ✗ FAIL if: Mixing of branch data occurs
```

**API Test (Using Browser Dev Tools > Network):**
```
[  ] Open DevTools > Network tab
[  ] POST /api/core/students (create new student)
[  ] Intercept and modify branchId to Boys Secondary UUID
     
     Expected Response: 403 Forbidden
     Expected Error Message: "Forbidden: You do not have access to this branch"
     
     ✗ FAIL if: Student created in wrong branch
     ✗ FAIL if: 200 OK response with wrong branchId
```

### Test 2.3: School Manager Can See All Branches

**Account: dr.anmar (School Manager)**

```
[  ] Open /ar/students
     Expected: Should see students from ALL three branches
     Expected Total: 121 + N + M (sum of all branches)
     
[  ] Verify branch selector dropdown shows all 3 branches:
     - ابتدائية (Primary)
     - ثانوية بنين (Boys Secondary)
     - ثانوية بنات (Girls Secondary)
     
[  ] Click on "Boys Secondary" in branch selector
     Expected: Page updates to show only Boys Secondary students
     
[  ] Click on "Girls Secondary"
     Expected: Page updates to show only Girls Secondary students
     
[  ] Students visible change based on selected branch
     ✓ PASS if: Data updates correctly without page reload
     ✓ PASS if: Counts decrease when switching branches
```

### Test 2.4: Super Admin Can See All Schools

**Account: super.admin**

```
[  ] Should have school selector (not just branch selector)
[  ] Should be able to switch between different schools
[  ] Should see summary data across all schools
[  ] Should NOT see individual student data by default
     (should require selecting a school first)
```

---

## 📊 PHASE 3: CRUD OPERATIONS TESTS

### Test 3.1: Create QA Test Records - Primary Branch

**Account: zena3**

**Create Student:**
```
[  ] Click "+ إضافة طالب" (Add Student)
[  ] Fill form:
     Name (AR): QA طالب ابتدائية
     Name (EN): QA Primary Student Full Audit
     Class: Select any primary class
     Date of Birth: 2010-01-15
     Status: Active
     
[  ] Submit form
     Expected: Student created successfully
     Expected: Student appears in list immediately (no refresh needed)
     
[  ] Verify in Network tab:
     Expected POST /api/core/students payload contains:
     {
       "nameAr": "QA طالب ابتدائية",
       "nameEn": "QA Primary Student Full Audit",
       "branchId": "<UUID matching Primary branch>",
       "schoolId": "<UUID of Al-Nakheel>",
       ...
     }
     
     Expected Response Status: 201 Created
     Expected Response includes: student.id, student.branch_id
```

**Verify in Supabase:**
```
SELECT id, full_name, branch_id, school_id, created_at
FROM students
WHERE full_name ILIKE '%QA%' AND full_name ILIKE '%ابتدائية%'
ORDER BY created_at DESC LIMIT 5;

Expected: Row shows:
- branch_id = {UUID of Primary}
- school_id = {UUID of Al-Nakheel}
- full_name = "QA طالب ابتدائية"
```

**Create Teacher:**
```
[  ] Navigate to /ar/teachers
[  ] Click "+ إضافة معلم" (Add Teacher)
[  ] Fill:
     Name (AR): QA معلم ابتدائية
     Name (EN): QA Primary Teacher Full Audit
     Subject: Arabic (أو أي مادة)
     Status: Active
     
[  ] Verify API request includes:
     "branchId": "<Primary branch UUID>",
     "schoolId": "<Al-Nakheel UUID>"
```

**Create Payment:**
```
[  ] Navigate to /ar/payments (Finance)
[  ] Create payment for QA student:
     Student: QA طالب ابتدائية
     Amount: 10,000 IQD
     Date: Today
     
[  ] Verify API request:
     {
       "studentId": "<QA student UUID>",
       "amount": 10000,
       "branchId": "<Primary UUID>",
       "schoolId": "<Al-Nakheel UUID>"
     }
     
[  ] Verify student's remaining_fee decreases
     Verify in next request: balance updates correctly
```

### Test 3.2: Read Operations - Verify Filtering

```
[  ] QA Students created in Primary appear only in Primary branch
     
[  ] Search for "QA": Should find QA students
     
[  ] Search for "QA" while viewing Boys Secondary: Should NOT find QA
     (because they're in Primary)
     
[  ] Switch branch to Primary: QA students appear
     
[  ] Filter by class: QA students appear correctly
     
[  ] Sort by date: QA students appear in correct order
```

### Test 3.3: Update Operations

```
[  ] Edit QA student:
     Change: Name to "QA طالب ابتدائية Updated"
     
[  ] Verify API request includes branch_id
     
[  ] Verify update succeeds (no 403)
     
[  ] Verify change appears in list immediately
```

### Test 3.4: Delete Operations

```
[  ] Delete QA student (soft delete - mark as deleted_at)
     
[  ] Verify API request includes branch_id
     
[  ] Verify student disappears from active list
     
[  ] Verify in "Deleted" tab, student appears
     
[  ] Check Supabase: deleted_at timestamp is set
```

---

## 🛡️ PHASE 4: SECURITY & AUTHORIZATION TESTS

### Test 4.1: Unauthorized Branch Access - API Level

**Using Browser DevTools or curl:**

```bash
# Get authentic request from Network tab first
# Replace branchId with UUID of different branch

curl -X POST https://school-iraq.com/api/core/students \
  -H "Authorization: Bearer {zena3_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nameAr": "Hacker Attempt",
    "nameEn": "Unauthorized Student",
    "branchId": "boys-secondary-branch-uuid",
    "classId": "some-class-uuid"
  }'

Expected Response:
Status: 403 Forbidden
Body: {
  "error": "Forbidden: You do not have access to this branch"
}

✗ FAIL if: Status 200 or 201 (means authorization bypassed)
✗ FAIL if: Student created in wrong branch
```

### Test 4.2: No Branch Access - Empty List

```
[  ] Login as zena3 (Primary branch only)
[  ] Open /ar/students
[  ] Verify the list shows ONLY Primary students
     
[  ] In Network tab, inspect API response
     Verify: All returned students have branch_id = Primary UUID
     
[  ] Count in UI vs API:
     Verify: Numbers match (no hidden data)
```

### Test 4.3: Database Consistency - No Orphaned Records

**Supabase SQL Queries:**

```sql
-- 1. Check for students with NULL branch_id (recent records)
SELECT COUNT(*) as orphaned_students
FROM students
WHERE branch_id IS NULL
  AND created_at > now() - interval '7 days'
  AND deleted_at IS NULL;

Expected Result: 0 rows

-- 2. Check payment/student branch mismatch
SELECT COUNT(*) as mismatches
FROM payments p
JOIN students s ON s.id = p.student_id
WHERE p.branch_id <> s.branch_id
  AND p.deleted_at IS NULL;

Expected Result: 0 rows

-- 3. Check salary/teacher branch mismatch
SELECT COUNT(*) as mismatches
FROM salaries sa
JOIN teachers t ON t.id = sa.teacher_id
WHERE sa.branch_id <> t.branch_id
  AND sa.deleted_at IS NULL;

Expected Result: 0 rows

-- 4. Verify QA records in correct branches
SELECT 
  s.id,
  s.full_name,
  s.branch_id,
  b.name as branch_name,
  s.created_at
FROM students s
LEFT JOIN branches b ON b.id = s.branch_id
WHERE s.full_name ILIKE '%QA%'
ORDER BY s.created_at DESC;

Expected: Each QA record shows correct branch_name
```

---

## ⚡ PHASE 5: PERFORMANCE TESTS

### Test 5.1: Page Load Times

```
[  ] Open DevTools > Network > Disable Cache
[  ] Load /ar/students
     Measure: Time until page interactive
     Expected: < 3 seconds
     
[  ] Check Network waterfall:
     Largest request: Should be initial HTML/JS (~2MB max)
     API request: /api/core/students should be < 500ms
     
[  ] Check Console:
     ✗ FAIL if: Errors or warnings related to missing branch_id
     ✗ FAIL if: Multiple requests for same data (N+1 problem)
```

### Test 5.2: API Response Times

```
[  ] POST /api/core/students (create student)
     Expected Duration: 200-800ms
     
[  ] GET /api/core/students (list with 121 records)
     Expected Duration: 150-500ms
     
[  ] Large branch with 1000+ students
     Expected Duration: < 2 seconds
     
✗ FAIL if: Any API call > 5 seconds
```

### Test 5.3: RLS Query Efficiency

```
[  ] Monitor Supabase logs for slow queries
[  ] Verify RLS policies don't cause:
     - Full table scans
     - Duplicate subqueries
     - N+1 problems with branches lookup
```

---

## 🎨 PHASE 6: UI/UX TESTS

### Test 6.1: All Buttons Functional

**In /ar/students:**
```
[  ] "+ إضافة طالب" - Opens form modal
[  ] "تحرير الصفحة المالية" - Opens finance editor
[  ] "طباعة جميع بطاقات الطلاب" - Downloads/prints student cards
[  ] "استخراج ملفات" - Exports student list
[  ] Search box - Filters students by name
[  ] Class filter - Shows only selected class
[  ] Status filter - Shows only active/deleted
```

**In /ar/payments:**
```
[  ] "+ إضافة دفعة" - Opens payment form
[  ] Search student - Auto-suggest student list
[  ] Edit payment - Opens edit modal
[  ] Delete payment - Soft deletes (marks deleted_at)
[  ] Print receipt - Downloads PDF
```

### Test 6.2: RTL/Localization

```
[  ] Switch to English (/en/students)
     Expected: Layout flips to LTR
     Expected: All Arabic text appears in English
     
[  ] Switch back to Arabic
     Expected: Layout is RTL
     Expected: All English text appears in Arabic
     
[  ] Check for missing translation keys
     ✗ FAIL if: Keys like "students.modals.form.branch" appear
```

### Test 6.3: Modal/Dialog Functionality

```
[  ] Add Student modal:
     [  ] Opens without page reload
     [  ] Form fields are editable
     [  ] Cancel button closes modal
     [  ] Submit button creates record
     [  ] Modal closes after successful submit
     [  ] New record appears in list
     
[  ] Edit Student modal:
     [  ] Pre-fills with current data
     [  ] Can update fields
     [  ] Submit updates record immediately
     [  ] List updates without refresh
     
[  ] Confirm Delete modal:
     [  ] Appears when delete clicked
     [  ] Cancel button returns to list
     [  ] Confirm button soft-deletes record
     [  ] Record disappears from list
```

---

## 📈 PHASE 7: DASHBOARD & REPORTS

### Test 7.1: Dashboard Metrics

**Primary Branch (zena3):**
```
[  ] Dashboard shows:
     [  ] Total Students: 121 (Primary only)
     [  ] Total Fees: 478,500,000 IQD (Primary only)
     [  ] Outstanding Balance: 477,910,000 IQD (Primary only)
     [  ] Teacher Count: N (Primary only)
     [  ] Monthly Salaries: M IQD (Primary only)
     
     ✓ PASS if: Numbers match actual Primary branch data
     ✗ FAIL if: Numbers include other branches
     ✗ FAIL if: Numbers change when selecting different branch
```

**School Manager (dr.anmar):**
```
[  ] Dashboard shows aggregate data for ALL branches
     [  ] Total Students: 121 + N + M (all branches)
     [  ] Total Fees: Sum of all branches
     
[  ] When switching to specific branch:
     [  ] Metrics update to that branch only
     [  ] Numbers decrease from total
```

### Test 7.2: Reports Generation

```
[  ] Student Report
     [  ] Export by branch - should only include selected branch
     [  ] Export with filters - apply filters to selected branch only
     [  ] Verify exported data doesn't contain other branches
     
[  ] Financial Report
     [  ] Monthly breakdown by branch
     [  ] Payments show only selected branch
     [  ] Fees reconcile correctly
     
[  ] Attendance Report
     [  ] Shows attendance for selected branch only
     [  ] Can't export other branches' attendance
```

---

## 🚨 PHASE 8: ERROR HANDLING & EDGE CASES

### Test 8.1: Invalid/Missing Data

```
[  ] Try to create student without branch_id
     Expected: 400 Bad Request
     Expected Error: "Branch ID is required"
     
[  ] Try to create payment without student_id
     Expected: 400 Bad Request
     
[  ] Try to create expense without branch_id
     Expected: 400 Bad Request
```

### Test 8.2: Cross-School Attempts

```
[  ] Try to create student in different school
     (using curl with different schoolId)
     
     Expected: 403 Forbidden
     Expected: "Cannot access this school"
```

### Test 8.3: Concurrency & Data Integrity

```
[  ] Open student in multiple tabs
[  ] Edit in tab 1
[  ] Try to edit same student in tab 2
     
     Expected: Last update wins (or conflict detected)
     Expected: No data corruption
```

---

## 📋 FINAL VERIFICATION CHECKLIST

### Before Declaring "READY"

- [ ] All 5 accounts tested and working
- [ ] Branch isolation verified (no data leakage)
- [ ] All CRUD operations functional
- [ ] API validation working (403 on unauthorized access)
- [ ] Database audit queries show zero orphaned records
- [ ] Performance within acceptable ranges
- [ ] No console errors (CSP violations OK if not security-related)
- [ ] No network errors (4xx/5xx outside of test scenarios)
- [ ] All buttons and features working
- [ ] RTL/i18n functioning correctly
- [ ] Modals open/close properly
- [ ] Data updates visible without refresh
- [ ] QA test records created and verified in Supabase

### Issues Found

| ID | Severity | Component | Issue | Steps to Reproduce | Expected | Actual | Status |
|----|----------|-----------|-------|-------------------|----------|--------|--------|
| |          |           |       |                   |          |        |        |
| |          |           |       |                   |          |        |        |

---

## 🎯 FINAL DECISION CRITERIA

### ✅ READY - If:
- Zero Critical issues
- Zero High issues blocking core functionality
- All 5 accounts working
- Branch isolation verified end-to-end
- Database audit clean
- No data leakage between branches

### ⚠️ READY WITH WARNINGS - If:
- Zero Critical issues
- Only Medium/Low issues
- Branch isolation fully working
- Minor UX/performance improvements possible
- Can be deployed with note to team

### ❌ NOT READY - If:
- Any Critical issue found
- Branch isolation broken
- Data leakage detected
- Database inconsistencies found
- Any High-severity blocker

---

**End of Test Plan**
**Generated:** 2026-05-07
**Next Review:** Upon completion of all testing phases

