# Prototype Linking Map

## Use This File

- This is the practical hotspot map for wiring the Figma prototype.
- Use frame names from `figma-frame-architecture.md`.
- Default prototype language should start in Arabic RTL unless the stakeholder explicitly needs English first.

## 1. Authentication Entry

### Start Frame

- `SCR / Auth / Login / Desktop / AR`

### Hotspots

- Submit button:
  - success -> `SCR / Dashboard / Default / Desktop / AR`
  - invalid credentials -> same frame with error state overlay/variant
- Password eye toggle -> same frame variant
- Theme switch -> same frame interactive component property
- Forgot password link -> `SCR / Auth / Forgot Password / Desktop / AR`

### Alternate Paths

- unauthorized role path -> `SCR / Gate / Access Denied / Desktop / AR`
- expired/inactive school path -> `SCR / Gate / Subscription Expired / Desktop / AR`

## 2. Dashboard Navigation

### Start Frame

- `SCR / Dashboard / Default / Desktop / AR`

### Primary Links

- Sidebar dashboard item -> current frame
- Sidebar students -> `SCR / Students / Desktop / AR`
- Sidebar teachers -> `SCR / Teachers / Desktop / AR`
- Sidebar attendance -> `SCR / Attendance / Desktop / AR`
- Sidebar payments -> `SCR / Payments / Desktop / AR`
- Sidebar reports -> `SCR / Reports / Desktop / AR`
- Sidebar monitoring -> `SCR / Monitoring / Desktop / AR`
- Sidebar super admin -> `SCR / Super Admin / Console / Desktop / AR`

### Local Overlay Links

- manage classes -> modal overlay component frame
- add fee -> fee modal overlay component frame
- profile trigger -> profile menu open state

## 3. Students CRUD Flow

### Start Frame

- `SCR / Students / Desktop / AR`

### Prototype Steps

1. Students list default
2. Search typed state
3. Filtered results state
4. Student action menu open
5. Add student modal
6. Save success banner state
7. Edit student modal
8. Delete confirmation dialog
9. Empty state for selected tab

### Click Mapping

- Status tabs switch between tab property variants
- Add student button opens modal overlay
- Row primary action opens student edit/details modal
- Delete action opens confirm dialog
- Export/print actions can link to informational toast states rather than new screens

## 4. Teachers Management Flow

- Start: `SCR / Teachers / Desktop / AR`
- Flow:
  - search/filter
  - open add teacher modal
  - import modal
  - account card modal
  - success banner
- Prototype note:
  - keep import and account card as parallel branches, not a linear path

## 5. Attendance Recording Flow

- Start: `SCR / Attendance / Desktop / AR`
- Flow:
  - choose date
  - choose class/section
  - mark rows
  - apply batch action
  - save pending state
  - save success state
- Prototype note:
  - use one alternate frame for “unrecorded only” filter

## 6. Payments Collection Flow

### Start Frame

- `SCR / Payments / Desktop / AR`

### Prototype Steps

1. Search toolbar typing
2. Quick filter active
3. Payments table filtered
4. Student detail drawer open
5. Add payment modal from drawer
6. Save success state
7. Print receipt state
8. Delete payment confirmation

### Click Mapping

- row student name -> `SCR / Payments / Detail Drawer Open / Desktop / AR`
- add payment icon -> add payment modal overlay
- export excel -> busy button state
- quick filter chips -> component property changes in place
- pagination next -> second-page variant

### Mobile Mapping

- `SCR / Payments / Mobile / AR`
- tapping a finance card opens full-screen detail sheet instead of desktop side drawer

## 7. Reports / Monitoring / Fee Notifications

- Use a hub frame per module plus:
  - loading variant
  - empty variant
  - filtered/report-ready variant
- Link from sidebar directly into each module hub frame.

## 8. Super Admin Scope Flow

### Start Frames

- `SCR / Super Admin / Console / Desktop / AR`
- `SCR / Dashboard / Scope Blocked / Desktop / AR`

### Flow

1. no school selected
2. school selector open in sidebar/footer area
3. school selected
4. scoped dashboard ready
5. navigate to scoped students/payments
6. return to super admin console

### Prototype Note

- This is the most important role-based branch in the product.
- Keep one explicit decision node labeled `Select School Context`.

## 9. Global Menus And Overlays

- Profile trigger -> profile menu open state on same frame
- Theme switch -> interactive component property, no navigation
- Confirm dialog -> overlay presentation, preserve source screen beneath
- Right drawers -> animate from inline end
- Mobile drawers/sheets -> animate from bottom or inline start depending on component type

## 10. Recommended Starting Prototype

- First clickable prototype:
  - login
  - dashboard
  - students
  - payments
  - super admin scope selection
- This covers the core shell, list-management pattern, finance pattern, and role-context pattern in one prototype set.

