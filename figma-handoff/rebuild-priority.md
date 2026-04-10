<!-- Generated: 2026-04-08 (v2) -->

# Rebuild Priority

## Overview

This document provides an ordered priority list for Figma reconstruction, organized into 8 phases spanning approximately 5 weeks. Each phase includes deliverables, frame counts, dependencies, and success criteria.

---

## Phase 1: Foundations & Shell (Week 1)

### Duration: 3-4 days

### Deliverables

#### 1.1 Design Tokens Setup
- [ ] Figma Variables for all CSS custom properties
- [ ] Color primitives (Tailwind palette + brand colors)
- [ ] Typography scale (displayXL → overline)
- [ ] Spacing scale (0-80px)
- [ ] Border radius scale (6-32px)
- [ ] Shadow ladder (xs → xl)
- [ ] Motion timing (fast/base/slow/spring)
- [ ] Z-index layers

#### 1.2 Color Styles
- [ ] Light mode semantic colors (90+ tokens)
- [ ] Dark mode semantic colors (90+ tokens)
- [ ] 14 theme preset swatches

#### 1.3 Text Styles
- [ ] Cairo font family (400-800 weights)
- [ ] Inter font family (400-800 weights)
- [ ] Typography levels with weight mapping

#### 1.4 App Shell Components
- [ ] AppSidebar (desktop, tablet, mobile variants)
- [ ] AppShellTopbar (fixed, sticky variants)
- [ ] ProfileMenu (avatar, menu states)
- [ ] SchoolScopeBanner (info, warning, error tones)

#### 1.5 Core UI Primitives
- [ ] Button (primary, secondary, outline, danger)
- [ ] Input (default, focus, error, disabled)
- [ ] Card family (Card, CardHeader, CardContent, CardFooter)
- [ ] StatsCard (6 tone variants)

### Frames Estimate: 25 frames

### Dependencies
- Access to globals.css for token extraction
- Cairo and Inter font files

### Success Criteria
- All tokens available as Figma Variables
- Shell components render correctly in auto-layout
- Theme switch demo works (light/dark)

---

## Phase 2: Shared Components (Week 1-2)

### Duration: 4-5 days

### Deliverables

#### 2.1 Navigation Components
- [ ] Breadcrumb (link, current, RTL/LTR)
- [ ] ListPagination (page buttons, info span, states)
- [ ] Tabs component ( StudentsTabs, ExpensesTabs)

#### 2.2 Feedback Components
- [ ] Toast (success, error, warning, info)
- [ ] ConfirmDialog (danger, primary, busy states)
- [ ] Skeleton family (8 variants):
  - [ ] SkBox
  - [ ] StatCardSkeleton
  - [ ] TableSkeleton
  - [ ] AnalysisSkeleton
  - [ ] StudentCardSkeleton
  - [ ] DashboardSkeleton
  - [ ] StudentsPageSkeleton
  - [ ] PaymentsPageSkeleton

#### 2.3 Form Patterns
- [ ] Form field wrapper
- [ ] Select dropdown
- [ ] Date picker input
- [ ] Textarea
- [ ] Checkbox
- [ ] Form validation states

#### 2.4 Data Display Patterns
- [ ] DataTableShell (loading, error, empty, default)
- [ ] Filter bar pattern
- [ ] Search input with debounce
- [ ] Empty state pattern
- [ ] Badge/Pill (status, tone variants)

#### 2.5 Overlay Patterns
- [ ] Modal container (backdrop, sizing)
- [ ] Drawer/Side panel (positioning, animations)
- [ ] Dropdown menu

### Frames Estimate: 35 frames

### Dependencies
- Phase 1 tokens and primitives

### Success Criteria
- All components have complete state coverage
- Components work in both RTL and LTR
- Dark mode variants for all components

---

## Phase 3: Auth & Gate Screens (Week 2)

### Duration: 2-3 days

### Deliverables

#### 3.1 Login Screen
- [ ] SCR / Login / Default / Desktop / AR
- [ ] SCR / Login / Default / Desktop / EN
- [ ] SCR / Login / Default / Tablet / AR
- [ ] SCR / Login / Default / Tablet / EN
- [ ] SCR / Login / Default / Mobile / AR
- [ ] SCR / Login / Error / Desktop / AR
- [ ] SCR / Login / Loading / Desktop / AR
- [ ] SCR / Login / Dark / Desktop / AR

