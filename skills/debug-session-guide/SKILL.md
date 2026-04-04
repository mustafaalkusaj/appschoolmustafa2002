# Debug Session Guide

## Name
debug-session-guide

## Description
Guides structured debugging sessions from problem identification to resolution. Provides a systematic framework for tackling complex bugs efficiently.

**When to use:**
- Starting a new debugging session on a complex issue
- Stuck on a bug and need a structured approach
- Teaching debugging methodology
- Planning a debugging strategy before diving in
- When multiple approaches have failed

## Instructions

1. **Define the problem**: Write a precise problem statement
2. **Gather information**: Collect error messages, logs, environment details
3. **Form hypotheses**: List possible causes based on evidence
4. **Plan investigation**: Choose which hypothesis to test first
5. **Execute tests**: Run code, add breakpoints, collect data
6. **Analyze results**: Compare findings to hypotheses
7. **Iterate**: Narrow down or form new hypotheses
8. **Verify solution**: Confirm the fix works and doesn't break other things
9. **Document findings**: Record what was learned

## Expected Input

- Problem description
- Any existing error information
- Access to codebase and debugging tools
- Environment details

## Expected Output

- Structured debugging plan
- Hypothesis list with testing order
- Checkpoint questions to ask at each step
- Common pitfalls to avoid
- Verification steps for the solution

## Example Usage

```
User: Guide me through debugging why our payment webhooks are failing
intermittently for Stripe integration.

Skill will:
1. Help define the exact problem (is it 100% failure or intermittent?)
2. Create hypotheses (webhook signature validation, retry logic, timeouts)
3. Guide systematic testing of each hypothesis
4. Provide checkpoint questions to verify progress
```

## Output Format

```markdown
# Debug Session Guide: [Problem Title]

## Problem Statement
[Precise description of the issue]

## Information Gathering Checklist
- [ ] Error messages collected
- [ ] Logs obtained (time range: X to Y)
- [ ] Environment versions documented
- [ ] Reproduction steps confirmed

## Hypotheses (Test in Order)
1. **Hypothesis**: [description]
   **Evidence**: [supporting/contradicting evidence]
   **Test**: [how to test this]
   **Expected result if true**: ...

2. **Hypothesis**: ...

## Debugging Plan

### Phase 1: Environment Check
- [ ] Verify configuration
- [ ] Check service connectivity
- [ ] Review recent changes

### Phase 2: Reproduction
- [ ] Create minimal reproduction case
- [ ] Add logging/breakpoints
- [ ] Collect evidence

### Phase 3: Isolation
- [ ] Narrow to specific component
- [ ] Test in isolation if possible

### Phase 4: Fix & Verify
- [ ] Implement fix
- [ ] Test reproduction case passes
- [ ] Run regression tests
- [ ] Monitor in production

## Checkpoint Questions
At each phase, ask:
1. What have I learned?
2. What can I rule out?
3. What should I test next?

## Common Pitfalls
- [pitfall to avoid]
- [pitfall to avoid]

## Success Criteria
- [ ] Issue reproduced consistently
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Solution verified
```
