# Screen Blueprints

This file treats route-level pages as the canonical screens and folds internal tab surfaces or overlays into each blueprint so a designer can rebuild the product without reopening the code.

## Auth And System

### Login

- Route: /[locale]/login
- Roles: Public
- Purpose: Role-aware authentication screen.
- Layout anatomy: Desktop uses a two-column split: hero copy on the right, glass form card on the left in RTL. Mobile removes the hero column and stacks brand, badge, title, fields, CTA, forgot password, and footer hints.
- Primary content: Brand lockup, secure-platform pill, headline, email field, password field with eye toggle, primary submit button, forgot password link, recovery hint footer, inline theme toggle area.
- Key states: Field empty/disabled submit, password revealed, async loading, invalid credentials, inactive account, profile load failure, server config failure.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Visually confirmed live on April 8, 2026 with fresh desktop and mobile screenshots.

### Forgot Password

- Route: /[locale]/forgot-password
- Roles: Public
- Purpose: Placeholder recovery handoff.
- Layout anatomy: Single centered glass card with logo header, icon tile, title, explanatory text, return-to-login CTA, and bottom inline theme switch row.
- Primary content: Brand header, recovery icon, message card, back CTA, footer controls.
- Key states: Default only.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: No self-service reset fields yet; treat as informational screen.

### Access Denied / Subscription Expired / Error / Not Found

- Route: System states
- Roles: All
- Purpose: Catch authorization and runtime failures.
- Layout anatomy: Access denied and subscription expired are dark fullscreen gates. Locale/global errors are lighter utility panels. Not found is a minimal 404 stub.
- Primary content: Large icon, title, body copy, recovery CTA(s), digest code when available for errors.
- Key states: Default; retry for error boundaries.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: These screens are visually inconsistent with the main blue/cyan system and should be normalized during Figma rebuild.


## Launcher And Shell

### Home Launcher

- Route: /[locale]
- Roles: Super admin, admin, employee
- Purpose: Quick launcher with role-filtered cards.
- Layout anatomy: Simple header with logo and current user details over a gradient canvas, followed by a responsive card grid.
- Primary content: Cards for dashboard, schools, students, teachers, payments, expenses, attendance, reports, subscriptions, super-admin, filtered by role.
- Key states: Role-filtered content only.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Lower-fidelity than the rest of the shell; include as a legacy/secondary surface in Figma.

### Shared App Shell

- Route: Protected modules
- Roles: Authenticated roles
- Purpose: Primary layout shell for most application routes.
- Layout anatomy: Right-aligned fixed sidebar in RTL, fixed or sticky topbar, independent scroll container, glassy cards over radial-gradient canvas.
- Primary content: Grouped nav, academic year badge, school scope selector for super admin, profile menu, theme and language controls.
- Key states: Desktop, mobile drawer, active nav, hover nav, scoped school selected/unselected/invalid.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: This should be one of the first Figma templates because most screens inherit from it.


## Core Modules

### Dashboard

- Route: /[locale]/dashboard
- Roles: Super admin, admin, employee
- Purpose: Daily command center.
- Layout anatomy: Topbar + school scope banner, action row, KPI cards, finance analysis, optional branding panel for super admin, recent activity, notifications, fees table, recent payments and overdue lists.
- Primary content: StatisticsCards, FinancialAnalysisPanel, SchoolBrandingPanel, RecentActivityPanel, NotificationsPanel, ClassFeesTable, RecentPaymentsPanel, OverdueStudentsPanel, ClassesModal, FeeModal.
- Key states: School scope blocked, loading spinner, empty operational data card, super-admin branding surface visible, table hidden/visible, delete confirm inside class fee interactions.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Dashboard is visually confirmed via a local pre-existing manual screenshot; use the live login screen as style baseline because dashboard screenshot predates this audit.

### Students

- Route: /[locale]/students
- Roles: Super admin, admin, employee
- Purpose: Student registry and fee-aware management.
- Layout anatomy: Tabs for active/transferred/suspended/deleted, stats grid, toolbar with search and filters, main table, row dropdown menus, modal stack for add/edit/delete/import/account card.
- Primary content: StudentsTabs, StudentsStats, StudentsToolbar, StudentsTable, StudentDropdownMenu, AddStudentModal, EditStudentModal, DeleteConfirmModal, ImportExcelModal, AccountCardModal.
- Key states: Tab switching resets filters; success and error banners; read-only employee mode; export current vs export all; print credentials; import preview/error.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: For Figma, split this route into table baseline plus separate overlay frames for each modal.

### Teachers

- Route: /[locale]/teachers
- Roles: Super admin, admin
- Purpose: Teacher account CRUD and assignments.
- Layout anatomy: Actions row, stats row, table header strip, filters toolbar, teachers table, account card modal, teacher form modal, import modal.
- Primary content: TeachersActions, TeachersStats, TeachersFilters, TeachersTable, TeacherFormModal, TeacherImportModal, AccountCardModal.
- Key states: Status filters, import/export/template download, password reset, account card loading, pagination, success and error banners.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Users route redirects here; treat this as canonical user-management screen for school roles.

### Attendance

- Route: /[locale]/attendance
- Roles: Super admin, admin, employee
- Purpose: Daily attendance editing surface.
- Layout anatomy: Hero summary row, filter and batch actions bar, KPI strip, editable attendance table, two-week history summary.
- Primary content: Date picker, class/section/status filters, assign-all batch buttons, note inputs per row, status quick chips, history summary cards.
- Key states: Loading students, loading records for selected date, save in progress, unrecorded filter, success and error flash messages.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Visual confirmation exists from a local manual screenshot; good candidate for table-pattern template extraction.


## Finance Modules

### Payments

