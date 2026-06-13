---
name: school-app-security
description: Security hardening practices for the school-app Next.js application with Supabase. Use when implementing authentication, fixing security vulnerabilities, handling passwords, or securing API endpoints.
---

# School App Security

Security hardening practices for the school-app multi-tenant SaaS application.

## Authentication Security

### Temporary Passwords
- Generate cryptographically secure temporary passwords
- Force password change on first login
- Set expiration on temporary passwords (24 hours max)

### Session Management
- Use Supabase Auth with JWT tokens
- Implement proper session timeout
- Validate sessions on protected routes

### Password Requirements
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, symbols
- Check against common password lists
- Rate limit login attempts

## Multi-Tenant Security

### Row Level Security (RLS)
- Always enable RLS on tenant-specific tables
- Use `school_id` column for data isolation
- Validate tenant access in every query

### Supabase Query Safety
```sql
-- Always filter by school_id
SELECT * FROM students 
WHERE school_id = auth.jwt() ->> 'school_id';

-- Use policies for automatic filtering
CREATE POLICY "Users see own school data"
ON students FOR SELECT
USING (school_id = auth.jwt() ->> 'school_id');
```

## API Security

### Input Validation
- Validate all user inputs with Zod schemas
- Sanitize HTML content
- Use parameterized queries (never string concatenation)

### Rate Limiting
- Implement rate limiting on auth endpoints
- Use Supabase built-in rate limiting
- Add custom rate limiting for sensitive operations

### CORS Configuration
- Whitelist specific origins
- Never use `*` in production
- Validate origin headers

## Common Vulnerabilities to Check

- [ ] SQL injection via raw queries
- [ ] XSS via unsanitized input
- [ ] CSRF on state-changing operations
- [ ] Exposed sensitive data in logs
- [ ] Missing authorization checks
- [ ] Insecure direct object references
- [ ] Missing rate limiting

## Security Checklist

Before deploying changes:

1. Run `npm run typecheck` to catch type errors
2. Review all new API endpoints for auth checks
3. Verify RLS policies cover new tables
4. Check for exposed secrets in client code
5. Validate all form inputs
