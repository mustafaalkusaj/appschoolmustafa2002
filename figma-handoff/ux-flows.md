<!-- Generated: 2026-04-08 (v2) -->

# UX Flows

Comprehensive documentation of all major user journeys across the School App, including triggers, steps, decision points, alternate states, and Figma prototype linking recommendations.

---

## Flow 1: Authentication Flow

**Trigger**: Public user opens login page or is redirected by ProtectedRoute.

### Steps
1. User opens `/[locale]/login`
2. Enters email address in email field
3. Enters password in password field (with optional reveal toggle)
4. Clicks submit button or presses Enter
5. Credentials submitted to `/api/auth/login`
6. On success: redirect based on role
   - If `next` param exists and access allowed → route there
   - Else super_admin → Super Admin console
   - Else admin/employee → Dashboard

### Decision Points
| Condition | Branch |
|-----------|--------|
| Invalid credentials | Inline error on login page: "بيانات الدخول غير صحيحة" |
| Inactive account | Inline error: "الحساب غير نشط" |
| Profile missing | Inline error: "تعذر تحميل الملف الشخصي" |
| Server config issue | Inline error: "خطأ في إعدادات الخادم" |
| Subscription expired | Redirect to `/[locale]/subscription-expired` |
| School inactive | Redirect to `/[locale]/subscription-expired` |
| Forbidden path after login | Redirect to `/[locale]/access-denied` |

### Alternate/Error States
- **Rate limited**: Too many attempts, temporary lockout
- **Network error**: Connection failure message
- **Session expired**: Silent redirect to login with `next` param

### Screens Involved
- Login (screen-blueprints: "Login")
- Subscription Expired (screen-blueprints: "Subscription Expired")
- Access Denied (screen-blueprints: "Access Denied")

### Figma Prototype Linking
- **Navigate to**: Login submit button → Dashboard (success branch)
- **Navigate to**: Login submit button → Subscription Expired (expired branch)
- **Navigate to**: Login submit button → Access Denied (forbidden branch)
- **Open overlay**: Error states as toast/inline messages
- **Motion**: Form shake on error (300ms), fade transition on navigation (200ms)

---

## Flow 2: Forgot Password Flow

**Trigger**: User clicks "نسيت كلمة المرور" on login page.

### Steps
1. User clicks forgot password link
2. Navigate to `/[locale]/forgot-password`
3. Display informational screen (placeholder - no self-service yet)
4. User clicks "العودة لتسجيل الدخول"
5. Return to login page

### Decision Points
| Condition | Branch |
|-----------|--------|
| User clicks back | Return to login |

### Screens Involved
- Login (screen-blueprints: "Login")
- Forgot Password (screen-blueprints: "Forgot Password")

### Figma Prototype Linking
- **Navigate to**: Forgot password link → Forgot Password screen
- **Navigate to**: Back button → Login screen
- **Motion**: Slide transition (200ms Ease Out)

---

## Flow 3: Home Launcher Navigation

**Trigger**: Authenticated user lands on `/[locale]` or uses launcher card.

### Steps
1. System renders role-filtered module cards
2. User scans available modules
3. User selects a module card
4. Navigate to target module route

### Decision Points
| Condition | Branch |
|-----------|--------|
| Role = super_admin | Show all cards including Schools, Subscriptions, Super Admin |
| Role = admin | Hide Schools, Subscriptions, Super Admin |
| Role = employee | Further restrict to Dashboard, Students, Payments, Attendance only |

### Screens Involved
- Home Launcher (screen-blueprints: "Home Launcher")
- Target module screens

### Figma Prototype Linking
- **Navigate to**: Each card → Corresponding module frame
- **Motion**: Card scale on hover (1.02), navigate on click (200ms)

---

## Flow 4: Dashboard Daily Review

**Trigger**: Admin opens `/[locale]/dashboard`.

