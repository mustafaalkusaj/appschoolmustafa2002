# Database Design

<cite>
**Referenced Files in This Document**
- [database_setup.sql](file://database_setup.sql)
- [admin_infrastructure.sql](file://admin_infrastructure.sql)
- [migrations/README.md](file://migrations/README.md)
- [migrations/20260322_000000_mobile_core_tables.sql](file://migrations/20260322_000000_mobile_core_tables.sql)
- [migrations/20260323_000000_dashboard_managed_account_schema.sql](file://migrations/20260323_000000_dashboard_managed_account_schema.sql)
- [migrations/20260324_000000_reliability_performance_indexes.sql](file://migrations/20260324_000000_reliability_performance_indexes.sql)
- [migrations/20260324_010000_academic_records_scope_model.sql](file://migrations/20260324_010000_academic_records_scope_model.sql)
- [migrations/20260326_020000_account_archives_table.sql](file://migrations/20260326_020000_account_archives_table.sql)
- [migrations/20260329_000000_teacher_activity_monitoring.sql](file://migrations/20260329_000000_teacher_activity_monitoring.sql)
- [migrations/20260330_000000_add_missing_indexes.sql](file://migrations/20260330_000000_add_missing_indexes.sql)
- [00990090/school-accounting-system/database/schema.sql](file://00990090/school-accounting-system/database/schema.sql)
- [00990090/school-accounting-system/database/sample_data.sql](file://00990090/school-accounting-system/database/sample_data.sql)
- [00990090/school-accounting-system/backend/src/models/User.js](file://00990090/school-accounting-system/backend/src/models/User.js)
- [00990090/school-accounting-system/backend/src/models/Student.js](file://00990090/school-accounting-system/backend/src/models/Student.js)
- [00990090/school-accounting-system/backend/src/models/Payment.js](file://00990090/school-accounting-system/backend/src/models/Payment.js)
- [00990090/school-accounting-system/backend/src/models/Expense.js](file://00990090/school-accounting-system/backend/src/models/Expense.js)
</cite>

## Update Summary
**Changes Made**
- Updated Performance Considerations section to document new indexing strategy
- Added documentation for newly added indexes: students.school_id, expenses.school_id, and payments.student_id
- Updated Foreign Key Constraint section to reflect standardization of attendance_records.school_id
- Enhanced Indexing Strategy documentation with complete coverage of all performance optimizations

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document provides comprehensive database design documentation for the school management system. It covers the multi-tenant schema, entity relationships, constraints, indexes, and RLS policies that enforce tenant isolation and role-based access control. It also documents the migration strategy, versioning, schema evolution, indexing strategy, and operational procedures such as backup and recovery. Finally, it includes sample data and common query patterns for major entities.

## Project Structure
The database schema is primarily defined in SQL bootstrap and migration files. The repository includes:
- Bootstrap schema and core RLS policies
- Administrative infrastructure (audit logs, notifications, feature flags, soft deletes)
- Academic records and teacher assignment schema
- Performance indexes and additional indexes
- Legacy accounting system schema and sample data for reference

```mermaid
graph TB
subgraph "Bootstrap"
A["database_setup.sql"]
B["admin_infrastructure.sql"]
end
subgraph "Migrations"
C["20260322_000000_mobile_core_tables.sql"]
D["20260323_000000_dashboard_managed_account_schema.sql"]
E["20260324_000000_reliability_performance_indexes.sql"]
F["20260324_010000_academic_records_scope_model.sql"]
G["20260326_020000_account_archives_table.sql"]
H["20260329_000000_teacher_activity_monitoring.sql"]
I["20260330_000000_add_missing_indexes.sql"]
end
subgraph "Legacy Accounting"
J["00990090/school-accounting-system/database/schema.sql"]
K["00990090/school-accounting-system/database/sample_data.sql"]
end
A --> C
A --> D
A --> E
A --> F
A --> G
A --> H
A --> I
B --> A
J --> K
```

**Diagram sources**
- [database_setup.sql](file://database_setup.sql)
- [admin_infrastructure.sql](file://admin_infrastructure.sql)
- [migrations/20260322_000000_mobile_core_tables.sql](file://migrations/20260322_000000_mobile_core_tables.sql)
- [migrations/20260323_000000_dashboard_managed_account_schema.sql](file://migrations/20260323_000000_dashboard_managed_account_schema.sql)
- [migrations/20260324_000000_reliability_performance_indexes.sql](file://migrations/20260324_000000_reliability_performance_indexes.sql)
- [migrations/20260324_010000_academic_records_scope_model.sql](file://migrations/20260324_010000_academic_records_scope_model.sql)
- [migrations/20260326_020000_account_archives_table.sql](file://migrations/20260326_020000_account_archives_table.sql)
- [migrations/20260329_000000_teacher_activity_monitoring.sql](file://migrations/20260329_000000_teacher_activity_monitoring.sql)
- [migrations/20260330_000000_add_missing_indexes.sql](file://migrations/20260330_000000_add_missing_indexes.sql)
- [00990090/school-accounting-system/database/schema.sql](file://00990090/school-accounting-system/database/schema.sql)
- [00990090/school-accounting-system/database/sample_data.sql](file://00990090/school-accounting-system/database/sample_data.sql)

**Section sources**
- [migrations/README.md](file://migrations/README.md)
- [database_setup.sql](file://database_setup.sql)
- [admin_infrastructure.sql](file://admin_infrastructure.sql)

## Core Components
This section outlines the principal database components and their roles in the system.

- Schools and Subscriptions
  - Schools define tenants with subscription lifecycle management.
  - Subscriptions track plan, status, and effective dates; a computed end date is maintained per school.
  - Indexes optimize queries by school and status.

- User Profiles and Authentication
  - User profiles link auth users to schools and roles.
  - Soft delete columns are standardized across key entities via administrative infrastructure.

- Academic Records and Managed Accounts
  - Managed user profiles unify student and teacher identities with role scoping.
  - Subjects, teacher assignments, assignments, and grades form the academic record domain.
  - Triggers maintain updated_at timestamps for managed entities.

- Payments and Expenses
  - Payments and expenses are tracked with method, references, and approvals.
  - Legacy accounting schema and sample data illustrate historical modeling.

- Administrative Infrastructure
  - Audit logs capture actions with actor metadata.
  - Notifications target recipients with read status.
  - Feature flags and soft-delete support are centrally managed.

**Section sources**
- [database_setup.sql](file://database_setup.sql)
- [admin_infrastructure.sql](file://admin_infrastructure.sql)
- [migrations/20260322_000000_mobile_core_tables.sql](file://migrations/20260322_000000_mobile_core_tables.sql)
- [migrations/20260324_010000_academic_records_scope_model.sql](file://migrations/20260324_010000_academic_records_scope_model.sql)
- [00990090/school-accounting-system/database/schema.sql](file://00990090/school-accounting-system/database/schema.sql)

## Architecture Overview
The database enforces multi-tenancy and role-based access control through RLS policies and helper functions. Tenant isolation is applied to tables containing a school_id column. Helper functions expose current_app_role and current_school_id to policy expressions.

```mermaid
graph TB
U["auth.users"]
UP["user_profiles"]
S["schools"]
SUB["subscriptions"]
AR["account_archives"]
subgraph "RLS Functions"
CF1["current_app_role()"]
CF2["current_school_id()"]
end
subgraph "Tenant Tables"
ST["students"]
PY["payments"]
EX["expenses"]
BR["branches"]
CL["classes"]
SE["sections"]
AT["attendance_records"]
end
U --> UP
UP --> S
S --> SUB
S --> AR
CF1 --> UP
CF2 --> UP
S --- ST
S --- PY
S --- EX
S --- BR
S --- CL
S --- SE
S --- AT
```

**Diagram sources**
- [database_setup.sql](file://database_setup.sql)

## Detailed Component Analysis

### Entity Relationship Model
The following ER diagram maps core entities and their relationships, highlighting primary keys, foreign keys, and indexes.

```mermaid
erDiagram
schools ||--o{ subscriptions : "has"
schools ||--o{ students : "hosts"
schools ||--o{ payments : "hosts"
schools ||--o{ expenses : "hosts"
schools ||--o{ branches : "hosts"
schools ||--o{ classes : "hosts"
schools ||--o{ sections : "hosts"
schools ||--o{ attendance_records : "hosts"
schools ||--o{ account_archives : "hosts"
classes ||--o{ sections : "contains"
students }o--|| classes : "belongs_to"
students }o--|| sections : "belongs_to"
students ||--o{ payments : "pays"
students ||--o{ attendance_records : "recorded_for"
payments }o--|| students : "linked_to"
expenses ||--o{ payments : "reconciled_by"
user_profiles }o--|| schools : "belongs_to"
user_profiles }o--|| auth.users : "maps_to"
```

**Diagram sources**
- [database_setup.sql](file://database_setup.sql)

**Section sources**
- [database_setup.sql](file://database_setup.sql)

### Schools and Subscriptions
- Purpose: Define tenants and manage subscription lifecycles.
- Key fields:
  - schools: id, name, is_active, subscription_end, created_at, plus optional address, phone, owner_email, city, plan.
  - subscriptions: id, school_id, plan, status, start_date, end_date, created_at.
- Constraints and indexes:
  - Unique indexes on school_id for subscriptions.
  - Indexes on subscriptions for school_id and status.
- Computed fields:
  - subscription_end is recomputed via triggers/functions to reflect the latest subscription end date.

**Section sources**
- [database_setup.sql](file://database_setup.sql)

### Students and Payments
- Purpose: Track student enrollment, class/section assignment, and payment history.
- Key fields:
  - students: admission_number, personal info, class_id, section_id, auth_user_id, is_active, created_at, updated_at.
  - payments: student_id, student_fee_id, amount, payment_method, reference_number, payment_date, receipt_number, notes, created_by, created_at, updated_at.
- Constraints and indexes:
  - Unique indexes on admission_number and receipt_number.
  - Indexes on student_id, payment_date, and receipt_number.
  - Foreign keys to students and users.

**Section sources**
- [database_setup.sql](file://database_setup.sql)
- [00990090/school-accounting-system/database/schema.sql](file://00990090/school-accounting-system/database/schema.sql)
- [00990090/school-accounting-system/database/sample_data.sql](file://00990090/school-accounting-system/database/sample_data.sql)

### Academic Records and Managed Accounts
- Purpose: Provide managed user profiles for students and teachers, and academic record tracking.
- Key fields:
  - managed_user_profiles: auth_user_id, school_id, role, full_name, email, phone, is_active, student_id, teacher_id, created_by, created_at, updated_at.
  - subjects: school_id, name, is_active, created_at, updated_at.
  - teacher_assignments: school_id, teacher_id, subject_id, class_id, section_id, is_active, created_at, updated_at.
  - assignments: school_id, teacher_id, student_id, subject_id, class_id, section_id, class_name, section, subject, title, description, due_at, content_kind, metadata, created_at, updated_at.
  - grades: school_id, teacher_id, student_id, assignment_id, subject_id, class_id, section_id, subject, exam_type, score, max_score, note, graded_at, created_at, updated_at.
- Constraints and indexes:
  - Unique indexes on email per school, student_id, teacher_id in managed_user_profiles.
  - Unique indexes on (school_id, name) for subjects.
  - Unique indexes for classwide and section-specific assignments.
  - Indexes on school_id, student_id, teacher_id, due_at for assignments and grades.
  - Triggers to maintain updated_at timestamps.

**Section sources**
- [migrations/20260322_000000_mobile_core_tables.sql](file://migrations/20260322_000000_mobile_core_tables.sql)
- [migrations/20260324_010000_academic_records_scope_model.sql](file://migrations/20260324_010000_academic_records_scope_model.sql)

### Attendance Records
- Purpose: Track daily attendance with status and notes.
- Key fields:
  - attendance_records: student_id, school_id, branch_id, attendance_date, status, note, created_at, updated_at.
- Constraints and indexes:
  - Unique index on (student_id, attendance_date).
  - Indexes on attendance_date and student_id.
  - **Updated**: Foreign key constraint standardized to ON DELETE CASCADE for consistency with other tenant-scoped tables.
  - Trigger to update updated_at automatically.

**Section sources**
- [database_setup.sql](file://database_setup.sql)
- [migrations/20260330_000000_add_missing_indexes.sql](file://migrations/20260330_000000_add_missing_indexes.sql)

### Administrative Infrastructure
- Audit Logs
  - Fields: id, actor_id, actor_name, actor_email, action_type, entity_type, entity_id, summary, metadata, ip_address, user_agent, created_at.
  - RLS: Super admin only.
  - Indexes: actor_id, action_type, entity_type, created_at.
- Notifications
  - Fields: id, user_id, school_id, type, title, message, is_read, link, metadata, created_at.
  - RLS: Owner-only.
  - Indexes: user_id, is_read.
- Feature Flags
  - Fields: id, key, is_enabled, description, updated_at.
  - RLS: Super admin only.
- Soft Delete Support
  - Adds deleted_at and deleted_by to key tables and centralizes soft-delete handling.

**Section sources**
- [admin_infrastructure.sql](file://admin_infrastructure.sql)

### Migration Strategy and Version Management
- Scope: Migrations cover shared managed-user auth/domain tables, teacher assignment and subject schema, storage buckets, RLS helper functions, and reliability/performance indexes.
- Guidance:
  - Keep existing migration filenames stable to preserve history.
  - Use comments and documentation to clarify intent.
  - Apply migrations in chronological order; later migrations may depend on earlier ones.

**Section sources**
- [migrations/README.md](file://migrations/README.md)

### RLS Policies and Access Control
- Helper Functions
  - current_app_role(): Returns the authenticated user's role from user_profiles.
  - current_school_id(): Returns the user's school_id from user_profiles.
- Tenant Isolation
  - Policies on tables with school_id:
    - Select: super_admin OR school_id = current_school_id().
    - Insert/Update/Delete: super_admin OR school_id = current_school_id(), with appropriate WITH CHECK clauses.
- Specialized Policies
  - user_profiles: select/update insert/delete with role-based checks.
  - schools/subscriptions: super_admin manages; select scoped by current school.
  - managed_user_profiles and academic tables: admin within current school.

**Section sources**
- [database_setup.sql](file://database_setup.sql)

### Indexing Strategy and Performance
- **Updated**: Complete Index Coverage
  - **Core Indexes**: All tenant-scoped tables now have comprehensive indexing strategy
    - subscriptions: school_id, status
    - account_archives: school_id, archive_year
    - managed_user_profiles: school_id, role, is_active; unique constraints on student_id and teacher_id; unique index on (school_id, lower(email))
    - subjects: school_id, name, is_active
    - teacher_assignments: school_id scope, teacher_id, is_active
    - assignments: school_id, student_id, teacher_id, due_at; composite scopes
    - grades: school_id, student_id, teacher_id, assignment_id; scopes
    - payments: school_id, student_id, created_at
    - attendance_records: attendance_date, student_id
    - **Newly Added**: students.school_id, expenses.school_id, payments.student_id
  - **Additional Indexes**: Reliability/performance indexes including payments, salaries, deductions, lecture_prices, lesson_times
  - **Missing Indexes**: Added in dedicated migration to complete coverage
  - **Standardization**: Foreign key constraints now consistently use ON DELETE CASCADE for tenant-scoped tables

**Section sources**
- [migrations/20260324_000000_reliability_performance_indexes.sql](file://migrations/20260324_000000_reliability_performance_indexes.sql)
- [migrations/20260330_000000_add_missing_indexes.sql](file://migrations/20260330_000000_add_missing_indexes.sql)
- [database_setup.sql](file://database_setup.sql)

### Backup and Recovery Procedures
- Recommended Approach
  - Use database-native logical backups for full/incremental snapshots.
  - Schedule regular backups and retain multiple retention cycles.
  - Test restore procedures periodically and document steps.
  - Store backups securely and encrypt at rest.
- Audit Trail
  - Maintain audit logs for administrative actions impacting data integrity.

### Data Security Measures and Compliance
- Row Level Security
  - Enforce tenant isolation and role-based access across sensitive tables.
- Audit Logging
  - Capture actor, action, entity, and metadata for compliance reporting.
- Data Loss Prevention
  - Soft delete support and centralized deletion controls.
- Access Controls
  - Least privilege via helper functions and policies.

**Section sources**
- [admin_infrastructure.sql](file://admin_infrastructure.sql)
- [database_setup.sql](file://database_setup.sql)

### Sample Data and Common Query Patterns
- Sample Data
  - Legacy accounting system includes representative inserts for users, classes, sections, students, fee structures, student fees, payments, installments, invoices, expenses, notifications, and backups.
- Common Queries (by model)
  - User
    - Find by email, by ID, create, verify password, update, list with pagination, delete (soft).
  - Student
    - List with filters (class, search), get by ID with payment summary, get by admission number, create, update, delete (soft), payment summary.
  - Payment
    - List with filters (student, date range), get by ID, create, update, delete, summary by date range, student payments.
  - Expense
    - List with filters (category, approval, date range), get by ID, create, update, approve, delete, summary by date range, categories.

**Section sources**
- [00990090/school-accounting-system/database/sample_data.sql](file://00990090/school-accounting-system/database/sample_data.sql)
- [00990090/school-accounting-system/backend/src/models/User.js](file://00990090/school-accounting-system/backend/src/models/User.js)
- [00990090/school-accounting-system/backend/src/models/Student.js](file://00990090/school-accounting-system/backend/src/models/Student.js)
- [00990090/school-accounting-system/backend/src/models/Payment.js](file://00990090/school-accounting-system/backend/src/models/Payment.js)
- [00990090/school-accounting-system/backend/src/models/Expense.js](file://00990090/school-accounting-system/backend/src/models/Expense.js)

## Dependency Analysis
The following diagram shows dependencies among key schema components and policies.

```mermaid
graph LR
CF1["current_app_role()"] --> P1["user_profiles policies"]
CF2["current_school_id()"] --> P2["tenant policies"]
P2 --> TBL1["schools"]
P2 --> TBL2["subscriptions"]
P2 --> TBL3["students"]
P2 --> TBL4["payments"]
P2 --> TBL5["expenses"]
P2 --> TBL6["branches"]
P2 --> TBL7["classes"]
P2 --> TBL8["sections"]
P2 --> TBL9["attendance_records"]
P2 --> TBL10["account_archives"]
P2 --> TBL11["managed_user_profiles"]
P2 --> TBL12["subjects"]
P2 --> TBL13["teacher_assignments"]
P2 --> TBL14["assignments"]
P2 --> TBL15["grades"]
```

**Diagram sources**
- [database_setup.sql](file://database_setup.sql)

**Section sources**
- [database_setup.sql](file://database_setup.sql)

## Performance Considerations
- **Updated**: Comprehensive Index Coverage
  - **Primary Indexes**: All tenant-scoped tables now have optimized indexes for common query patterns
    - **students.school_id**: Optimizes school-level student queries and filtering
    - **expenses.school_id**: Improves expense reporting and aggregation by school
    - **payments.student_id**: Enhances student payment history queries and financial reporting
  - **Secondary Indexes**: Support for date-range queries, status filtering, and composite lookups
  - **Foreign Key Consistency**: Standardized ON DELETE CASCADE behavior across tenant-scoped tables
  - **Query Performance**: Significantly improved performance for:
    - School administration dashboards
    - Financial reporting and analytics
    - Student payment history views
    - Expense categorization and approval workflows
- Triggers and Timestamps
  - Updated-at triggers reduce application logic and keep audit trails accurate.
- Partitioning
  - Consider partitioning large tables (e.g., payments, attendance_records) by date ranges for improved maintenance and query performance.
- Statistics and Vacuum
  - Regularly update statistics and vacuum/analyze to maintain query planner effectiveness.

## Troubleshooting Guide
- RLS Denials
  - Verify current_app_role and current_school_id return expected values for the authenticated user.
  - Confirm user_profiles contains the correct role and school_id.
- Policy Conflicts
  - Remove outdated generic policies before applying tenant policies.
- Index Issues
  - **Updated**: All previously missing indexes have been added in migrations/20260330_000000_add_missing_indexes.sql
  - Verify indexes exist: students.school_id, expenses.school_id, payments.student_id
  - Check foreign key constraints: attendance_records.school_id uses ON DELETE CASCADE
- Audit Logs
  - Check audit_logs for failed operations and actor metadata to diagnose access problems.

**Section sources**
- [admin_infrastructure.sql](file://admin_infrastructure.sql)
- [database_setup.sql](file://database_setup.sql)
- [migrations/20260330_000000_add_missing_indexes.sql](file://migrations/20260330_000000_add_missing_indexes.sql)

## Conclusion
The school management system employs a robust multi-tenant schema with strong RLS enforcement, centralized administrative infrastructure, and a well-defined migration strategy. The recent indexing improvements have significantly enhanced query performance across all major functional areas. The combination of helper functions, tenant-scoped policies, and comprehensive indexes ensures secure, scalable, and performant operations across schools, students, payments, academic records, and administrative functions.

## Appendices

### Appendix A: Migration Timeline and Evolution
- Bootstrap and Core
  - database_setup.sql establishes schools, subscriptions, user_profiles, attendance, and RLS helpers.
  - admin_infrastructure.sql adds audit logs, notifications, feature flags, and soft-delete support.
- Academic and Managed Accounts
  - 20260322_000000_mobile_core_tables.sql introduces managed_user_profiles, assignments, and grades.
  - 20260324_010000_academic_records_scope_model.sql evolves academic schema with subjects and teacher assignments.
- Reliability and Performance
  - 20260324_000000_reliability_performance_indexes.sql adds critical indexes.
  - **20260330_000000_add_missing_indexes.sql**: **New** - Completes indexing strategy with students.school_id, expenses.school_id, and payments.student_id indexes. Standardizes foreign key constraints to ON DELETE CASCADE.
- Specialized Tables
  - 20260326_020000_account_archives_table.sql adds account_archives with RLS.
  - 20260329_000000_teacher_activity_monitoring.sql extends monitoring capabilities.

**Section sources**
- [migrations/README.md](file://migrations/README.md)
- [database_setup.sql](file://database_setup.sql)
- [admin_infrastructure.sql](file://admin_infrastructure.sql)
- [migrations/20260322_000000_mobile_core_tables.sql](file://migrations/20260322_000000_mobile_core_tables.sql)
- [migrations/20260324_010000_academic_records_scope_model.sql](file://migrations/20260324_010000_academic_records_scope_model.sql)
- [migrations/20260324_000000_reliability_performance_indexes.sql](file://migrations/20260324_000000_reliability_performance_indexes.sql)
- [migrations/20260330_000000_add_missing_indexes.sql](file://migrations/20260330_000000_add_missing_indexes.sql)
- [migrations/20260326_020000_account_archives_table.sql](file://migrations/20260326_020000_account_archives_table.sql)
- [migrations/20260329_000000_teacher_activity_monitoring.sql](file://migrations/20260329_000000_teacher_activity_monitoring.sql)