# Branch Hygiene Checker

## Name
branch-hygiene-checker

## Description
Evaluates git branches for cleanliness and best practices, identifying issues like old branches, incomplete work, and maintenance problems.

## When to Use
- Before creating a pull request
- During branch cleanup sessions
- When reviewing repository health
- After completing a feature

## Instructions

### Branch Analysis

**1. Stale Branch Detection**
```bash
git fetch -p  # Fetch and prune remote
git branch -vv  # Check tracking relationships
```

Mark stale if:
- No commits in 30+ days
- Already merged to main
- Duplicated work from another branch

**2. Naming Convention Check**
Valid patterns:
- `feature/TICKET-123-add-login`
- `bugfix/fix-payment-error`
- `hotfix/critical-security-patch`
- `refactor/improve-auth-module`

Invalid patterns:
- `test` (too vague)
- `temp` (no purpose)
- `wip` (implies incomplete work)
- `my-changes` (unclear ownership)

**3. Commit Quality Check**
- Each commit should be self-contained
- No "WIP" or "fix typo" commits in final branch
- Logical commit history
- No merge commits in feature branches (prefer rebase)

**4. Pre-PR Checklist**
- [ ] Branch is based on latest main
- [ ] Tests pass locally
- [ ] No debug/console statements
- [ ] No commented-out code
- [ ] Commit messages are meaningful
- [ ] Branch name follows convention

### Cleanup Actions
1. Delete merged branches
2. Rename poorly named branches
3. Squash/fixup WIP commits
4. Rebase on latest main
5. Remove unnecessary files

## Expected Input
- Branch name to check (or current branch)
- Repository context (main branch name, conventions)

## Expected Output
- Hygiene score (0-100)
- List of issues found
- Specific recommendations
- Commands to fix issues

## Example Usage

**Input:**
```
Check branch: feature/user-authentication
```

**Output:**
```
## Branch Hygiene Report: feature/user-authentication

### Overall Score: 72/100 ⚠️

### Issues Found

**🚨 Critical**
- Contains "WIP" in commit history (L45, L67)
- 3 console.log statements left in code

**⚠️ Warnings**
- Last commit "fix stuff" has unclear message
- Missing tests for auth module
- Branch is 12 days behind main (rebase recommended)

**✅ Good**
- Branch name follows convention
- No merge commits (uses rebase)
- Changes are logically grouped

### Recommendations

**1. Clean up commits**
```bash
git rebase -i HEAD~5
# Squash/fixup the WIP and "fix stuff" commits
```

**2. Remove debug statements**
```bash
# Found in:
# - src/auth/login.js:23
# - src/auth/session.js:45
# - src/middleware/auth.js:67
```

**3. Rebase on latest main**
```bash
git fetch origin
git rebase origin/main
```

### Pre-Merge Checklist
- [x] Branch name ✓
- [ ] Remove console.logs
- [ ] Add auth tests
- [ ] Rebase on main
- [ ] Clean commit history
```

---

**Input:**
```
Scan all branches for hygiene issues
```

**Output:**
```
## Repository Branch Hygiene Report

### Total Branches: 23
### Stale Branches: 4
### Naming Violations: 2
### Needs Cleanup: 6

### Stale Branches (Safe to Delete)
- `old-feature` - Merged 45 days ago
- `temp-test` - Last commit 90 days ago
- `feature/abandoned` - No activity 60 days
- `experiment/poc` - Proof of concept, superseded

### Poor Naming
- `my_stuff` → `feature/add-user-dashboard`
- `bug_fix` → `bugfix/resolve-login-timeout`

### Action Items
```bash
# Delete stale branches
git branch -d old-feature temp-test feature/abandoned experiment/poc

# Rename branches
git branch -m my_stuff feature/add-user-dashboard
git branch -m bug_fix bugfix/resolve-login-timeout
```
