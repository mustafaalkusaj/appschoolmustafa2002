# Mocking Helper

## Name
mocking-helper

## Description
Assists with creating and configuring mocks, stubs, and spies for unit testing. Helps isolate code under test by replacing dependencies with controlled test doubles.

### When to Use
- Testing code with external dependencies
- Isolating units for testing
- Simulating error conditions
- Controlling async behavior
- Verifying method calls

## Instructions

### 1. Identify Dependencies
- List external dependencies in code
- Identify classes/functions to mock
- Map dependency injection points
- Note dependency interfaces
- Check for global state usage

### 2. Choose Mock Type
- Mock: Full implementation of interface
- Stub: Pre-programmed responses
- Spy: Wrapper around real implementation
- Fake: Simplified working implementation
- Dummy: Passed but never used

### 3. Create Mock Configuration
- Define return values
- Set up error scenarios
- Configure call tracking
- Set up async behavior
- Configure partial mocks

### 4. Implement and Verify
- Create mock/stub
- Inject into code under test
- Verify interactions
- Assert mock state
- Clean up after test

## Expected Input
- Code file to test
- Dependencies to mock
- Testing framework (Jest, Sinon, unittest, etc.)
- Mock behavior requirements
- Verification expectations

## Expected Output
- Mock/stub implementations
- Mock configuration code
- Injection setup
- Verification assertions
- Cleanup logic

## Example Usage

```
User: Create mocks for DatabaseService and EmailService in user registration test.

Assistant:
Jest Implementation:

// Mock setup
const mockDb = {
  createUser: jest.fn(),
  findUser: jest.fn(),
};

const mockEmail = {
  sendWelcome: jest.fn(),
  sendVerification: jest.fn(),
};

// Happy path mock
mockDb.createUser.mockResolvedValue({ id: 1, email: 'test@example.com' });
mockEmail.sendWelcome.mockResolvedValue(true);

// Error scenario
mockDb.createUser.mockRejectedValue(new Error('DB connection failed'));

// Verification
expect(mockDb.createUser).toHaveBeenCalledWith({ email: 'test@example.com' });
expect(mockEmail.sendWelcome).toHaveBeenCalledWith('test@example.com');
```
