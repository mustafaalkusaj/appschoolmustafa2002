# Typing Enforcer

## Description
Adds strict TypeScript typing to JavaScript files and improves existing type definitions.

## When to Use
- Adding TypeScript to JavaScript codebase
- Fixing type errors
- Improving type coverage
- Setting up strict mode

## Instructions
1. Analyze current typing situation
2. Define core type definitions
3. Add interface/type annotations
4. Configure tsconfig for strictness
5. Fix compilation errors
6. Add type guards where needed
7. Document complex types

## Expected Input
```
File: utils/helpers.js
Issues:
- No types defined
- Uses JSDoc types (inconsistent)
- any types everywhere
Goal: Full TypeScript with strict mode
```

## Expected Output
```
utils/
├── helpers.ts
│   - Fully typed function signatures
│   - Generic types where appropriate
│   - Union types for variants
├── helpers.test.ts
│   - Type tests included
└── index.ts
    - Re-exports with types
```

## Example Usage
```
User: Add strict typing to the entire API client module
Assistant: [Creates comprehensive types for all API responses, adds generics for request/response, implements Zod for runtime validation]
```
