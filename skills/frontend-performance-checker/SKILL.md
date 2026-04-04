# Frontend Performance Checker

## Name
frontend-performance-checker

## Description
Analyzes and optimizes frontend performance metrics including Core Web Vitals, rendering performance, and resource loading. Identifies bottlenecks and provides actionable recommendations.

### When to Use
- Investigating slow page loads
- Optimizing Core Web Vitals (LCP, FID, CLS)
- Reducing JavaScript execution time
- Improving Time to Interactive
- Analyzing render-blocking resources
- Finding memory leaks

## Instructions

### Step 1: Collect Metrics
1. Run Lighthouse audit
2. Check Chrome DevTools Performance tab
3. Analyze Network waterfall
4. Measure Core Web Vitals
5. Check JavaScript bundle impact

### Step 2: Identify Issues
1. Large JavaScript bundles
2. Unoptimized images (size, format, loading)
3. Render-blocking CSS/JS
4. Excessive DOM size
5. Memory leaks in SPAs
6. Unnecessary re-renders

### Step 3: Common Fixes
1. Code-split and lazy load routes
2. Optimize images (WebP, AVIF, lazy loading)
3. Defer non-critical scripts
4. Preload critical resources
5. Use content-visibility for off-screen content
6. Memoize expensive computations

### Step 4: Verify Improvements
1. Re-run Lighthouse
2. Compare before/after metrics
3. Test on throttled connections
4. Verify no functionality broken

## Expected Input
```
Performance issue or target:
- URL or file paths to analyze
- Specific metric to improve
- Target values (e.g., LCP < 2.5s)
```

## Expected Output
```
Analysis and fixes:
- Performance metric analysis
- Identified bottlenecks
- Optimized code/resources
- Comparison before/after
```

## Example Usage

**Input:**
```
LCP is 4.2s on homepage, above 2.5s target
```

**Output:**
```
Analysis:
- Hero image (3.2MB) loaded without optimization
- No preload for critical resources
- Render-blocking CSS in <head>

Fixes applied:
1. Add preload for hero image
2. Convert hero to WebP (400KB)
3. Inline critical CSS
4. Defer remaining stylesheets

Result: LCP reduced to 1.8s
```

## Target Metrics
| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| LCP | < 2.5s | 2.5-4s | > 4s |
| FID | < 100ms | 100-300ms | > 300ms |
| CLS | < 0.1 | 0.1-0.25 | > 0.25 |
| TTFB | < 800ms | 800-1800ms | > 1800ms |