#### 3.2 Forgot Password
- [ ] SCR / Forgot Password / Default / Desktop / AR
- [ ] SCR / Forgot Password / Default / Desktop / EN

#### 3.3 Access Denied
- [ ] SCR / Access Denied / Default / Desktop / AR
- [ ] SCR / Access Denied / Default / Desktop / EN

#### 3.4 Subscription Expired
- [ ] SCR / Subscription Expired / Default / Desktop / AR
- [ ] SCR / Subscription Expired / Default / Desktop / EN

#### 3.5 Error/Not Found
- [ ] SCR / Not Found / Default / Desktop / AR
- [ ] SCR / Error / Default / Desktop / AR

### Frames Estimate: 13 frames

### Dependencies
- Phase 1-2 components
- Login screenshots for verification

### Success Criteria
- Login form validates correctly
- Gate screens render consistently
- Mobile login removes hero image

---

## Phase 4: Core Workflows (Week 2-3)

### Duration: 5-6 days

### Deliverables

#### 4.1 Dashboard
- [ ] SCR / Dashboard / Default / Desktop / AR
- [ ] SCR / Dashboard / Default / Desktop / EN
- [ ] SCR / Dashboard / Default / Tablet / AR
- [ ] SCR / Dashboard / Default / Mobile / AR
- [ ] SCR / Dashboard / Empty / Desktop / AR
- [ ] SCR / Dashboard / Super Admin Scoped / Desktop / AR
- [ ] OVL / Dashboard / Classes Modal
- [ ] OVL / Dashboard / Fee Modal

**Subcomponents**:
- StatisticsCards (7 KPI cards)
- FinancialAnalysisPanel (charts)
- ClassFeesTable
- NotificationsPanel
- RecentActivityPanel
- RecentPaymentsPanel
- OverdueStudentsPanel
- SchoolBrandingPanel

#### 4.2 Students (4 Tab Variants + 5 Modals)
- [ ] SCR / Students / Active Tab / Desktop / AR
- [ ] SCR / Students / Transferred Tab / Desktop / AR
- [ ] SCR / Students / Suspended Tab / Desktop / AR
- [ ] SCR / Students / Deleted Tab / Desktop / AR
- [ ] SCR / Students / Default / Desktop / EN
- [ ] SCR / Students / Default / Tablet / AR
- [ ] SCR / Students / Default / Mobile / AR
- [ ] SCR / Students / Empty / Desktop / AR
- [ ] OVL / Students / AddStudentModal (3-step wizard)
- [ ] OVL / Students / EditStudentModal
- [ ] OVL / Students / DeleteConfirmModal
- [ ] OVL / Students / ImportExcelModal
- [ ] OVL / Students / AccountCardModal

#### 4.3 Teachers (Main + 3 Modals)
- [ ] SCR / Teachers / Default / Desktop / AR
- [ ] SCR / Teachers / Default / Desktop / EN
- [ ] SCR / Teachers / Default / Tablet / AR
- [ ] SCR / Teachers / Default / Mobile / AR
- [ ] OVL / Teachers / TeacherFormModal
- [ ] OVL / Teachers / TeacherImportModal
- [ ] OVL / Teachers / AccountCardModal

#### 4.4 Attendance
- [ ] SCR / Attendance / Default / Desktop / AR
- [ ] SCR / Attendance / Default / Desktop / EN
- [ ] SCR / Attendance / Default / Tablet / AR
- [ ] SCR / Attendance / Default / Mobile / AR
- [ ] SCR / Attendance / Filtered / Desktop / AR

### Frames Estimate: 26 frames

### Dependencies
- Phase 1-3 complete
- Manual screenshot references for dashboard/attendance

### Success Criteria
- Students 4 tab variants render correctly
- AddStudentModal 3-step wizard documented
- Attendance spreadsheet table documented

---

## Phase 5: Finance Module (Week 3-4)

### Duration: 5-6 days

### Deliverables

#### 5.1 Payments (Main + Detail Panel + Archive + 2 Modals)
- [ ] SCR / Payments / Default / Desktop / AR
- [ ] SCR / Payments / Default / Desktop / EN
- [ ] SCR / Payments / Default / Tablet / AR
- [ ] SCR / Payments / Default / Mobile / AR
- [ ] SCR / Payments / Detail Panel / Desktop / AR
- [ ] OVL / Payments / PaymentModal
- [ ] OVL / Payments / ArchiveDetailModal

**Subcomponents**:
- PaymentsTable (9 columns)
- PaymentsFilters
- PaymentsStats
- StudentDetailPanel (drawer)
- PaymentsArchive section

