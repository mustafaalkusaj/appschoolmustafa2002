# Bundle Size Optimizer

## Name
bundle-size-optimizer

## Description
Reduces JavaScript and CSS bundle sizes through tree-shaking, code splitting, dependency optimization, and build configuration improvements. Helps achieve faster load times.

### When to Use
- Bundle size exceeds performance budget
- Long initial load times
- Slow Time to Interactive
- Analyzing what's contributing to bundle size
- Optimizing third-party dependencies
- Setting up production builds

## Instructions

### Step 1: Analyze Bundle
1. Run bundle analyzer (webpack-bundle-analyzer, rollup-plugin-visualizer)
2. Identify large dependencies
3. Find duplicate packages
4. Check for unused code
5. Measure gzipped size

### Step 2: Optimize Dependencies
1. Replace heavy libraries with lighter alternatives
2. Use conditional imports for features
3. Analyze if libraries are fully used
4. Tree-shake unused exports
5. Consider native alternatives

### Step 3: Implement Code Splitting
1. Split by route (React.lazy, dynamic imports)
2. Split vendor libraries (webpack optimization)
3. Split common components
4. Use loading boundaries for chunks
5. Preload critical chunks

### Step 4: Configure Build
1. Enable minification (Terser)
2. Enable tree-shaking
3. Set sideEffects in package.json
4. Configure output optimization
5. Enable compression (Brotli/Gzip)

## Expected Input
```
Bundle analysis:
- bundle analyzer report
- or file paths to analyze
- target bundle size
```

## Expected Output
```
Optimized bundle:
- Reduced main bundle size
- Code-split chunks
- Optimized imports
- Build configuration updates
- Before/after comparison
```

## Example Usage

**Input:**
```
Main bundle: 2.1MB
Lodash fully imported
Moment.js in use
No code splitting
```

**Output:**
```
Optimizations applied:

1. Replace moment with date-fns
   Before: moment (67KB gzipped)
   After: date-fns (7KB gzipped)

2. Tree-shake lodash
   Before: full lodash import
   After: import { debounce } from 'lodash-es'

3. Add route-based code splitting
   Before: single bundle
   After: 4 chunks (main: 180KB, routes: 50-80KB each)

Result: Main bundle 180KB, total 450KB (78% reduction)
```

## Quick Wins
- Use lodash-es instead of lodash
- Replace moment with date-fns or dayjs
- Use React.lazy for route components
- Remove unused dependencies
- Configure sideEffects in package.json
