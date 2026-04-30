# Fix: remaining_fee Column Constraint Blocks Status Updates

## Problem

Production error when updating student status:
```
column "remaining_fee" can only be updated to DEFAULT
```

This blocks ALL student status actions (suspend/delete/restore/transfer).

## Root Cause

PostgreSQL CHECK constraint on `remaining_fee` column is too restrictive.

Likely definition (in Supabase):
```sql
ALTER TABLE students
ADD CONSTRAINT check_remaining_fee
CHECK (remaining_fee = DEFAULT);
```

This prevents ANY UPDATE to students table because PostgreSQL tries to validate remaining_fee on every row modification.

## Solution

Drop the restrictive constraint and use computed column instead.

### Step 1: Connect to Supabase SQL Editor

Go to: https://app.supabase.com → Project → SQL Editor

### Step 2: Find the Constraint

```sql
SELECT constraint_name, constraint_definition
FROM information_schema.check_constraints
WHERE table_name = 'students'
  AND constraint_name LIKE '%remaining%';
```

### Step 3: Drop Constraint

```sql
ALTER TABLE public.students
DROP CONSTRAINT check_remaining_fee;
```

(Replace `check_remaining_fee` with actual constraint name from Step 2)

### Step 4: Verify

Run UPDATE to confirm it works:
```sql
UPDATE students
SET status = 'suspended'
WHERE id = 'test-id'
RETURNING id, status;
```

### Step 5: Create Proper Computed Column

If remaining_fee should be read-only computed value:

```sql
ALTER TABLE public.students
ADD COLUMN remaining_fee_computed numeric
GENERATED ALWAYS AS (
  GREATEST(COALESCE(total_fee, 0) - COALESCE(paid_fee, 0), 0)
) STORED;

-- If previous column exists, migrate:
UPDATE public.students
SET remaining_fee = remaining_fee_computed
WHERE remaining_fee IS DISTINCT FROM remaining_fee_computed;

-- Drop old constraint
ALTER TABLE public.students
DROP CONSTRAINT check_remaining_fee;
```

## Workaround (If Constraint Cannot Be Dropped)

Modify API to use raw SQL instead of ORM:

```typescript
const { data, error } = await serviceSupabase.rpc(
  'update_student_status',
  {
    student_id: studentId,
    school_id: targetSchoolId,
    new_status: newStatus
  }
);
```

Create stored procedure:
```sql
CREATE OR REPLACE FUNCTION update_student_status(
  p_student_id uuid,
  p_school_id uuid,
  p_new_status text
) RETURNS TABLE (
  id uuid,
  status text
) AS $$
BEGIN
  RETURN QUERY UPDATE public.students
  SET status = p_new_status
  WHERE id = p_student_id AND school_id = p_school_id
  RETURNING id, status;
END;
$$ LANGUAGE plpgsql;
```

## Testing

After fix, run in production:
```bash
curl -X PATCH https://school-iraq.com/api/web/students/[id] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{"school_id": "[id]", "status": "suspended"}'
```

Expected: HTTP 200, student status updated

## Files Affected

- app/api/web/students/[studentId]/route.ts - PATCH handler
- Supabase students table schema

## Priority

🔴 CRITICAL - Blocks all student actions in production

## Timeline

Fix must be applied to production database before UI actions work.
