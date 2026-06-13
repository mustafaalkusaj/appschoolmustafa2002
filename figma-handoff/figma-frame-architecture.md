# Figma Frame Architecture

## Global Frame Rules

- Naming prefix:
  - `COV` cover
  - `FND` foundations
  - `TOK` tokens
  - `CMP` components
  - `PAT` patterns
  - `TPL` templates
  - `SCR` screens
  - `PRT` prototypes
  - `ARC` archive
- Canonical desktop frame widths:
  - `1440` for full shell pages
  - `1280` for dense module alternatives
- Canonical tablet widths:
  - `1024`
  - `834`
- Canonical mobile widths:
  - `390`
- Direction setup:
  - Arabic frames use RTL auto layout where appropriate
  - English mirrors shell alignment and chevrons
- Shell frame baseline:
  - sidebar: `280px`
  - topbar: `80px`
  - content max width on dashboard: about `1600px`

## 1. Cover

### `COV / Product Overview`

- Size: `1440 x 1024`
- Layout: vertical auto layout
- Padding: `80`
- Gap: `40`
- Contents:
  - product title
  - one-line architecture summary
  - route/component counts
  - screenshot strip
  - “how to use this file” block

## 2. Foundations

### `FND / Color Moodboard`

- Size: `1600 x 1200`
- Layout: vertical auto layout
- Padding: `64`
- Gap: `32`
- Contents:
  - blue/cyan baseline
  - dark theme mapping
  - semantic status palette
  - legacy purple action palette callout

### `FND / Typography`

- Size: `1440 x 1200`
- Layout: vertical
- Padding: `64`
- Gap: `24`
- Contents:
  - Cairo Arabic hierarchy
  - Inter English hierarchy
  - mixed-script examples
  - numeric and currency styles

### `FND / Spacing And Radius`

- Size: `1440 x 960`
- Layout: vertical
- Padding: `64`
- Gap: `24`
- Contents:
  - spacing scale
  - shell paddings
  - radii
  - shadow ladder

## 3. Tokens

### `TOK / Semantic Tokens / Light`

- Size: `1600 x 1200`
- Layout: vertical
- Padding: `64`
- Gap: `24`

### `TOK / Semantic Tokens / Dark`

- Size: `1600 x 1200`
- Layout: vertical
- Padding: `64`
- Gap: `24`

### `TOK / Runtime Branding Presets`

- Size: `1920 x 1400`
- Layout: grid-like sections
- Padding: `64`
- Gap: `32`
- Contents:
  - the 14 discovered theme presets
  - each preset shown as mini shell preview and token swatch block

## 4. Icons And Assets

### `FND / Icons / Navigation`

- Size: `1440 x 900`
- Layout: wrapping grid
- Padding: `64`
- Gap: `24`

### `FND / Assets / Logos`

- Size: `1440 x 900`
- Layout: vertical
- Padding: `64`
- Gap: `32`
- Contents:
  - app mark
  - school logo patterns
  - avatar fallback styles

## 5. Components

### `CMP / Nav / Sidebar`

- Staging frame size: `1600 x 1200`
- Use component sets for:
  - sidebar shell desktop
  - sidebar shell mobile drawer
  - nav group label
  - nav item
  - footer card
  - school selector row

### `CMP / Nav / Topbar`

- Staging frame size: `1600 x 960`
- Use component sets for:
  - fixed topbar desktop
  - topbar tablet
  - topbar mobile
  - page title block
  - academic year pill

### `CMP / Identity / Profile Menu`

- Staging frame size: `1440 x 960`
- Use component sets for:
  - trigger closed/open
  - panel
  - action row
  - avatar image/initials

### `CMP / Actions / Buttons`

- Staging frame size: `1600 x 1200`
- Split into:
  - `ACT / Button / Shell`
  - `ACT / Button / Legacy Dashboard`

### `CMP / Forms / Inputs`

- Staging frame size: `1600 x 1200`
- Include:
  - auth glass input
  - select field
  - search field
  - inline icon variants

### `CMP / Data / Cards`

- Staging frame size: `1600 x 1200`
- Include:
  - base card family
  - KPI card
  - notification item
  - status pill

### `CMP / Data / Tables`

- Staging frame size: `1920 x 1400`
- Include:
  - table shell states
  - student row
  - payment row
  - mobile finance card
  - pagination

### `CMP / Overlays`

- Staging frame size: `1920 x 1400`
- Include:
  - confirm dialog
  - right drawer
  - centered form modal
  - full mobile sheet

## 6. Patterns

### `PAT / Auth / Split Layout`

- Size: `1440 x 1024`
- Layout: horizontal
- Padding: `32`
- Gap: `32`
- Children:
  - hero narrative
  - auth card
  - floating theme toggle if shown outside shell pages

### `PAT / Dashboard / Overview`

- Size: `1600 x 1400`
- Layout: vertical
- Padding: `32`
- Gap: `32`
- Children:
  - shell
  - action cluster
  - KPI row
  - two-column content block
  - optional branding section
  - operational lower grid

### `PAT / Students / Management Workspace`

- Size: `1600 x 1400`
- Layout: vertical
- Padding: `32`
- Gap: `24`
- Children:
  - status tabs
  - KPI row
  - toolbar
  - table shell
  - modals rail

### `PAT / Payments / Collection Workspace`

