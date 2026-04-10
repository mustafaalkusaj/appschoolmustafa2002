<!-- Generated: 2026-04-08 (v2) -->

# Screen Blueprints

Comprehensive documentation for all routable screens and non-routable surfaces in the School App. Each blueprint includes layout anatomy, components, states, and Figma reconstruction guidance.

---

## Auth & System Screens

### Login
- **Route**: /[locale]/login
- **Screen Type**: page
- **Role/Access**: public
- **Purpose**: Role-aware authentication with email/password credentials
- **Layout Anatomy**: 
  - Desktop: Two-column split layout (RTL: glass form card on right, hero copy on left)
  - Mobile: Stacked single column - brand, badge, title, fields, CTA, forgot password, footer
- **Sections**:
  1. Brand lockup with school logo
  2. Secure-platform pill badge
  3. Headline ("تسجيل الدخول")
  4. Email input field
  5. Password field with eye toggle
  6. Primary submit button
  7. Forgot password link
  8. Recovery hint footer
  9. Inline theme toggle area
- **Components Used**: BrandLockup, ui-input, ui-button, ThemeModeToggle, LanguageToggle
- **Forms**: Email (required, email format), Password (required, min 6 chars)
- **Key States**: 
  - default: Empty form, disabled submit
  - filled: Form valid, submit enabled
  - loading: Async authentication in progress
  - error-invalid: Invalid credentials inline error
  - error-inactive: Account inactive error
  - error-profile: Profile load failure
  - error-config: Server configuration error
- **Responsive Notes**: 
  - Desktop (1440): Full two-column with hero imagery
  - Tablet (768): Reduced hero, compact form
  - Mobile (390): Single column, hero removed
