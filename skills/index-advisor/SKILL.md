# Database Index Advisor

## Name
index-advisor

## Description
Analyzes query patterns and table structures to recommend optimal indexes. Considers query frequency, data distribution, write/read ratios, and index maintenance overhead.

**When to use:**
- Slow query investigation
- New feature development planning
- Database performance tuning
- Schema design review
- High-traffic endpoint optimization
- Before major application releases

## Instructions

1. Analyze provided queries and their frequency
2. Review WHERE, JOIN, ORDER BY, and GROUP BY clauses
3. Consider column cardinality
4. Evaluate read/write ratio for the table
5. Check for existing overlapping indexes
6. Consider composite vs single-column indexes
7. Analyze index maintenance overhead
8. Prioritize recommendations by impact

## Expected Input

```
- Target table schema
- Query patterns (SQL or ORM queries)
- Query frequency or importance
- Read/write ratio if known
- Existing indexes
- Table size estimate
```

## Expected Output

```
- Recommended indexes with priority
- Estimated performance improvement
- Index creation SQL
- Potential downsides (write overhead, storage)
- Implementation order
- Indexes to avoid or remove
```

## Example Usage

**Input:**
Table: `orders` (1M rows)
Query: `SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC`
Frequency: 10,000/hour

**Output:**
```
Recommendation: Composite Index (HIGH PRIORITY)

CREATE INDEX idx_orders_user_status_date 
ON orders (user_id, status, created_at DESC);

Analysis:
- Covers WHERE clause (user_id, status)
- Eliminates filesort for ORDER BY
- Column order optimized by cardinality

Estimated improvement: 70-85% query time reduction
Expected index size: ~50MB

Alternative: Two separate indexes (lower priority)
- idx_orders_user_id
- idx_orders_status

Composite preferred due to ORDER BY and high frequency.

Caution: 3-5% write overhead increase
```
