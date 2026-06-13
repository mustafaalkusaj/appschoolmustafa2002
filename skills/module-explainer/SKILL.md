# module-explainer

## Name

Module Explainer

## Description

Explains the purpose, interface, and usage of a specific module, component, or file. This skill provides detailed documentation for individual code units.

**When to use:**
- When working with unfamiliar modules
- When reviewing code for correctness
- When writing tests or documentation
- When debugging specific functionality
- When planning changes to a specific module

## Instructions

1. **Analyze module structure:**
   - Read the module's public exports (index.ts, named exports)
   - Identify the module's purpose from file name and contents
   - Look for JSDoc/type documentation

2. **Document the interface:**
   - Exported functions with signatures
   - Exported classes with methods
   - Exported types and interfaces
   - Exported constants

3. **Explain implementation:**
   - Key functions and their logic
   - Side effects and dependencies
   - Configuration options
   - Error handling

4. **Provide usage examples:**
   - Basic usage patterns
   - Common use cases
   - Edge cases to handle
   - Integration points

## Expected Input

- Module path (relative to src/ or absolute path)
- Specific aspects to focus on (interface, implementation, usage)

## Expected Output

```markdown
# Module: `src/lib/auth/session.ts`

## Purpose
Manages user session lifecycle including creation, validation, refresh, and termination. Provides a unified interface for session operations across the application.

## Exports

### `class SessionManager`
Main class for session operations.

#### Constructor
```typescript
new SessionManager(config: SessionConfig, storage: SessionStorage)
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `create` | `create(user: User): Promise<Session>` | Creates new session for user |
| `validate` | `validate(token: string): Promise<Session \| null>` | Validates session token |
| `refresh` | `refresh(token: string): Promise<Session>` | Extends session expiry |
| `revoke` | `revoke(token: string): Promise<void>` | Terminates session |

### Types
```typescript
interface SessionConfig {
  expiryHours: number;
  refreshThreshold: number;
}

interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}
```

## Dependencies
- `crypto` (built-in) - Token generation
- `ioredis` - Session storage

## Usage Example
```typescript
const manager = new SessionManager(
  { expiryHours: 24, refreshThreshold: 4 },
  new RedisSessionStorage(redis)
);

const session = await manager.create(currentUser);
const validSession = await manager.validate(session.token);
```

## Side Effects
- Writes to Redis on create/refresh/revoke
- Generates secure random tokens using crypto.randomBytes

## Error Handling
- Throws `SessionError` on validation failures
- Throws `StorageError` on Redis connection issues
```

## Example Usage

```
Load skill: module-explainer
Module: src/features/payments/services/stripe.ts
Output: Complete explanation of Stripe integration module
```

**Best used when working with a specific module and needing to understand its interface and behavior.**