- **RTL Notes**: Arabic primary; form labels right-aligned, icons on right
- **Dark Mode Notes**: Darker surfaces (#080e1a), brighter cyan accents (#8ae7ff)
- **Figma Reconstruction Notes**: [CONFIRMED] Live screenshots captured April 8, 2026

---

### Forgot Password
- **Route**: /[locale]/forgot-password
- **Screen Type**: page
- **Role/Access**: public
- **Purpose**: Password recovery information screen (placeholder implementation)
- **Layout Anatomy**: Single centered glass card
- **Sections**:
  1. Logo header
  2. Recovery icon tile
  3. Title ("استعادة كلمة المرور")
  4. Explanatory text
  5. Return-to-login CTA
  6. Bottom inline theme switch row
- **Components Used**: BrandLockup, ui-button, ThemeModeToggle
- **Key States**: default only (no self-service reset fields yet)
- **Responsive Notes**: Centered card scales down on mobile
- **RTL Notes**: Full RTL support
- **Dark Mode Notes**: Glass card adapts to dark surfaces
- **Figma Reconstruction Notes**: [INFERRED] Treat as informational screen

---

### Access Denied
- **Route**: /[locale]/access-denied
- **Screen Type**: page
- **Role/Access**: all (error state)
- **Purpose**: Authorization failure gate screen
- **Layout Anatomy**: Dark fullscreen gate with centered content
- **Sections**:
  1. Large shield/lock icon
  2. Title ("وصول مرفوض")
  3. Body copy explaining insufficient permissions
  4. Recovery CTA (return to dashboard)
- **Components Used**: AppIcon, ui-button
- **Key States**: default, retry
- **Responsive Notes**: Centered content on all viewports
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Dark gate design
- **Figma Reconstruction Notes**: [INFERRED] Normalize with main system during rebuild

---

### Subscription Expired
- **Route**: /[locale]/subscription-expired
- **Screen Type**: page
- **Role/Access**: all (subscription gate)
- **Purpose**: Subscription expiration flow with sign-out action
- **Layout Anatomy**: Dark fullscreen gate with centered content
- **Sections**:
  1. Calendar/expired icon
  2. Title ("الاشتراك منتهي")
  3. Expiration details
  4. Contact admin message
  5. Sign out button
- **Components Used**: AppIcon, ui-button
- **Key States**: default
- **Responsive Notes**: Centered content
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Dark gate design
- **Figma Reconstruction Notes**: [INFERRED]

---

## Launcher & Shell

### Home Launcher
- **Route**: /[locale]
- **Screen Type**: page
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Quick launcher with role-filtered module cards
- **Layout Anatomy**: 
  - Simple header with logo and user details over gradient canvas
  - Responsive card grid below
- **Sections**:
  1. Header with branding and current user
  2. Module cards grid:
     - Dashboard (all roles)
     - Schools (super_admin)
     - Students (all roles)
     - Teachers (admin, super_admin)
     - Payments (all roles)
     - Expenses (admin, super_admin)
     - Attendance (all roles)
     - Reports (admin, super_admin)
     - Subscriptions (super_admin)
     - Super Admin (super_admin)
- **Components Used**: BrandLockup, Card, StatsCard
- **Key States**: Role-filtered visibility
- **Responsive Notes**: 
  - Desktop: 3-4 column grid
  - Tablet: 2 column
  - Mobile: Single column stack
- **RTL Notes**: Grid flows RTL
- **Dark Mode Notes**: Gradient canvas darkens
- **Figma Reconstruction Notes**: [INFERRED] Lower fidelity than shell; legacy/secondary surface

---

### App Shell (Layout Template)
- **Route**: Protected modules wrapper
- **Screen Type**: page template
- **Role/Access**: authenticated roles
- **Purpose**: Primary layout shell for most application routes
- **Layout Anatomy**:
  - Fixed right-aligned sidebar (RTL) - 280px width
  - Fixed/sticky topbar - 64px height
  - Independent scroll container for main content
  - Glassy cards over radial-gradient canvas
- **Sections**:
  1. AppSidebar: Grouped nav, academic year badge, school scope selector (super_admin), profile menu, theme/language controls
  2. AppShellTopbar: Title, subtitle, actions, academic year pill, ping indicator
  3. Main content area: Scrollable content region
- **Components Used**: AppSidebar, AppShellTopbar, ProfileMenu, ThemeModeToggle, LanguageToggle, PingIndicator
- **Key States**:
  - Desktop: Full sidebar visible
  - Mobile: Sidebar collapsed, toggle button visible
  - Active nav item: Gradient background
  - Hover nav item: Subtle highlight
  - Scoped school: Selected/unselected/invalid states
- **Responsive Notes**:
  - Desktop (1440): Full sidebar 280px
  - Tablet (768): Sidebar overlay/drawer mode
  - Mobile (390): Bottom sheet or drawer sidebar
- **RTL Notes**: Sidebar on right in RTL, left in LTR
- **Dark Mode Notes**: Full token swap support
- **Figma Reconstruction Notes**: [CONFIRMED] Build first - most screens inherit from this

---

## Dashboard Module

### Dashboard Main
- **Route**: /[locale]/dashboard
- **Screen Type**: page
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Daily command center with KPIs and financial overview
- **Layout Anatomy**:
  - Topbar + school scope banner
  - Action row with quick actions
  - KPI cards grid (StatisticsCards)
  - Financial analysis panel
  - Optional SchoolBrandingPanel (super_admin only)
  - Recent activity and notifications
  - Class fees table
  - Recent payments and overdue lists
- **Sections**:
  1. **Hero Stats**: 4-6 KPI cards (students, fees, payments, expenses)
  2. **Financial Analysis**: Charts and breakdown
  3. **Branding Panel**: Theme customization (super_admin)
  4. **Activity Feed**: Recent actions
  5. **Notifications**: Unread notifications list
  6. **Class Fees Table**: Editable class fee management
  7. **Recent Payments**: Latest transactions
  8. **Overdue Students**: Outstanding fees list
- **Components Used**: StatisticsCards, FinancialAnalysisPanel, SchoolBrandingPanel, RecentActivityPanel, NotificationsPanel, ClassFeesTable, RecentPaymentsPanel, OverdueStudentsPanel, ClassesModal, FeeModal
- **Tables**: ClassFeesTable - columns: Class, Section, Fee Amount, Actions
- **Stats/Metrics**:
  - Total Students
  - Total Fees
  - Total Payments
  - Total Expenses
  - Collection Rate %
  - Overdue Count
- **Modal Dependencies**: ClassesModal, FeeModal
- **Key States**:
  - Loading: Skeleton state
  - Scope blocked: Empty state when no school selected
  - No operational data: Empty dashboard panel
  - Data ready: Full content
  - Classes modal open
  - Fee modal open
- **Responsive Notes**:
  - Desktop: Full multi-column layout
  - Tablet: 2-column grids
  - Mobile: Single column, charts may hide
- **RTL Notes**: Charts adapt to RTL
- **Dark Mode Notes**: Charts use dark palette
- **Figma Reconstruction Notes**: [CONFIRMED] Local manual screenshot reference

---

### Dashboard - StatisticsCards Panel
- **Route**: Non-routable: dashboard/StatisticsCards
- **Screen Type**: conditional-section
- **Role/Access**: super_admin, admin, employee
- **Purpose**: KPI summary display
- **Layout Anatomy**: Responsive grid of stat cards
- **Sections**: 4-6 metric cards with icons and trend indicators
- **Components Used**: StatsCard
- **Stats/Metrics**:
  - Students count
  - Total fees (د.ع)
  - Total paid (د.ع)
  - Total remaining (د.ع)
  - Expenses (د.ع)
  - Collection percentage
- **Key States**: loading ("..."), ready (formatted numbers)
- **Responsive Notes**: sm:grid-cols-2, lg:grid-cols-4, xl:grid-cols-6
- **RTL Notes**: Numbers display correctly
- **Dark Mode Notes**: Cards use dark surface tokens
- **Figma Reconstruction Notes**: [INFERRED]

---

### Dashboard - FinancialAnalysisPanel
- **Route**: Non-routable: dashboard/FinancialAnalysisPanel
- **Screen Type**: conditional-section
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Financial breakdown with charts
- **Layout Anatomy**: Card with bar chart and donut chart
- **Sections**:
  1. Bar chart: Payments by time period
  2. Donut chart: Payment status distribution
  3. Collection percentage display
- **Components Used**: DashboardFinanceCharts (Recharts)
- **Stats/Metrics**: Paid percentage, remaining percentage
- **Key States**: loading, empty, data ready
- **Responsive Notes**: Charts stack on mobile
- **RTL Notes**: Recharts handles RTL
- **Dark Mode Notes**: Chart colors adapt
- **Figma Reconstruction Notes**: [INFERRED]

---

### Dashboard - NotificationsPanel
- **Route**: Non-routable: dashboard/NotificationsPanel
- **Screen Type**: conditional-section
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Recent notification feed
- **Layout Anatomy**: Scrollable list with unread indicators
- **Sections**:
  1. Panel header with refresh button
  2. Notification list items
  3. Empty state
- **Components Used**: NotificationItem
- **Key States**: loading, empty, list with unread/read items
- **Responsive Notes**: Collapses or becomes drawer on mobile
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Unread indicators use primary color
- **Figma Reconstruction Notes**: [INFERRED]

---

### Dashboard - OverdueStudentsPanel
- **Route**: Non-routable: dashboard/OverdueStudentsPanel
- **Screen Type**: conditional-section
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Outstanding fees quick view
- **Layout Anatomy**: List of students with remaining balance
- **Sections**:
  1. Panel header
  2. Student rows with name, class, remaining amount
  3. Color-coded amounts (red for overdue)
- **Components Used**: OverdueStudentRow
- **Key States**: loading, empty (no overdue), list
- **Responsive Notes**: Horizontal scroll on mobile if needed
- **RTL Notes**: Amounts align left
- **Dark Mode Notes**: Red accent maintained
- **Figma Reconstruction Notes**: [INFERRED]

---

### Dashboard - RecentActivityPanel
- **Route**: Non-routable: dashboard/RecentActivityPanel
- **Screen Type**: conditional-section
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Activity feed with type-specific icons
- **Layout Anatomy**: Timeline-style list
- **Sections**:
  1. Activity items with icons
  2. Status badges
  3. Timestamps
- **Components Used**: ActivityItem
- **Key States**: loading, empty, list
- **Responsive Notes**: Full width
- **RTL Notes**: Timeline flows RTL
- **Dark Mode Notes**: Icons adapt
- **Figma Reconstruction Notes**: [INFERRED]

---

### Dashboard - RecentPaymentsPanel
- **Route**: Non-routable: dashboard/RecentPaymentsPanel
- **Screen Type**: conditional-section
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Recent payment transactions
- **Layout Anatomy**: Transaction list
- **Sections**:
  1. Payment rows with student, amount, date
  2. Method badges
- **Components Used**: PaymentRow
- **Key States**: loading, empty, list
- **Responsive Notes**: Scrollable
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Green accents for amounts
- **Figma Reconstruction Notes**: [INFERRED]

---

### Dashboard - SchoolBrandingPanel
- **Route**: Non-routable: dashboard/SchoolBrandingPanel
- **Screen Type**: conditional-section
- **Role/Access**: super_admin only
- **Purpose**: Brand customization with color pickers and theme presets
- **Layout Anatomy**: Card with color inputs and preset grid
- **Sections**:
  1. Primary color picker
  2. Secondary color picker
  3. Theme preset selection grid (14 presets)
  4. Live preview
- **Forms**: Color inputs, preset selection
- **Key States**: default, saving, success
- **Responsive Notes**: Presets grid adapts (4 cols desktop, 2 mobile)
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Preview shows dark mode
- **Figma Reconstruction Notes**: [INFERRED]

---

## Students Module

### Students Main
- **Route**: /[locale]/students
- **Screen Type**: page
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Student registry and fee-aware management
- **Layout Anatomy**:
  - Tabs for status filtering
  - Stats grid
  - Toolbar with search and filters
  - Main table
  - Row dropdown menus
  - Modal stack
- **Sections**:
  1. **StudentsTabs**: Active, Transferred, Suspended, Deleted counts
  2. **StudentsStats**: Summary metrics
  3. **StudentsToolbar**: Search, filters, export, import, print
  4. **StudentsTable**: Responsive mobile cards + desktop table
  5. **Pagination**: ListPagination
- **Components Used**: StudentsTabs, StudentsStats, StudentsToolbar, StudentsTable, StudentDropdownMenu
- **Tables**: StudentsTable - columns: #, Name, Class/Section, Phone, Parent Phone, Status, Fees, Actions
- **Modal Dependencies**: AddStudentModal, EditStudentModal, DeleteConfirmModal, ImportExcelModal, AccountCardModal
- **Key States**:
  - Tab switching resets filters
  - Success/error banners
  - Read-only employee mode
  - Export current vs export all
  - Print credentials
  - Import preview/error
- **Responsive Notes**:
  - Desktop: Full table
  - Mobile: Card layout (.tbl-mobile-cards)
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [CONFIRMED] Split into table + overlay frames

---

### Students - Active Tab Panel
- **Route**: Non-routable: students/active
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Active students list
- **Layout Anatomy**: Filtered table view
- **Sections**: StudentsTable with active filter
- **Tables**: Active students only
- **Key States**: loading, empty, filtered
- **Responsive Notes**: Same as main
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Separate frame for tab state

---

### Students - Transferred Tab Panel
- **Route**: Non-routable: students/transferred
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Transferred students list
- **Layout Anatomy**: Filtered table view with transfer info
- **Sections**: StudentsTable with transferred filter
- **Tables**: Transferred students
- **Key States**: loading, empty, filtered
- **Responsive Notes**: Same as main
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Students - Suspended Tab Panel
- **Route**: Non-routable: students/suspended
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Suspended students list
- **Layout Anatomy**: Filtered table view
- **Sections**: StudentsTable with suspended filter
- **Tables**: Suspended students
- **Key States**: loading, empty, filtered
- **Responsive Notes**: Same as main
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Students - Deleted Tab Panel
- **Route**: Non-routable: students/deleted
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin only (employee read-only)
- **Purpose**: Soft-deleted students list
- **Layout Anatomy**: Filtered table view with restore option
- **Sections**: StudentsTable with deleted filter
- **Tables**: Deleted students
- **Key States**: loading, empty, filtered
- **Responsive Notes**: Same as main
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Students - AddStudentModal
- **Route**: Non-routable: students/modals/add
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: 3-step wizard for adding new students
- **Layout Anatomy**: Modal with step indicator
- **Sections**:
  1. Step 1: Basic Info (name, birth date, gender)
  2. Step 2: Contact Info (parent name, phones, address)
  3. Step 3: Fees (class, section, fee amount, discount)
- **Forms**:
  - Full name (required)
  - Birth date (optional)
  - Gender (optional)
  - Parent name (required)
  - Parent phone (required)
  - Student phone (optional)
  - Address (optional)
  - Class (required)
  - Section (optional)
  - Fee amount (required)
  - Discount (optional)
- **Key States**: step-1, step-2, step-3, validation-error, saving, success
- **Responsive Notes**: Full screen on mobile, centered modal on desktop
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Modal uses dark surface
- **Figma Reconstruction Notes**: [INFERRED]

---

### Students - EditStudentModal
- **Route**: Non-routable: students/modals/edit
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Edit existing student information
- **Layout Anatomy**: Single-form modal
- **Sections**: All student fields editable
- **Forms**: Same as Add but pre-filled
- **Key States**: loading, ready, saving, validation-error, success
- **Responsive Notes**: Modal sizing
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Students - DeleteConfirmModal
- **Route**: Non-routable: students/modals/delete
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Confirm student deletion
- **Layout Anatomy**: ConfirmDialog component
- **Sections**: Warning message, student name, confirm/cancel buttons
- **Key States**: default, busy (deleting)
- **Responsive Notes**: Centered
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Students - ImportExcelModal
- **Route**: Non-routable: students/modals/import
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Bulk import with preview and validation
- **Layout Anatomy**: 
  1. File upload area
  2. Preview table
  3. Validation errors
  4. Import button
- **Forms**: File upload (Excel)
- **Key States**: upload, preview, validation-error, importing, success
- **Responsive Notes**: Scrollable preview
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Students - AccountCardModal
- **Route**: Non-routable: students/modals/account-card
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Display login credentials with print/copy options
- **Layout Anatomy**: Card display with credentials
- **Sections**:
  1. Student name
  2. Username/email
  3. Password (revealed/hidden toggle)
  4. Print button
  5. Copy button
- **Key States**: password-hidden, password-revealed, printing
- **Responsive Notes**: Card format
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Print version uses light theme
- **Figma Reconstruction Notes**: [INFERRED]

---

## Teachers Module

### Teachers Main
- **Route**: /[locale]/teachers
- **Screen Type**: page
- **Role/Access**: super_admin, admin
- **Purpose**: Teacher account CRUD and assignments
- **Layout Anatomy**:
  - Actions row
  - Stats row
  - Table header strip
  - Filters toolbar
  - Teachers table
- **Sections**:
  1. **TeachersActions**: Bulk actions
  2. **TeachersStats**: Summary metrics
  3. **TeachersFilters**: Search and filters
  4. **TeachersTable**: 7-column table
- **Components Used**: TeachersActions, TeachersStats, TeachersFilters, TeachersTable
- **Tables**: TeachersTable - columns: #, User, Role, Assignments, App Data, Status, Actions
- **Modal Dependencies**: TeacherFormModal, TeacherImportModal, AccountCardModal
- **Key States**:
  - Status filters
  - Import/export/template download
  - Password reset
  - Account card loading
  - Pagination
  - Success/error banners
- **Responsive Notes**: Table horizontal scroll on mobile
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Users route redirects here

---

### Teachers - TeacherFormModal
- **Route**: Non-routable: teachers/modals/form
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Create/edit teacher account
- **Layout Anatomy**: Form modal
- **Sections**:
  1. Full name (required)
  2. Email (optional)
  3. Phone (optional)
  4. Subject (select, required)
  5. Job Title (select, required)
  6. Branch (select, optional)
  7. Salary Base (number, optional)
  8. Status (select: active/inactive, required)
- **Forms**: All fields above
- **Key States**: create, edit, saving, validation-error, success
- **Responsive Notes**: Modal sizing
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Teachers - TeacherImportModal
- **Route**: Non-routable: teachers/modals/import
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Bulk teacher import
- **Layout Anatomy**: File upload + preview
- **Forms**: Excel file upload
- **Key States**: upload, preview, importing, success
- **Responsive Notes**: Scrollable
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Teachers - AccountCardModal
- **Route**: Non-routable: teachers/modals/account-card
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Teacher credentials display
- **Layout Anatomy**: Credential card
- **Key States**: password-hidden, password-revealed, printing
- **Responsive Notes**: Card format
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Print uses light theme
- **Figma Reconstruction Notes**: [INFERRED]

---

## Users Module

### Users
- **Route**: /[locale]/users
- **Screen Type**: page (redirect)
- **Role/Access**: super_admin, admin
- **Purpose**: Redirects to /teachers
- **Layout Anatomy**: N/A - redirect only
- **Figma Reconstruction Notes**: [INFERRED] No separate frame needed

---

## Payments Module

### Payments Main
- **Route**: /[locale]/payments
- **Screen Type**: page
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Student billing and collection workspace
- **Layout Anatomy**:
  - KPI hero section
  - Summary stats
  - Filters card
  - Current ledger section
  - Students table
  - Archive section
  - Right-side StudentDetailPanel (drawer)
- **Sections**:
  1. **PaymentsStats**: 4 stat cards
  2. **PaymentsFilters**: Quick filters + advanced filters
  3. **PaymentsToolbar**: Actions
  4. **PaymentsTable**: Student ledger with payment info
  5. **PaymentsArchive**: Yearly archive management
- **Components Used**: PaymentsStats, PaymentsFilters, PaymentsToolbar, PaymentsTable, StudentDetailPanel
- **Tables**:
  - PaymentsTable: #, Student Name, Class, Phone, Total, Paid, Discount, Remaining, Actions
  - Mobile cards: Name, Class, Payment count, Balance, Actions
- **Modal Dependencies**: PaymentModal, ArchiveDetailModal, ConfirmDialog
- **Key States**:
  - Quick filter chips (all, no_invoice, collected, discounted, transferred, graduated, suspended, deleted)
  - Sort/dir toggles
  - Exporting state
  - Student detail open
  - Payment modal search dropdown
  - Delete payment confirm
  - Archive export
- **Responsive Notes**:
  - Desktop: Full table, side panel
  - Mobile: Cards, full-screen panel
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Code-derived (rate-limited screenshot)

---

### Payments - StudentDetailPanel
- **Route**: Non-routable: payments/drawer/student-detail
- **Screen Type**: drawer
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Student payment history and details
- **Layout Anatomy**: Right slide-out panel
- **Sections**:
  1. Close button
  2. Student Info Card (name, class, phone, address)
  3. Financial Summary (total, paid, discount, remaining)
  4. Progress bar (payment %)
  5. Payment transactions list
  6. Add Payment button
- **Tables**: Payment rows with amount, method, date, receipt
- **Key States**: hidden, loading, empty, ready, delete-pending
- **Responsive Notes**: Full-screen overlay on mobile
- **RTL Notes**: Slides from left in RTL
- **Dark Mode Notes**: Panel uses dark surface
- **Figma Reconstruction Notes**: [INFERRED]

---

### Payments - Archive Section
- **Route**: Non-routable: payments/archive
- **Screen Type**: conditional-section
- **Role/Access**: super_admin, admin
- **Purpose**: Yearly snapshot management
- **Layout Anatomy**: Archive cards grid
- **Sections**:
  1. Year selector
  2. Archive button
  3. Archive cards list
- **Key States**: empty, list, archiving, archive-detail-open
- **Responsive Notes**: Grid adapts
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Payments - PaymentModal
- **Route**: Non-routable: payments/modals/payment
- **Screen Type**: modal
- **Role/Access**: super_admin, admin, employee (with canAddPayments)
- **Purpose**: Record new payment
- **Layout Anatomy**: Modal with form
- **Sections**:
  1. Student search (autocomplete with dropdown)
  2. Student info box (shows after selection)
  3. Receipt date
  4. Amount
  5. Manual receipt number
  6. Auto-generated receipt number (read-only)
  7. Payment method (cash/bank_transfer/check)
  8. Notes
- **Forms**: All fields above
- **Key States**: student-search, student-selected, validation-error, saving, success
- **Responsive Notes**: Centered modal
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Payments - ArchiveDetailModal
- **Route**: Non-routable: payments/modals/archive-detail
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: View archived year details
- **Layout Anatomy**: Large modal with tables
- **Sections**:
  1. Header with year and date
  2. KPI grid (4 columns)
  3. Archived students table
  4. Archived payments table
- **Tables**: Archived students, archived payments
- **Key States**: loading, ready, exporting
- **Responsive Notes**: max-w-[1600px], scrollable
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

## Salaries Module

### Salaries Main
- **Route**: /[locale]/salaries
- **Screen Type**: page
- **Role/Access**: super_admin, admin
- **Purpose**: Teacher payroll system with nested sections
- **Layout Anatomy**:
  - App shell
  - SalariesSidebar (secondary navigation)
  - Main content area based on section
- **Sections** (via sidebar):
  1. Main - QuickAccessGrid + TeachersTable
  2. Schedule - ScheduleSection
  3. Deductions - DeductionsSection
  4. Calendar - CalendarSection
  5. Reports - ReportsSection
  6. Archive - ArchiveSection
  7. Settings - SettingsSection
- **Components Used**: SalariesSidebar, QuickAccessGrid, TeachersTable, ScheduleSection, DeductionsSection, CalendarSection, ReportsSection, ArchiveSection, SettingsSection
- **Modal Dependencies**: TeacherModal, PaySalaryModal, ExportModal, PrintModal, DailyLogModal, LessonTimesModal, PricesModal, ManagerModals
- **Key States**:
  - Section switching
  - Report summary/details modes
  - Calendar month switching
  - Archive confirmation
  - Modal heavy workflows
  - Pay salary calculation modes (fixed/hourly/mixed)
- **Responsive Notes**: Sidebar becomes overlay on mobile
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Mini-product - rebuild foundations first

---

### Salaries - Main Section
- **Route**: Non-routable: salaries/section/main
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Primary teacher payroll view
- **Layout Anatomy**: QuickAccessGrid + TeachersTable
- **Sections**:
  1. Quick access actions
  2. Teachers table with salary info
- **Tables**: TeachersTable with salary columns
- **Key States**: loading, ready
- **Responsive Notes**: Grid adapts
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - Schedule Section
- **Route**: Non-routable: salaries/section/schedule
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Lesson times management
- **Layout Anatomy**: Schedule management interface
- **Sections**: Schedule grid/calendar
- **Key States**: loading, ready, editing
- **Responsive Notes**: Scrollable
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - Deductions Section
- **Route**: Non-routable: salaries/section/deductions
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Salary deductions management
- **Layout Anatomy**: Deductions list/form
- **Key States**: loading, ready, adding, editing
- **Responsive Notes**: Form + list layout
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - Calendar Section
- **Route**: Non-routable: salaries/section/calendar
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Payroll calendar view
- **Layout Anatomy**: Calendar with payroll events
- **Key States**: month-switching, loading, ready
- **Responsive Notes**: Calendar grid
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - Reports Section
- **Route**: Non-routable: salaries/section/reports
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Salary reports with two views
- **Layout Anatomy**: Toggle between summary and details
- **Sections**:
  1. Summary view
  2. Details view
- **Key States**: summary-mode, details-mode, loading
- **Responsive Notes**: Table layouts
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - Archive Section
- **Route**: Non-routable: salaries/section/archive
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Monthly archiving
- **Layout Anatomy**: Archive management
- **Key States**: loading, ready, confirming-archive
- **Responsive Notes**: List layout
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - Settings Section
- **Route**: Non-routable: salaries/section/settings
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Payroll settings
- **Layout Anatomy**: Settings form
- **Key States**: loading, ready, saving
- **Responsive Notes**: Form layout
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - TeacherModal
- **Route**: Non-routable: salaries/modals/teacher
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Create/edit teacher
- **Layout Anatomy**: Form modal
- **Forms**: Same as Teachers module
- **Key States**: create, edit, saving
- **Responsive Notes**: Modal sizing
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - PaySalaryModal
- **Route**: Non-routable: salaries/modals/pay-salary
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Process salary payment
- **Layout Anatomy**: Form with calculation modes
- **Forms**:
  - Teacher display
  - Month picker
  - Gross salary
  - Deductions
  - Net salary (calculated)
  - Payment date
  - Notes
- **Key States**: fixed-mode, hourly-mode, mixed-mode, saving
- **Responsive Notes**: Modal sizing
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - ExportModal
- **Route**: Non-routable: salaries/modals/export
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Export salary data
- **Layout Anatomy**: Export options form
- **Forms**:
  - Format (XLSX/CSV/PDF)
  - Date range
  - Include options checkboxes
- **Key States**: default, exporting
- **Responsive Notes**: Modal sizing
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - PrintModal
- **Route**: Non-routable: salaries/modals/print
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Printable salary summary
- **Layout Anatomy**: Print preview
- **Key States**: preview, printing
- **Responsive Notes**: Print-optimized
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Print uses light theme
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - DailyLogModal
- **Route**: Non-routable: salaries/modals/daily-log
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Daily attendance/status log
- **Layout Anatomy**: Date picker + entries grid
- **Forms**: Date, teacher entries
- **Key States**: loading, ready, saving
- **Responsive Notes**: Scrollable
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - LessonTimesModal
- **Route**: Non-routable: salaries/modals/lesson-times
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Configure lesson times
- **Layout Anatomy**: Time configuration form
- **Key States**: loading, ready, saving
- **Responsive Notes**: Form layout
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Salaries - PricesModal
- **Route**: Non-routable: salaries/modals/prices
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: Configure pricing
- **Layout Anatomy**: Pricing form
- **Key States**: loading, ready, saving
- **Responsive Notes**: Form layout
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

## Expenses Module

### Expenses Main
- **Route**: /[locale]/expenses
- **Screen Type**: page
- **Role/Access**: super_admin, admin
- **Purpose**: Expense invoice and type administration
- **Layout Anatomy**:
  - Hero stats
  - Actions and filters
  - Dual-tab workspace
  - Tables
  - Footer summary/pagination
- **Sections**:
  1. **Hero Stats**: 4 cards (Total, Today, Types count, Monthly)
  2. **Tab Switcher**: Invoices | Types
  3. **Filters**: Search, type, date range
  4. **Table**: ExpensesTable or TypesTable
  5. **Footer**: Summary + pagination
- **Components Used**: ExpensesStats, ExpensesFilters, ExpensesTable, TypesTable
- **Tables**:
  - ExpensesTable: #, Recipient, Type, Amount, Date, Receipt, Actions
  - TypesTable: #, Type Name, Usage Count, Total Used, Notes, Actions
- **Modal Dependencies**: ExpenseForm, ExpenseTypeForm, ConfirmDialog
- **Key States**:
  - Invoices tab
  - Types tab
  - Loading
  - Empty
  - Search deferred
  - Add/edit expense
  - Add/edit type
  - Delete pending
- **Responsive Notes**: Tables scroll horizontally on mobile
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Two separate frames for tabs

---

### Expenses - Invoices Tab Panel
- **Route**: Non-routable: expenses/tab/invoices
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Expense records management
- **Layout Anatomy**: Filtered table of expenses
- **Tables**: ExpensesTable
- **Forms**: ExpenseForm (Add/Edit)
  - Expense Type (select)
  - Amount (number, required)
  - Expense Date (date, default today)
  - Recipient (text)
  - Receipt Number (text)
  - Notes (textarea)
- **Key States**: list, add-form, edit-form, delete-confirm
- **Responsive Notes**: Table scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Expenses - Types Tab Panel
- **Route**: Non-routable: expenses/tab/types
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Expense category management
- **Layout Anatomy**: Types table
- **Tables**: TypesTable
- **Forms**: ExpenseTypeForm (Add/Edit)
  - Type Name (text, required)
  - Notes (textarea)
- **Key States**: list, add-form, edit-form, delete-confirm
- **Responsive Notes**: Table scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

## Reports Module

### Reports
- **Route**: /[locale]/reports
- **Screen Type**: page
- **Role/Access**: super_admin, admin
- **Purpose**: Data export and printable summary center
- **Layout Anatomy**:
  - Top summary KPIs
  - Detailed report cards
  - Financial summary strip
  - Export and print controls
- **Sections**:
  1. **Overview KPIs**: 6-8 hero cards
  2. **Report Cards Grid**: Students, Payments, Expenses, Salaries
  3. **Financial Summary**: Income vs Expenses vs Net
  4. **Export Controls**: Export All, Print Summary
- **Components Used**: StatsCard, ReportCard
- **Stats/Metrics**:
  - Students Count (active/total)
  - Total Fees (د.ع)
  - Payments Volume (د.ع)
  - Expenses Volume (د.ع)
  - Salaries Total (د.ع)
  - Net Balance (د.ع)
- **Key States**:
  - Overview loading
  - Action loading per dataset
  - All-datasets export
  - Print summary
  - No-scope empty state
- **Responsive Notes**: Cards grid 2-col md, 1-col sm
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Printable states separate frames

---

## Monitoring Module

### Monitoring Main
- **Route**: /[locale]/monitoring
- **Screen Type**: page
- **Role/Access**: super_admin, admin (with view_teacher_activity)
- **Purpose**: Moderate teacher messages and homework
- **Layout Anatomy**:
  - Custom header (no AppShellTopbar)
  - School scope banner
  - Tab switcher
  - Filter controls
  - Data table
  - Pagination
- **Sections**:
  1. **Hero Summary**: 4 cards (Messages, Homework, Teachers, Branches)
  2. **Tab Switcher**: Messages | Homework
  3. **Filters**: Search, branch, teacher, class, section, status
  4. **Table**: Messages or Homework items
  5. **Pagination**: Standard
- **Components Used**: MonitoringStats, MonitoringFilters, MonitoringTable
- **Tables**:
  - Columns: Title, Teacher, Branch, Target/Class, Status, Date, Detail button
  - Status badges: active (green), edited_by_admin (amber), deleted_by_admin (red)
- **Modal Dependencies**: DetailModal, ConfirmDialog
- **Key States**:
  - Messages tab
  - Homework tab
  - List loading
  - Detail loading
  - Edit mode
  - Save pending
  - Delete confirmation
- **Responsive Notes**: Sidebar below main content on lg
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Dedicated moderation template

---

### Monitoring - Messages Tab Panel
- **Route**: Non-routable: monitoring/tab/messages
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Teacher messages moderation
- **Layout Anatomy**: Messages list
- **Tables**: Messages list
- **Key States**: loading, list, detail-open, edit-mode
- **Responsive Notes**: Table adapts
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Monitoring - Homework Tab Panel
- **Route**: Non-routable: monitoring/tab/homework
- **Screen Type**: tab-panel
- **Role/Access**: super_admin, admin
- **Purpose**: Homework moderation
- **Layout Anatomy**: Homework list
- **Tables**: Homework list
- **Key States**: loading, list, detail-open, edit-mode
- **Responsive Notes**: Table adapts
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Monitoring - DetailModal
- **Route**: Non-routable: monitoring/modals/detail
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: View and edit message/homework details
- **Layout Anatomy**: 2-column (content | audit sidebar)
- **Sections**:
  1. Header with title and teacher info
  2. Status and last updated cards
  3. Editable fields (title, link/subject, message, due date)
  4. Targeting info
  5. Audit trail sidebar
- **Forms**: Editable fields when in edit mode
- **Key States**: view-mode, edit-mode, saving, delete-confirm
- **Responsive Notes**: Full viewport on mobile
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

## Attendance Module

### Attendance
- **Route**: /[locale]/attendance
- **Screen Type**: page
- **Role/Access**: super_admin, admin, employee
- **Purpose**: Daily attendance recording
- **Layout Anatomy**:
  - Hero with date selector and save button
  - Alerts (success/error)
  - SchoolScopeBanner
  - Filters section
  - Bulk status controls
  - Stats cards
  - Main attendance table
  - History section
- **Sections**:
  1. **Date & Save**: Date picker, save button (disabled if no changes), reset
  2. **Filters**: Date, class, section, status, search
  3. **Bulk Actions**: Assign all present/absent/late/excused
  4. **Stats Grid**: 6 metrics (displayed, present, absent, late, excused, rate %)
  5. **Attendance Table**: Spreadsheet-like grid
  6. **History**: 14-day summary
- **Components Used**: AttendanceFilters, AttendanceTable, AttendanceStats
- **Tables**: Attendance grid - columns: Student, Class/Section, Status buttons, Notes, Last Updated
- **Forms**: Status selection (4 buttons per row), Notes input
- **Stats/Metrics**:
  - Displayed count
  - Present (green)
  - Absent (red)
  - Late (amber)
  - Excused (blue)
  - Attendance rate %
- **Key States**:
  - Loading students
  - Loading records for date
  - Save in progress
  - Unrecorded filter
  - Success/error flash messages
- **Responsive Notes**:
  - Desktop: Full spreadsheet table
  - Mobile: Card layout with status buttons
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [CONFIRMED] Local manual screenshot reference

---

## Fee Notifications Module

### Fee Notifications
- **Route**: /[locale]/fee-notifications
- **Screen Type**: page
- **Role/Access**: super_admin, admin (with view/send permissions)
- **Purpose**: Compose notification campaigns and review history
- **Layout Anatomy**:
  - Hero summary cards
  - 2-column grid: History (left) | Composer (right)
- **Sections**:
  1. **Hero Stats**: 4 cards (History count, Selected students, Branches, Classes)
  2. **History Table**: Title, target mode, sent/failed counts, date
  3. **Composer Form**: Title, message, target mode, selectors, due date, deep link, note
  4. **Student Selection**: Checkbox grid (when specific_students mode)
- **Components Used**: FeeNotificationStats, HistoryTable, ComposerForm
- **Tables**: History - columns: Title, Target, Sent, Failed, Date, Detail
- **Forms**:
  - Title (text)
  - Message (textarea)
  - Target Mode (select: all_students, school, branch, class_section, specific_students)
  - Branch (conditional)
  - Class (conditional)
  - Section (conditional)
  - Due Date (datetime)
  - Deep Link (text)
  - Note (text)
- **Modal Dependencies**: HistoryModal
- **Key States**:
  - Target-mode conditional fields
  - Sending
  - Search debounce
  - History modal open
  - Loading
  - Empty history
- **Responsive Notes**: 2-col xl, stacks vertically below
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Code-derived

---

### Fee Notifications - HistoryModal
- **Route**: Non-routable: fee-notifications/modals/history
- **Screen Type**: modal
- **Role/Access**: super_admin, admin
- **Purpose**: View notification details and recipients
- **Layout Anatomy**: 2-column (sidebar | main)
- **Sections**:
  1. Header with title and message
  2. Left sidebar: Targeting mode, created by, created at, stats
  3. Main: Recipients list with status badges
  4. Audit trail
- **Key States**: loading, ready
- **Responsive Notes**: Full viewport on mobile
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

## Schools Module

### Schools Legacy
- **Route**: /[locale]/schools
- **Screen Type**: page (redirects to /app/schools)
- **Role/Access**: super_admin
- **Purpose**: Simple legacy school list
- **Layout Anatomy**: Standalone layout with sidebar, title, KPI cards, list rows
- **Sections**:
  1. Title area
  2. Three KPI cards
  3. Schools list
  4. Inline action buttons
- **Key States**: Loading, empty, success message
- **Responsive Notes**: List scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Legacy styling - archive in Figma

---

## Subscriptions Module

### Subscriptions Legacy
- **Route**: /[locale]/subscriptions
- **Screen Type**: page (redirects to /app/subscriptions)
- **Role/Access**: super_admin
- **Purpose**: Simple legacy subscription list
- **Layout Anatomy**: Similar to Schools
- **Key States**: Loading, empty
- **Responsive Notes**: List layout
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Legacy - archive in Figma

---

## Super Admin Module

### Super Admin Console
- **Route**: /[locale]/super-admin
- **Screen Type**: page
- **Role/Access**: super_admin only
- **Purpose**: Master control plane for tenant management
- **Layout Anatomy**:
  - App shell
  - Topbar
  - Left-side vertical tab rail
  - Large content pane
  - Diagnostics banner
  - Search/filter strip
- **Sections** (10 tabs):
  1. **Overview**: System diagnostics, summary KPIs, infrastructure status
  2. **Schools**: List, create, edit, delete schools
  3. **Users**: List, create, edit, delete admins/staff
  4. **Subscriptions**: List, manage, view plan details
  5. **Audit**: Audit log viewer (conditional)
  6. **Roles**: Custom roles editor (conditional)
  7. **Trash**: Soft-deleted items recovery (conditional)
  8. **Notifications**: System notifications (conditional)
  9. **Monitoring**: System activity monitor (conditional)
  10. **Branches**: Branch management (conditional)
- **Components Used**: SuperAdminTabs, OverviewTab, SchoolsTab, UsersTab, SubscriptionsTab, AuditLogTab, RolesTab, TrashTab, NotificationsTab, MonitoringTab, BranchesTab
- **Modal Dependencies**: SchoolForm, UserForm, DeleteSchoolDialog, DeleteUserDialog
- **Key States**:
  - Initial loading
  - Background refresh
  - Schema compatibility notice
  - Unavailable-tab hiding (infrastructure flags)
  - Active spotlight filters
  - Create/edit/delete flows
- **Responsive Notes**: Tab rail horizontal scroll on mobile
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED] Multiple frames needed - one per tab

