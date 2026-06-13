# Test Planner

## Name
test-planner

## Description
Strategic test planning skill that helps design comprehensive test strategies, identify testable scenarios, and organize testing efforts effectively.

### When to Use
- Starting a new feature and need to plan testing approach
- Designing test coverage strategy for a module
- Planning regression testing after changes
- Organizing test efforts for a sprint or release
- Creating test plans for legacy code

## Instructions

### 1. Analyze Requirements
- Review feature specifications and user stories
- Identify functional requirements
- Map business logic and edge cases
- Understand integration points

### 2. Define Test Scope
- List features to test
- Identify dependencies and integrations
- Determine test types needed (unit, integration, E2E)
- Set priorities based on risk and impact

### 3. Create Test Strategy
- Design test pyramid approach
- Plan test execution order
- Define success criteria
- Identify test data requirements

### 4. Document Test Plan
- List all test scenarios
- Categorize by priority (P0, P1, P2)
- Define test environment needs
- Estimate execution time

## Expected Input
- Feature description or requirements document
- Code files to be tested
- Existing test structure (if any)
- Project testing conventions

## Expected Output
- Comprehensive test plan document
- List of test scenarios with priorities
- Test coverage map
- Recommended test execution order
- Risk assessment for uncovered areas

## Example Usage

```
User: Plan testing strategy for a user authentication module that includes login, logout, password reset, and session management.

Assistant:
1. Identified test categories:
   - Unit: AuthService methods, token generation, password hashing
   - Integration: Database operations, session storage, email service
   - E2E: Full login flow, password reset flow, session timeout

2. Test scenarios created:
   - P0: Valid login, Invalid login attempts, Session expiry
   - P1: Password reset flow, Logout behavior, Token refresh
   - P2: Remember me functionality, Multiple session handling

3. Coverage recommendations:
   - Aim for 90%+ coverage on AuthService
   - Integration tests for DB operations
   - E2E scenarios for critical user flows
```