- Route: /[locale]/payments
- Roles: Super admin, admin, employee
- Purpose: Student billing and collection workspace.
- Layout anatomy: KPI hero, summary stats, filters card, current ledger section, students table, archive section, side/detail overlays.
- Primary content: PaymentsStats, PaymentsFilters, PaymentsToolbar, PaymentsTable, StudentDetailPanel, PaymentModal, PaymentsArchive, ArchiveDetailModal, ConfirmDialog.
- Key states: Quick filter chips, sort/dir, exporting, open student detail, add payment modal search dropdown, delete payment confirm, archive export.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Latest live authed screenshot was blocked by auth rate limiting, so layout is code-derived and cross-checked against older local manual captures.

### Expenses

- Route: /[locale]/expenses
- Roles: Super admin, admin
- Purpose: Expense invoice and type administration.
- Layout anatomy: Hero stats, actions and filters, dual-tab workspace for invoices and expense types, large tables, footer summary/pagination, add/edit forms, delete confirmation.
- Primary content: Search, type filter, from/to dates, invoice rows, type rows, expense form, type form, export to XLSX, refresh action.
- Key states: Invoices tab, types tab, loading, empty, search deferred, add/edit expense, add/edit type, delete pending.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Use two separate screen frames in Figma because the tab content is materially different.

### Salaries

- Route: /[locale]/salaries
- Roles: Super admin, admin
- Purpose: Teacher payroll system with many internal sections.
- Layout anatomy: Main app shell plus nested SalariesSidebar for section navigation. Each section occupies the main content frame with its own cards/tables/forms.
- Primary content: Main section uses QuickAccessGrid + teacher table. Other sections cover schedule, deductions, reports, calendar, archive, settings. Overlay set includes teacher modal, pay salary modal, detail panel, prices, lesson times, daily log, export, print, manager modals, archive confirmation.
- Key states: Section switching, report summary/details modes, calendar month switching, archive confirmation, modal heavy workflows, pay salary calculation modes (fixed/hourly/mixed).
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Treat as a mini-product in Figma; rebuild foundations first, then each section as a distinct template.


## Reporting And Moderation

### Reports

- Route: /[locale]/reports
- Roles: Super admin, admin
- Purpose: Data export and printable summary center.
- Layout anatomy: Top summary KPIs, detailed report cards, financial summary strip, export and print controls.
- Primary content: Students, payments, expenses, salaries dataset cards plus financial summary cards and export actions.
- Key states: Overview loading, action loading per dataset, all-datasets export, print summary, no-scope empty state.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Printable states should become separate archive frames in Figma because they diverge from app-shell layout.

### Monitoring

- Route: /[locale]/monitoring
- Roles: Super admin, admin
- Purpose: Moderate teacher activity feed.
- Layout anatomy: School scope banner, custom top control region, list of messages or homework entries, detail modal with editable fields and audit feed, confirm dialog for deletion.
- Primary content: TabKey messages/homework, search/filter stack, detail side metadata, target chips, attachment block, moderation CTA row.
- Key states: List loading, detail loading, edit mode, save pending, delete confirmation, pagination.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Because there is no shared topbar here, build a dedicated moderation template rather than reusing standard topbar exactly.

### Fee Notifications

- Route: /[locale]/fee-notifications
- Roles: Super admin, admin
- Purpose: Compose notification campaigns and review history.
- Layout anatomy: Custom composer form with target mode fields, school scope banner, history list with filters and pagination, history detail modal with recipients and audit trail.
- Primary content: Title/message/note/due/deep-link fields, target mode switch, branch/class/section/student selectors, send CTA, history cards, recipient result pills.
- Key states: Target-mode conditional fields, sending, search debounce, history modal, loading, toasts, empty history.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Local older manual screenshot for this route appears blank, so treat current visual as code-derived.


## Super Admin And Legacy Admin

### Schools and Subscriptions Legacy Pages

- Route: /[locale]/schools and /[locale]/subscriptions
- Roles: Super admin
- Purpose: Simple legacy lists for quick activation and renewal.
- Layout anatomy: Standalone layout with sidebar, title area, three KPI cards, list rows, inline action buttons.
- Primary content: Count summaries, status badges, renew buttons, activation toggles, success banners.
- Key states: Loading, empty, success message.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: Visually older than the super-admin console; keep them in an Archive/Legacy section of the Figma file.

### Super Admin Console

- Route: /[locale]/super-admin
- Roles: Super admin
- Purpose: Master control plane across tenant, users, subscriptions, audit and infrastructure.
- Layout anatomy: App shell, topbar, left-side vertical tab rail, large content pane with tab-dependent widgets, diagnostics banner, search/filter strip, modal forms and destructive dialogs.
- Primary content: Tabs for Overview, Schools, Users, Subscriptions, Audit, Roles, Trash, Notifications, Monitoring, Branches; SchoolForm, UserForm, Delete dialogs; overview charts and spotlight filters.
- Key states: Initial loading, background refresh, schema compatibility notice, unavailable-tab hiding based on infrastructure flags, active spotlight filters, create/edit/delete flows.
- Responsive and RTL notes: Arabic is the primary composition direction; mobile generally removes or collapses secondary regions, while sidebar becomes an overlay drawer.
- Dark mode notes: Uses the same structure with token swaps from `html.dark`; major differences are darker surfaces, brighter primary cyan/blue accents, and inverted text on active sidebar items.
- Figma reconstruction notes: This route alone deserves multiple Figma frames, one per tab and one per overlay.



## Additional Internal Surface Count

- Super Admin internal tabs: 10
- Salaries internal sections: 7 plus multiple overlays
- Students internal status tabs: 4
- Expenses internal tabs: 2
- Monitoring internal data tabs: 2
- Payments detail/archive overlays: 3
