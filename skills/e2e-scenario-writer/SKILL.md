# E2E Scenario Writer

## Name
e2e-scenario-writer

## Description
Writes end-to-end test scenarios that simulate real user workflows through complete application paths. Covers user interactions, UI flows, and full system behavior.

### When to Use
- Validating complete user journeys
- Testing critical business workflows
- Verifying UI component interactions
- Testing multi-step processes
- Validating acceptance criteria

## Instructions

### 1. Understand User Journey
- Map complete user flow from start to end
- Identify entry points and exit points
- Document user actions and expectations
- Note data flow through the system
- Identify happy path and alternatives

### 2. Design E2E Scenarios
- Define preconditions for each scenario
- List user actions step-by-step
- Specify expected outcomes at each step
- Include error scenarios and recovery
- Plan assertions for final state

### 3. Generate Test Structure
- Use behavior-driven naming (Gherkin/Cucumber)
- Include setup and teardown
- Add page object interactions
- Implement wait strategies
- Use realistic test data

### 4. Ensure Reliability
- Add explicit waits for dynamic content
- Implement retry logic for flakiness
- Use stable selectors
- Handle network timing issues
- Add appropriate timeouts

## Expected Input
- User story or feature description
- UI component/page files
- Application routes
- Testing framework (Cypress, Playwright, Selenium)
- User authentication flow (if applicable)

## Expected Output
- Complete E2E test scenarios
- Step-by-step user actions
- Clear assertions and expectations
- Page object methods
- Setup and cleanup logic

## Example Usage

```
User: Write E2E scenarios for a shopping cart checkout flow.

Assistant:
Scenario: Complete checkout
  Given user is logged in
  And cart has 2 items
  When user clicks "Checkout"
  And enters shipping address
  And selects payment method
  And clicks "Place Order"
  Then confirmation page shows
  And order number is displayed
  And email confirmation sent

Scenario: Checkout with invalid card
  Given user is on checkout payment step
  When enters invalid card number
  Then error message displayed
  And user remains on payment step
```
