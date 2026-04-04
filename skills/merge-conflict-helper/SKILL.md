# Merge Conflict Helper

## Name
merge-conflict-helper

## Description
Resolves git merge conflicts by analyzing conflicting changes, determining the correct resolution, and applying clean merges.

## When to Use
- When `git merge` or `git pull` results in conflicts
- During rebasing with conflicts
- When cherry-picking commits that conflict
- For any git operation resulting in CONFLICT markers

## Instructions

### Conflict Resolution Process

**1. Identify Conflicts**
```bash
git status                    # Shows conflicting files
git diff --name-only --diff-filter=U  # List of conflicted files
```

**2. Understand the Conflict**
```
<<<<<<< HEAD (current change)
const x = 1;
=======
const x = 2;
>>>>>>> feature-branch (incoming change)
```

**3. Analyze Both Versions**
- What does HEAD (current branch) want?
- What does the incoming branch want?
- What was the original base?

**4. Resolve Options**
- Keep HEAD changes
- Keep incoming changes
- Merge both (if compatible)
- Write completely new solution

**5. Mark as Resolved**
```bash
git add <resolved-file>
git commit  # Completes the merge
```

### Resolution Strategies

**Same change, different values:**
```javascript
// Both added same line, different values
<<<<<<< HEAD
const MAX_RETRIES = 3;
=======
const MAX_RETRIES = 5;
>>>>>>> feature

// Resolution: Pick one or merge
const MAX_RETRIES = 5;  // Or keep higher value
```

**Additive changes (usually safe):**
```javascript
// HEAD added line A, incoming added line B
<<<<<<< HEAD
const a = 1;
=======
const b = 2;
>>>>>>> feature

// Resolution: Keep both
const a = 1;
const b = 2;
```

**Conflicting modifications:**
```javascript
// Both modified same lines
<<<<<<< HEAD
return response.json();
=======
return res.send(data);
>>>>>>> feature

// Resolution: May need refactoring to satisfy both
return res.status(200).json(data);
```

### Tools
- `git mergetool` - Visual merge tool
- VS Code merge editor
- GitHub's conflict editor

## Expected Input
- List of conflicting files
- Git conflict markers in files
- Context about what each branch changed

## Expected Output
- Resolved conflict for each file
- Explanation of resolution choices
- Commands to complete the merge

## Example Usage

**Input:**
```
Conflict in src/config.js:

<<<<<<< HEAD
const PORT = 3000;
const HOST = 'localhost';
=======
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
>>>>>>> feature/env-config

Context: HEAD is main, feature branch adds environment config
```

**Output:**
```
## Conflict Resolution: src/config.js

### Analysis
| Setting | HEAD | Incoming |
|---------|------|----------|
| PORT    | 3000 | env.PORT or 3000 |
| HOST    | localhost | 0.0.0.0 |

### Resolution: Merge Both Changes
```javascript
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
```

### Reasoning
- PORT: Take incoming (allows env override, maintains default)
- HOST: Take incoming (0.0.0.0 needed for container networking)

### Command to Apply
```bash
git checkout --ours src/config.js  # Clear markers
# Then manually edit to desired state
# Or use VS Code/Git mergetool
git add src/config.js
```

---

**Input:**
```
Three-way merge conflict in src/api/user.ts
<<<<<<< HEAD
  await saveUser(user);
=======
  return createUser(user);
>>>>>>> feature/async-api
```

**Output:**
```
## Conflict Resolution: src/api/user.ts

### Analysis
- HEAD: Calls saveUser() (side effect)
- Incoming: Returns createUser() result (return value)

### Resolution
```typescript
const newUser = await createUser(user);
await saveUser(newUser);
return newUser;
```

### Explanation
Both changes are needed: create the user and save it. The incoming
branch was likely refactoring to return the user object, which we
should preserve while keeping the save side effect.
```
