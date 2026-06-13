# impact-analyzer

## name

Impact Analyzer

## description

Systematically analyzes the ripple effects of a proposed change across the codebase. This skill helps predict what else might break, which systems depend on the change, and what testing is required.

**When to use this skill:**
- Before making significant changes to existing code
- When modifying shared utilities or base classes
- Before refactoring public APIs
- When changing database schemas
- When updating authentication/authorization logic
- Any time you're unsure of the full scope of your changes

## instructions

1. **Identify the Change Scope**
   - List the direct files/modules being modified
   - Determine the nature of change (add/modify/delete)
   - Note the type of code (API, utility, UI, data model)

2. **Map Dependencies**
   - Use grep to find all imports of modified modules
   - Check for inheritance hierarchies
   - Look for decorator usages
   - Find all places that call modified functions

3. **Analyze Impact Categories**
   - **API Impact**: Breaking changes to interfaces
   - **Data Impact**: Schema changes, migration needs
   - **UI Impact**: Components that depend on changed logic
   - **Security Impact**: Auth changes, data exposure
   - **Performance Impact**: Changes to hot paths
   - **Configuration Impact**: Env vars, feature flags

4. **Trace Data Flows**
   - Follow the data from input to output
   - Identify all consumers of changed data
   - Check for side effects

5. **Check Related Systems**
   - External API consumers
   - Database triggers
   - Message queue consumers
   - Cron jobs or scheduled tasks

6. **Document the Impact**
   - Categorize each affected area by severity
   - List required tests
   - Note migration needs

7. **Provide Recommendations**
   - Suggest approach to minimize impact
   - Recommend testing strategy
   - Propose rollout plan if needed

## expected input

- The proposed code change (files and nature of modification)
- Optional: context about why the change is needed
- Optional: deadline constraints

## expected output

An impact analysis report containing:
- Summary of changes
- List of affected files (grouped by severity)
- Impact categories affected
- Required tests
- Migration needs
- Recommendations for safe rollout

## example usage

```
User: I want to rename the `getUserById` function to `fetchUser` and change its return type from User to Promise<User>

[Using impact-analyzer]

Output:
# Impact Analysis: Rename getUserById → fetchUser

## Change Summary
- Rename function from `getUserById` to `fetchUser`
- Change return type from `User` to `Promise<User>` (async)

## Impact by Category

### HIGH Severity
- `src/services/userService.ts` - Direct usage, needs update
- `src/hooks/useUser.ts` - Uses return value directly
- `src/components/UserProfile.tsx` - Consumes hook
- `src/components/AdminPanel.tsx` - Direct call

### MEDIUM Severity
- `src/types/index.ts` - Type exports may need updating
- `src/__tests__/userService.test.ts` - All tests need updates
- `docs/API.md` - Documentation needs update

### LOW Severity
- `README.md` - Example code snippets
- `CHANGELOG.md` - Breaking change note needed

## Files Requiring Changes
1. `src/services/userService.ts` - Rename function + add async
2. `src/hooks/useUser.ts` - Add await handling
3. `src/components/UserProfile.tsx` - Add async/await
4. `src/components/AdminPanel.tsx` - Add async/await
5. `src/types/index.ts` - Update type exports
6. All test files - Update test expectations

## Required Testing
- Unit tests for the renamed function
- Integration tests for all calling sites
- E2E test for user profile flow
- Regression test for admin panel

## Migration Strategy
1. Add new `fetchUser` function alongside `getUserById`
2. Update all call sites to use new function
3. Add deprecation warning to old function
4. Remove old function in next major version

## Backward Compatibility
This is a BREAKING CHANGE. Requires major version bump.
```
