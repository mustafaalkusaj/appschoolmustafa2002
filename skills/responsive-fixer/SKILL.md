# Responsive Fixer

## Name
responsive-fixer

## Description
Diagnoses and fixes responsive design issues across different screen sizes and devices. Ensures layouts adapt properly from mobile to desktop and handles edge cases like tablet orientations.

### When to Use
- Layout breaks on specific screen sizes
- Elements overflow or get cut off on mobile
- Navigation doesn't work properly on touch devices
- Images don't scale correctly
- Typography is unreadable at certain sizes
- CSS Grid/Flexbox layouts collapse unexpectedly

## Instructions

### Step 1: Diagnose the Issue
1. Identify the problematic viewport(s)
2. Determine root cause (flex, grid, absolute positioning, fixed widths)
3. Check for missing media queries
4. Verify viewport meta tag presence
5. Test touch vs hover interactions

### Step 2: Apply Fixes
1. Use CSS clamp() for fluid typography
2. Implement proper media queries (mobile-first approach)
3. Replace fixed widths with min/max/relative units
4. Fix flex behavior with flex-wrap and flex-basis
5. Ensure images use max-width: 100%

### Step 3: Verify Across Breakpoints
1. Test at common breakpoints: 320px, 768px, 1024px, 1440px
2. Check both orientations on tablets
3. Verify no horizontal scroll
4. Test interactive elements touch targets (min 44x44px)

## Expected Input
```
Issue description or screenshot showing:
- The broken layout
- Target viewport size(s)
- Expected behavior
```

## Expected Output
```
Fixed CSS/code with:
- Added/updated media queries
- Proper responsive units
- Working layouts at all breakpoints
- Touch-friendly interactions
```

## Example Usage

**Input:**
```css
/* Breakpoint: 375px mobile - text overflow */
.container {
  width: 100%;
  font-size: 18px;
}
.sidebar {
  width: 300px;
  position: fixed;
}
```

**Output:**
```css
/* Fixed responsive styles */
.container {
  width: 100%;
  font-size: clamp(14px, 4vw, 18px);
}

.sidebar {
  position: fixed;
  width: 100%;
  max-width: 300px;
  height: 100%;
}

@media (min-width: 768px) {
  .sidebar {
    width: 300px;
    position: sticky;
  }
}
```
