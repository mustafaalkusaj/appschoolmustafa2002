# task-decomposer

## name

Task Decomposer

## description

Breaks down large, complex tasks into smaller, manageable, and independently testable units. This skill ensures that big tasks become achievable sprint-sized work items.

**When to use this skill:**
- Task estimated to take more than 2 days
- Epic or user story that needs sprint planning
- Implementing a major feature with multiple components
- Refactoring efforts that touch many files
- Any task where "I don't know where to start" is expressed

## instructions

1. **Identify the End Goal**
   - Clearly state what success looks like
   - Define the deliverable
   - Note any hard deadlines

2. **Map the Scope**
   - List all components involved
   - Identify external dependencies
   - Note integration points

3. **Group by Category**
   - Separate frontend/backend work
   - Group by feature module
   - Identify shared utilities needed

4. **Decompose Each Group**
   - Break into tasks that are:
     - Completable in 1-8 hours
     - Testable independently
     - Reversible if needed
   - Each task should have clear "done" criteria

5. **Order the Tasks**
   - Identify prerequisites (Task B needs Task A)
   - List tasks that can run in parallel
   - Order by risk (do risky items early)

6. **Add Task Metadata**
   - Estimated effort
   - Priority level
   - Required skills/tools
   - Dependencies

7. **Create a Task Board View**
   - Group into columns: To Do | In Progress | Review | Done
   - Add milestones for key checkpoints

## expected input

- A large task or epic description
- Optional: deadline or time constraint
- Optional: team size or available resources

## expected output

A decomposed task list with:
- Task titles (action-oriented, verb + noun)
- Task descriptions (2-3 sentences)
- Dependencies marked
- Effort estimates
- Suggested order/execution plan
- Milestone markers for complex efforts

## example usage

```
User: We need to rewrite our authentication system to support OAuth2

[Using task-decomposer]

Output:
# Authentication System Rewrite - Task Breakdown

## Milestones
- M1: Foundation (Core types and utilities)
- M2: OAuth2 Provider Integration
- M3: Backend API Changes
- M4: Frontend Integration
- M5: Testing & Security Audit

## Tasks

### M1: Foundation
- [ ] 1.1 Create TypeScript types for Auth models (2h)
- [ ] 1.2 Set up JWT utility functions (3h)
- [ ] 1.3 Create auth config validation schema (2h)

### M2: OAuth2 Provider Integration
- [ ] 2.1 Implement Google OAuth flow (4h)
- [ ] 2.2 Implement GitHub OAuth flow (4h)
- [ ] 2.3 Create OAuth callback handler (3h)
- [ ] 2.4 Add token refresh logic (4h)

### M3: Backend API Changes
- [ ] 3.1 Create /auth/login endpoint (2h)
- [ ] 3.2 Create /auth/refresh endpoint (2h)
- [ ] 3.3 Create /auth/logout endpoint (1h)
- [ ] 3.4 Update user model with OAuth fields (2h)
- [ ] 3.5 Add rate limiting to auth endpoints (2h)

### M4: Frontend Integration
- [ ] 4.1 Create LoginPage component (3h)
- [ ] 4.2 Create AuthContext provider (3h)
- [ ] 4.3 Implement OAuth button components (2h)
- [ ] 4.4 Add protected route HOC (2h)
- [ ] 4.5 Update user profile page (2h)

### M5: Testing & Security
- [ ] 5.1 Write unit tests for auth utilities (4h)
- [ ] 5.2 Write integration tests for API (4h)
- [ ] 5.3 Security audit and penetration test (8h)
- [ ] 5.4 Performance testing with auth (2h)

## Execution Order
1. Complete M1 first (foundation for everything)
2. M2 and M3 can run in parallel (different layers)
3. M4 depends on M1, M2, M3
4. M5 runs last, after everything is integrated

## Total Estimated Time: 60-70 hours
```
