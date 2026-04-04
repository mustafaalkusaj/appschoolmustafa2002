# N+1 Query Detector

## Name
n-plus-one-detector

## Description
Identifies and reports N+1 query problems in database access patterns. Detects scenarios where a query runs once, then repeatedly for each result (N+1 problem), causing significant performance degradation.

**When to use:**
- Performance investigation
- Code review for database efficiency
- Proactive optimization
- Load testing analysis
- Monitoring slow endpoints
- Training on query efficiency

## Instructions

1. Analyze the code for query patterns
2. Identify relationship access in loops
3. Look for ORM lazy loading usage
4. Check for missing eager loading (.include, .with, etc.)
5. Review API endpoints for inefficient data fetching
6. Provide specific line-by-line analysis
7. Suggest fixes with example code
8. Estimate query count reduction

## Expected Input

```
- Code snippet or file path
- ORM/Query builder being used
- Execution context (API endpoint, job, etc.)
- Sample data volumes if known
```

## Expected Output

```
- N+1 instances found with locations
- Query count analysis (before/after)
- Specific fix recommendations
- Refactored code examples
- Performance impact metrics
```

## Example Usage

**Input (Node.js/Sequelize):**
```javascript
const users = await User.findAll();
for (const user of users) {
  const orders = await Order.findAll({ where: { userId: user.id }});
  user.orders = orders;
}
```

**Output:**
```
N+1 DETECTED: 2 instances

Location: controllers/users.js:45-52
Problem: Query in loop for each user
- Query 1: SELECT * FROM users (1 time)
- Query 2: SELECT * FROM orders WHERE userId = ? (N times)

For 100 users: 101 total queries

Fix:
const users = await User.findAll({
  include: [{
    model: Order,
    as: 'orders'
  }]
});

Result: 2 queries total (99% reduction)
```
