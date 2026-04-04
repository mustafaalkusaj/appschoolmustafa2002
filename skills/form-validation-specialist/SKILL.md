# Form Validation Specialist

## Name
form-validation-specialist

## Description
Builds robust form validation logic with proper error handling, real-time feedback, and user-friendly messages. Supports synchronous and asynchronous validation with various schemas.

### When to Use
- Creating new form components
- Adding validation to existing forms
- Implementing custom validation rules
- Handling async validation (API checks)
- Building reusable form validation hooks
- Creating multi-step form logic

## Instructions

### Step 1: Define Validation Schema
1. List all form fields and their types
2. Define validation rules per field:
   - Required/optional
   - Type constraints (email, number, etc.)
   - Length constraints (min/max)
   - Pattern/regex requirements
   - Custom business rules
3. Identify async validation needs

### Step 2: Implement Validation Logic
1. Choose validation approach (schema-based or custom)
2. Create validation functions
3. Implement field-level validation
4. Implement form-level validation
5. Handle submission validation

### Step 3: Create UI Feedback
1. Display field-level errors inline
2. Show success states
3. Implement touched/dirty tracking
4. Create error summary for forms
5. Disable submission during validation

### Step 4: Optimize UX
1. Debounce real-time validation
2. Show progress for async validation
3. Preserve partial form data on error
4. Clear errors on field correction

## Expected Input
```
Form specification:
- Field definitions and types
- Validation requirements
- Error message requirements
- Async validation needs
```

## Expected Output
```
Complete validation implementation:
- Validation functions/schema
- Error state management
- Form component with validation
- Error display components
```

## Example Usage

**Input:**
```
Form with: email (required, valid format), password (min 8 chars, 1 uppercase, 1 number), confirm password (must match)
```

**Output:**
```tsx
// validation.ts
import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupForm = z.infer<typeof signupSchema>;

// FormComponent.tsx
function SignupForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validateField = async (name: string, value: string) => {
    const result = signupSchema.shape[name].safeParse(value);
    if (!result.success) {
      setErrors(prev => ({ ...prev, [name]: result.error.errors[0].message }));
    } else {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  // ... form implementation
}
```