- Size: `1600 x 1500`
- Layout: vertical
- Padding: `32`
- Gap: `24`
- Children:
  - KPI row
  - search toolbar
  - operations/filters panel
  - table shell
  - right detail drawer

## 7. Templates

### `TPL / App Shell / Desktop`

- Size: `1440 x 1024`
- Layout: none at outer frame, internal shell constraints
- Notes:
  - sidebar fixed width
  - topbar fixed
  - content scroll region

### `TPL / App Shell / Mobile`

- Size: `390 x 844`
- Layout: vertical
- Notes:
  - hidden drawer
  - topbar compressed
  - content stacked

## 8. Screens - Auth

### `SCR / Auth / Login / Desktop / AR`

- Size: `1440 x 1024`
- Direction: RTL
- Layout: two-column
- Padding: `32`
- Gap: `32`

### `SCR / Auth / Login / Mobile / AR`

- Size: `390 x 844`
- Direction: RTL
- Layout: vertical
- Padding: `20`
- Gap: `20`

### `SCR / Auth / Forgot Password / Desktop / AR`

- Size: `1280 x 900`
- Layout: centered card

### `SCR / Gate / Access Denied / Desktop / AR`

- Size: `1280 x 900`
- Layout: centered state

### `SCR / Gate / Subscription Expired / Desktop / AR`

- Size: `1280 x 900`
- Layout: centered state

## 9. Screens - Dashboard

### `SCR / Dashboard / Default / Desktop / AR`

- Size: `1440 x 1280`
- Children:
  - shell
  - scope banner
  - action row
  - KPI cards
  - analytics section
  - activity/notifications column
  - class fees table
  - payments/overdues row

### `SCR / Dashboard / Empty Operational Data / Desktop / AR`

- Same size
- Replace lower data sections with empty state block

### `SCR / Dashboard / Scope Blocked / Desktop / AR`

- Same size
- Replace content body with school scope empty state

### `SCR / Dashboard / Loading / Desktop / AR`

- Same size
- Spinner-centered state

## 10. Screens - Academic / Core App

### `SCR / Students / Desktop / AR`

- Size: `1440 x 1280`
- Children:
  - shell
  - tabs
  - stats
  - toolbar
  - data table
  - modal references

### `SCR / Students / Mobile / AR`

- Size: `390 x 844`
- Children:
  - topbar
  - stacked tabs
  - stacked controls
  - student cards

### `SCR / Teachers / Desktop / AR`

- Size: `1440 x 1280`
- Structure mirrors students with teacher-specific actions

### `SCR / Attendance / Desktop / AR`

- Size: `1440 x 1280`
- Keep editable table and batch controls visible above fold

## 11. Screens - Finance

### `SCR / Payments / Desktop / AR`

- Size: `1440 x 1400`
- Children:
  - shell
  - KPI row
  - search toolbar
  - operations panel
  - payments table
  - hidden detail drawer reference

### `SCR / Payments / Detail Drawer Open / Desktop / AR`

- Same size
- Drawer occupies right-side overlay layer

### `SCR / Payments / Mobile / AR`

- Size: `390 x 844`
- Table replaced by stacked finance cards

### `SCR / Expenses / Desktop / AR`

- Size: `1440 x 1280`
- Follow finance shell template

### `SCR / Salaries / Desktop / AR`

- Size: `1440 x 1280`
- Follow finance shell template

## 12. Screens - Reports / Monitoring

### `SCR / Reports / Desktop / AR`

- Size: `1440 x 1280`

### `SCR / Monitoring / Desktop / AR`

- Size: `1440 x 1280`

### `SCR / Fee Notifications / Desktop / AR`

- Size: `1440 x 1280`

## 13. Screens - Admin

### `SCR / Schools / Legacy Admin / Desktop / AR`

- Size: `1440 x 1200`
- Mark as legacy visual pattern

### `SCR / Subscriptions / Legacy Admin / Desktop / AR`

- Size: `1440 x 1200`
- Mark as legacy visual pattern

## 14. Screens - Super Admin

### `SCR / Super Admin / Console / Desktop / AR`

- Size: `1600 x 1400`
- Children:
  - shell
  - compact hero
  - tab bar
  - overview tab data blocks

### `SCR / Super Admin / School Scoped / Desktop / AR`

- Same size
- Include school-context banner and scoped links

## 15. Prototypes / User Flows

### `PRT / Auth Flow`

- Size: `1920 x 1080`
- Arrange frames left-to-right by progression

### `PRT / Students CRUD`

- Size: `2200 x 1400`
- Use modal overlays connected from desktop students frame

### `PRT / Payments Collection`

- Size: `2400 x 1400`
- Connect list, detail drawer, add payment modal, print receipt branch

### `PRT / Super Admin Scope Flow`

- Size: `2200 x 1400`
- Connect no-scope state, school selection, scoped dashboard, scoped modules

## 16. Archive / Ambiguous / Inferred

### `ARC / Legacy Purple Buttons`

- Size: `1440 x 900`
- Keep side-by-side comparison against blue/cyan shell buttons

### `ARC / Legacy Admin Pages`

- Size: `1600 x 1200`
- Store schools/subscriptions divergent pages here

### `ARC / Verification Gaps`

- Size: `1440 x 900`
- Include notes about runtime-dependent states not fully screenshot-verified

