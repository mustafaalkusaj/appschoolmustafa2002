# Bug Reproducer

## Name
bug-reproducer

## Description
Creates minimal, reproducible test cases for bugs. This skill helps isolate issues by stripping away unnecessary code while preserving the exact conditions that trigger the bug.

**When to use:**
- A bug report lacks steps to reproduce
- The bug is intermittent and hard to trigger consistently
- You need to create a minimal test case for a bug report
- Debugging a complex scenario with too many variables

## Instructions

1. **Gather context**: Collect the bug report, error messages, and environment details
2. **Identify minimal scope**: Determine the smallest code section that exhibits the bug
3. **Strip unnecessary code**: Remove dependencies, imports, and logic not directly related to the bug
4. **Create reproduction steps**: Write clear, numbered steps that reliably trigger the bug
5. **Verify**: Confirm the reproduction case works consistently
6. **Document**: Include environment version, inputs, and expected vs actual behavior

## Expected Input

- Bug description or error report
- Relevant code files
- Error messages or stack traces (if available)
- Environment details (OS, runtime versions, dependencies)

## Expected Output

- Minimal code file that reproduces the bug
- Step-by-step reproduction instructions
- Environment configuration needed to reproduce
- Expected behavior vs actual behavior

## Example Usage

```
User: Create a bug reproduction case for this error:
"TypeError: Cannot read property 'name' of undefined"
occurring in src/services/userService.ts when calling getUser(123)

Skill will:
1. Read src/services/userService.ts
2. Identify the getUser function and its dependencies
3. Create a minimal test file that isolates this function
4. Provide reproduction steps with sample data
```

## Output Format

```markdown
## Bug Reproduction

### Environment
- Node.js: v18.x
- Framework: Express 4.x

### Minimal Reproduction Code
[code file]

### Reproduction Steps
1. [step 1]
2. [step 2]
...

### Expected Behavior
[what should happen]

### Actual Behavior
[what happens instead]
```
