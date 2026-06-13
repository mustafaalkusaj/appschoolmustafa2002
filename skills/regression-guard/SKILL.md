# Regression Guard

## Name
regression-guard

## Description
Identifies potential regressions before code changes and ensures existing functionality remains intact. Helps create regression test suites and validates changes against existing behavior.

### When to Use
- Before making code changes
- During code review
- After dependency updates
- When refactoring code
- Before deployment to production

## Instructions

### 1. Analyze Changes
- Review modified files and functions
- Map changes to affected functionality
- Identify dependent code paths
- Understand side effects of changes
- Check related configuration changes

### 2. Identify Regression Risks
- List features that could break
- Identify affected business logic
- Map data flow changes
- Check API contract changes
- Verify dependency impacts

### 3. Design Regression Tests
- Select existing tests to run
- Create new tests for changed paths
- Prioritize critical functionality
- Design minimal test set to validate changes
- Plan test execution order

### 4. Execute and Validate
- Run regression test suite
- Verify all tests pass
- Document any failures
- Create fix or add test for failures
- Re-validate after fixes

## Expected Input
- List of modified files
- Original code (git diff or before/after)
- Affected module specifications
- Existing test suite
- Test execution environment

## Expected Output
- Risk assessment report
- List of affected functionality
- Regression test suite (existing + new)
- Test execution results
- Recommendations for safe deployment

## Example Usage

```
User: Analyze regression risks for changing UserService.updateEmail method to add email verification.

Assistant:
Risk Assessment:
- HIGH: Email update in UserProfile
- HIGH: Email-based authentication
- MEDIUM: Email notifications
- MEDIUM: User search by email
- LOW: Audit log records

Regression Tests Required:
1. Run existing UserService tests
2. Add test: updateEmail sends verification
3. Add test: old email still works until verified
4. Run integration tests for email service
5. Run E2E: change email flow
```