#### 5.2 Salaries (7 Sidebar Sections + 8+ Modals)
- [ ] SCR / Salaries / Main / Desktop / AR
- [ ] SCR / Salaries / Schedule / Desktop / AR
- [ ] SCR / Salaries / Deductions / Desktop / AR
- [ ] SCR / Salaries / Calendar / Desktop / AR
- [ ] SCR / Salaries / Reports / Desktop / AR
- [ ] SCR / Salaries / Archive / Desktop / AR
- [ ] SCR / Salaries / Settings / Desktop / AR
- [ ] SCR / Salaries / Default / Tablet / AR
- [ ] SCR / Salaries / Default / Mobile / AR
- [ ] OVL / Salaries / PaySalaryModal
- [ ] OVL / Salaries / TeacherModal
- [ ] OVL / Salaries / DailyLogModal
- [ ] OVL / Salaries / ExportModal
- [ ] OVL / Salaries / PrintModal
- [ ] OVL / Salaries / LessonTimesModal
- [ ] OVL / Salaries / PricesModal
- [ ] OVL / Salaries / TeacherDetailPanel
- [ ] OVL / Salaries / ArchiveConfirmation

#### 5.3 Expenses (2 Tabs)
- [ ] SCR / Expenses / Invoices Tab / Desktop / AR
- [ ] SCR / Expenses / Types Tab / Desktop / AR
- [ ] SCR / Expenses / Default / Tablet / AR
- [ ] SCR / Expenses / Default / Mobile / AR

### Frames Estimate: 21 frames

### Dependencies
- Phase 1-4 complete
- Payments detail panel pattern from earlier work

### Success Criteria
- Salaries 7 sections documented individually
- All 8+ salaries modals have specs
- Payments detail drawer works as overlay

---

## Phase 6: Reports & Admin (Week 4)

### Duration: 3-4 days

### Deliverables

#### 6.1 Reports
- [ ] SCR / Reports / Default / Desktop / AR
- [ ] SCR / Reports / Default / Desktop / EN
- [ ] SCR / Reports / Default / Tablet / AR
- [ ] SCR / Reports / Default / Mobile / AR

#### 6.2 Monitoring (2 Tabs + Detail Modal)
- [ ] SCR / Monitoring / Messages Tab / Desktop / AR
- [ ] SCR / Monitoring / Homework Tab / Desktop / AR
- [ ] SCR / Monitoring / Default / Tablet / AR
- [ ] SCR / Monitoring / Default / Mobile / AR
- [ ] OVL / Monitoring / DetailModal (with edit mode)

#### 6.3 Fee Notifications (Composer + History Modal)
- [ ] SCR / Fee Notifications / Composer / Desktop / AR
- [ ] SCR / Fee Notifications / Default / Tablet / AR
- [ ] SCR / Fee Notifications / Default / Mobile / AR
- [ ] OVL / Fee Notifications / HistoryModal

#### 6.4 Schools & Subscriptions (Legacy)
- [ ] SCR / Schools / Legacy / Desktop / AR
- [ ] SCR / Subscriptions / Legacy / Desktop / AR

### Frames Estimate: 13 frames

### Dependencies
- Phase 1-5 complete

### Success Criteria
- Monitoring detail modal shows audit sidebar
- Fee Notifications target mode fields documented
- Legacy pages noted as stylistic outliers

---

## Phase 7: Super Admin (Week 4-5)

### Duration: 4-5 days

### Deliverables

#### 7.1 Super Admin Tab Panels (10 Tabs)
- [ ] SCR / Super Admin / Overview Tab / Desktop / AR
- [ ] SCR / Super Admin / Schools Tab / Desktop / AR
- [ ] SCR / Super Admin / Users Tab / Desktop / AR
- [ ] SCR / Super Admin / Subscriptions Tab / Desktop / AR
- [ ] SCR / Super Admin / Audit Tab / Desktop / AR
- [ ] SCR / Super Admin / Roles Tab / Desktop / AR
- [ ] SCR / Super Admin / Trash Tab / Desktop / AR
- [ ] SCR / Super Admin / Notifications Tab / Desktop / AR
- [ ] SCR / Super Admin / Monitoring Tab / Desktop / AR
- [ ] SCR / Super Admin / Branches Tab / Desktop / AR

