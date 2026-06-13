# Security Policy

## Supported Scope

This repository is the web admin and shared backend/domain layer for the school platform.
Security fixes should be applied against the current production branch first.

## Current Security Controls

- Signed RBAC session cookies for web access control.
- Supabase Auth for authenticated identities.
- Row-level security and tenant-scoped policies in SQL migrations.
- Server-side role and school-scope checks on management APIs.
- Rate limiting on sensitive admin and session routes.
- Security headers at the Next.js edge layer.

## Reporting a Vulnerability

Do not open public GitHub issues for security problems.

Report vulnerabilities privately to the project owner/maintainer with:

- affected route, page, or module
- reproduction steps
- impact assessment
- sample request or payload if relevant

If the issue involves credential exposure, privilege escalation, tenant isolation failure, or service-role misuse, treat it as critical and rotate affected secrets before wider disclosure.

## Operational Expectations

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and rotate it on suspected exposure.
- Apply migrations before deploying application code that depends on new RLS or schema behavior.
- Review `npm audit` output regularly.
- Re-run lint, typecheck, build, and load tests before production rollout.
