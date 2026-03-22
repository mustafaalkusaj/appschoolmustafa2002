# school-app

Next.js web admin application for school operations.

This repository is intentionally limited to:

- web admin UI
- shared Supabase/backend/domain logic
- database migrations, storage rules, and RLS SQL

This repository must not grow mobile runtime concerns such as:

- Expo
- React Native
- iOS/Android projects
- mobile screen implementations

## Repo Boundaries

- Web admin UI: `app/[locale]`, `components/`, `hooks/`, `messages/`, `public/`
- Shared backend/domain: `app/api/`, `lib/`, `types/`, `proxy.ts`, `scripts/`
- DB/migrations/storage: `migrations/`, `database_setup.sql`, `admin_infrastructure.sql`

Some migration filenames still include `mobile`. That label is legacy migration history only. Those SQL files define shared managed-user schema, auth linkage, storage policies, and RLS primitives. They do not imply Expo, React Native, iOS, or Android code belongs here.

## Structure Notes

- `docs/repo-boundaries.md` documents what belongs in web, shared backend, and DB scope.
- `docs/web-admin-handoff/README.md` contains web-only design handoff material.
- `migrations/README.md` explains migration scope and the legacy naming.

## Development

Run the development server:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```