---

### Super Admin - Overview Tab Panel
- **Route**: Non-routable: super-admin/tab/overview
- **Screen Type**: tab-panel
- **Role/Access**: super_admin
- **Purpose**: System diagnostics and summary
- **Layout Anatomy**: Diagnostics grid with KPIs
- **Sections**:
  1. Infrastructure status
  2. Diagnostics grid (schools count, users by role, subscriptions by plan, system health)
- **Stats/Metrics**: Schools, Users, Subscriptions, System health
- **Key States**: loading, ready
- **Responsive Notes**: Grid adapts
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Schools Tab Panel
- **Route**: Non-routable: super-admin/tab/schools
- **Screen Type**: tab-panel
- **Role/Access**: super_admin
- **Purpose**: School management
- **Layout Anatomy**: Search + filter + list
- **Sections**:
  1. Spotlight search
  2. Filter buttons
  3. Schools list/table
- **Tables**: Schools - columns: Name, Plan, Status, Created, Actions
- **Modal Dependencies**: SchoolForm, DeleteSchoolDialog
- **Key States**: loading, list, create-modal, edit-modal, delete-confirm
- **Responsive Notes**: Table scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Users Tab Panel
- **Route**: Non-routable: super-admin/tab/users
- **Screen Type**: tab-panel
- **Role/Access**: super_admin
- **Purpose**: User management
- **Layout Anatomy**: Search + filter + list
- **Sections**:
  1. Search/filter
  2. Users list/table
