# SQL Query Optimizer

## Name
query-optimizer

## Description
Analyzes SQL queries for performance issues and provides optimization recommendations. Examines query structure, indexing opportunities, JOIN patterns, and suggests improvements to reduce execution time and resource usage.

**When to use:**
- Queries running slowly in production
- High database CPU or I/O utilization
- Reports of slow page loads related to database operations
- Before deploying new complex queries
- Routine performance audit

## Instructions

1. Analyze the provided SQL query structure
2. Identify potential bottlenecks (full table scans, missing indexes, inefficient JOINs)
3. Review WHERE clauses for SARGability
4. Check SELECT statements for unnecessary columns
5. Examine JOIN order and type recommendations
6. Provide rewritten optimized query
7. Suggest any required index changes
8. Estimate performance improvement

## Expected Input

```
SQL query to analyze
Database type (PostgreSQL, MySQL, SQLite, etc.)
Table schema context (optional but helpful)
Execution plan if available (optional)
```

## Expected Output

```
- Analysis summary of current query
- Identified bottlenecks and issues
- Optimized query version
- Index recommendations
- Estimated improvement
- Alternative approaches if applicable
```

## Example Usage

**Input:**
```sql
SELECT * FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
AND o.status = 'pending'
```

**Output:**
```
Analysis:
- Using SELECT * retrieves unnecessary columns
- Missing index on orders.status
- Missing index on users.created_at

Optimized Query:
SELECT u.id, u.email, o.id, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
AND o.status = 'pending'

Index Recommendations:
- CREATE INDEX idx_orders_status ON orders(status)
- CREATE INDEX idx_users_created_at ON users(created_at)

Estimated improvement: 40-60% faster execution
```
