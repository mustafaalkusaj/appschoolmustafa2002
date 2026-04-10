<!-- Generated: 2026-04-08 (v2) -->

# Interaction States

Comprehensive interaction state matrix organized by component category. Documents all 12 states (hover, focus, active, selected, disabled, expanded, collapsed, open, current, invalid, success, destructive) across all components.

---

## Component Interaction State Matrix

### Shell Components

#### AppSidebar
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | `--sidebar-item-hover: rgba(79, 140, 255, 0.07)` background |
| focus | Yes | `outline-2 offset-2` on nav items |
| active | Yes | `--sidebar-item-active-bg: linear-gradient(135deg, rgba(79, 140, 255, 0.96), rgba(121, 215, 255, 0.96))` |
| selected | Yes | School scope dropdown selected state |
| disabled | N/A | Nav items don't disable |
| expanded | Yes | Mobile sidebar open state |
| collapsed | Yes | Mobile sidebar closed state |
| open | N/A | Use expanded |
| current | Yes | Active route item highlighted with gradient |
| invalid | Yes | Invalid school selection (red border) |
| success | N/A | |
| destructive | N/A | |

#### AppShellTopbar
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Menu button background change |
| focus | Yes | Ring outline on interactive elements |
| active | Yes | Profile menu expanded state |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | Yes | Profile menu open |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |

#### ProfileMenu
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Trigger button hover effect |
| focus | Yes | Focus ring on trigger |
| active | Yes | Panel expanded |
| selected | Yes | Theme/language option selected |
| disabled | N/A | |
| expanded | Yes | Panel visible |
| collapsed | Yes | Panel hidden |
| open | Yes | Same as expanded |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | Yes | Sign-out action (red tone) |

---

### UI Primitives

#### Button (ui-button)
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Darker background (`hover:bg-slate-800` or variant-specific) |
| focus | Yes | `focus-visible:ring-2 ring-[#F59E0B]` (amber ring) |
| active | Yes | Scale down (`active:scale-[0.98]`) |
| selected | N/A | |
| disabled | Yes | `opacity-50 pointer-events-none` |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | Yes | `bg-rose-600` for danger actions |

#### Button (Legacy - variants)
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Default: darker gradient, Outline: bg fill, Secondary: darker bg |
| focus | Yes | Amber ring |
| active | Yes | Pressed state |
| selected | N/A | |
| disabled | Yes | `opacity-50 pointer-events-none` |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | Yes | Danger variant with rose tones |

#### Input (ui-input)
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Subtle border darken |
| focus | Yes | `focus:border-sky-400 focus:ring-4 focus:ring-sky-100` |
| active | N/A | |
| selected | N/A | |
| disabled | Yes | `opacity-50 cursor-not-allowed` |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | Yes | Red border, error message below |
| success | Yes | Green border/checkmark |
| destructive | N/A | |

#### Password Input
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Input hover + eye button hover |
| focus | Yes | Input focus ring |
| active | N/A | |
| selected | N/A | |
| disabled | Yes | Full input disabled |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | Yes | Red border |
| success | N/A | |
| destructive | N/A | |
| **reveal** | Yes | Eye icon toggles text visibility |

#### Card
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | `hover:-translate-y-1` lift effect, shadow increase |
| focus | N/A | |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |

#### StatsCard
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | `hover:-translate-y-1` lift, shadow increase |
| focus | N/A | |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **variant** | Yes | primary/info/success/warning/danger/neutral |

---

### Navigation Components

#### Breadcrumb
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Link hover underline |
| focus | Yes | Focus ring |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | Yes | Current page (no href) with `aria-current="page"` |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |

#### ListPagination
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Button hover background |
| focus | Yes | Focus ring |
| active | Yes | Current page: gradient bg + white text + font-bold |
| selected | Yes | Current page selected |
| disabled | Yes | `opacity-50 pointer-events-none` for prev/next at edges |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | Yes | Active page button |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |

#### StudentsTabs
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Tab hover background |
| focus | Yes | Focus ring |
| active | Yes | Active tab: `bg-sky-600 text-white` |
| selected | Yes | Active tab selected |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | Yes | Active tab indicator |
| invalid | N/A | |
| success | N/A | |
| destructive | Yes | Deleted tab (red tone) |

