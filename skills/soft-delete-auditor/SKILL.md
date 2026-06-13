# Soft Delete Implementation Auditor

## Name
soft-delete-auditor

## Description
Reviews soft delete implementations for consistency, correctness, and common pitfalls. Checks query scopes, cascade behavior, index coverage, and data recovery procedures.

**When to use:**
- Code review of soft delete implementation
- Debugging missing records issue
- Performance review of soft delete queries
- Migration planning from hard to soft delete
- Consistency auditing
- Disaster recovery planning

## Instructions

1. Identify soft delete column pattern (deleted_at, is_deleted, etc.)
2. Review model/global scopes for soft delete filtering
3. Check query builders and ORM usage across codebase
4. Verify index coverage on soft delete column
5. Review cascade soft delete behavior
6. Check data recovery/archive procedures
7. Identify queries that bypass soft delete
8. Review retention and permanent deletion policies

## Expected Input

```
- ORM framework and version
- Soft delete column naming convention
- Model definitions or file paths
- Query patterns across the codebase
- Retention policy if defined
```

## Expected Output

```
- Implementation consistency score
- Issues found with severity
- Query patterns bypassing soft delete
- Missing scope applications
- Index recommendations
- Data recovery procedures
- Security concerns (data exposure)
```

## Example Usage

**Input:**
Laravel/Eloquent app with `deleted_at` column on `users` table

**Output:**
```
SOFT DELETE AUDIT RESULTS
==========================

Consistency Score: 72/100

CRITICAL Issues:
1. Missing Global Scope
   File: app/Services/UserService.php:34
   Query: User::where('role', 'admin')->get()
   Issue: Returns both active AND deleted users
   
   Fix: Add ->whereNull('deleted_at') or use withTrashed()

2. Missing Index
   Table: users
   Column: deleted_at
   Issue: No index - slow queries on large tables
   
   Fix: Add index on deleted_at

MEDIUM Issues:
1. Hard Delete Found
   File: app/Jobs/DeleteOldUsers.php:56
   Issue: Using ->forceDelete() without backup
   
   Fix: Add backup step before force delete

2. Inconsistent Column Name
   Table: orders uses 'is_deleted' (boolean)
   Table: users uses 'deleted_at' (timestamp)
   Recommendation: Standardize to deleted_at

Missing Global Scopes in:
- UserService.php:34
- OrderController.php:78
- ReportGenerator.php:45
```
