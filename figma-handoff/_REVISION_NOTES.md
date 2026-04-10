# Figma Handoff — Revision Notes

## Revision: 2026-04-09 (v3)

### Summary
The handoff package is still the baseline design reference, but the live root app now has an implementation delta that must be considered the current source of truth.

### Live implementation delta
- root app verified at `http://localhost:3000`
- white-first shell foundations are live in the shared app shell
- login now has visible language and theme controls
- dashboard widgets now use isolated loading/error/retry behavior instead of fragile page-wide failure
- `payments` and the default `salaries` route shell now have materially better English coverage in the live UI
- full route-group completion is still pending for `fee-notifications`, `monitoring`, and several remaining admin/operations modules

### Reference rule
When a handoff doc conflicts with the live root app implementation, prefer the live root app and the verification reports generated on 2026-04-09.

## Revision: 2026-04-08 (v2)

### Summary
All files in this directory have been regenerated with expanded scope and detail.

### Changes from prior version (v1)
- Expanded route coverage: now includes non-routable UI surfaces (tab panels, conditional sections, dialogs, embedded flows)
- Added multi-viewport responsive documentation (desktop 1440, tablet 768, mobile 390)
- Added per-tenant theme preset documentation (Modern, Professional, Academic, Vibrant, Classic, Dark)
- Added comprehensive 12-state interaction states matrix (hover, focus, active, selected, disabled, expanded, collapsed, open, current, invalid, success, destructive)
- New file: figma-variable-mapping.md — maps tokens to Figma Variables, Text Styles, Color Styles, Effect Styles
- New file: coverage-report.md — quantitative summary of documentation coverage
- Added screenshot naming convention: {screen}--{viewport}--{direction}--{state}.png
- Added revision headers to all updated files
- Previous version backed up to figma-handoff-backup-20260408/

### Files in this package
1. figma-build-plan.md
2. screen-blueprints.md
3. ux-flows.md
4. route-inventory.csv
5. component-inventory.csv
6. design-tokens.json
7. figma-naming-convention.md
8. responsive-mapping.md
9. interaction-states.md
10. missing-or-ambiguous-items.md
11. rebuild-priority.md
12. asset-inventory.md
13. figma-variable-mapping.md (NEW)
14. coverage-report.md (NEW)
