# dependency-mapper

## Name

Dependency Mapper

## Description

Creates a visual or textual map of dependencies between modules, files, and packages. This skill helps understand coupling, identify circular dependencies, and trace code ownership paths.

**When to use:**
- When refactoring code to understand impact
- When debugging import/dependency errors
- When optimizing bundle size (tree shaking)
- When identifying tight coupling that needs decoupling
- When onboarding to understand code relationships
- When planning feature implementation to know where to make changes

## Instructions

1. **Build dependency graph:**
   - Parse all import/export statements in the codebase
   - Group imports by file/module
   - Identify external package dependencies vs internal modules
   - Track direction of dependencies (A imports B means A depends on B)

2. **Categorize dependencies:**
   - **Internal modules:** Files within the project
   - **External packages:** npm/Cargo/Python packages
   - **Peer dependencies:** Shared dependencies between packages
   - **Dev dependencies:** Only used in development

3. **Identify patterns:**
   - Circular dependencies (A→B→C→A)
   - Hub modules (imported by many files)
   - Orphan modules (no other files depend on them)
   - Deep nesting levels
   - Cross-boundary dependencies (src→utils vs utils→src)

4. **Create visualization:**
   - Text-based dependency tree for specific paths
   - List of key dependencies per module
   - Flag problematic patterns

## Expected Input

- Target module or file path (optional, defaults to full codebase)
- Specific dependency type to focus on (optional)

## Expected Output

```markdown
# Dependency Map

## Key Dependencies (most imported)
1. `utils/validation.ts` - 15 modules
2. `lib/api-client.ts` - 12 modules
3. `hooks/useAuth.ts` - 8 modules

## External Package Dependencies
| Package | Version | Used By |
|---------|---------|---------|
| react | ^18.2.0 | 45 files |
| zod | ^3.22.0 | 12 files |
| axios | ^1.6.0 | 8 files |

## Dependency Tree (src/features/users)
```
src/features/users/
├── index.ts
├── hooks/
│   └── useUser.ts (depends on: api, types/User)
├── api/
│   └── userApi.ts (depends on: api-client, types/User)
└── components/
    ├── UserCard.tsx (depends on: useUser, types/User)
    └── UserList.tsx (depends on: useUser, UserCard)
```

## Circular Dependencies
- ⚠️ `auth/token.ts` ↔ `auth/session.ts`
- ⚠️ `utils/format.ts` ↔ `utils/parse.ts`

## Cross-Boundary Issues
- ⚠️ `components/` imports from `features/` (violates layer rule)
```

## Example Usage

```
Load skill: dependency-mapper
Target: src/features/payments
Output: Dependency tree and relationship map for payments feature
```

**Best used before refactoring or when tracing how a change might affect other parts of the system.**
