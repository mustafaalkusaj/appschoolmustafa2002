# Migrations

This directory is for database schema, storage, and RLS changes only.

## Current Scope

- shared managed-user auth/domain tables
- teacher assignment and subject schema
- storage bucket and storage policies
- RLS helper functions and access policies

## Legacy Naming

Some filenames still contain `mobile`. Do not treat that as a signal that mobile UI belongs in this repository.

- `20260322_000000_mobile_core_tables.sql`
  Shared managed-user tables, auth links, assignments, grades, and notifications.
- `20260322_mobile_attachments_storage.sql`
  Storage bucket setup and storage access policies.
- `20260322_managed_mobile_rls.sql`
  Managed-user helper functions and RLS access rules.

The safest approach is to keep existing migration filenames stable and clarify their intent with comments and documentation instead of renaming historical SQL files.

## 2026-04-27 — Migration drift resolved (P-0401)

Three migration files were applied to production outside the migration file system.
All tables confirmed present in DB via `information_schema.tables` query.

| Migration file | Status |
|---|---|
| `20260425_ops_monitoring.sql` | Applied — ops_health_reports, ops_pending_actions, app_notifications, support_tickets ✅ |
| `20260426_ops_error_capture.sql` | Applied — ops_errors ✅ |
| `20260426_advanced_ops_extensions.sql` | Applied — extensions to ops tables ✅ |
| `20260427_000000_audit_logs_append_only.sql` | Applied via MCP 2026-04-27 ✅ |

No `schema_migrations` tracking table exists — this project applies SQL directly.
Tracking is done by this README file and git history.

## Related SQL Files Outside This Folder

- `database_setup.sql`
  Base schema bootstrap, attendance, RBAC, and core school/subscription setup.
- `admin_infrastructure.sql`
  Audit logs, notifications, feature flags, soft-delete support, and super-admin infrastructure.
