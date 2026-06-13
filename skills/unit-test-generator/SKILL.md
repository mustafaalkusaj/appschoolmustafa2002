# Unit Test Generator

## Name
unit-test-generator

## Description
Generates comprehensive unit tests for functions, methods, and classes. Creates well-structured tests with appropriate assertions, setup/teardown logic, and edge case coverage.

### When to Use
- Writing tests for new functions or methods
- Adding test coverage to existing code
- Generating baseline tests for legacy code
- Creating tests alongside TDD workflow
- Filling coverage gaps

## Instructions

### 1. Analyze Target Code
- Identify function/method signature
- Map input parameters and return types
- Understand side effects and dependencies
- Identify external dependencies needing mocks

### 2. Design Test Cases
- Happy path scenarios
- Edge cases (empty, null, boundary values)
- Error conditions and exception handling
- Boundary value analysis
- Equivalence partitioning

### 3. Generate Test Structure
- Follow project test conventions
- Use appropriate assertions
- Create meaningful test names
- Include descriptive comments
- Add setup/teardown as needed

### 4. Review and Refine
- Verify test coverage
- Ensure tests are independent
- Check for proper mock usage
- Validate assertion messages

## Expected Input
- Source file(s) to test
- Function/method to test (specified or detected)
- Testing framework in use (Jest, Pytest, JUnit, etc.)
- Project testing conventions

## Expected Output
- Complete test file(s)
- Test cases for each scenario
- Appropriate mocks and stubs
- Setup and teardown logic
- Descriptive test names and assertions

## Example Usage

```
User: Generate unit tests for a calculateDiscount function that takes price and discount percentage.

Assistant:
Generated tests covering:
- calculateDiscount(100, 10) → 90
- calculateDiscount(0, 20) → 0
- calculateDiscount(100, 0) → 100
- calculateDiscount(100, 100) → 0
- Edge: calculateDiscount(100, 150) → Error
- Edge: calculateDiscount(-100, 10) → Error
- Edge: calculateDiscount(null, 10) → Error
```