### Steps
1. Load dashboard data (KPIs, finance, activity, notifications)
2. Display StatisticsCards grid
3. User reviews FinancialAnalysisPanel (charts)
4. User may open ClassesModal or FeeModal from action row
5. User inspects RecentPaymentsPanel and OverdueStudentsPanel
6. Super_admin sees SchoolBrandingPanel for customization

### Decision Points
| Condition | Branch |
|-----------|--------|
| No school scope (super_admin) | Show blocked empty state |
| No operational data | Show empty dashboard panel |
| User clicks "إدارة الصفوف" | Open ClassesModal overlay |
| User clicks "إضافة رسوم" | Open FeeModal overlay |
| User changes theme preset | Apply runtime branding refresh |

### Screens Involved
- Dashboard Main (screen-blueprints: "Dashboard Main")
- Dashboard - StatisticsCards Panel
- Dashboard - FinancialAnalysisPanel
- Dashboard - SchoolBrandingPanel (super_admin)
- Dashboard - ClassesModal
- Dashboard - FeeModal

### Figma Prototype Linking
- **Open overlay**: Classes button → ClassesModal
- **Open overlay**: Add fee button → FeeModal
- **Swap overlay**: ClassesModal ↔ FeeModal (if linked actions)
- **Navigate to**: Table row actions → Students/Payments modules
- **Motion**: Modal slide up + fade (220ms), backdrop blur

---

## Flow 5: Student CRUD Flow

**Trigger**: Operator opens Students module.

### Steps
1. Load Students page with default Active tab
2. Display StudentsTabs with counts per status
3. User may switch tab (Active → Transferred → Suspended → Deleted)
4. User searches or filters by class/section
5. User clicks "إضافة طالب" → Open AddStudentModal (3-step wizard)
   - Step 1: Basic Info
   - Step 2: Contact Info
   - Step 3: Fees
6. Or user clicks edit on row → Open EditStudentModal
7. Or user clicks delete → Open DeleteConfirmModal
8. Or user clicks import → Open ImportExcelModal
9. Or user clicks account card → Open AccountCardModal

### Decision Points
| Condition | Branch |
|-----------|--------|
| Tab switch | Reset filters, load new dataset |
| Role = employee | Disable delete, restrict edit permissions |
| Import file selected | Show preview with validation errors |
| Validation passes | Enable import commit button |
| Validation fails | Show errors, disable commit |
| Delete confirmed | Remove row with success toast |

### Screens Involved
- Students Main (screen-blueprints: "Students Main")
- Students - Active Tab Panel
- Students - Transferred Tab Panel
- Students - Suspended Tab Panel
- Students - Deleted Tab Panel
- Students - AddStudentModal
- Students - EditStudentModal
- Students - DeleteConfirmModal
- Students - ImportExcelModal
- Students - AccountCardModal

### Figma Prototype Linking
- **Swap overlay**: Tab switching (maintain context)
- **Open overlay**: Add button → AddStudentModal (Step 1)
- **Swap overlay**: AddStudentModal Step 1 → Step 2 → Step 3
- **Open overlay**: Edit action → EditStudentModal
- **Open overlay**: Delete action → DeleteConfirmModal
- **Open overlay**: Import button → ImportExcelModal
- **Open overlay**: Account card action → AccountCardModal
- **Close overlay**: Success → Return to table with refresh
- **Motion**: Step transitions (200ms), modal fade (180ms)

---

## Flow 6: Teacher Management Flow

**Trigger**: Admin opens Teachers module.

### Steps
1. Load Teachers page
2. Display TeachersStats and TeachersFilters
3. User filters/search teachers
4. User clicks "إضافة أستاذ" → Open TeacherFormModal (create)
5. Or user clicks edit → Open TeacherFormModal (edit)
6. Or user clicks account card → Open AccountCardModal
7. Or user clicks import → Open TeacherImportModal
8. Or user clicks reset password → Confirm then success

