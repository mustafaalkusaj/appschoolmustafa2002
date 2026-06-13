# Responsive Mapping

## Breakpoint Model

- Desktop canonical: 1440 and 1280 widths, shell with persistent 280px sidebar
- Tablet inferred: 1024 and 834 widths, sidebar still exists but competes with content density before switching to drawer behavior
- Mobile verified: 390 width, sidebar becomes overlay, topbar compresses, auth hero collapses
- Breakpoint source: Tailwind defaults inferred from uncustomized setup plus actual live mobile login screenshot

## Global Rules

- Sidebar is fixed on the right in RTL on desktop, currently implemented at 280px wide, and becomes a slide-over drawer on smaller widths.
- Topbar remains fixed for shell pages and offsets content with `--app-shell-topbar-footprint`.
- Card stacks switch from multi-column grids to single-column or 2-column intermediate grids.
- Tables remain desktop-first and require either horizontal overflow or simplified stacking depending on module.

## Screen-Specific Adaptation

- Login:
  - Desktop: hero + form split layout
  - Mobile: hero removed, form card becomes primary full-height content
- Dashboard:
  - Desktop: KPI rows and side panels coexist with a fixed 280px sidebar and fixed topbar offset
  - Mobile: expect stacked KPI cards and single-column panels; verify if charts remain readable
- Students and Teachers:
  - Filters stack vertically
  - Tables likely overflow horizontally; preserve sticky actions where possible in Figma prototypes
- Payments:
  - KPI hero becomes vertical stack
  - Student detail panel should convert to full-screen overlay on mobile
- Salaries:
  - Nested sidebar should likely become tab chips or a top select on tablet/mobile
- Monitoring and Fee Notifications:
  - Detail modals should become full-height sheets on narrow widths

## RTL/LTR Mapping

- Arabic keeps right-side sidebar, right-aligned titles, and inline-start icons/paddings.
- English flips layout direction, icon positions, breadcrumb order, and chevron directions.
- Numbers remain left-to-right within many fields and financial values even in Arabic.
