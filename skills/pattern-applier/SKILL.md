# Pattern Applier

## Description
Applies established design patterns and architectural patterns to improve code structure and maintainability.

## When to Use
- Need consistent architecture across codebase
- Implementing complex features
- Want to follow proven best practices
- Setting up new project structure

## Instructions
1. Analyze requirements and identify applicable patterns
2. Select appropriate pattern(s)
3. Create pattern implementation template
4. Apply pattern to specific use case
5. Document pattern usage
6. Create examples for the team

## Expected Input
```
Scenario: Need to manage form state with complex validation
Applicable patterns:
- Controlled Component pattern
- Form State Machine
- Validation Schema pattern

Goal: Consistent form handling across all forms
```

## Expected Output
```
/patterns/
├── forms/
│   ├── FormController.tsx      - Controlled form wrapper
│   ├── useFormController.ts    - Form state machine hook
│   ├── Field.tsx              - Form field component
│   ├── FormContext.tsx        - Form context provider
│   └── README.md              - Pattern documentation
└── examples/
    └── ContactForm.tsx        - Usage example
```

## Example Usage
```
User: Apply proper error handling pattern to all API calls
Assistant: [Implements result/either monad pattern for error handling, creates typed API wrapper, adds retry logic and fallbacks]
```
