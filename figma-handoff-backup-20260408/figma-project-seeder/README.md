# School App Figma Seeder

This plugin is the practical fallback for turning the local `figma-handoff` package into a real Figma file structure when direct Figma MCP write access is not exposed in the Codex session.

## What It Creates

- 16 Figma pages matching the handoff architecture
- cover/foundations/tokens/components/patterns/templates/screen/prototype/archive pages
- top-level staging frames for the main screens and component canvases
- starter shell mockups for auth, dashboard, tables, finance, and super-admin patterns
- light/dark token swatch areas and runtime branding preset cards

## What It Does Not Do

- It does not fully recreate every pixel-perfect screen automatically.
- It does not sync live code changes back into Figma.
- It does not replace direct Figma MCP automation.

## How To Run

1. Open Figma Desktop or Figma in a browser with plugin development enabled.
2. Create or open a blank Design file.
3. Go to `Plugins > Development > Import plugin from manifest...`
4. Select:
   `/Users/musatafa/school-app/figma-handoff/figma-project-seeder/manifest.json`
5. Run `School App Figma Seeder`.

## Behavior

- The plugin creates missing pages if they do not exist.
- If a page already exists, it appends missing frames to the right of existing content.
- If a frame with the same name already exists on that page, it skips that frame.

## Source Package

The plugin is derived from these local handoff files:

- `/Users/musatafa/school-app/figma-handoff/figma-build-plan.md`
- `/Users/musatafa/school-app/figma-handoff/figma-frame-architecture.md`
- `/Users/musatafa/school-app/figma-handoff/component-spec-sheets.md`
- `/Users/musatafa/school-app/figma-handoff/design-tokens.json`

## Notes

- The current canonical shell width in the seeded project is `280px`.
- The plugin keeps legacy purple dashboard buttons documented as a separate legacy path, because the codebase still contains them in active dashboard components.
- This plugin was authored from the audited codebase and local handoff package, but it was not executed inside Figma from this session because direct Figma runtime access is not exposed here.
