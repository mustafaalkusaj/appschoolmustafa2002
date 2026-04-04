# Timeout Diagnoser

## Name
timeout-diagnoser

## Description
Diagnoses timeout issues in applications. Identifies whether timeouts are caused by slow operations, resource contention, network issues, or configuration problems.

**When to use:**
- Requests timing out inconsistently
- Services becoming unresponsive after a period
- Connection pool exhaustion causing timeouts
- Database queries taking too long
- API calls exceeding expected duration
- Understanding timeout vs deadlock vs slow operation

## Instructions

1. **Categorize the timeout**: Network, database, API, or application-level
2. **Check timeout configuration**: Compare actual vs expected timeout values
3. **Analyze latency patterns**: Look for gradual slowdown or sudden spikes
4. **Check resource usage**: CPU, memory, connections, file handles
5. **Review query performance**: Explain slow database queries
6. **Check for deadlocks**: Ensure operations aren't waiting indefinitely
7. **Network diagnostics**: DNS, connection limits, firewall issues

## Expected Input

- Timeout error messages
- Request/response timestamps
- Configuration files
- Relevant logs around timeout events
- System metrics if available

## Expected Output

- Categorized root cause of timeouts
- Specific bottlenecks identified
- Timeline analysis of slow operations
- Configuration recommendations
- Code or query optimizations

## Example Usage

```
User: Our API returns 504 Gateway Timeout after exactly 30 seconds.
50% of requests fail during peak hours but work fine at night.

Skill will:
1. Identify this as a reverse proxy timeout configuration
2. Check for slow database queries during peak
3. Look for connection pool exhaustion
4. Recommend timeout adjustments and optimizations
```

## Output Format

```markdown
## Timeout Diagnosis Report

### Timeout Overview
- Type: [Network/Database/API/Application]
- Pattern: [Consistent/Intermittent/Gradual]
- Affected endpoints: [list]

### Root Cause
[primary cause of the timeouts]

### Contributing Factors
1. [factor 1]
2. [factor 2]

### Performance Analysis
| Operation | Expected | Actual | Threshold |
|-----------|----------|--------|-----------|
| ... | ... | ... | ... |

### Slow Queries/Operations
```sql
-- Query with execution plan
```

### Recommendations

#### Configuration Changes
```yaml
# config changes
```

#### Code Optimizations
```code
// before
// after
```

### Verification Plan
[steps to confirm timeouts are resolved]
```
