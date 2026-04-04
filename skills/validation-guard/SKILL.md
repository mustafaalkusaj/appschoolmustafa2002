# Validation Guard

## Name
validation-guard

## Description
Adds a robust validation layer to your backend services. Validation guards ensure that incoming data meets expected criteria before processing, preventing invalid data from reaching business logic.

**When to use:**
- When you need to validate request bodies, query parameters, or headers
- When you want to centralize validation logic
- When building REST APIs that need consistent error responses
- When you want to prevent SQL injection, XSS, or other injection attacks
- When you need to validate complex nested objects or arrays
- When you want to provide clear, actionable error messages to API consumers

## Instructions

1. **Choose a validation approach** - Schema-based (Joi, Zod, Yup) or class-based (class-validator)
2. **Define validation schemas** - Create schemas for each input type
3. **Create validation middleware** - Build middleware to intercept and validate requests
4. **Handle validation errors** - Return structured, user-friendly error responses
5. **Apply to routes** - Attach validation middleware to appropriate endpoints
6. **Custom validators** - Add business-specific validation rules

## Expected Input

```javascript
{
  "validationType": "schema-based", // or "class-based"
  "framework": "Express", // or "Fastify", "NestJS", "Django", etc.
  "schema": {
    "name": "CreateUserSchema",
    "fields": [
      { "name": "email", "type": "string", "rules": ["required", "email", "maxLength:255"] },
      { "name": "password", "type": "string", "rules": ["required", "minLength:8", "pattern:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)/"] },
      { "name": "age", "type": "number", "rules": ["optional", "min:13", "max:120"] },
      { "name": "tags", "type": "array", "rules": ["optional", "maxLength:10", "items:string"] }
    ]
  },
  "errorFormat": "detailed" // or "simple"
}
```

## Expected Output

```javascript
// Middleware
const validateRequest = (schema) => async (req, res, next) => {
  try {
    await schema.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      code: 'VALIDATION_ERROR'
    }));
    return res.status(400).json({ success: false, errors });
  }
};

// Usage
router.post('/users', validateRequest(CreateUserSchema), userController.create);
```

## Example Usage

**Input:**
```
Add validation to a user registration endpoint.
Fields: email (required, valid email), password (required, min 8 chars, must have uppercase and number),
firstName (required, 2-50 chars), lastName (required, 2-50 chars), phone (optional, valid phone format).
Framework: Express with Zod.
```

**Output:**
```typescript
// validation/schemas/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name too long'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name too long'),
  phone: z
    .string()
    .regex(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Invalid phone format')
    .optional()
    .or(z.literal('')),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// validation/middleware/validateRequest.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'VALIDATION_ERROR'
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors
        });
      }
      next(error);
    }
  };
};

// routes/user.routes.ts
import { validateRequest } from '../validation/middleware/validateRequest';
import { createUserSchema } from '../validation/schemas/user.schema';

router.post(
  '/register',
  validateRequest(createUserSchema),
  userController.register
);
```

## Validation Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| Required fields | Core data | `z.string().min(1)` |
| Optional fields | Nullable data | `z.string().optional()` |
| Enum validation | Fixed choices | `z.enum(['active', 'inactive'])` |
| Custom validators | Complex rules | `.refine(val => checkBusinessRule(val))` |
| Transform | Data normalization | `.transform(val => val.trim())` |
| Async validation | Database checks | `.refine(async val => await checkExists(val))` |

## Best Practices

- **Fail fast**: Validate early in the request pipeline
- **Clear messages**: Return field-specific error messages
- **Sanitize inputs**: Trim strings, normalize data before validation
- **Defense in depth**: Validate at API layer AND service layer
- **Type safety**: Use TypeScript inference for validated types
- **Document constraints**: Include validation rules in OpenAPI specs
