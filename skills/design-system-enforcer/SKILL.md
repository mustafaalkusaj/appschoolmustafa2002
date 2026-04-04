# Design System Enforcer

## Name
design-system-enforcer

## Description
Ensures UI components and styles adhere to established design system standards. Validates spacing, typography, colors, and component patterns against defined tokens and guidelines.

### When to Use
- Auditing existing components for design system compliance
- Fixing inconsistent styling across the codebase
- Implementing new components that must match existing patterns
- Migrating code to a new design system
- During code reviews to catch design violations

## Instructions

### Step 1: Identify Design System
1. Locate design tokens (colors, spacing, typography)
2. Find component library documentation or source
3. Identify naming conventions and patterns
4. Check for CSS variables or design token files

### Step 2: Analyze Current Code
1. Scan component for hardcoded values
2. Check against design token definitions
3. Compare spacing, colors, font sizes with tokens
4. Verify component structure matches patterns

### Step 3: Apply Corrections
1. Replace hardcoded colors with CSS variables
2. Swap magic numbers with spacing tokens
3. Use typography components or classes
4. Align component structure with library patterns

### Step 4: Validate
1. Run visual comparison if available
2. Check for remaining hardcoded values
3. Verify accessibility is maintained
4. Ensure no breaking changes to functionality

## Expected Input
```
Code to audit/fix:
- File paths or code snippets
- Design system token locations
- Component library references
```

## Expected Output
```
Fixed code with:
- Replaced hardcoded values with design tokens
- Consistent naming conventions
- Proper CSS variable usage
- Component patterns matching design system
```

## Example Usage

**Input:**
```tsx
// Before - violating design system
<div style={{ 
  backgroundColor: '#f0f0f0',
  padding: '12px',
  fontSize: '14px',
  color: '#333'
}}>
  Content
</div>
```

**Output:**
```tsx
// After - design system compliant
<div className="surface-muted padding-md typography-body">
  Content
</div>

// Or with CSS variables
<div style={{ 
  backgroundColor: 'var(--color-surface-muted)',
  padding: 'var(--spacing-md)',
  fontSize: 'var(--font-size-body)',
  color: 'var(--color-text-primary)'
}}>
  Content
</div>
```
