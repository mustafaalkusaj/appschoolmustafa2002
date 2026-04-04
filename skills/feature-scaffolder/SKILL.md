# Feature Scaffolder

## Description
Creates the foundational structure for new application features including components, hooks, types, and tests.

## When to Use
- Starting a new feature in the codebase
- Need consistent structure across features
- Want to avoid setup boilerplate

## Instructions
1. Analyze the feature requirements and domain
2. Determine required files based on project conventions
3. Generate component files with proper naming
4. Create type definitions and interfaces
5. Set up test files with basic structure
6. Follow existing project patterns and conventions

## Expected Input
```
Feature name: FeatureName
Domain: module/domain
Features needed:
- Component files (view, container)
- Types/interfaces
- Hooks (useFeatureName)
- API integration layer
- Test files
```

## Expected Output
```
/features/feature-name/
├── components/
│   ├── FeatureNameView.tsx
│   └── FeatureNameContainer.tsx
├── hooks/
│   └── useFeatureName.ts
├── types/
│   └── featureName.types.ts
├── api/
│   └── featureName.api.ts
└── __tests__/
    └── FeatureName.test.tsx
```

## Example Usage
```
User: Create feature scaffold for "UserProfile" with API integration
Assistant: [Creates complete feature structure with components, hooks, types, API layer, and tests following project conventions]
```
