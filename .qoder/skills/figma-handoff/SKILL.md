---
name: figma-handoff
description: Design system handoff workflow from Figma to code. Use when preparing Figma designs for production, generating design tokens, creating component specifications, or bridging design-to-code gaps.
---

# Figma Handoff

Workflow for transitioning Figma designs to production-ready code.

## Pre-Handoff Checklist

- [ ] All components use design tokens (no hardcoded values)
- [ ] Variants properly named and organized
- [ ] Auto-layout correctly configured
- [ ] Component properties documented
- [ ] Interaction states included (hover, focus, disabled, active)

## Design Token Extraction

### Color Tokens
Extract colors as CSS custom properties:

```css
:root {
  /* Primary */
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a8a;
  
  /* Semantic */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

### Spacing Scale
Use consistent spacing based on 4px grid:

```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
}
```

### Typography Scale
Document font sizes, weights, and line heights:

```css
:root {
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
}
```

## Component Specification Format

For each component, document:

### 1. Component Name & Description
```markdown
## Button

Primary interactive element for user actions.
```

### 2. Variants
- Primary (default)
- Secondary
- Outline
- Ghost
- Destructive

### 3. States
- Default
- Hover
- Focus (with visible focus ring)
- Active/Pressed
- Disabled
- Loading

### 4. Props/Properties
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | string | 'primary' | Visual style variant |
| size | string | 'md' | Size variant |
| disabled | boolean | false | Disabled state |

### 5. Usage Example
```tsx
<Button variant="primary" size="md">
  Click me
</Button>
```

## Handoff Package Structure

```
figma-handoff/
├── tokens/
│   ├── colors.json
│   ├── spacing.json
│   └── typography.json
├── components/
│   ├── Button.md
│   ├── Input.md
│   └── Card.md
└── assets/
    ├── icons/
    └── illustrations/
```

## Coverage Report

Generate a coverage report showing:

1. **Token Coverage**: % of designs using tokens vs hardcoded
2. **Component Coverage**: % of components documented
3. **State Coverage**: % of states specified per component
4. **Accessibility**: Focus states, ARIA labels, contrast ratios

## Quality Gates

Before marking handoff complete:

- [ ] All tokens extracted and converted to CSS/JS
- [ ] All components have specifications
- [ ] All interaction states documented
- [ ] Accessibility requirements noted
- [ ] Design and implementation reviewed together