#### SalariesSidebar
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Item hover background |
| focus | Yes | Focus ring |
| active | Yes | Active section: highlighted background |
| selected | Yes | Active section |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | Yes | Mobile: sidebar hidden |
| open | Yes | Mobile: sidebar visible |
| current | Yes | Active section indicator |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |

---

### Form Components

#### Select/Dropdown
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Trigger hover |
| focus | Yes | Focus ring on trigger |
| active | Yes | Dropdown open |
| selected | Yes | Selected option highlighted |
| disabled | Yes | `opacity-50 cursor-not-allowed` |
| expanded | Yes | Dropdown open |
| collapsed | Yes | Dropdown closed |
| open | Yes | Same as expanded |
| current | Yes | Current value displayed |
| invalid | Yes | Red border |
| success | N/A | |
| destructive | N/A | |

#### Checkbox
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Hover state on box |
| focus | Yes | Focus ring |
| active | N/A | |
| selected | Yes | Checked state |
| disabled | Yes | Grayed out, non-interactive |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |

#### Date Picker
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Input hover |
| focus | Yes | Input focus ring |
| active | Yes | Calendar open |
| selected | Yes | Selected date |
| disabled | Yes | Disabled dates grayed |
| expanded | Yes | Calendar visible |
| collapsed | Yes | Calendar hidden |
| open | Yes | Same as expanded |
| current | Yes | Today highlighted |
| invalid | Yes | Invalid date range |
| success | N/A | |
| destructive | N/A | |

#### Search Input (with debounce)
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Input hover |
| focus | Yes | Focus ring |
| active | Yes | Typing state |
| selected | N/A | |
| disabled | Yes | Input disabled |
| expanded | Yes | Results dropdown open |
| collapsed | Yes | Results dropdown closed |
| open | Yes | Same as expanded |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **searching** | Yes | Debounce loading state |

---

### Data Display Components

#### DataTableShell
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | N/A | |
| focus | N/A | |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **loading** | Yes | TableSkeleton display |
| **error** | Yes | Error message + retry button |
| **empty** | Yes | Empty state with icon + message |
| **default** | Yes | Table + pagination |

#### Table Row
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | `hover:bg-slate-50 dark:hover:bg-slate-800/50` |
| focus | Yes | Row focus ring |
| active | Yes | Selected row |
| selected | Yes | Selected row highlight |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **action-menu-open** | Yes | Dropdown visible |

#### StudentsTable
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Row hover |
| focus | Yes | Cell focus |
| active | Yes | Selected row |
| selected | Yes | Selected for action |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **viewport** | Yes | Desktop table vs mobile cards |
| **tab** | Yes | Active tab affects content |

#### PaymentsTable
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Row hover, student name link |
| focus | Yes | Focus ring |
| active | Yes | Selected student |
| selected | Yes | Selected row |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **quick-filter** | Yes | Filter chip active |
| **sorting** | Yes | Sort indicator |

---

### Feedback Components

#### Toast
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Pause auto-dismiss |
| focus | N/A | |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | Yes | Visible state |
| current | N/A | |
| invalid | N/A | |
| success | Yes | Green theme |
| destructive | Yes | Red theme (error) |
| **type** | Yes | success/error/warning/info |
| **progress** | Yes | Auto-dismiss bar |
| **dismissing** | Yes | Exit animation |

#### ConfirmDialog
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Button hover states |
| focus | Yes | Button focus rings |
| active | N/A | |
| selected | N/A | |
| disabled | Yes | Busy state disables buttons |
| expanded | N/A | |
| collapsed | N/A | |
| open | Yes | Dialog visible |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | Yes | Danger tone (rose) |
| **tone** | Yes | danger/primary |
| **busy** | Yes | Loading state with spinner |

#### Skeleton
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | N/A | |
| focus | N/A | |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **type** | Yes | stat/table/dashboard/analysis/student/page |
| **shimmer** | Yes | CSS animation |

#### SchoolScopeBanner
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Dropdown hover |
| focus | Yes | Dropdown focus |
| active | N/A | |
| selected | Yes | School selected |
| disabled | N/A | |
| expanded | Yes | Dropdown open |
| collapsed | Yes | Dropdown closed |
| open | Yes | Same as expanded |
| current | N/A | |
| invalid | Yes | Invalid selection (red tone) |
| success | N/A | |
| destructive | N/A | |
| **tone** | Yes | info/warning/error |

