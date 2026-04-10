# UX Flows

## Flow 1: Authentication

- Trigger: Public user opens login or is redirected by ProtectedRoute.
- Steps:
  1. Open `/[locale]/login`.
  2. Enter email and password.
  3. Submit credentials to `/api/auth/login`.
  4. If `next` exists and access is allowed, route there.
  5. Else route by role default: super_admin -> Super Admin, admin/employee -> Dashboard.
- Decision points:
  - Invalid credentials -> inline error on login page.
  - Inactive account -> inline error on login page.
  - Profile missing or server config issue -> inline error on login page.
  - Subscription expired or school inactive -> `/[locale]/subscription-expired`.
  - Forbidden path after login -> `/[locale]/access-denied`.
- Figma prototype suggestion: Link login button to a success branch and three error branches.

## Flow 2: Home Launcher Navigation

- Trigger: Authenticated user lands on `/[locale]` or uses launcher card.
- Steps:
  1. Render role-filtered cards.
  2. User selects a module card.
  3. Navigate to target module route.
- Decision points:
  - Role hides unavailable modules.
- Figma prototype suggestion: Cards use Navigate To actions to module frames.

## Flow 3: Dashboard Daily Review

- Trigger: Admin opens `/[locale]/dashboard`.
- Steps:
  1. Read KPI cards and finance analysis.
  2. Review notifications and recent activity.
  3. Open classes modal or fee modal from action row.
  4. Inspect recent payments and overdue students.
- Decision points:
  - No school scope for super admin -> blocked empty state.
  - No operational data -> empty dashboard panel.
- Figma prototype suggestion: Dashboard frame links to overlay modals and downstream Students/Payments.

## Flow 4: Student CRUD

- Trigger: Operator opens Students module.
- Steps:
  1. Switch status tab if needed.
  2. Search or filter by class/section.
  3. Open Add Student or Edit Student modal.
  4. Save or cancel.
  5. Optional: print or copy credentials card.
- Decision points:
  - Employee role cannot delete or fully manage.
  - Import flow opens preview/error states before commit.
- Figma prototype suggestion: Table row action menu opens overlay variants instead of separate pages.

## Flow 5: Teacher Account Management

- Trigger: Admin opens Teachers module.
- Steps:
  1. Filter/search teachers.
  2. Create or edit teacher account.
  3. Open account card, reset password, or toggle status.
  4. Import or export data.
- Decision points:
  - Import modal and account-card modal branch from same table context.
- Figma prototype suggestion: Teacher form modal and import modal should be connected as overlays.

## Flow 6: Attendance Capture

- Trigger: User opens Attendance for a selected date.
- Steps:
  1. Choose date and filters.
  2. Bulk-assign status or edit row by row.
  3. Optionally add notes.
  4. Save attendance.
  5. Review history summary for previous two weeks.
- Decision points:
  - Unrecorded-only view and missing school scope both alter the canvas.
- Figma prototype suggestion: Use interactive components for status chips and batch controls.

## Flow 7: Payment Collection

- Trigger: User opens Payments and selects a student.
- Steps:
  1. Review KPI/filters and student ledger.
  2. Open student detail panel.
  3. Add payment from detail panel or top filters card.
  4. Search/select student in modal if needed.
  5. Submit payment and optionally print receipt.
- Decision points:
  - Delete payment opens confirm dialog.
  - Archive detail opens from archive section.
- Figma prototype suggestion: Main frame -> student detail panel -> payment modal -> success state.

## Flow 8: Expense Management

- Trigger: Admin opens Expenses module.
- Steps:
  1. Switch between invoices and types tabs.
  2. Search/filter current list.
  3. Open add/edit form.
  4. Delete or export rows.
- Decision points:
  - Each tab has its own empty and loading state.
- Figma prototype suggestion: Use tab variants plus modal overlays.

## Flow 9: Salary Operations

- Trigger: Admin opens Salaries module.
- Steps:
  1. Use nested sidebar to switch section.
  2. In main section open teacher modal, pay salary modal, or detail panel.
  3. In reports section toggle summary/detail modes.
  4. In archive section confirm month archive.
  5. Use export/print/settings overlays when needed.
- Decision points:
  - Salary type changes calculation mode.
  - Some reference data loads only when section or modal opens.
- Figma prototype suggestion: Treat each section as a separate prototype starting point under one route.

## Flow 10: Super Admin Tenant Operations

- Trigger: Super admin opens Super Admin console.
- Steps:
  1. Search or switch tab.
  2. Review overview diagnostics or open Schools/Users/Subscriptions tab.
  3. Create/edit school or user in modal.
  4. Archive or toggle entities via delete/confirm dialog.
  5. Switch scoped school and jump to dashboard/students/payments with `?school=`.
- Decision points:
  - Infrastructure flags can hide some tabs.
  - Missing school scope blocks most school-bound pages outside the console.
- Figma prototype suggestion: Use a prototype hub frame with tab rail interactions and deep-links to scoped module frames.


## Flow Linking Recommendations

- Use `Navigate to` between route-level screens.
- Use `Open overlay` for modals, dialogs, drawers, and detail panels.
- Use `Swap overlay` for multi-step stacks such as Students add/edit/delete/import/account-card and Super Admin school/user forms.
- Recommended motion:
  - base navigation: Smart Animate, 200ms, Ease Out
  - modal open/close: Move in + fade, 180ms to 220ms
  - drawer/detail panel: slide from inline-start in RTL, 220ms
