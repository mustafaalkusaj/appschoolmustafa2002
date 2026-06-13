# Commit Writer

## Name
commit-writer

## Description
Generates well-structured, conventional commit messages following best practices for clear project history and automated changelog generation.

## When to Use
- After completing a feature or bug fix
- Before pushing changes
- When rebasing or cleaning up commits
- For any code changes that need to be committed

## Instructions

### Commit Message Structure
Follow Conventional Commits format:
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons (no code change)
- `refactor`: Code change that neither fixes a bug nor adds feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Rules
1. Use imperative mood ("add feature" not "added feature")
2. Keep subject line under 50 characters
3. Separate subject from body with blank line
4. Wrap body at 72 characters
5. Reference issues in footer: `Closes #123`
6. One logical change per commit

### Process
1. Review staged changes with `git diff --staged`
2. Determine the appropriate type
3. Write a concise subject describing what changed
4. Add body explaining why (if not obvious)
5. Reference related issues

## Expected Input
- List of changed files
- Description of what was changed and why
- Related issue numbers (if any)

## Expected Output
- Properly formatted commit message
- Suggestions for splitting commits if needed

## Example Usage

**Input:**
```
Changed files:
- src/auth/login.js (added login validation)
- src/auth/logout.js (fixed session cleanup)
- tests/auth.test.js (added tests)

Context: Added email validation to login, fixed memory leak in logout
Issue: Closes #456
```

**Output:**
```
feat(auth): add email validation to login

Validate email format before authentication to prevent
invalid login attempts and improve user feedback.

Closes #456
```

**Alternative if splitting needed:**
```
Consider splitting into two commits:

Commit 1: feat(auth): add email validation to login
Commit 2: fix(auth): clean up session on logout
```

## Tips
- Commit early, commit often
- If you can't describe it briefly, consider splitting
- Reference issues for traceability
- Use `git commit --amend` for fixing the last commit message
