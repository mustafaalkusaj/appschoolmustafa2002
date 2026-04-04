# Boilerplate Cleaner

## Description
Identifies and removes duplicate code, redundant patterns, and unnecessary boilerplate from the codebase.

## When to Use
- Codebase has grown with duplication
- Files are too large or repetitive
- Need to reduce maintenance burden
- Improving developer experience

## Instructions
1. Scan for duplicate code patterns
2. Identify common boilerplate patterns
3. Create shared utilities/components
4. Replace duplications with abstractions
5. Extract common hooks/wrappers
6. Verify functionality is preserved
7. Update imports throughout codebase

## Expected Input
```
Issue: Multiple components repeat the same:
- Loading state handling (3+ components)
- Error boundary logic
- Form validation patterns
- API error handling
```

## Expected Output
```
/common/
├── hooks/
│   ├── useLoading.ts
│   ├── useError.ts
│   └── useAsync.ts
├── components/
│   ├── LoadingSpinner.tsx
│   ├── ErrorMessage.tsx
│   └── AsyncBoundary.tsx
└── utils/
    └── formValidation.ts
```

## Example Usage
```
User: Clean up the 20 different button variants across the codebase
Assistant: [Creates unified Button component with variant props, extracts icon logic to separate components, removes all duplicate button implementations]
```
