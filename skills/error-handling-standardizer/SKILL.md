# Error Handling Standardizer

## Name
error-handling-standardizer

## Description
Establishes a consistent error handling pattern across your backend application. A standardized error handling system ensures all errors are caught, logged appropriately, and returned to clients in a consistent format.

**When to use:**
- When you have inconsistent error responses across endpoints
- When you want to centralize error handling logic
- When building APIs that need predictable error formats
- When you need to differentiate between client errors and server errors
- When you want to include correlation IDs for debugging
- When you need to hide internal error details from clients while logging them

## Instructions

1. **Define error hierarchy** - Create base error classes and specific error types
2. **Create error codes** - Establish a system of machine-readable error codes
3. **Build error handler middleware** - Global error catching middleware
4. **Standardize responses** - Consistent JSON error response structure
5. **Implement logging** - Structured logging with correlation IDs
6. **Handle async errors** - Ensure all async errors are caught properly
7. **Add error monitoring** - Integrate with monitoring tools (Sentry, DataDog)

## Expected Input

```javascript
{
  "framework": "Express",
  "errorTypes": [
    "ValidationError",
    "NotFoundError",
    "AuthenticationError",
    "AuthorizationError",
    "ConflictError",
    "RateLimitError"
  ],
  "loggingService": "Winston", // or "Pino", "Morgan"
  "monitoringService": null, // or "Sentry", "DataDog"
  "includeCorrelationId": true
}
```

## Expected Output

```javascript
// errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

// Standard response format
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [...],
    "correlationId": "abc-123-def"
  }
}
```

## Example Usage

**Input:**
```
Set up error handling for an Express.js API.
Include: custom error classes, global error middleware, correlation ID tracking,
structured logging with Winston, and consistent JSON error responses.
```

**Output:**
```typescript
// errors/AppError.ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details: unknown = null
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND',
      identifier ? { resource, identifier } : undefined);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 429, 'RATE_LIMIT_ERROR', { retryAfter });
  }
}

// Correlation ID middleware
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

// Global error handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    correlationId: req.correlationId,
    path: req.path,
    method: req.method,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    }
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        correlationId: req.correlationId
      }
    });
  }

  // Unknown errors - don't leak details to client
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      correlationId: req.correlationId
    }
  });
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage in routes
router.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await userService.findById(req.params.id);
  if (!user) throw new NotFoundError('User', req.params.id);
  res.json({ success: true, data: user });
}));
```

## HTTP Status Code Mapping

| Status Code | Error Type | Use Case |
|-------------|------------|----------|
| 400 | ValidationError | Invalid input data |
| 401 | AuthenticationError | Missing or invalid credentials |
| 403 | AuthorizationError | Valid auth but insufficient permissions |
| 404 | NotFoundError | Resource doesn't exist |
| 409 | ConflictError | Duplicate resource, state conflict |
| 422 | UnprocessableError | Valid format but semantically invalid |
| 429 | RateLimitError | Too many requests |
| 500 | InternalError | Unexpected server error |

## Best Practices

- **Operational vs Programmatic**: Mark expected errors as operational
- **Never leak internals**: Hide stack traces and internal details from clients
- **Correlation IDs**: Always include for request tracing
- **Log everything**: Store full error details server-side
- **Graceful degradation**: Return useful errors even when services fail
- **Use wrapper functions**: Ensure async errors are caught