### Decision Points
| Condition | Branch |
|-----------|--------|
| Form validation fails | Show inline errors |
| Email exists | Show duplicate error |
| Import preview ready | Show validation state |

### Screens Involved
- Teachers Main (screen-blueprints: "Teachers Main")
- Teachers - TeacherFormModal
- Teachers - TeacherImportModal
- Teachers - AccountCardModal

### Figma Prototype Linking
- **Open overlay**: Add/Edit → TeacherFormModal
- **Open overlay**: Import → TeacherImportModal
- **Open overlay**: Account card → AccountCardModal
- **Motion**: Standard modal transitions

---

## Flow 7: Attendance Recording Flow

**Trigger**: User opens Attendance for selected date.

### Steps
1. Load Attendance page with today's date
2. Display date picker and save button (disabled)
3. User may change date
4. User applies filters (class, section, status)
5. User bulk-assigns status via top buttons (all present/absent/late/excused)
6. Or user edits row-by-row with status buttons
7. User adds notes per row
8. Changes enable save button
9. User clicks save → Show loading → Success banner
10. History section shows 14-day summary

### Decision Points
| Condition | Branch |
|-----------|--------|
| No changes made | Save button disabled |
| Changes pending | Save button enabled with count |
| Unrecorded-only filter | Hide recorded students |
| No school scope | Blocked empty state |
| Save success | Green banner, history updates |
| Save error | Red banner, keep changes |

### Screens Involved
- Attendance (screen-blueprints: "Attendance")

### Figma Prototype Linking
- **Interactive component**: Status buttons (4 states: unselected → selected)
- **State change**: Save button disabled → enabled on change
- **Open overlay**: None (single-page flow)
- **Motion**: Row highlight on change, banner slide down (300ms)

---

## Flow 8: Payment Collection Flow

**Trigger**: User opens Payments and selects a student.

### Steps
1. Load Payments page with KPI hero
2. Display PaymentsStats and PaymentsFilters
3. User applies quick filters or advanced filters
4. User clicks student row → Open StudentDetailPanel (drawer)
5. Panel shows student info, financial summary, payment history
6. User clicks "إضافة دفعة" → Open PaymentModal
7. Or user clicks pay from top filters → Open PaymentModal with student search
8. In PaymentModal: Search/select student, fill amount, date, method
9. Submit → Success → Panel refreshes
10. User may print receipt from payment row
11. User may delete payment → ConfirmDialog → Refresh

### Decision Points
| Condition | Branch |
|-----------|--------|
| canAddPayments = false | Hide add buttons |
| canDeletePayments = false | Hide delete buttons |
| Student selected in modal | Show student info box |
| Amount > remaining | Validation warning |
| Delete confirmed | Remove payment, update totals |

### Screens Involved
- Payments Main (screen-blueprints: "Payments Main")
- Payments - StudentDetailPanel
- Payments - PaymentModal
- Payments - Archive Section
- Payments - ArchiveDetailModal

### Figma Prototype Linking
- **Open overlay**: Student row click → StudentDetailPanel (slide from right in LTR, left in RTL)
- **Open overlay**: Add payment → PaymentModal
- **Swap overlay**: PaymentModal → Success state → Close
- **Open overlay**: Archive card → ArchiveDetailModal
- **Motion**: Drawer slide (220ms), modal fade (180ms)

---

## Flow 9: Expense Management Flow

**Trigger**: Admin opens Expenses module.

### Steps
1. Load Expenses page with hero stats
2. Default to Invoices tab
3. User switches to Types tab if needed
4. User searches/filters current list
5. User clicks "إضافة مصروف" → Open ExpenseForm
6. Or user clicks edit → Open ExpenseForm (pre-filled)
7. Or user clicks delete → ConfirmDialog
8. Or user clicks export → Download XLSX

### Decision Points
| Condition | Branch |
|-----------|--------|
| Invoices tab | Show expense records table |
| Types tab | Show expense categories table |
| Type has usage | Warn on delete |