- **Tables**: Users - columns: Name, Email, Role, Status, Last Login, Actions
- **Modal Dependencies**: UserForm, DeleteUserDialog
- **Key States**: loading, list, create-modal, edit-modal, delete-confirm
- **Responsive Notes**: Table scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Subscriptions Tab Panel
- **Route**: Non-routable: super-admin/tab/subscriptions
- **Screen Type**: tab-panel
- **Role/Access**: super_admin
- **Purpose**: Subscription management
- **Layout Anatomy**: List with plan badges
- **Tables**: Subscriptions - columns: School, Plan, Expiry, Auto-renew, Actions
- **Key States**: loading, list, renew-modal
- **Responsive Notes**: Table scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Audit Tab Panel
- **Route**: Non-routable: super-admin/tab/audit
- **Screen Type**: tab-panel
- **Role/Access**: super_admin (conditional on infrastructure)
- **Purpose**: Audit log viewer
- **Layout Anatomy**: Filters + audit table
- **Tables**: Audit - columns: Actor, Action, Resource, Timestamp, Details
- **Key States**: loading, empty, list
- **Responsive Notes**: Table scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Roles Tab Panel
- **Route**: Non-routable: super-admin/tab/roles
- **Screen Type**: tab-panel
- **Role/Access**: super_admin (conditional on infrastructure)
- **Purpose**: Custom roles editor
- **Layout Anatomy**: Roles list + permission matrix
- **Key States**: loading, list, create-modal, edit-modal
- **Responsive Notes**: Permission grid scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Trash Tab Panel
- **Route**: Non-routable: super-admin/tab/trash
- **Screen Type**: tab-panel
- **Role/Access**: super_admin (conditional on infrastructure)
- **Purpose**: Soft-deleted items recovery
- **Layout Anatomy**: Deleted items list
- **Key States**: loading, empty, list, restore-confirm, delete-permanent-confirm
- **Responsive Notes**: List layout
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Notifications Tab Panel
- **Route**: Non-routable: super-admin/tab/notifications
- **Screen Type**: tab-panel
- **Role/Access**: super_admin (conditional on infrastructure)
- **Purpose**: System notifications
- **Layout Anatomy**: Notification list
- **Key States**: loading, list, detail-view
- **Responsive Notes**: List layout
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Monitoring Tab Panel
- **Route**: Non-routable: super-admin/tab/monitoring
- **Screen Type**: tab-panel
- **Role/Access**: super_admin (conditional on infrastructure)
- **Purpose**: System activity monitor
- **Layout Anatomy**: Metrics dashboard
- **Key States**: loading, ready
- **Responsive Notes**: Metrics grid
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - Branches Tab Panel
- **Route**: Non-routable: super-admin/tab/branches
- **Screen Type**: tab-panel
- **Role/Access**: super_admin (conditional on infrastructure)
- **Purpose**: Branch management
- **Layout Anatomy**: Branches list + form
- **Tables**: Branches - columns: Name, School, Status, Actions
- **Key States**: loading, list, create-modal, edit-modal
- **Responsive Notes**: Table scrolls
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - SchoolForm
- **Route**: Non-routable: super-admin/forms/school
- **Screen Type**: modal
- **Role/Access**: super_admin
- **Purpose**: Create/edit school
- **Layout Anatomy**: Form modal
- **Forms**:
  - Name (required)
  - Email (required)
  - Phone
  - Address
  - Logo upload
  - Plan selector
  - Primary color
  - Secondary color
  - Status (active/inactive)
