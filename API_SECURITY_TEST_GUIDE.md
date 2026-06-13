# 🔐 API SECURITY TEST GUIDE
**Branch Isolation & Authorization Testing via API**

---

## PREREQUISITES

### 1. Get Authentication Token

**Option A: From Browser DevTools**
```
1. Open school-iraq.com in Chrome
2. Press F12 to open DevTools
3. Go to Console tab
4. Paste this code:

const token = JSON.parse(localStorage.getItem('sb-school-iraq-com-auth-token'));
const accessToken = token?.session?.access_token;
console.log('TOKEN:', accessToken);

4. Copy the full token string (starts with 'eyJ...')
```

**Option B: From Network Tab**
```
1. Open Network tab
2. Perform any API call (e.g., load /ar/students)
3. Look for API request like GET /api/core/students
4. Click the request and go to Headers tab
5. Find "Authorization" header
6. Copy the Bearer token value (without "Bearer ")
```

### 2. Get Branch IDs

**From UI:**
```
1. Login to account (zena3, saif1, or zena1)
2. Open DevTools > Network tab
3. Load /ar/students
4. Look for API response from /api/core/students
5. Check response body for branch_id value
6. Record these UUIDs:
   - Primary Branch UUID
   - Boys Secondary Branch UUID
   - Girls Secondary Branch UUID
```

---

## 🧪 TEST SCENARIOS

### TEST 1: Branch Admin Accessing Own Branch (SHOULD SUCCEED)

**Account:** zena3@school-iraq.com (Primary Branch)

```bash
# Get list of students (should work - owns this branch)
curl -X GET 'https://school-iraq.com/api/core/students?page=1&limit=50' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json'

# Expected Response: 200 OK
# Expected: Array of students with branch_id matching Primary branch
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid1",
      "full_name": "Student Name",
      "branch_id": "primary-branch-uuid",
      "school_id": "al-nakheel-uuid",
      ...
    },
    ...
  ],
  "total": 121,
  "page": 1
}
```

---

### TEST 2: Branch Admin Accessing Other Branch (SHOULD FAIL)

**Account:** zena3@school-iraq.com (Primary Branch Only)  
**Attempting:** Access Boys Secondary data

```bash
# Try to get students from Boys Secondary
# (using hardcoded Boys Secondary branch UUID)

curl -X GET 'https://school-iraq.com/api/core/students' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json'

# ❌ The list should NOT include Boys Secondary students
# ❌ If students from other branches appear = SECURITY BREACH
```

---

### TEST 3: Create Student - Branch ID Must Match

**Account:** zena3@school-iraq.com  
**Attempting:** Create legitimate student in Primary branch

```bash
# CREATE STUDENT (LEGITIMATE)
curl -X POST 'https://school-iraq.com/api/core/students' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{
    "nameAr": "QA طالب ابتدائية",
    "nameEn": "QA Primary Student",
    "registrationNumber": "QA-2026-001",
    "dateOfBirth": "2010-01-15",
    "status": "active",
    "classId": "some-valid-primary-class-uuid",
    "branchId": "primary-branch-uuid"
  }'

# Expected: 201 Created
# Expected: Student created with branch_id = primary-branch-uuid
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-student-uuid",
    "full_name": "QA طالب ابتدائية",
    "branch_id": "primary-branch-uuid",
    "school_id": "al-nakheel-uuid",
    "created_by": "zena3-user-uuid",
    "created_at": "2026-05-07T12:48:00Z"
  }
}
```

---

### TEST 4: ATTACK - Branch Admin Creating Student in Different Branch

**Account:** zena3@school-iraq.com (Primary Only)  
**Attempting:** Create student in Boys Secondary branch (UNAUTHORIZED)

```bash
# MALICIOUS REQUEST
curl -X POST 'https://school-iraq.com/api/core/students' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{
    "nameAr": "Hacker Attempt",
    "nameEn": "Unauthorized Student",
    "registrationNumber": "HACK-001",
    "dateOfBirth": "2015-01-15",
    "status": "active",
    "classId": "boys-secondary-class-uuid",
    "branchId": "boys-secondary-branch-uuid"
  }'

# ❌ SHOULD FAIL
# Expected: 403 Forbidden
# Expected Error: "You do not have access to this branch"

# ✗ SECURITY BREACH IF: 201 Created
# ✗ SECURITY BREACH IF: Student created in wrong branch
```

**Expected Response (SAFE):**
```json
{
  "error": "Forbidden: You do not have access to this branch",
  "code": 403
}
```

**Dangerous Response (UNSAFE):**
```json
{
  "success": true,
  "data": {
    "id": "hacker-student-uuid",
    "full_name": "Hacker Attempt",
    "branch_id": "boys-secondary-branch-uuid"  // ❌ WRONG BRANCH
  }
}
```

---

