# Repo Boundaries

This repository should stay focused on three concerns only:

1. Web admin UI
2. Shared Supabase/backend/domain logic
3. Database migrations, storage, and RLS

## Web Admin UI

These files are specific to the browser-based admin product:

- `app/[locale]/` for the real routed web screens
- `app/layout.tsx` and route redirects under `app/*/page.tsx`
- `components/` for visual and interaction components
- `hooks/` for browser/UI state hooks
- `messages/` and `public/` for localized copy and static assets
- `app/[locale]/globals.css` for the web styling layer

## Shared Backend And Domain

These files define business rules, Supabase access, RBAC, and route handlers shared by the deployed web app backend:

- `app/api/` for HTTP route handlers
- `lib/auth.ts`, `lib/supabase.ts`, `lib/supabase-server.ts`, `lib/rbac-session.ts`
- `lib/managed-users.ts`, `lib/managed-users-server.ts`
- `lib/school-context.ts`, `lib/school-scope.ts`, `lib/admin-infrastructure.ts`
- `lib/audit.ts`, `lib/flags.ts`, `lib/branding.ts`, `lib/locale-routing.ts`
- `types/roles.ts`
- `proxy.ts`
- `scripts/create-default-users.mjs`

## Database, Migrations, And Storage

These files are database-owned assets and should stay SQL-only:

- `migrations/*.sql`
- `database_setup.sql`
- `admin_infrastructure.sql`

The migration filenames containing `mobile` are legacy names kept for migration-history safety. Their actual scope is shared managed-user backend schema:

- auth linkage for students and teachers
- managed user profiles and credentials
- assignments, grades, subjects, and teacher assignments
- notifications and storage bucket policies
- RLS helper functions and access rules

## What Does Not Belong Here

Keep these concerns out of this repo:

- Expo configuration
- React Native components
- native iOS/Android projects
- mobile navigation, screen, and device-only assumptions

If a future student/teacher mobile app is built, it should live in its own repository and consume the shared Supabase schema and policies from this codebase rather than colocating mobile UI here.
