---
name: theme-tokens
description: Theme token delta system for multi-tenant applications with per-theme customization. Use when implementing tenant themes, theme presets, or managing design token overrides.
---

# Theme Tokens

Design token system with per-theme customization for multi-tenant SaaS applications.

## Token Architecture

### Base Tokens (Default Theme)
The foundation of the design system:

```css
:root {
  /* Colors */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-900: #1e3a8a;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-8: 2rem;
  
  /* Typography */
  --font-family: "Inter", sans-serif;
  --font-size-base: 1rem;
  --line-height-base: 1.5;
  
  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
}
```

### Token Deltas (Theme Overrides)
Only define what differs from base:

```css
/* Theme: School Alpha */
[data-theme="school-alpha"] {
  --color-primary-500: #8b5cf6;  /* Violet instead of blue */
  --color-primary-600: #7c3aed;
  --radius-md: 0.75rem;  /* More rounded */
}

/* Theme: School Beta */
[data-theme="school-beta"] {
  --color-primary-500: #10b981;  /* Green instead of blue */
  --color-primary-600: #059669;
}
```

## Theme Presets

Define standard presets for common use cases:

```typescript
const themePresets = {
  default: {
    name: "Default",
    primaryColor: "#3b82f6",
    borderRadius: "0.5rem",
  },
  education: {
    name: "Education",
    primaryColor: "#8b5cf6",
    borderRadius: "0.75rem",
  },
  corporate: {
    name: "Corporate",
    primaryColor: "#0f766e",
    borderRadius: "0.25rem",
  },
};
```

## Theme Application

### HTML Attribute Method

```html
<html data-theme="school-alpha">
  <!-- Theme tokens automatically apply -->
</html>
```

### JavaScript Theme Switching

```typescript
function applyTheme(themeId: string) {
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem('theme', themeId);
}

// On load
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  applyTheme(savedTheme);
}
```

### CSS-in-JS Integration

```typescript
// Generate theme CSS from database
function generateThemeCSS(theme: ThemeConfig): string {
  const tokens = theme.tokenDeltas;
  
  return `[data-theme="${theme.id}"] {
    ${Object.entries(tokens)
      .map(([key, value]) => `--${key}: ${value};`)
      .join('\n')}
  }`;
}
```

## Multi-Tenant Theme Storage

### Database Schema

```sql
CREATE TABLE school_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  preset_id TEXT,  -- Reference to preset or null for custom
  token_deltas JSONB,  -- Only overridden tokens
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Token Delta Format

```json
{
  "tokenDeltas": {
    "color-primary-500": "#8b5cf6",
    "color-primary-600": "#7c3aed",
    "color-primary-900": "#4c1d95",
    "radius-md": "0.75rem"
  }
}
```

## Color Derivation

When setting a primary color, derive the full scale:

```typescript
function deriveColorScale(baseColor: string): ColorScale {
  return {
    50: lighten(baseColor, 95),
    100: lighten(baseColor, 90),
    200: lighten(baseColor, 75),
    300: lighten(baseColor, 60),
    400: lighten(baseColor, 30),
    500: baseColor,
    600: darken(baseColor, 10),
    700: darken(baseColor, 20),
    800: darken(baseColor, 30),
    900: darken(baseColor, 40),
  };
}
```

## Theme Preview

Generate preview swatches for theme selector:

```tsx
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div className="theme-preview">
      <div 
        className="swatch-primary"
        style={{ backgroundColor: theme.tokens['color-primary-500'] }}
      />
      <div className="preview-card" style={{
        borderRadius: theme.tokens['radius-md'],
        border: `2px solid ${theme.tokens['color-primary-500']}`
      }}>
        <span style={{ color: theme.tokens['color-primary-500'] }}>
          {theme.name}
        </span>
      </div>
    </div>
  );
}
```

## Best Practices

1. **Only store deltas** - Never duplicate base tokens
2. **Validate colors** - Ensure accessibility contrast ratios
3. **Test all themes** - Verify components render correctly in each theme
4. **Cache theme CSS** - Generate once, cache for performance
5. **Provide fallbacks** - Always have a default theme

## Checklist for New Themes

- [ ] Primary color defined
- [ ] Full color scale derived
- [ ] Contrast ratios verified (WCAG AA minimum)
- [ ] Border radius consistent
- [ ] Test on all major components
- [ ] Dark mode variant (if applicable)
- [ ] Theme preview generated
