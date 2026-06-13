# Memory Leak Hunter

## Name
memory-leak-hunter

## Description
Identifies and diagnoses memory leaks in applications. Tracks down objects that should have been garbage collected but persist, causing increasing memory usage over time.

**When to use:**
- Application memory grows continuously without leveling off
- Out of memory crashes in long-running processes
- Performance degradation over time
- Memory profiling shows objects not being released
- Container/pod memory limits being hit frequently

## Instructions

1. **Confirm leak**: Verify memory growth pattern is a true leak
2. **Identify scope**: Determine if leak is in heap, memory-mapped files, or connections
3. **Take snapshots**: Collect memory snapshots at different intervals (before/after)
4. **Compare snapshots**: Find objects that exist in later snapshot but not earlier
5. **Trace references**: Follow reference chains to find what's keeping objects alive
6. **Identify source**: Pinpoint the code creating the retained objects
7. **Propose fix**: Suggest changes to release references properly

## Expected Input

- Memory profiling data (heap dumps, snapshots)
- Application logs showing memory trends
- Codebase access for investigation
- Environment details (runtime, framework)

## Expected Output

- Memory growth analysis and confirmation of leak
- List of leaked object types and approximate counts
- Reference chain showing what's retaining objects
- Specific code locations causing the leak
- Recommended fixes with code examples

## Example Usage

```
User: Our Node.js server memory grows from 200MB to 1.5GB over 24 hours
and then crashes. Find the memory leak.

Skill will:
1. Analyze heap snapshots if provided
2. Look for common Node.js leak patterns (event listeners, closures, caches)
3. Check for unreleased resources
4. Identify the specific code causing retention
5. Provide fix recommendations
```

## Output Format

```markdown
## Memory Leak Analysis

### Memory Trend
[description of memory growth pattern]

### Leaked Objects Identified
| Object Type | Count (Snapshot 1) | Count (Snapshot 2) | Growth |
|-------------|---------------------|---------------------|--------|
| ... | ... | ... | ... |

### Reference Chain (Retaining Path)
```
[object] → [parent] → [root]
```

### Source Code Locations
1. **File:line** - Description of leak
2. **File:line** - Description of leak

### Recommended Fixes
```javascript
// Before (leaking)
[problematic code]

// After (fixed)
[corrected code]
```

### Verification
[steps to confirm leak is fixed]
```
