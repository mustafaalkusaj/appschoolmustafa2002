# Stack Trace Explainer

## Name
stacktrace-explainer

## Description
Decodes and explains stack traces in plain language. Translates technical error call stacks into actionable insights about what went wrong and where.

**When to use:**
- Investigating a new error with an unfamiliar stack trace
- Explaining a technical error to non-technical stakeholders
- Understanding the execution path that led to an error
- Identifying which part of the codebase caused the failure

## Instructions

1. **Parse the stack trace**: Extract file paths, line numbers, function names
2. **Identify the error type**: Determine the exception/error class
3. **Locate the origin**: Find where the error was thrown
4. **Trace the call chain**: Map the execution path from entry to failure
5. **Explain each frame**: Translate technical details into plain language
6. **Identify responsibility**: Determine which component/service caused the issue
7. **Provide context**: Add relevant code snippets if available

## Expected Input

- Full stack trace text
- Programming language of the trace
- Error type/message (if separate from trace)

## Expected Output

- Plain English explanation of what happened
- Annotated stack trace with explanations for each frame
- Identification of the error source and cause
- Suggested areas to investigate for fixes

## Example Usage

```
User: Explain this stack trace:
Error: Cannot read property 'map' of undefined
    at processUserData (userService.js:45:15)
    at async.processUsers (userController.js:23:10)
    at Layer.handle [as handle_request] (express line 234)
    ...

Skill will:
1. Parse each stack frame
2. Explain processUserData failed at line 45
3. Show the call chain from Express handler to the error
4. Identify that userService.js needs investigation
```

## Output Format

```markdown
## Stack Trace Explanation

### Error Summary
[plain English description of the error]

### Call Chain (execution path)
```
[numbered frames with explanations]
```

### Key Findings

**Error Source**: [file:line:column]
**Error Type**: [exception class]
**Root Cause**: [plain language explanation]

### Frame-by-Frame Analysis
| Frame | Location | What happened |
|-------|----------|---------------|
| 1 | entry point | [explanation] |
| ... | ... | ... |

### Where to Look
[file paths to investigate]
```
