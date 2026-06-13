# Database Schema Reviewer

## Name
schema-reviewer

## Description
Reviews database schemas for design issues, normalization problems, data integrity concerns, and best practice violations. Provides actionable feedback for schema improvements.

**When to use:**
- New schema design review
- Legacy schema modernization
- Pre-production validation
- Schema optimization projects
- Database documentation
- Compliance and standards review

## Instructions

1. Analyze table structures and relationships
2. Review data types for appropriateness
3. Check normalization (1NF, 2NF, 3NF)
4. Verify primary and foreign key usage
5. Examine constraint definitions
6. Review index coverage
7. Check for anti-patterns (Y2K38, floating point for money, etc.)
8. Assess naming conventions
9. Document issues with severity and recommendations

## Expected Input

```
- Schema definition (DDL, diagram, or ORM models)
- Database type/version
- Business context if available
- Any known performance or data issues
```

## Expected Output

```
- Overall schema health score
- Issues by severity (Critical, High, Medium, Low)
- Specific problems with line/table references
- Recommended fixes
- Alternative designs if applicable
- Priority of recommended changes
```

## Example Usage

**Input:**
```sql
CREATE TABLE orders (
  id INT,
  user_id INT,
  total FLOAT,
  created_date VARCHAR(50),
  status VARCHAR(10)
);
```

**Output:**
```
SCHEMA REVIEW RESULTS
====================

Health Score: 65/100

CRITICAL Issues:
1. Table: orders
   - Missing PRIMARY KEY on 'id' column
   - Fix: Add PRIMARY KEY or use SERIAL

2. Column: total (FLOAT)
   - Floating point for monetary values causes precision errors
   - Fix: Use DECIMAL(10,2) instead

HIGH Issues:
1. Column: created_date (VARCHAR)
   - Storing dates as strings prevents date operations
   - Fix: Use DATE, TIMESTAMP, or DATETIME

2. Column: status (VARCHAR)
   - No enum or constraint enforcement
   - Fix: Use ENUM or CHECK constraint

MEDIUM Issues:
1. Missing index recommendations
   - Add index on user_id for foreign key

2. Table naming convention
   - Consider 'order' vs 'orders' consistency
```
