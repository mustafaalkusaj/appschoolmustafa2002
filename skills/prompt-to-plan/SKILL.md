# prompt-to-plan

## name

Prompt to Plan

## description

Transforms a quick user request or vague idea into a detailed, actionable execution plan. This skill is essential when a user presents a feature request, bug fix, or task in natural language without clear structure.

**When to use this skill:**
- User says "I want to add X feature" without specifying how
- User describes a problem but doesn't know what steps are needed
- User requests a complex change that needs to be broken down
- Starting a new feature or significant refactoring
- When you need to validate your understanding before implementation

## instructions

1. **Understand the Request**
   - Read the user's request carefully
   - Identify the core goal (what they want to achieve)
   - Note any constraints or requirements mentioned

2. **Ask Clarifying Questions** (if needed)
   - Determine missing context (existing code, dependencies, users)
   - Clarify scope boundaries
   - Confirm priorities if multiple items mentioned

3. **Analyze the Current State**
   - Examine relevant existing code files
   - Identify related modules, APIs, or services
   - Check for existing patterns or conventions

4. **Create the Plan Structure**
   - Break into phases: Discovery → Implementation → Testing → Deployment
   - List specific files that need modification
   - Identify dependencies between tasks
   - Add risk considerations

5. **Format the Output**
   - Use numbered steps for clarity
   - Group related tasks
   - Include estimated effort for each phase
   - Add verification points

6. **Review with User**
   - Present the plan clearly
   - Ask for confirmation or adjustments
   - Adjust based on feedback

## expected input

- A user request in natural language (English or Arabic)
- Optional: reference to specific files or features
- Optional: priority or deadline constraints

## expected output

A structured execution plan containing:
- Goal statement
- Phase-by-phase breakdown
- Specific file modifications
- Dependencies and prerequisites
- Risks and considerations
- Estimated timeline

## example usage

```
User: I want to add a dark mode to our app

[Using prompt-to-plan]

Output:
# Dark Mode Implementation Plan

## Goal
Add system-aware dark mode toggle with persistent user preference.

## Phases

### Phase 1: Discovery (15 min)
- Audit current CSS variables and theme structure
- Check existing color utilities
- Review user preference storage approach

### Phase 2: Implementation
1. Create theme context provider (`src/contexts/ThemeContext.tsx`)
2. Add CSS variables for dark mode (`src/styles/themes.css`)
3. Implement toggle component (`src/components/ThemeToggle.tsx`)
4. Add localStorage persistence

### Phase 3: Testing
- Test toggle functionality
- Verify all components respect theme
- Check system preference detection

### Phase 4: Deployment
- Add feature flag for gradual rollout
- Document in changelog

## Risks
- Existing hardcoded colors may need refactoring
- Third-party components may not support themes

## Files to Modify
- `src/App.tsx` - Add ThemeProvider
- `src/styles/globals.css` - Add theme variables
- `src/components/*` - Update to use theme variables
```