#### 7.2 Super Admin Forms & Dialogs
- [ ] OVL / Super Admin / SchoolFormModal
- [ ] OVL / Super Admin / UserFormModal
- [ ] OVL / Super Admin / RoleFormModal
- [ ] OVL / Super Admin / BranchFormModal
- [ ] OVL / Super Admin / DeleteSchoolDialog
- [ ] OVL / Super Admin / DeleteUserDialog

#### 7.3 Responsive Variants
- [ ] SCR / Super Admin / Overview Tab / Desktop / EN
- [ ] SCR / Super Admin / Default / Tablet / AR
- [ ] SCR / Super Admin / Default / Mobile / AR

### Frames Estimate: 17 frames

### Dependencies
- Phase 1-6 complete
- Infrastructure flags for conditional tabs

### Success Criteria
- All 10 tab panels documented
- SchoolForm and UserForm have validation states
- Tab switching prototype works

---

## Phase 8: Polish & Prototyping (Week 5)

### Duration: 3-4 days

### Deliverables

#### 8.1 Theme Preset Variants
- [ ] Apply 14 theme presets to shell frame
- [ ] Document sidebar color changes per preset
- [ ] Document accent color usage per preset

#### 8.2 Mobile Variant Completion
- [ ] All major screens have mobile frames
- [ ] Drawer/overlay behaviors documented
- [ ] Touch-friendly action sizing

#### 8.3 Prototype Wiring (15 Flows)
- [ ] FLOW / Authentication
- [ ] FLOW / Dashboard Navigation
- [ ] FLOW / Admin Daily
- [ ] FLOW / Employee Collection
- [ ] FLOW / Student CRUD
- [ ] FLOW / Teacher Management
- [ ] FLOW / Attendance Recording
- [ ] FLOW / Payments Collection
- [ ] FLOW / Salary Operations
- [ ] FLOW / Monitoring Moderation
- [ ] FLOW / Fee Notifications Sending
- [ ] FLOW / Super Admin Operations
- [ ] FLOW / School Scope Switching
- [ ] FLOW / Report Export
- [ ] FLOW / Settings Configuration

#### 8.4 Cross-Flow Consistency Review
- [ ] Button styling consistent across screens
- [ ] Modal sizing consistent
- [ ] Form patterns consistent
- [ ] Empty states consistent
- [ ] Error states consistent

### Frames Estimate: 10 flow frames + review

### Dependencies
- All previous phases complete

### Success Criteria
- All 15 flows have hotspot mappings
- Click-through prototype works end-to-end
- No visual inconsistencies across screens

---

## Total Frame Count

| Phase | Frames | Duration |
|-------|--------|----------|
| Phase 1: Foundations & Shell | 25 | Week 1 (3-4 days) |
| Phase 2: Shared Components | 35 | Week 1-2 (4-5 days) |
| Phase 3: Auth & Gate Screens | 13 | Week 2 (2-3 days) |
| Phase 4: Core Workflows | 26 | Week 2-3 (5-6 days) |
| Phase 5: Finance Module | 21 | Week 3-4 (5-6 days) |
| Phase 6: Reports & Admin | 13 | Week 4 (3-4 days) |
| Phase 7: Super Admin | 17 | Week 4-5 (4-5 days) |
| Phase 8: Polish & Prototyping | 10+ | Week 5 (3-4 days) |
| **Total** | **160+ frames** | **~5 weeks** |

---

## Critical Path Items

These items block downstream work and must be completed first:

1. **Phase 1.1 Design Tokens** — Required for all color/spacing
2. **Phase 1.4 App Shell** — Required for all screen layouts
3. **Phase 2.3 Form Patterns** — Required for all modals
4. **Phase 2.4 DataTableShell** — Required for all data screens

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Missing screenshots | Use code-derived specs with lower confidence markers |
| Token inconsistencies | Normalize during Phase 1, document legacy items |
| Modal complexity | Create reusable modal template in Phase 2 |
| Super Admin infrastructure tabs | Mark as conditional, document availability flags |
| Mobile responsive unknowns | Make reasonable assumptions, flag for verification |

---

## Handoff Checklist

Before considering the Figma file complete:

- [ ] All 16 pages created
- [ ] All 160+ frames rendered
- [ ] All components have variant properties
- [ ] All tokens are Figma Variables
- [ ] All 15 flows have prototype hotspots
- [ ] RTL and LTR variants documented
- [ ] Dark mode variants documented
- [ ] Mobile variants for major screens
- [ ] Missing items documented in Archive page
- [ ] Developer handoff notes added to cover page
