# Figma Naming Convention

## Pages

- Use numbered top-level pages exactly:
  - `01 Cover`
  - `02 Foundations`
  - `03 Tokens`
  - `04 Icons and Assets`
  - `05 Components`
  - `06 Patterns`
  - `07 Templates`
  - `08 Screens - Auth`
  - `09 Screens - Dashboard`
  - `10 Screens - Academic / Core App`
  - `11 Screens - Finance`
  - `12 Screens - Reports / Monitoring`
  - `13 Screens - Admin`
  - `14 Screens - Super Admin`
  - `15 Prototypes / User Flows`
  - `16 Archive / Ambiguous / Inferred`

## Frames

- Screen frames: `SCR / <Screen> / <State> / <Viewport>`
- Foundation frames: `FRA / <Topic> / <Subtopic>`
- Flow frames: `FLOW / <Journey>`

## Components

- Master components: `CMP / <Category> / <Name>`
- Example:
  - `CMP / Button / Primary`
  - `CMP / Navigation / Sidebar Item`
  - `CMP / Data Display / KPI Card`
  - `CMP / Overlay / Confirm Dialog`

## Variants And Properties

- State: `Default | Hover | Focus | Active | Disabled | Loading | Error | Success`
- Theme: `Light | Dark`
- Direction: `RTL | LTR`
- Size: `XS | SM | MD | LG | XL`
- Tone: `Neutral | Primary | Success | Warning | Danger | Info`
- Icon: `None | Leading | Trailing | Both`
- Density: `Comfortable | Compact`

## Screen State Suffixes

- `Default`
- `Loading`
- `Empty`
- `Error`
- `Filtered`
- `Searching`
- `Modal Open`
- `Panel Open`
- `Delete Confirm`

## Layer Naming

- Keep slot names explicit:
  - `Title`
  - `Subtitle`
  - `Leading Icon`
  - `Trailing Action`
  - `Table Header`
  - `Row Actions`
  - `Overlay Backdrop`
- Avoid generic layer names like `Group 123` or `Rectangle 88`.
