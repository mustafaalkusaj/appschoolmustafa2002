# Form Builder

## Description
Generates HTML/React/Vue forms with validation, state management, and accessibility features.

## When to Use
- Creating data entry forms
- Need form validation logic
- Building dynamic forms with conditional fields

## Instructions
1. Define form fields and their types
2. Specify validation rules and messages
3. Determine form layout and styling approach
4. Generate form component with controlled inputs
5. Add form state management
6. Implement submission handling
7. Include accessibility attributes

## Expected Input
```
Form: UserRegistrationForm
Fields:
- email (required, email format)
- password (required, min 8 chars, must include number)
- confirmPassword (required, must match password)
- agreeToTerms (required, checkbox)
- role (select, options from enum)
```

## Expected Output
```
/components/forms/
├── UserRegistrationForm.tsx
├── UserRegistrationForm.styles.ts
├── useUserRegistrationForm.ts
└── userRegistrationSchema.ts (Zod/yup validation)
```

## Example Usage
```
User: Build a multi-step checkout form with shipping and payment sections
Assistant: [Creates stepper form with validation per step, summary view, and persisted progress]
```
