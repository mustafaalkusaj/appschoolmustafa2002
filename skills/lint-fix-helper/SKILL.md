# Lint Fix Helper

## Name
lint-fix-helper

## Description
Analyzes lint errors and provides clear explanations with step-by-step fixes for common linting issues.

## When to Use
- When linting fails in CI/CD
- During local development before committing
- For learning why a lint rule exists
- When stuck on a confusing lint error

## Instructions

### Error Analysis
1. Parse the lint error output
2. Identify the rule violated
3. Look up rule documentation
4. Determine the appropriate fix

### Fix Strategy
1. **Auto-fixable**: Apply automatic fix
2. **Configuration change**: Update lint config if rule is wrong for project
3. **Code change**: Modify code to satisfy rule
4. **Disable inline**: Use disable comment (last resort)

### Common Error Categories

**Syntax Errors:**
- Missing brackets/semicolons
- Unclosed strings
- Invalid token

**Import Errors:**
- Unused imports
- Incorrect import paths
- Circular dependencies

**Style Errors:**
- Formatting inconsistencies
- Naming convention violations
- Line length exceeded

**Best Practice Errors:**
- TODO comments
- console.log statements
- Any type usage
- Deprecated API usage

### Resolution Order
1. Check if auto-fix available
2. Review rule documentation
3. Apply code fix
4. If rule conflicts with project needs, update config
5. If rule is overly strict, add inline disable with comment

## Expected Input
- Lint error output (from CLI or IDE)
- File path and line numbers
- Rule name (if known)

## Expected Output
- Clear explanation of each error
- Step-by-step fix instructions
- Code examples showing before/after
- Prevention tips for future

## Example Usage

**Input:**
```
ESLint error in src/components/Button.jsx:23
'data' is defined but never used.
```

**Output:**
```
## Lint Fix: Unused Variable 'data'

### Error
```
src/components/Button.jsx:23: 'data' is defined but never used
```

### Explanation
ESLint's `no-unused-vars` rule flags variables that are assigned but never
referenced. This helps prevent dead code and typos.

### Fix Options

**Option 1: Use the variable (Recommended)**
```jsx
// Before
const Button = ({ onClick }) => {
  const data = fetchButtonData();
  return <button onClick={onClick}>Click</button>;
};

// After
const Button = ({ onClick }) => {
  const data = fetchButtonData();
  return <button onClick={onClick}>{data.label}</button>;
};
```

**Option 2: Prefix with underscore**
```jsx
const Button = ({ onClick }) => {
  const _data = fetchButtonData(); // Intentionally unused
  return <button onClick={onClick}>Click</button>;
};
```

**Option 3: Remove entirely**
```jsx
const Button = ({ onClick }) => {
  return <button onClick={onClick}>Click</button>;
};
```

### Recommendation
Option 1 if the data is needed, Option 3 if it was accidentally left in.

---

**Input:**
```
TypeScript error TS2322: Type 'string' is not assignable to type 'number'
src/utils/calculate.ts:15
```

**Output:**
```
## Lint Fix: Type Mismatch

### Error
```
src/utils/calculate.ts:15: Type 'string' is not assignable to type 'number'
```

### Explanation
The variable expects a `number` but is receiving a `string`. This is a
TypeScript type safety issue.

### Root Cause
Check line 15 - likely passing `value.toString()` when you need `value` directly,
or parsing a string where a number was expected.

### Fix
```typescript
// Before
const result = calculateTotal(inputValue.toString());

// After (if inputValue is string)
const result = calculateTotal(parseFloat(inputValue));

// Or if inputValue should be number
const result = calculateTotal(inputValue);
```

### Prevention
- Use strict TypeScript configuration
- Add type annotations for function parameters
- Validate external data at entry points
```
