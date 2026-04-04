# config-scanner

## Name

Configuration Scanner

## Description

Scans and summarizes all configuration files in a project, extracting key settings and identifying potential issues. This skill provides a consolidated view of how the project is configured.

**When to use:**
- When debugging configuration-related issues
- When setting up a new environment
- When auditing security configuration
- When migrating between environments
- When documenting project setup

## Instructions

1. **Locate all configuration files:**
   - Root level: `.env`, `.env.example`, `.env.local`, `config.ts`
   - Build: `vite.config.ts`, `webpack.config.js`, `next.config.js`, `tsconfig.json`
   - Testing: `jest.config.js`, `vitest.config.ts`, `.mocharc.json`
   - Linting: `.eslintrc`, `.eslintrc.json`, `.prettierrc`
   - Framework: `tailwind.config.js`, `prisma/schema.prisma`
   - Docker: `Dockerfile`, `docker-compose.yml`, `.dockerignore`
   - CI/CD: `.github/workflows/*.yml`, `.gitlab-ci.yml`

2. **Parse and extract settings:**
   - Development vs production configurations
   - Feature flags
   - Environment-specific overrides
   - Plugin/extension configurations

3. **Identify configuration issues:**
   - Missing `.env.example` file
   - Hardcoded values that should be environment variables
   - Inconsistent configuration patterns
   - Outdated configuration formats
   - Security concerns (exposed secrets, permissive CORS)

4. **Document configuration hierarchy:**
   - How configs override each other
   - Environment variable precedence
   - Build-time vs runtime configuration

## Expected Input

- Environment to focus on (development, production, test) - optional
- Specific config type to audit (security, build, database) - optional

## Expected Output

```markdown
# Configuration Audit

## Configuration Files Found

| File | Purpose | Priority |
|------|---------|----------|
| .env | Base environment | 1 |
| .env.local | Local overrides | 2 |
| .env.production | Production overrides | 3 |
| vite.config.ts | Build tool | - |
| tsconfig.json | TypeScript config | - |

## Environment Variables

### Required (not set)
| Variable | Description | Used In |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection | prisma, api |
| STRIPE_SECRET_KEY | Stripe API key | payments |

### Optional (with defaults)
| Variable | Default | Description |
|----------|---------|-------------|
| API_TIMEOUT | 30000 | Request timeout (ms) |
| LOG_LEVEL | info | Logging verbosity |

## Build Configuration Summary

**Vite:**
- Mode: development (default)
- Target: es2020
- Plugins: react(), tailwindcss(), daisyui()

**TypeScript:**
- Strict mode: enabled
- Path aliases: @/* → src/*

## Security Audit

| Issue | Severity | Location |
|-------|----------|----------|
| CORS allows all origins | HIGH | src/middleware/cors.ts:5 |
| DEBUG mode in production | MEDIUM | .env:3 |

## Configuration Issues
⚠️ `.env.example` is missing - developers won't know required variables
⚠️ `STRIPE_SECRET_KEY` appears in source code at `src/payments/index.ts:12`
```

## Example Usage

```
Load skill: config-scanner
Focus: Security audit
Output: Configuration security analysis
```

**Best used when setting up new environments, debugging, or auditing project configuration.**