### Screens Involved
- Expenses Main (screen-blueprints: "Expenses Main")
- Expenses - Invoices Tab Panel
- Expenses - Types Tab Panel

### Figma Prototype Linking
- **Swap overlay**: Tab switch (Invoices ↔ Types)
- **Open overlay**: Add/Edit → ExpenseForm or ExpenseTypeForm
- **Open overlay**: Delete → ConfirmDialog
- **Motion**: Tab content crossfade (150ms)

---

## Flow 10: Salary Operations Flow

**Trigger**: Admin opens Salaries module.

### Steps
1. Load Salaries page with nested sidebar
2. Default to Main section
3. User switches section via sidebar:
   - Main: QuickAccessGrid + TeachersTable
   - Schedule: Lesson times management
   - Deductions: Deductions management
   - Calendar: Payroll calendar
   - Reports: Toggle summary/details modes
   - Archive: Monthly archiving
   - Settings: Payroll settings
4. In Main: User clicks teacher → Open TeacherModal
5. User clicks pay salary → Open PaySalaryModal
6. User selects calculation mode (fixed/hourly/mixed)
7. Fill form, submit → Success
8. User may export/print from any section

### Decision Points
| Condition | Branch |
|-----------|--------|
| Section switch | Load section content, maintain context |
| Calculation mode | Show/hide relevant fields |
| canManageTeacher = false | Disable edit actions |

### Screens Involved
- Salaries Main (screen-blueprints: "Salaries Main")
- Salaries - Main Section
- Salaries - Schedule Section
- Salaries - Deductions Section
- Salaries - Calendar Section
- Salaries - Reports Section
- Salaries - Archive Section
- Salaries - Settings Section
- Salaries - TeacherModal
- Salaries - PaySalaryModal
- Salaries - ExportModal
- Salaries - PrintModal

### Figma Prototype Linking
- **Navigate to**: Each sidebar item → Section frame (treat as separate prototypes)
- **Open overlay**: Teacher actions → TeacherModal
- **Open overlay**: Pay salary → PaySalaryModal
- **Swap overlay**: Calculation mode changes (modal content swap)
- **Motion**: Sidebar selection highlight, modal transitions

---

## Flow 11: Report Generation Flow

**Trigger**: Admin opens Reports module.

### Steps
1. Load Reports page with overview KPIs
2. Display 4 report cards (Students, Payments, Expenses, Salaries)
3. Each card shows dataset stats
4. User clicks Export on card → Download XLSX
5. Or user clicks Print → Generate printable view
6. Or user clicks "تصدير الكل" → Export all datasets

### Decision Points
| Condition | Branch |
|-----------|--------|
| Export in progress | Show loader on card |
| No data | Disable export, show empty state |

### Screens Involved
- Reports (screen-blueprints: "Reports")

### Figma Prototype Linking
- **Open overlay**: Print → Print preview modal
- **State change**: Card loader during export
- **Motion**: Download progress (if shown)

---

## Flow 12: Monitoring/Moderation Flow

**Trigger**: Admin opens Monitoring module.

### Steps
1. Load Monitoring page with custom header
2. Display hero stats and tab switcher
3. Default to Messages tab
4. User applies filters (search, branch, teacher, class, section, status)
5. User clicks detail button → Open DetailModal
6. Modal shows content + audit trail sidebar
7. User clicks edit → Enable form fields
8. User saves → Show loading → Success + audit entry
9. Or user deletes → ConfirmDialog → Remove + audit entry

### Decision Points
| Condition | Branch |
|-----------|--------|
| Messages tab | Show messages list |
| Homework tab | Show homework list |
| canModerate = false | Disable edit/delete, read-only mode |
| Status = deleted_by_admin | Show red badge |
| Status = edited_by_admin | Show amber badge |

