# Flaky Test Investigator

## Name
flaky-test-investigator

## Description
Diagnoses and fixes flaky tests that produce inconsistent results. Identifies root causes of test instability and provides solutions to make tests reliable.

### When to Use
- Tests passing and failing randomly
- Intermittent test failures
- Tests passing locally but failing CI
- Tests dependent on timing
- Race condition suspected

## Instructions

### 1. Gather Evidence
- Collect failure patterns and logs
- Identify failure frequency
- Note failure conditions
- Check test execution history
- Review CI/CD environment

### 2. Identify Root Causes
- Timing and async issues
- Shared state contamination
- Test order dependencies
- Resource contention
- Environment differences
- Data pollution
- Network instability

### 3. Categorize Issue Type
- Race condition
- Time-based dependency
- Shared mutable state
- External service dependency
- Environment-specific behavior
- Data cleanup missing
- Flaky assertion

### 4. Implement Fix
- Add explicit waits
- Use synchronization primitives
- Implement retry logic
- Isolate test data
- Add proper cleanup
- Mock external dependencies
- Stabilize assertions

## Expected Input
- Flaky test file(s)
- Test execution history/logs
- CI/CD environment details
- Recent code changes
- Error messages and stack traces

## Expected Output
- Root cause analysis
- Issue categorization
- Specific fix recommendations
- Updated test code
- Prevention guidelines
- Monitoring recommendations

## Example Usage

```
User: Test "should load user data" fails randomly in CI.

Assistant:
Root Cause Analysis:
- Test checks DOM before React renders
- Race condition between fetch and render
- Sometimes passes if render is fast

Fix Applied:
Before:
  expect(wrapper.find('.user-name').text()).toBe('John');

After:
  await waitFor(() => {
    expect(wrapper.find('.user-name').text()).toBe('John');
  });

Additional Recommendations:
1. Add explicit timeout of 5000ms
2. Add data-testid for reliable selection
3. Consider mocking API response
```
