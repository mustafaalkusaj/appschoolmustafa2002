# Root Cause Investigator

## Name
root-cause-investigator

## Description
Systematically investigates issues to find the underlying cause rather than just the symptoms. Applies structured debugging methodologies to trace problems back to their source.

**When to use:**
- Recurring bugs that keep being fixed but return
- Complex issues with multiple possible causes
- Production incidents requiring quick diagnosis
- Post-mortem analysis to prevent future occurrences
- Surface-level fixes that haven't resolved the issue

## Instructions

1. **Define the problem**: Clearly state the observed symptoms
2. **Gather data**: Collect logs, traces, metrics, and code
3. **Form hypotheses**: List possible causes based on evidence
4. **Test hypotheses**: Use code inspection, debugging, or experiments
5. **Narrow scope**: Eliminate hypotheses, focus on likely causes
6. **Verify**: Confirm the root cause explains all symptoms
7. **Document**: Record findings and contributing factors

## Expected Input

- Problem description and symptoms
- Relevant logs, metrics, or error messages
- Access to source code
- Timeline of when the issue started

## Expected Output

- Confirmed root cause with evidence
- Contributing factors identified
- Explanation of why this causes the observed symptoms
- Recommended fix or solution
- Steps to verify the fix works

## Example Usage

```
User: Investigate why users are randomly logged out after 30 minutes
despite having valid sessions.

Skill will:
1. Examine session management code
2. Check token expiration logic
3. Review server configuration
4. Test hypothesis about cookie vs token expiration mismatch
5. Confirm root cause and provide fix
```

## Output Format

```markdown
## Root Cause Analysis

### Problem Statement
[clear description of the issue]

### Observed Symptoms
- [symptom 1]
- [symptom 2]

### Investigation Process
**Hypothesis 1**: [description] → Tested: [result]
**Hypothesis 2**: [description] → Tested: [result]

### Root Cause (Confirmed)
[detailed explanation with evidence]

### Contributing Factors
1. [factor 1]
2. [factor 2]

### Recommended Fix
[code change or configuration adjustment]

### Verification Steps
1. [step to confirm fix works]
```