### Screens Involved
- Monitoring Main (screen-blueprints: "Monitoring Main")
- Monitoring - Messages Tab Panel
- Monitoring - Homework Tab Panel
- Monitoring - DetailModal

### Figma Prototype Linking
- **Swap overlay**: Tab switch (Messages ↔ Homework)
- **Open overlay**: Detail button → DetailModal
- **State change**: Edit mode toggle (view → edit)
- **Motion**: Modal slide up, edit mode transition (200ms)

---

## Flow 13: Fee Notifications Flow

**Trigger**: Admin opens Fee Notifications module.

### Steps
1. Load Fee Notifications page
2. Display hero stats and 2-column layout
3. Left: History table with filters
4. Right: Composer form
5. User fills title, message, due date
6. User selects target mode:
   - all_students: No additional fields
   - school: School selector
   - branch: Branch selector
   - class_section: Class + Section selectors
   - specific_students: Student checkbox grid
7. User clicks send → Loading → Success toast
8. History updates with new entry
9. User clicks history row → Open HistoryModal
10. Modal shows recipients with delivery status

### Decision Points
| Condition | Branch |
|-----------|--------|
| Target mode change | Show/hide conditional fields |
| Specific students mode | Show searchable checkbox grid |
| canSendFeeNotifications = false | Disable send button |
| Send success | Reset form, refresh history |
| Delivery failed | Show failure reason in modal |

### Screens Involved
- Fee Notifications (screen-blueprints: "Fee Notifications")
- Fee Notifications - HistoryModal

### Figma Prototype Linking
- **State change**: Target mode conditional fields (show/hide)
- **Open overlay**: History row → HistoryModal
- **Motion**: Form field transitions (150ms)

---

## Flow 14: Super Admin Operations Flow

**Trigger**: Super admin opens Super Admin console.

### Steps
1. Load Super Admin page with tab rail
2. Default to Overview tab
3. User switches tabs:
   - Overview: System diagnostics
   - Schools: List with search/filter
   - Users: List with search/filter
   - Subscriptions: List with plan badges
   - Audit: Audit log (if enabled)
   - Roles: Custom roles (if enabled)
   - Trash: Deleted items (if enabled)
   - Notifications: System notifications (if enabled)
   - Monitoring: System metrics (if enabled)
   - Branches: Branch list (if enabled)
4. In Schools: User clicks create → SchoolForm modal
5. Or user clicks edit → SchoolForm modal (pre-filled)
6. Or user clicks delete → DeleteConfirmDialog
7. Similar flows for Users tab
8. User may switch scoped school and jump to dashboard with `?school=` param

### Decision Points
| Condition | Branch |
|-----------|--------|
| Infrastructure flag = false | Hide tab |
| Schema incompatible | Show notice banner |
| School created | Refresh list, show success |
| Delete confirmed | Remove from list (soft delete) |

### Screens Involved
- Super Admin Console (screen-blueprints: "Super Admin Console")
- Super Admin - Overview Tab Panel
- Super Admin - Schools Tab Panel
- Super Admin - Users Tab Panel
- Super Admin - Subscriptions Tab Panel
- Super Admin - Audit Tab Panel
- Super Admin - Roles Tab Panel
- Super Admin - Trash Tab Panel
- Super Admin - Notifications Tab Panel
- Super Admin - Monitoring Tab Panel
- Super Admin - Branches Tab Panel
- Super Admin - SchoolForm
- Super Admin - UserForm
- Super Admin - DeleteConfirmDialog

### Figma Prototype Linking
- **Navigate to**: Tab rail → Tab content frames
- **Open overlay**: Create/Edit → SchoolForm or UserForm
- **Open overlay**: Delete → DeleteConfirmDialog
- **Navigate to**: Scope switch → Dashboard with school param
- **Motion**: Tab content swap (200ms)

---

## Flow 15: Tenant/School Switching Flow

**Trigger**: Super admin uses school scope selector.

