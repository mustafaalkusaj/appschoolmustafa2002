# env-auditor

## Name

Environment Auditor

## Description

Audits environment variables and configuration management, ensuring proper setup, security, and documentation. This skill focuses specifically on how the application handles configuration through environment variables.

**When to use:**
- When debugging runtime issues related to configuration
- When onboarding to a new environment
- When auditing for security compliance
- When migrating environments
- When setting up CI/CD pipelines
- When troubleshooting "works on my machine" issues

## Instructions

1. **Locate environment files:**
   - `.env`, `.env.local`, `.env.development`, `.env.production`
   - `.env.example`, `.env.template`
   - `vercel.json`, `netlify.toml` (managed service configs)
   - CI/CD variable definitions

2. **Trace environment variable usage:**
   - Search for `process.env`, `import.meta.env`, `os.environ`
   - Identify where each env var is used
   - Check for default values when not set

3. **Audit security and compliance:**
   - Identify secrets that should not be committed
   - Check for hardcoded secrets in source
   - Verify `.gitignore` excludes sensitive files
   - Check for proper secret rotation practices

4. **Document variable purposes:**
   - Categorize variables (database, API keys, feature flags)
   - Document required vs optional
   - Note any transformations applied

5. **Check documentation:**
   - Ensure `.env.example` exists and is updated
   - Verify README documents required setup

## Expected Input

- Environment to audit (development, staging, production)
- Specific variables to trace (optional)

## Expected Output

```markdown
# Environment Audit

## Environment Files

| File | Exists | In .gitignore | Purpose |
|------|--------|---------------|---------|
| .env | ✓ | ✓ | Base config |
| .env.local | ✓ | ✓ | Local overrides |
| .env.example | ✓ | - | Template |
| .env.production | ✗ | - | Missing |

## Variable Inventory

### Database
| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| DATABASE_URL | Yes | - | Prisma, migrations |
| DATABASE_POOL_SIZE | No | 10 | Connection pool |

### Authentication
| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| JWT_SECRET | Yes | - | Auth middleware |
| JWT_EXPIRY | No | 7d | Token generation |
| GOOGLE_CLIENT_ID | No | - | OAuth |

### External Services
| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| STRIPE_SECRET_KEY | Yes | - | Payments |
| SENDGRID_API_KEY | No | - | Email |
| S3_BUCKET | Yes | - | File uploads |

## Security Findings

### 🔴 Critical
| Issue | File | Line |
|-------|------|------|
| `STRIPE_SECRET_KEY` hardcoded | src/payments.ts | 23 |
| `JWT_SECRET` uses default value | src/auth.ts | 15 |

### 🟡 Warning
| Issue | File | Line |
|-------|------|------|
| `.env.production` missing | - | - |
| No secret rotation policy | - | - |

## Required Setup Checklist
- [ ] Set `DATABASE_URL` to production PostgreSQL
- [ ] Generate new `JWT_SECRET` (min 32 chars)
- [ ] Add `STRIPE_SECRET_KEY` from Stripe dashboard
- [ ] Create `.env.production` with production values
- [ ] Verify all secrets are in CI/CD variable store

## Recommended `.env.example` Content
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Auth
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=7d

# External Services (replace with real keys)
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...
```

## Missing Documentation
⚠️ No documentation for `DATABASE_POOL_SIZE` - may cause connection issues under load
```

## Example Usage

```
Load skill: env-auditor
Focus: Security audit for production
Output: Environment variable audit with security findings
```

**Best used before deployment, during security audits, or when debugging configuration-related issues.**