---

### Overlay Components

#### Modal (generic)
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | N/A | |
| focus | Yes | Focus trap within |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | Yes | Visible with backdrop |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **saving** | Yes | Loading overlay |
| **validation-error** | Yes | Error messages |

#### StudentDetailPanel (Drawer)
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Action buttons hover |
| focus | Yes | Button focus |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | Yes | Slide in from right (LTR) / left (RTL) |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **hidden** | Yes | Off-screen |
| **loading** | Yes | Skeleton state |
| **empty** | Yes | No data message |
| **ready** | Yes | Content displayed |
| **delete-pending** | Yes | Confirm state |

#### PaymentModal
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Input/button hover |
| focus | Yes | Input focus |
| active | N/A | |
| selected | Yes | Student selected |
| disabled | Yes | Save button (validation) |
| expanded | Yes | Student search dropdown |
| collapsed | Yes | Dropdown closed |
| open | Yes | Modal visible |
| current | N/A | |
| invalid | Yes | Validation errors |
| success | Yes | Success message |
| destructive | N/A | |
| **student-search** | Yes | Searching state |
| **student-selected** | Yes | Info box visible |
| **saving** | Yes | Loading state |

#### AddStudentModal (3-step)
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Button hover |
| focus | Yes | Input focus |
| active | N/A | |
| selected | N/A | |
| disabled | Yes | Next/Submit validation |
| expanded | N/A | |
| collapsed | N/A | |
| open | Yes | Modal visible |
| current | Yes | Current step indicator |
| invalid | Yes | Step validation errors |
| success | Yes | Completion |
| destructive | N/A | |
| **step-1** | Yes | Basic info |
| **step-2** | Yes | Contact info |
| **step-3** | Yes | Fees |
| **saving** | Yes | Submitting |

#### DetailModal (Monitoring)
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Button hover |
| focus | Yes | Input focus (edit mode) |
| active | N/A | |
| selected | N/A | |
| disabled | Yes | Edit button (canModerate) |
| expanded | N/A | |
| collapsed | N/A | |
| open | Yes | Modal visible |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **view-mode** | Yes | Read-only |
| **edit-mode** | Yes | Editable fields |
| **saving** | Yes | Save in progress |
| **delete-confirm** | Yes | Confirm dialog overlay |

---

### Brand Components

#### ThemeModeToggle
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Option hover |
| focus | Yes | Focus ring |
| active | Yes | Selected option |
| selected | Yes | Active theme |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | Yes | Current theme |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **variant** | Yes | floating/inline/compact |

#### LanguageToggle
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | Yes | Button hover |
| focus | Yes | Focus ring |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **compact** | Yes | Icon-only mode |

#### SchoolLogo
| State | Applies | Implementation |
|-------|---------|----------------|
| hover | N/A | |
| focus | N/A | |
| active | N/A | |
| selected | N/A | |
| disabled | N/A | |
| expanded | N/A | |
| collapsed | N/A | |
| open | N/A | |
| current | N/A | |
| invalid | N/A | |
| success | N/A | |
| destructive | N/A | |
| **image** | Yes | Logo loaded |
| **fallback** | Yes | Initials displayed |
| **error** | Yes | Load failed → fallback |

---

## Screen-Level States

### Per-Page States

#### Loading State
| Screen | Visual |
|--------|--------|
| Dashboard | DashboardSkeleton |
| Students | StudentsPageSkeleton |
| Teachers | TableSkeleton |
| Payments | PaymentsPageSkeleton |
| Attendance | Spinner + "جارٍ مزامنة السجلات..." |
| All others | Generic spinner or skeleton |

#### Empty State
| Screen | Trigger | Visual |
|--------|---------|--------|
| Dashboard | No operational data | Empty panel card |
| Students | No students in tab | "لا توجد نتائج" |
| Payments | No payments | "لا توجد نتائج" |
| Expenses | No expenses | "لا توجد نتائج" |
| Reports | No data | Card empty states |
| All tables | Filter returns nothing | Empty with clear filters |