- **Key States**: create, edit, saving, validation-error
- **Responsive Notes**: Modal sizing
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - UserForm
- **Route**: Non-routable: super-admin/forms/user
- **Screen Type**: modal
- **Role/Access**: super_admin
- **Purpose**: Create/edit user
- **Layout Anatomy**: Form modal
- **Forms**:
  - Full name (required)
  - Email (required)
  - Phone
  - Role (select)
  - Permissions (multi-select if custom role)
  - Status
- **Key States**: create, edit, saving, validation-error
- **Responsive Notes**: Modal sizing
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

### Super Admin - DeleteConfirmDialog
- **Route**: Non-routable: super-admin/dialogs/delete
- **Screen Type**: modal
- **Role/Access**: super_admin
- **Purpose**: Confirm school/user deletion
- **Layout Anatomy**: ConfirmDialog
- **Key States**: default, busy
- **Responsive Notes**: Centered
- **RTL Notes**: Full RTL
- **Dark Mode Notes**: Full support
- **Figma Reconstruction Notes**: [INFERRED]

---

## Summary: Screen Count

| Category | Count |
|----------|-------|
| Auth & System | 4 |
| Launcher & Shell | 2 |
| Dashboard | 7 |
| Students | 9 |
| Teachers | 4 |
| Users | 1 |
| Payments | 5 |
| Salaries | 13 |
| Expenses | 3 |
| Reports | 1 |
| Monitoring | 4 |
| Attendance | 1 |
| Fee Notifications | 2 |
| Schools | 1 |
| Subscriptions | 1 |
| Super Admin | 15 |
| **TOTAL** | **73** |
