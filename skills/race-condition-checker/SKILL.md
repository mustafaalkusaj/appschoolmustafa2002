# Race Condition Checker

## Name
race-condition-checker

## Description
Detects potential race conditions and concurrency bugs in code. Analyzes code for timing-dependent behaviors, shared state access, and improper synchronization.

**When to use:**
- Intermittent failures that don't have consistent patterns
- Bugs that appear only under heavy load or concurrent access
- Code that accesses shared state without proper locking
- Async code with potential timing issues
- Data corruption or inconsistent state issues

## Instructions

1. **Identify shared state**: Find variables/resources accessed by multiple execution paths
2. **Analyze access patterns**: Check for read-modify-write sequences
3. **Look for synchronization gaps**: Find missing locks, mutexes, or atomic operations
4. **Check async boundaries**: Identify promises, callbacks, or async/await that may reorder
5. **Review initialization**: Look for lazy initialization race conditions
6. **Check for deadlocks**: Identify potential circular wait conditions
7. **Propose solutions**: Recommend proper synchronization mechanisms

## Expected Input

- Source code to analyze
- Description of the intermittent behavior
- Architecture diagram (if available)
- Testing/load patterns used

## Expected Output

- List of potential race conditions found
- Risk level for each identified issue
- Code locations with the problematic patterns
- Recommended fixes with synchronization approaches
- Test cases to reliably trigger the race condition

## Example Usage

```
User: Our user balance is getting corrupted when two payments process
simultaneously. Find the race condition.

Skill will:
1. Review payment processing code
2. Identify the shared account balance variable
3. Find the read-modify-write pattern causing corruption
4. Check for missing transaction locking
5. Provide a thread-safe solution
```

## Output Format

```markdown
## Race Condition Analysis

### Symptom Description
[description of the intermittent issue]

### Potential Race Conditions Found

#### 1. [Name]
**Severity**: High/Medium/Low
**Location**: [file:line]
**Pattern**: [what creates the race]
```javascript
// Problematic code
[pull code]
```
**Recommended Fix**:
```javascript
// Fixed code
[pull fix]
```

### Synchronization Gap Analysis
| Shared State | Access Pattern | Protection |
|--------------|----------------|------------|
| ... | ... | ... |

### Test Case to Trigger
```javascript
[code to reliably trigger the race]
```

### Prevention Recommendations
[practices to avoid similar issues]
```
