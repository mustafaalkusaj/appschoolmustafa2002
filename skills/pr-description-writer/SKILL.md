# PR Description Writer

## Name
pr-description-writer

## Description
Creates clear, comprehensive pull request descriptions that help reviewers understand the purpose, implementation, and testing of changes.

## When to Use
- When opening a new pull request
- When updating an existing PR description
- Before requesting review
- After making significant changes to a PR

## Instructions

### PR Description Template
```
## Summary
Brief description of what this PR does

## Motivation
Why is this change needed?

## Changes Made
- Bullet points of specific changes
- Include file paths for context

## Testing
How was this tested?

## Screenshots/Evidence
(if applicable - UI changes, etc.)

## Related Issues
Closes #123

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or explain them)
```

### Best Practices
1. **Be specific**: Include ticket/issue numbers
2. **Show the why**: Explain motivation beyond just what changed
3. **Scope appropriately**: Don't make PRs too large (aim for <400 lines)
4. **Include evidence**: Screenshots, logs, benchmarks when relevant
5. **Be honest**: Note limitations, trade-offs, or follow-up work needed

### Review Flow
1. Write draft description before coding to clarify scope
2. Update as implementation evolves
3. Final review before requesting reviewers

## Expected Input
- PR title (draft)
- List of changed files with brief descriptions
- Related issues or tickets
- Testing approach used
- Any known limitations or follow-ups

## Expected Output
- Complete PR description following the template
- Draft PR title suggestions
- Checklist items for reviewer guidance

## Example Usage

**Input:**
```
Title: Fix login bug
Files: src/auth/login.js, tests/auth.test.js
Issue: #789 - Users can't login with special characters in password
Testing: Manual testing + new unit test added
```

**Output:**
```
## Summary
Fix login validation to properly handle special characters in passwords (e.g., @, #, $).

## Motivation
Users with special characters in their passwords were unable to log in, receiving
"Invalid credentials" errors even with correct credentials. This affected
approximately 15% of users per support tickets.

## Changes Made
- `src/auth/login.js:45` - Update regex to allow special characters
- `src/auth/validators.js:12` - Add character whitelist
- `tests/auth.test.js:78` - Add test cases for special character passwords

## Testing
- Added 5 new unit tests covering edge cases
- Manual testing with passwords containing: @, #, $, %, &, !
- Verified existing tests still pass

## Screenshots
[Include before/after if UI-related]

## Related Issues
Closes #789

## Checklist
- [x] Tests added/updated
- [x] No breaking changes
- [ ] Documentation updated (N/A - no user-facing docs for this)
```