### TEST 5: ATTACK - POST Without branchId Parameter

**Account:** zena3@school-iraq.com

```bash
# MISSING BRANCH ID
curl -X POST 'https://school-iraq.com/api/core/students' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{
    "nameAr": "No Branch",
    "nameEn": "Missing Branch ID",
    "registrationNumber": "TEST-001",
    "dateOfBirth": "2010-01-15",
    "status": "active",
    "classId": "some-class-uuid"
    // ❌ MISSING: "branchId"
  }'

# Expected: 400 Bad Request
# Expected Error: "Branch ID is required and must not be empty"

# ✗ FAIL if: 201 Created (means branchId not enforced)
# ✗ FAIL if: System auto-assigns a branch (dangerous fallback)
```

**Expected Response:**
```json
{
  "error": "Branch ID is required and must not be empty",
  "code": 400,
  "field": "branchId"
}
```

---

### TEST 6: Payment - Must Match Student's Branch

**Account:** zena3@school-iraq.com (Primary Branch)  
**Scenario:** Creating legitimate payment for Primary student

```bash
# CREATE PAYMENT FOR LEGITIMATE PRIMARY STUDENT
curl -X POST 'https://school-iraq.com/api/core/payments' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{
    "studentId": "qa-primary-student-uuid",
    "amount": 10000,
    "paymentDate": "2026-05-07",
    "description": "QA Test Payment",
    "branchId": "primary-branch-uuid"
  }'

# Expected: 201 Created
# Expected: Payment created with correct branch_id
```

**Now ATTACK: Try to pay for Boys Secondary student**

```bash
# MALICIOUS: Create payment for wrong branch's student
curl -X POST 'https://school-iraq.com/api/core/payments' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{
    "studentId": "boys-secondary-student-uuid",
    "amount": 50000,
    "paymentDate": "2026-05-07",
    "branchId": "boys-secondary-branch-uuid"
  }'

# Expected: 403 Forbidden
# Expected Error: "You do not have access to this branch"
# Or: "Student not found" (if student filtered out by RLS)

# ✗ FAIL if: 201 Created (data corruption across branches)
```

---

### TEST 7: School Manager Can See All Branches

**Account:** dr.anmar@school-iraq.com (School Manager)

```bash
# School manager can list students from all branches
curl -X GET 'https://school-iraq.com/api/core/students?page=1&limit=100' \
  -H 'Authorization: Bearer {DR_ANMAR_TOKEN}' \
  -H 'Content-Type: application/json'

# Expected: 200 OK
# Expected: Students from ALL three branches in response
# Expected: Total count = 121 + boys_count + girls_count

# Response should include diverse branch_id values
```

**But still can't access unauthorized school:**

```bash
# Try to list students from a DIFFERENT SCHOOL
curl -X GET 'https://school-iraq.com/api/core/students?schoolId=different-school-uuid' \
  -H 'Authorization: Bearer {DR_ANMAR_TOKEN}' \
  -H 'Content-Type: application/json'

# Expected: 403 Forbidden
# Or: Empty list (if query param ignored)

# ✗ FAIL if: Returns students from different school
```

---

### TEST 8: Super Admin - Full Access

**Account:** super.admin@school-iraq.com

```bash
# Super admin can list all students from any school
curl -X GET 'https://school-iraq.com/api/core/students?page=1&limit=200' \
  -H 'Authorization: Bearer {SUPER_ADMIN_TOKEN}' \
  -H 'Content-Type: application/json'

# Expected: 200 OK
# Expected: Students from ALL schools visible
# Expected: Total count = all students in system

# Super admin should also see aggregate data
curl -X GET 'https://school-iraq.com/api/core/dashboard/overview' \
  -H 'Authorization: Bearer {SUPER_ADMIN_TOKEN}' \
  -H 'Content-Type: application/json'

# Expected: System-wide metrics (all schools + branches)
```

---

### TEST 9: Salary/Teacher Branch Enforcement

**Account:** zena3@school-iraq.com (Primary Branch)

```bash
# CREATE SALARY FOR PRIMARY TEACHER (LEGITIMATE)
curl -X POST 'https://school-iraq.com/api/core/salaries' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{
    "teacherId": "primary-teacher-uuid",
    "monthYear": "2026-05",
    "basicSalary": 500000,
    "deductions": 50000,
    "branchId": "primary-branch-uuid"
  }'

# Expected: 201 Created
# Expected: teacher.branch_id must equal salary.branch_id
```

**ATTACK: Try to create salary for different branch's teacher**

```bash
# MALICIOUS
curl -X POST 'https://school-iraq.com/api/core/salaries' \
  -H 'Authorization: Bearer {ZENA3_TOKEN}' \
  -H 'Content-Type: application/json' \
  -d '{
    "teacherId": "boys-secondary-teacher-uuid",
    "monthYear": "2026-05",
    "basicSalary": 500000,
    "deductions": 50000,
    "branchId": "boys-secondary-branch-uuid"
  }'

# Expected: 403 Forbidden
# Or: "Teacher not found" (filtered by RLS)

# ✗ FAIL if: 201 Created
```

