# Data Integrity Checker

## Name
data-integrity-checker

## Description
Audits database records for integrity issues including orphaned records, duplicate data, constraint violations, and inconsistent state. Ensures referential integrity and data quality.

**When to use:**
- Data quality investigation
- Pre-deployment validation
- Routine data health checks
- After data migration or import
- investigating bugs related to data
- Compliance auditing

## Instructions

1. Identify foreign key relationships
2. Check for orphaned child records
3. Detect duplicate records where unique constraints exist
4. Verify CHECK constraint violations
5. Look for NULL values in non-nullable contexts
6. Check for data consistency issues
7. Validate business rule compliance
8. Generate detailed report of issues found

## Expected Input

```
- Database connection or schema
- Tables to audit
- Known relationships and constraints
- Any specific integrity rules to check
- Sample size for large tables
```

## Expected Output

```
- Integrity issues by type and severity
- Affected record counts
- Sample problematic records (anonymized)
- SQL to identify all issues
- Remediation steps
- Prevention recommendations
```

## Example Usage

**Input:**
Check integrity between `orders` and `users` tables, and validate `email` uniqueness in `users`.

**Output:**
```
DATA INTEGRITY AUDIT
====================

1. ORPHANED RECORDS (HIGH)
Table: orders
Foreign Key: user_id
Issue: 23 orders reference non-existent users

Sample records:
- Order #1042, user_id: 9999 (deleted user)
- Order #1089, user_id: 8888 (deleted user)

Detection SQL:
SELECT * FROM orders WHERE user_id NOT IN (SELECT id FROM users);

Remediation:
- Option A: Delete orphaned orders
- Option B: Restore users and re-link
- Option C: Set user_id = NULL (if allowed)

2. DUPLICATE EMAILS (MEDIUM)
Table: users
Constraint: email should be UNIQUE
Issue: 5 duplicate emails found

Sample:
- test@example.com (3 records: IDs 12, 45, 78)
- admin@example.com (2 records: IDs 23, 67)

3. NULL VIOLATIONS (LOW)
Table: orders
Column: total (should NOT be NULL)
Issue: 2 orders with NULL total

Total Issues: 30
Records Affected: 45
```
