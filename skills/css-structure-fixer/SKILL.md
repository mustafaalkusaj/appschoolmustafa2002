# CSS Structure Fixer

## Name
css-structure-fixer

## Description
Refactors and organizes CSS architecture for maintainability. Improves specificity management, removes redundancy, implements proper naming conventions, and optimizes selector performance.

### When to Use
- CSS becoming hard to maintain
- Specificity conflicts and override chains
- Duplicate styles across files
- Naming inconsistencies
- Slow selector performance
- Moving from CSS to CSS Modules or Tailwind
- Inheriting legacy CSS code

## Instructions

### Step 1: Audit Current CSS
1. List all CSS files and their purposes
2. Identify duplicate styles
3. Map out specificity issues
4. Find dead/unused CSS
5. Check naming patterns

### Step 2: Establish Architecture
1. Choose methodology (BEM, Utility-first, CSS Modules)
2. Define naming conventions
3. Create folder structure (base, components, utilities)
4. Set up design tokens/variables

### Step 3: Refactor
1. Extract common patterns to utilities
2. Flatten deep selector nesting
3. Reduce selector specificity
4. Remove !important usage
5. Consolidate duplicate styles

### Step 4: Validate
1. Ensure no visual regressions
2. Check all states (hover, focus, active)
3. Verify responsive behavior
4. Confirm accessibility maintained

## Expected Input
```
CSS code or files:
- Paths to CSS files
- Known issues or patterns
- Target methodology
```

## Expected Output
```
Refactored CSS:
- Organized file structure
- Consistent naming
- Reduced specificity
- Removed duplication
- Migration guide if needed
```

## Example Usage

**Input:**
```css
/* Before - messy structure */
.main-container .header .nav .nav-item .link {
  color: blue;
}
.button.primary {
  background: blue;
}
.btn {
  background: blue !important;
}
.button {
  background: red;
}
```

**Output:**
```css
/* After - BEM structure */
.nav__link {
  color: var(--color-primary);
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
}

.button--secondary {
  background: var(--color-secondary);
}

.button:hover {
  opacity: 0.9;
}

.button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Extracted utilities */
.text-center { text-align: center; }
.d-flex { display: flex; }
.gap-sm { gap: var(--spacing-sm); }
```

## Best Practices
- Use CSS custom properties for values
- Keep specificity low (0-3 levels max)
- Use classes over element selectors
- Prefer composition over nesting
- Extract repeatable patterns
- Document component patterns
