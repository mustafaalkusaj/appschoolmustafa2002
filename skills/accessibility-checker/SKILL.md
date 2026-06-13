# Accessibility Checker

## Name
accessibility-checker

## Description
Audits and fixes accessibility issues to meet WCAG 2.1 AA standards. Checks keyboard navigation, screen reader support, color contrast, focus management, and semantic HTML structure.

### When to Use
- Pre-launch accessibility audit
- Fixing keyboard navigation issues
- Adding ARIA labels and roles
- Improving screen reader experience
- Fixing color contrast violations
- Ensuring form accessibility

## Instructions

### Step 1: Automated Checks
1. Run axe-core or Lighthouse audit
2. Check for missing alt text on images
3. Verify heading hierarchy (no skips)
4. Check form labels and error messages
5. Verify color contrast ratios (4.5:1 text, 3:1 UI)

### Step 2: Keyboard Navigation
1. Ensure all interactive elements are focusable
2. Check logical tab order
3. Verify focus indicators are visible
4. Test custom interactive components
5. Check modal/dialog focus trapping

### Step 3: Screen Reader Testing
1. Verify ARIA labels where needed
2. Check live regions for dynamic content
3. Ensure form error associations
4. Verify button/link text is descriptive
5. Check image alt text accuracy

### Step 4: Apply Fixes
1. Add missing ARIA attributes
2. Fix semantic HTML structure
3. Implement keyboard handlers
4. Add focus management for modals
5. Create skip links and landmarks

## Expected Input
```
Component or page to audit:
- File paths or live URL
- Specific accessibility concerns
- Target WCAG level (A, AA, AAA)
```

## Expected Output
```
Fixed code with:
- Proper ARIA attributes
- Semantic HTML elements
- Keyboard support
- Color contrast fixes
- Screen reader announcements
```

## Example Usage

**Input:**
```tsx
// Broken accessibility
<button onClick={toggle}>
  <img src="menu.svg" />
</button>
<div className="content">
  <div style={{color: '#cccccc'}}>Text</div>
</div>
```

**Output:**
```tsx
// Fixed accessibility
<button onClick={toggle} aria-label="Toggle menu" aria-expanded={isOpen}>
  <img src="menu.svg" alt="" role="presentation" />
</button>
<div className="content">
  <div style={{color: '#767676'}}>Text</div>
  {/* Contrast ratio now 4.5:1 on white background */}
</div>
```

## WCAG Checklist
- [ ] Color contrast ≥ 4.5:1 for normal text
- [ ] Color contrast ≥ 3:1 for large text/UI
- [ ] All images have alt text
- [ ] Form inputs have associated labels
- [ ] Focus visible on all interactive elements
- [ ] No keyboard traps
- [ ] Heading hierarchy maintained
- [ ] Skip link provided
- [ ] ARIA used correctly (not overused)
