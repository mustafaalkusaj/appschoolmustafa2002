# Integration Test Generator

## Name
integration-test-generator

## Description
Generates integration tests that verify interactions between components, services, APIs, and databases. Ensures proper data flow and error handling across system boundaries.

### When to Use
- Testing API endpoints with real services
- Verifying database operations and queries
- Testing service-to-service communication
- Validating message queue integrations
- Checking file system operations

## Instructions

### 1. Identify Integration Points
- Map component boundaries
- Identify external dependencies (DB, APIs, services)
- Determine test environment needs
- Plan test data requirements

### 2. Design Integration Scenarios
- Happy path through the integration
- Error propagation across boundaries
- Timeout and retry scenarios
- Data transformation and mapping
- Authentication and authorization flows

### 3. Generate Test Structure
- Set up test environment/container
- Seed required test data
- Execute integration steps
- Verify results at each boundary
- Clean up resources

### 4. Ensure Isolation
- Use test containers when possible
- Implement proper cleanup
- Avoid test interdependencies
- Use unique test data per run

## Expected Input
- Source files/services to test
- Integration endpoints (API routes, DB schemas)
- Service dependencies
- Testing framework (Supertest, TestContainers, etc.)
- Project testing conventions

## Expected Output
- Complete integration test file(s)
- Environment setup and teardown
- Test data fixtures
- API/Database verification assertions
- Proper cleanup logic

## Example Usage

```
User: Create integration tests for a User API with endpoints for create, read, update, delete.

Assistant:
Generated tests:
- POST /users → 201, verifies user in DB
- GET /users/:id → 200, returns correct user
- GET /users/:id (not found) → 404
- PUT /users/:id → 200, updates in DB
- DELETE /users/:id → 204, removes from DB
- CRUD sequence in single test
- Error handling for invalid input
```
