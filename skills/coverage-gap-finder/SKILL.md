# Coverage Gap Finder

## Name
coverage-gap-finder

## Description
Analyzes code coverage reports to identify untested code paths, branches, and conditions. Provides actionable recommendations to improve test coverage.

### When to Use
- Improving test coverage metrics
- Before release validation
- Code review process
- Identifying untested functionality
- Prioritizing test writing efforts

## Instructions

### 1. Analyze Coverage Report
- Review line coverage metrics
- Examine branch coverage
- Check function/method coverage
- Identify uncovered files
- Note partially covered files

### 2. Identify Gaps
- List uncovered lines
- Map uncovered branches
- Find untested functions
- Identify dead code
- Check error handling coverage

### 3. Prioritize Gaps
- Sort by business criticality
- Consider code complexity
- Factor in change frequency
- Assess risk of untested code
- Plan coverage improvement effort

### 4. Generate Recommendations
- List specific gaps with locations
- Suggest test scenarios
- Prioritize by impact
- Estimate effort to fix
- Provide test templates

## Expected Input
- Coverage report (JSON, HTML, or text)
- Source files under test
- Test files
- Coverage thresholds
- Critical code paths

## Expected Output
- Coverage gap analysis
- List of untested code sections
- Branch coverage issues
- Prioritized recommendations
- Test scenario suggestions
- Estimated coverage improvement

## Example Usage

```
User: Analyze coverage report for AuthService.

Assistant:
Coverage Analysis:
- Overall: 72% (target: 85%)
- Uncovered lines: 23
- Uncovered branches: 8

Critical Gaps:
1. user.service.ts:45-50 - Error handling for DB timeout
2. user.service.ts:67-72 - Retry logic not tested
3. user.service.ts:89-95 - Cache invalidation edge case
4. user.service.ts:112-120 - Partial update scenario

Quick Wins:
1. Add test for network timeout handling
2. Add test for concurrent update conflict
3. Add test for null user object in cache

Estimated improvement: +10% coverage
```