---

## 📊 DATABASE AUDIT QUERIES

Run these in Supabase SQL Editor to verify data integrity:

### Query 1: QA Records Verification
```sql
-- Verify QA students are in correct branches
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

-- Expected: Each row shows correct branch_name
-- ✗ FAIL if: QA-Primary appears in Boys Secondary branch
```

### Query 2: Orphaned Records (No Branch ID)
```sql
-- Check for records missing branch_id
SELECT COUNT(*) as orphaned_count
FROM students
WHERE branch_id IS NULL
  AND created_at > now() - interval '7 days'
  AND deleted_at IS NULL;

-- Expected: 0 rows
-- ✗ FAIL if: Any count > 0
```

### Query 3: Payment/Student Branch Mismatch
```sql
-- Verify payments match their student's branch
SELECT COUNT(*) as mismatches
FROM payments p
JOIN students s ON s.id = p.student_id
WHERE p.branch_id <> s.branch_id
  AND p.deleted_at IS NULL;

-- Expected: 0 rows
-- ✗ FAIL if: Any count > 0 (data corruption)
```

### Query 4: Salary/Teacher Branch Mismatch
```sql
-- Verify salaries match their teacher's branch
SELECT COUNT(*) as mismatches
FROM salaries sa
JOIN teachers t ON t.id = sa.teacher_id
WHERE sa.branch_id <> t.branch_id
  AND sa.deleted_at IS NULL;

-- Expected: 0 rows
-- ✗ FAIL if: Any count > 0
```

### Query 5: RLS Policy Test
```sql
-- Verify RLS actually restricts access
-- Run as authenticated user zena3 (Primary branch only)

SELECT COUNT(*) as primary_students
FROM students
WHERE branch_id = (
  SELECT id FROM branches WHERE name ILIKE '%ابتدائية%'
);

-- Expected: 121+ (includes QA records)

-- Now try to query boys secondary (should return 0 due to RLS)
-- This would require switching user context, so manual verification needed
```

---

## ✅ SUCCESS CRITERIA

### API Security Tests - PASS If:
- ✅ TEST 1: 200 OK - Own branch access works
- ✅ TEST 2: No cross-branch data in response
- ✅ TEST 3: 201 Created - Legitimate student created
- ✅ TEST 4: 403 Forbidden - Cross-branch attack blocked
- ✅ TEST 5: 400 Bad Request - Missing branchId rejected
- ✅ TEST 6: 403 - Cross-branch payment blocked
- ✅ TEST 7: School manager sees all branches
- ✅ TEST 8: Super admin has full access
- ✅ TEST 9: Salary/teacher branch enforced

### Database Audit - PASS If:
- ✅ All QA records in correct branches
- ✅ Zero orphaned records (NULL branch_id)
- ✅ Zero payment/student branch mismatches
- ✅ Zero salary/teacher branch mismatches
- ✅ RLS policies working (users can't query other branches)

---

## 🚨 CRITICAL FAILURES

If ANY of these occur: **NOT READY FOR PRODUCTION**

1. ❌ TEST 4 returns 201 Created (branch isolation bypassed)
2. ❌ TEST 5 returns 201 Created (missing branchId not enforced)
3. ❌ TEST 6 returns 201 Created (cross-branch payment created)
4. ❌ Query 3 returns > 0 (payment/student mismatch)
5. ❌ Query 4 returns > 0 (salary/teacher mismatch)
6. ❌ Test 2: Other branch students visible (RLS failure)
7. ❌ Missing branchId silently creates record in default branch
8. ❌ User can switch to unauthorized branch via query param

---

## 📋 TESTING CHECKLIST

```
[ ] Collect tokens for all 5 accounts
[ ] Get all branch UUIDs
[ ] Run TEST 1 - Own branch access
[ ] Run TEST 2 - No cross-branch data
[ ] Run TEST 3 - Create legitimate student
[ ] Run TEST 4 - Block cross-branch creation
[ ] Run TEST 5 - Require branchId
[ ] Run TEST 6 - Block cross-branch payment
[ ] Run TEST 7 - School manager multi-branch
[ ] Run TEST 8 - Super admin access
[ ] Run TEST 9 - Salary branch enforcement
[ ] Query 1 - Verify QA records
[ ] Query 2 - Check orphaned records
[ ] Query 3 - Check payment/student match
[ ] Query 4 - Check salary/teacher match
[ ] Query 5 - Verify RLS working
[ ] Document all results
[ ] Decision: PASS/FAIL
```

---

**End of API Security Test Guide**

