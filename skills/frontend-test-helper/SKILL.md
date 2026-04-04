# Frontend Test Helper

## Name
frontend-test-helper

## Description
Writes unit, integration, and component tests for frontend code using Jest, React Testing Library, Playwright, and Cypress. Ensures proper test coverage with maintainable, readable tests.

### When to Use
- Writing tests for new components
- Adding tests to existing code
- Testing user interactions
- Testing async operations
- Writing E2E tests for flows
- Debugging failing tests
- Setting up test infrastructure

## Instructions

### Step 1: Determine Test Scope
1. Unit tests: Pure functions, utilities, hooks
2. Component tests: Props, state, interactions
3. Integration tests: Multiple components working together
4. E2E tests: Complete user flows

### Step 2: Write Tests
1. Set up test environment
2. Render component with test utilities
3. Query elements using accessible selectors
4. Simulate user interactions
5. Assert expected outcomes
6. Handle async operations with waitFor/async utilities

### Step 3: Use Proper Selectors
1. Prefer accessible queries (getByRole, getByLabelText)
2. Use getByTestId as last resort
3. Avoid implementation details
4. Test behavior, not implementation

### Step 4: Handle Edge Cases
1. Loading states
2. Error states
3. Empty states
4. Permission/authorization
5. Network failures

## Expected Input
```
Test specification:
- File/component to test
- Testing framework in use
- Required test coverage
- Specific user flows
```

## Expected Output
```
Test files with:
- Setup and teardown
- Component rendering tests
- Interaction tests
- Async operation tests
- Proper assertions
```

## Example Usage

**Input:**
```
Write tests for a LoginForm component with email/password inputs, submit button, validation errors, and loading state.
```

**Output:**
```tsx
// LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders email and password inputs', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('shows validation errors for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'invalid');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data on valid submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    render(<LoginForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });
});
```

## Testing Library Priority
1. getByRole - Accessible queries first
2. getByLabelText - Form field queries
3. getByPlaceholderText - When label not available
4. getByText - Non-interactive elements
5. getByTestId - Last resort only