#### Error State
| Screen | Trigger | Visual |
|--------|---------|--------|
| All | API failure | Red banner |
| DataTableShell | Load failure | Error message + retry |
| Login | Auth failure | Inline error |
| Forms | Submit failure | Inline error |

#### Success State
| Screen | Trigger | Visual |
|--------|---------|--------|
| All | Action success | Green toast |
| Attendance | Save success | Green banner |
| Students | CRUD success | Toast + refresh |
| Payments | Payment recorded | Toast + refresh |

#### Filtered State
| Screen | Trigger | Visual |
|--------|---------|--------|
| Students | Tab/filter active | Filtered count, reset button |
| Payments | Quick filter | Active chip highlighted |
| Expenses | Tab switch | Tab content swap |
| Monitoring | Status filter | Badge filter active |

#### Searching State
| Screen | Trigger | Visual |
|--------|---------|--------|
| Students | Search input | Debounced loading |
| Teachers | Search input | Debounced loading |
| Payments | Search input | Debounced loading |

---

### Conditional Visibility States

#### Role-Gated Content
| Role | Visible | Hidden |
|------|---------|--------|
| super_admin | All | None |
| admin | All except Super Admin, Schools, Subscriptions | Super Admin console |
| employee | Dashboard, Students, Payments, Attendance | Admin functions, delete actions |

#### Permission-Gated Actions
| Permission | Grants |
|------------|--------|
| canAddPayments | Add payment buttons |
| canDeletePayments | Delete payments, archive |
| canManageTeacher | Edit/delete teachers |
| canModerate | Edit/delete monitoring items |
| canSendFeeNotifications | Send notification button |
| canRecordAttendance | Save attendance |

#### Subscription-Gated
| State | Behavior |
|-------|----------|
| Active subscription | Full access |
| Expired subscription | Redirect to subscription-expired |
| Inactive school | Redirect to subscription-expired |

#### Infrastructure-Gated (Super Admin)
| Flag | Tab Visibility |
|------|----------------|
| auditLogs | Audit tab |
| customRoles | Roles tab |
| softDeleteSchools | Trash tab |
| branchesEnabled | Branches tab |

---

## State Transition Reference

### Common Transitions
| From | To | Trigger | Duration |
|------|-----|---------|----------|
| default | hover | Mouse enter | 120ms |
| hover | default | Mouse leave | 120ms |
| default | focus | Keyboard/tab | instant |
| default | active | Click | instant |
| closed | open | Trigger click | 200ms |
| open | closed | Close action | 150ms |
| valid | invalid | Validation fail | instant |
| invalid | valid | Input correction | instant |
| idle | loading | Action start | instant |
| loading | success | Action complete | instant |
| loading | error | Action fail | instant |

### Modal Stack Transitions
| Sequence | Pattern |
|----------|---------|
| Page → Modal | Open overlay |
| Modal → Nested Modal | Open overlay (stacked) |
| Modal A → Modal B | Swap overlay |
| Modal → Success | Swap to success state → auto-close |
| Modal → Confirm | Open overlay (confirm on top) |

### Tab Transitions
| Pattern | Behavior |
|---------|----------|
| Tab switch | Content crossfade |
| Tab with filter reset | Data refresh + fade |
| Tab with persisted state | Instant swap |

---

## 12-State Quick Reference

| State | Definition | Common Application |
|-------|------------|-------------------|
| **hover** | Mouse over element | Buttons, links, table rows, nav items |
| **focus** | Keyboard focused | Inputs, buttons, links (accessibility) |
| **active** | Being pressed/activated | Buttons, selected tabs |
| **selected** | Chosen from group | Tabs, pagination, dropdown options |
| **disabled** | Non-interactive | Buttons, inputs (permission/validation) |
| **expanded** | Opened/showing more | Sidebar, dropdowns, accordions |
| **collapsed** | Closed/hidden | Sidebar, dropdowns |
| **open** | Visible/accessible | Modals, drawers, panels |
| **current** | Active in navigation | Current route, current page |
| **invalid** | Failed validation | Form inputs with errors |
| **success** | Completed successfully | Forms, actions, toasts |
| **destructive** | Dangerous action | Delete buttons, confirm dialogs |
