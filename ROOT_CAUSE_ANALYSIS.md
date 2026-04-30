# Root Cause Analysis: remaining_fee Write Blocker

## The Error
```
column "remaining_fee" can only be updated to DEFAULT
```

## What It Means
- `remaining_fee` is a `GENERATED ALWAYS AS (expression) STORED` column ✓ (correct design)
- PostgreSQL auto-computes remaining_fee from: `total_fee - paid_fee`
- Direct writes to remaining_fee are forbidden by PostgreSQL
- Error means: "Don't try to SET this column, it's auto-computed"

## Why APIs Fail
When PATCH /api/web/students/[id] runs:
```typescript
.update({
  status: "suspended",  // ✓ OK to write
  class_name: "...",    // ✓ OK to write
  // remaining_fee NOT in payload ✓ correct
})
```

Query succeeds in creating the UPDATE statement, but PostgreSQL rejects it because:
1. Some TRIGGER is trying to SET remaining_fee
2. OR some CONSTRAINT is validating remaining_fee during row modification
3. OR remaining_fee column definition has an issue

## What to Look For

### Problem 1: Trigger Setting remaining_fee
```sql
CREATE TRIGGER update_remaining_fee
AFTER INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION compute_remaining_fee();  -- ← BAD if it SETSremaining_fee
```

**Fix:** Remove the SET from trigger, let column auto-compute

### Problem 2: CHECK Constraint
```sql
ALTER TABLE students
ADD CONSTRAINT check_remaining_fee
CHECK (remaining_fee = total_fee - paid_fee);  -- ← BAD, blocks all updates
```

**Fix:** Drop constraint, remaining_fee will self-validate via GENERATED definition

### Problem 3: Column Definition
Column might be defined as:
```sql
remaining_fee numeric DEFAULT 0  -- ← WRONG (not generated, has default)
```

Should be:
```sql
remaining_fee numeric GENERATED ALWAYS AS (
  GREATEST(COALESCE(total_fee, 0) - COALESCE(paid_fee, 0), 0)
) STORED  -- ← CORRECT (auto-computed, read-only)
```

## Verification Script
Run `VERIFY_REMAINING_FEE.sql` in Supabase SQL Editor:
- Shows exact column configuration
- Lists any triggers touching remaining_fee
- Lists any functions writing to remaining_fee
- Tests UPDATE to confirm it works

## Expected Configuration (After Fix)
```
Column: remaining_fee
Type: numeric
Generated: ALWAYS
Updatable: NO (read-only)
Expression: GREATEST(COALESCE(total_fee, 0) - COALESCE(paid_fee, 0), 0)
Triggers: None that write to it
Constraints: None that restrict updates based on it
```

## Fix Migration
`migrations/20260430_000000_fix_remaining_fee_constraint.sql` will:
1. Drop any CHECK constraints on remaining_fee
2. Recreate remaining_fee as proper GENERATED column
3. Restore correct auto-computation

## Timeline
1. Run VERIFY_REMAINING_FEE.sql (2 min)
2. If verification shows problem → run fix migration (1 min)
3. Test UPDATE (1 min)
4. Total: ~5 minutes

## Key Point
**The code is correct.** It never tries to write remaining_fee.
**The database has the issue.** Something on production is blocking writes due to remaining_fee configuration.

Once verified and fixed, all student status actions work immediately.
