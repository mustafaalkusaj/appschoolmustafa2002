# Error Pattern Clusterer

## Name
error-pattern-clusterer

## Description
Analyzes multiple error instances to identify recurring patterns and group related errors. Helps prioritize fixes by understanding which errors are most impactful.

**When to use:**
- Multiple similar errors appearing in logs
- High volume of errors needing triage
- Identifying which bugs affect most users
- Grouping errors by root cause for batch fixing
- Understanding error trends over time

## Instructions

1. **Collect error instances**: Gather all unique error occurrences
2. **Extract error signatures**: Identify unique identifiers, types, and messages
3. **Group by similarity**: Cluster errors with common root causes
4. **Calculate frequency**: Count occurrences of each pattern
5. **Assess impact**: Determine which patterns affect most users/sessions
6. **Prioritize clusters**: Rank by frequency, severity, and fixability
7. **Document patterns**: Summarize each cluster with resolution hints

## Expected Input

- Multiple error messages or log entries
- Error timestamps and frequency
- Stack traces (if available)
- User/session identifiers (for impact analysis)

## Expected Output

- Grouped error clusters with representative examples
- Frequency ranking of each cluster
- Impact assessment per cluster
- Common root causes identified
- Suggested fix approach per cluster

## Example Usage

```
User: We have 500 errors in the last hour. Cluster them to find patterns.
[list of errors]

Skill will:
1. Parse each error
2. Group by error type and stack trace pattern
3. Identify 3-4 distinct clusters
4. Show cluster frequencies and representative errors
5. Suggest fix approach for each cluster
```

## Output Format

```markdown
## Error Pattern Analysis

### Summary
- **Total Errors**: X
- **Unique Patterns**: Y
- **Clustered Groups**: Z

### Error Clusters (Ranked by Frequency)

#### Cluster 1: [Name]
**Frequency**: X occurrences (Y% of total)
**Impact**: High/Medium/Low
**Example Error**:
```
[representative error message]
```
**Stack Pattern**:
```
[common stack frames]
```
**Root Cause**: [identified cause]
**Fix Approach**: [how to resolve]
**Priority**: [P1/P2/P3]

#### Cluster 2: [Name]
...

### Error Trend
[chart or table of error frequency over time]

### Recommendations
1. Prioritize Cluster X first due to [reason]
2. Batch fix Clusters X, Y as they share [commonality]
```
