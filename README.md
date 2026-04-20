# school-app

**Multi-Branch School Management System**  
Next.js web admin application for school operations with production-ready multi-branch architecture.

## 🎯 What This Is

A complete, production-ready school management system featuring:

✅ **Multi-Branch Architecture** - Complete branch isolation at database level  
✅ **JWT Authentication** - Secure token-based authentication with RBAC  
✅ **Core API System** - 17 production endpoints for all school operations  
✅ **Web Admin UI** - React/Next.js dashboard for administrators  
✅ **Audit Trail** - Complete operation logging for compliance  
✅ **Investor Dashboard** - Cross-branch aggregation and reporting  

## 📚 Documentation

Start here based on your role:

- **Frontend Developers** → [CORE_API_DOCUMENTATION.md](./CORE_API_DOCUMENTATION.md)
- **Backend Developers** → [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)
- **DevOps/Deployment** → [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- **Project Overview** → [PROJECT_COMPLETION_SUMMARY.md](./PROJECT_COMPLETION_SUMMARY.md)

## 🔐 Security & Isolation

This repository features:

- Multi-tenant branch isolation (Prisma proxy pattern)
- JWT-based authentication (24-hour tokens)
- Role-based access control (8-level hierarchy)
- Automatic data filtering on all queries
- Comprehensive audit logging
- Database migrations and RLS SQL

## Repo Boundaries

- Web admin UI: `app/[locale]`, `components/`, `hooks/`, `messages/`, `public/`
- Shared backend/domain: `app/api/`, `lib/`, `types/`, `proxy.ts`, `scripts/`
- DB/migrations/storage: `migrations/`, `database_setup.sql`, `admin_infrastructure.sql`

Some migration filenames still include `mobile`. That label is legacy migration history only. Those SQL files define shared managed-user schema, auth linkage, storage policies, and RLS primitives. They do not imply Expo, React Native, iOS, or Android code belongs here.

## Structure Notes

- `docs/repo-boundaries.md` documents what belongs in web, shared backend, and DB scope.
- `docs/web-admin-handoff/README.md` contains web-only design handoff material.
- `migrations/README.md` explains migration scope and the legacy naming.

## 🚀 Quick Start

### Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database and JWT settings

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

### Development

```bash
# Run development server on http://localhost:3000
npm run dev

# Run tests
bash scripts/test-core-api.sh
```

### Production Build

```bash
npm run build
npm start
```

## Deployment

Before a production deploy, run:

```bash
npm run predeploy:check
npm run check
npm run test:e2e
```

After deploy, run:

```bash
APP_URL=https://your-domain.example \
HEALTHCHECK_TOKEN=... \
npm run postdeploy:smoke

node scripts/postdeploy-smoke.mjs https://your-domain.example <healthcheck-token>
node scripts/uptime-check.mjs https://your-domain.example
psql "$DATABASE_URL" -f scripts/verify-production-db.sql
```

Production requires these environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RBAC_COOKIE_SECRET`
- `HEALTHCHECK_TOKEN`

Recommended for production:

- `NEXT_PUBLIC_SENTRY_DSN`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Operational release and rollback guidance lives in `docs/production-runbook.md`.
