# Fixture Organizer

## Name
fixture-organizer

## Description
Organizes and manages test fixtures, test data, and sample files. Helps create reusable, maintainable test data structures that can be shared across test suites.

### When to Use
- Managing test data across suites
- Creating reusable test objects
- Setting up test databases
- Loading sample files for tests
- Centralizing test configuration

## Instructions

### 1. Analyze Fixture Needs
- Identify shared test data
- Map data types and structures
- Note test data dependencies
- Check for duplicate test data
- Identify test data lifecycle

### 2. Design Fixture Structure
- Create factory functions for objects
- Define fixture hierarchies
- Plan fixture composition
- Set up fixture teardown
- Consider lazy vs eager loading

### 3. Organize Fixtures
- Group by domain/module
- Create fixture modules
- Set up fixture directories
- Configure fixture discovery
- Implement fixture inheritance

### 4. Implement and Document
- Create fixture files
- Add factory functions
- Set up setup/teardown hooks
- Document usage patterns
- Provide examples

## Expected Input
- Test files needing fixtures
- Data models/structures
- Database schema (if applicable)
- File requirements
- Test data requirements

## Expected Output
- Organized fixture files
- Factory functions
- Shared test data
- Setup/teardown utilities
- Usage documentation

## Example Usage

```
User: Organize fixtures for User entity tests.

Assistant:
Structure:
tests/fixtures/
  users/
    index.ts
    factories.ts
    samples.ts

// factories.ts
export function createUser(overrides = {}) {
  return {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.name.fullName(),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createAdminUser() {
  return createUser({ role: 'admin' });
}

// samples.ts
export const sampleUser = createUser({ id: 'test-user-1' });
export const adminUsers = Array.from({ length: 3 }, () => createAdminUser());

// Usage in tests
import { createUser, sampleUser } from '../fixtures/users';

test('update user', () => {
  const user = createUser();
  // ...
});
```
