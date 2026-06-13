# Refactor Assistant

## Description
Helps restructure and improve existing code while maintaining functionality. Identifies code smells and suggests improvements.

## When to Use
- Improving code quality
- Reducing complexity
- Preparing code for new features
- Code review feedback needs addressing

## Instructions
1. Analyze current code structure and patterns
2. Identify code smells and improvement areas
3. Plan refactoring steps to maintain behavior
4. Execute refactoring incrementally
5. Ensure tests still pass after each change
6. Document breaking changes if any

## Expected Input
```
File: /components/OldUserDashboard.tsx
Issues identified:
- Large component (500+ lines)
- Mixed responsibilities
- Inline styles scattered
- Duplicate logic in handlers
```

## Expected Output
```
/components/dashboard/
├── UserDashboard.tsx          - Container component
├── UserDashboardView.tsx      - Presentational component
├── useDashboardData.ts        - Data fetching hook
├── useDashboardFilters.ts     - Filter logic hook
├── DashboardHeader.tsx         - Extracted header
├── DashboardStats.tsx         - Stats cards
└── UserTable.tsx              - Extracted table
```

## Example Usage
```
User: Refactor the legacy API utility file that handles multiple endpoints
Assistant: [Splits monolithic API file into domain-specific modules, adds TypeScript types, and implements proper error handling]
```
