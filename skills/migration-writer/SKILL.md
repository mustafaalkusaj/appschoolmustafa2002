# Safe Migration Writer

## Name
migration-writer

## Description
Generates safe, reversible database migrations with proper rollback support. Ensures migrations follow best practices including transaction handling, data validation, and zero-downtime patterns.

**When to use:**
- Creating new database tables
- Modifying existing table structures
- Adding, removing, or renaming columns
- Creating or modifying indexes
- Data transformations that require backup
- Before production deployment

## Instructions

1. Understand the desired schema change
2. Determine if change is backward-compatible
3. Write UP migration with proper transaction handling
4. Write DOWN migration for rollback capability
5. Add data validation and constraints
6. Include appropriate checks for existing data
7. Use safe operations (ADD column vs MODIFY)
8. Document any manual steps if required
9. Suggest testing strategy

## Expected Input

```
- Current schema (table name, current columns)
- Desired change type (add column, modify, rename, etc.)
- Data type and constraints
- Database system (PostgreSQL, MySQL, SQLite, etc.)
- Any existing data considerations
```

## Expected Output

```
- Complete UP migration file
- Complete DOWN migration file
- Pre-migration checklist
- Post-migration verification queries
- Rollback procedure
- Testing recommendations
```

## Example Usage

**Input:**
Add a `phone` column to `users` table, required field, VARCHAR(20)

**Output:**
```sql
-- Migration: Add phone column to users
-- UP
BEGIN;

ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;

-- Verify
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'phone';

-- DOWN
BEGIN;

ALTER TABLE users DROP COLUMN phone;

-- Pre-migration checklist:
-- [ ] Backup users table
-- [ ] Check for existing records with phone data elsewhere
-- [ ] Notify application team of new required field

-- Post-migration:
-- [ ] Verify column exists
-- [ ] Check application handles new field
```
