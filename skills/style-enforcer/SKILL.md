# Style Enforcer

## Name
style-enforcer

## Description
Enforces project coding standards and style guides, identifying violations and providing automatic fixes where possible.

## When to Use
- Before committing code
- During code review
- When integrating new code
- For pre-commit hooks

## Instructions

### Detection
1. Identify project style configuration (ESLint, Prettier, Pylint, RuboCop, etc.)
2. Scan for violations in target files
3. Categorize by severity:
   - Error (will fail CI)
   - Warning (should fix)
   - Info (style preference)

### Fix Process
1. Run auto-fix for fixable issues
2. Review changes made
3. Handle non-fixable violations manually
4. Verify no regressions introduced

### Common Style Rules

**JavaScript/TypeScript:**
- Indentation (2 or 4 spaces)
- Semicolons (required or not)
- Quote style (single/double)
- Max line length (80-120)
- Import ordering
- Naming conventions

**Python:**
- PEP 8 compliance
- Import sorting (isort)
- Docstring format
- Max line length (Black: 88)
- Variable naming

**General:**
- File naming conventions
- Comment formatting
- Dead code removal
- Unused imports/variables

### Enforcement Levels
- **Hard**: Must fix before merge
- **Soft**: Suggested improvements
- **Auto-fix**: Can be fixed automatically

## Expected Input
- File(s) or directory to check
- Style guide version (if specified)
- Whether to auto-fix or just report

## Expected Output
- List of violations with:
  - File and line number
  - Rule violated
  - Severity level
  - Suggested fix (if applicable)
- Auto-fix results (if requested)

## Example Usage

**Input:**
```
Enforce style on src/utils/format.js
```

**Output:**
```
## Style Check Results: src/utils/format.js

### Errors (Must Fix)
❌ L23: Unexpected trailing whitespace
❌ L45: Missing semicolon
❌ L67: 'console.log' found (use logger)

### Warnings
⚠️ L12: Variable 'tmp' should be camelCase (tmpValue)
⚠️ L89: Function exceeds 50 lines (73 lines)

### Auto-fix Applied
✅ Fixed 4 issues automatically
✅ L45: Added missing semicolon
✅ L23: Removed trailing whitespace
✅ L12: Renamed 'tmp' to 'tmpValue'

### Remaining
⚠️ L67: Manual fix needed - replace console.log with logger
⚠️ L89: Consider extracting helper function

Run `npm run lint -- --fix` for full auto-fix
```

---

**Input:**
```
Enforce style on entire src/ directory, auto-fix enabled
```

**Output:**
```
## Style Enforcement Summary

### Files Checked: 47
### Issues Found: 23
### Auto-fixed: 18
### Manual Fix Required: 5

### Files Needing Attention
- src/api/users.js: 2 issues (1 auto-fixed, 1 manual)
- src/utils/parser.js: 3 issues (all manual)

### Manual Fixes Needed
1. src/api/users.js:67 - Replace console.log
2. src/utils/parser.js:23 - Extract function >50 lines
3. src/utils/parser.js:45 - Add JSDoc comment
4. src/utils/parser.js:78 - Handle promise rejection
5. src/utils/parser.js:102 - Remove commented code
```
