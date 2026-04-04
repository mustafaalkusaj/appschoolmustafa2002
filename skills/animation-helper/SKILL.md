# Animation Helper

## Name
animation-helper

## Description
Adds smooth, performant animations and transitions to UI components. Implements CSS animations, transitions, and React animation libraries while maintaining 60fps performance and accessibility preferences.

### When to Use
- Adding micro-interactions to buttons/links
- Implementing page transitions
- Creating loading states
- Building accordion/modal animations
- Adding hover effects
- Implementing scroll-based animations
- Following prefers-reduced-motion

## Instructions

### Step 1: Choose Animation Approach
1. CSS transitions for simple hover/state changes
2. CSS keyframes for complex/repeating animations
3. Framer Motion for React component choreography
4. Web Animations API for advanced control

### Step 2: Plan Animation
1. Define what animates (transform, opacity, etc.)
2. Determine duration (fast: 150ms, normal: 300ms, slow: 500ms)
3. Choose easing function
4. Identify trigger (hover, click, scroll, appear)
5. Plan reduced motion alternative

### Step 3: Implement
1. Use transform/opacity for GPU acceleration
2. Apply will-change sparingly
3. Use cubic-bezier for custom easing
4. Respect prefers-reduced-motion
5. Debounce scroll-triggered animations

### Step 4: Optimize
1. Test at 60fps
2. Avoid animating layout properties
3. Use requestAnimationFrame for JS animations
4. Clean up animation listeners
5. Verify accessibility doesn't suffer

## Expected Input
```
Animation request:
- Element to animate
- Animation type (hover, click, load, scroll)
- Desired behavior
- Duration preference
```

## Expected Output
```
Animation implementation:
- CSS or JS animation code
- Accessibility consideration
- Performance optimized
- Reduced motion fallback
```

## Example Usage

**Input:**
```
Add a smooth expand/collapse animation to an accordion
```

**Output:**
```css
/* CSS approach */
.accordion__content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
  opacity: 0;
}

.accordion__content.is-open {
  max-height: 500px; /* or use JS to calculate */
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .accordion__content {
    transition: none;
  }
}
```

```tsx
/* Framer Motion approach */
import { motion, AnimatePresence } from 'framer-motion';

function Accordion({ isOpen, children }) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

## Animation Cheat Sheet
| Type | Duration | Easing | Use Case |
|------|----------|--------|----------|
| Micro | 100-150ms | ease-out | Buttons, toggles |
| Standard | 200-300ms | ease-in-out | Modals, dropdowns |
| Emphasis | 400-500ms | spring | Page transitions |
| Loading | 600-1000ms | linear | Spinners, progress |
