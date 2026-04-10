---
name: interaction-states
description: Comprehensive interaction state documentation for UI components. Use when designing or implementing hover, focus, disabled, active, expanded, or invalid states for interactive elements.
---

# Interaction States

Complete guide for implementing UI component interaction states.

## Core States

Every interactive element must have these states:

### 1. Default
The resting state of the element.

### 2. Hover
When the mouse pointer is over the element.

```css
.button:hover {
  background-color: var(--color-primary-600);
  cursor: pointer;
}
```

### 3. Focus
When the element receives keyboard focus.

```css
.button:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

**Critical**: Always use `:focus-visible` for keyboard-only focus styling.

### 4. Active/Pressed
When the element is being clicked or activated.

```css
.button:active {
  background-color: var(--color-primary-700);
  transform: scale(0.98);
}
```

### 5. Disabled
When the element is not interactive.

```css
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
```

## Conditional States

### Expanded (for disclosure widgets)

```css
.accordion-trigger[aria-expanded="true"] {
  background-color: var(--color-neutral-100);
}

.accordion-trigger[aria-expanded="true"] .icon {
  transform: rotate(180deg);
}
```

### Invalid (for form fields)

```css
.input:invalid:not(:placeholder-shown) {
  border-color: var(--color-error-500);
}

.input[aria-invalid="true"] {
  border-color: var(--color-error-500);
  box-shadow: 0 0 0 1px var(--color-error-500);
}
```

### Loading

```css
.button[data-loading="true"] {
  position: relative;
  color: transparent;
  pointer-events: none;
}

.button[data-loading="true"]::after {
  content: "";
  position: absolute;
  /* spinner styles */
}
```

## State Priority Order

When multiple states apply, use this priority (highest wins):

1. `disabled` - overrides everything
2. `loading`
3. `invalid` (for form elements)
4. `active`
5. `focus`
6. `hover`
7. `default`

## CSS Implementation Pattern

```css
/* Base styles */
.button {
  background-color: var(--color-primary-500);
  color: white;
  transition: all 0.15s ease;
}

/* Hover - lower priority */
.button:hover:not(:disabled) {
  background-color: var(--color-primary-600);
}

/* Focus - keyboard accessible */
.button:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* Active */
.button:active:not(:disabled) {
  background-color: var(--color-primary-700);
}

/* Disabled - highest priority */
.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## Tailwind CSS Pattern

```tsx
<button
  className={cn(
    // Base
    "bg-primary-500 text-white transition-all",
    // Hover
    "hover:bg-primary-600",
    // Focus
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
    // Active
    "active:bg-primary-700",
    // Disabled
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
  )}
>
  Button
</button>
```

## Checklist for Each Component

- [ ] Default state defined
- [ ] Hover state with visual feedback
- [ ] Focus-visible state with outline
- [ ] Active/pressed state
- [ ] Disabled state with reduced opacity
- [ ] Loading state (for buttons/actions)
- [ ] Invalid state (for form inputs)
- [ ] Expanded state (for disclosure widgets)
- [ ] All states meet WCAG contrast requirements
- [ ] States tested with keyboard navigation

## Accessibility Requirements

1. **Focus must be visible** - Never remove focus outlines without replacement
2. **Disabled elements** - Should not receive focus (use `tabindex="-1"`)
3. **Invalid states** - Use `aria-invalid="true"` attribute
4. **Loading states** - Use `aria-busy="true"` and announce to screen readers
5. **Color is not enough** - Combine color changes with other visual indicators