### Steps
1. Super admin sees SchoolScopeBanner in sidebar
2. User clicks school selector dropdown
3. List of available schools appears
4. User selects school
5. Scope changes across app
6. Data reloads for selected school
7. User navigates to school-bound page (Students, Payments, etc.)
8. Content reflects selected school

### Decision Points
| Condition | Branch |
|-----------|--------|
| No school selected | Block content, show selector |
| Invalid school ID | Show error state |
| School switch while unsaved changes | Warn about losing changes |

### Screens Involved
- App Shell (screen-blueprints: "App Shell")
- All school-scoped pages

### Figma Prototype Linking
- **State change**: Selector dropdown open/close
- **Navigate to**: Any scoped page with context change
- **Motion**: Data refresh loading state

---

## Flow 16: Theme Switching Flow

**Trigger**: User switches theme mode or preset.

### Steps
1. User opens ProfileMenu
2. User selects ThemeModeToggle
3. Options: System / Light / Dark
4. User clicks option → Theme changes immediately
5. Or in SchoolBrandingPanel (super_admin):
   - User selects theme preset from grid
   - Colors update in real-time preview
   - User saves → Apply to school

### Decision Points
| Condition | Branch |
|-----------|--------|
| System mode | Follow OS preference |
| Light/Dark mode | Force theme |
| Preset selected | Update preview only |
| Save clicked | Persist to DB, apply globally |

### Screens Involved
- App Shell (ProfileMenu)
- Dashboard - SchoolBrandingPanel

### Figma Prototype Linking
- **State change**: Theme toggle selection
- **State change**: Preset selection with color updates
- **Motion**: Smooth color transition (300ms)

---

## Figma Prototype Linking Summary

### Navigation Patterns
| Pattern | Usage | Motion |
|---------|-------|--------|
| Navigate to | Route-level screens | Smart Animate, 200ms, Ease Out |
| Open overlay | Modals, dialogs, drawers | Move in + fade, 180-220ms |
| Swap overlay | Multi-step stacks, tab content | Crossfade, 150-200ms |
| Close overlay | Dismiss modal/drawer | Fade out, 150ms |

### Directional Motion (RTL Context)
| Element | Enter | Exit |
|---------|-------|------|
| Drawer/Panel | Slide from left | Slide to left |
| Modal | Scale up + fade | Scale down + fade |
| Toast | Slide from top-right | Fade out |
| Tab content | Crossfade | Crossfade |

### Recommended Starting Prototypes
1. **Authentication**: Login → Dashboard (success) + error branches
2. **Daily Workflow**: Dashboard → Students → Student CRUD flow
3. **Finance Collection**: Dashboard → Payments → Payment flow
4. **Admin Control**: Super Admin → Schools → School CRUD flow
5. **Attendance**: Dashboard → Attendance → Recording flow

---

## Flow Coverage Matrix

| Flow | Primary Role | Complexity | Modal Count |
|------|--------------|------------|-------------|
| 1. Authentication | All | Low | 0 |
| 2. Forgot Password | All | Low | 0 |
| 3. Home Launcher | All | Low | 0 |
| 4. Dashboard Review | All | Medium | 2 |
| 5. Student CRUD | Admin+ | High | 5 |
| 6. Teacher Management | Admin+ | Medium | 3 |
| 7. Attendance | All | Medium | 0 |
| 8. Payment Collection | All | High | 3 |
| 9. Expense Management | Admin+ | Medium | 2 |
| 10. Salary Operations | Admin+ | Very High | 8+ |
| 11. Report Generation | Admin+ | Low | 1 |
| 12. Monitoring | Admin+ | High | 1 |
| 13. Fee Notifications | Admin+ | High | 1 |
| 14. Super Admin | Super Admin | Very High | 3+ |
| 15. School Switching | Super Admin | Low | 0 |
| 16. Theme Switching | All | Low | 0 |
