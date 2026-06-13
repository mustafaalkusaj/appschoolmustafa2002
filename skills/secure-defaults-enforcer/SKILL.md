# Secure Defaults Enforcer

**Name:** Secure Defaults Enforcer

**Description:** Reviews and enforces secure default configurations across the application, ensuring security settings are safe out-of-the-box rather than requiring manual hardening.

**When to Use:**
- When setting up new projects or services
- During configuration review
- Before production deployment
- After adding new infrastructure components
- For compliance with security baselines (CIS, NIST)

**Instructions:**
1. Review application configuration files for security settings
2. Check database default configurations (credentials, encryption)
3. Verify TLS/SSL settings and certificate validation
4. Review cookie security attributes (HttpOnly, Secure, SameSite)
5. Check CORS configuration
6. Verify CSRF protection is enabled by default
7. Review error handling and debug mode settings
8. Check logging configurations for sensitive data exposure
9. Verify secure headers are set (HSTS, CSP, X-Frame-Options)
10. Review encryption at rest configurations

**Expected Input:**
- Configuration files (config files, env files, yaml, json)
- Framework and library configurations
- Infrastructure as code files
- Security policy requirements

**Expected Output:**
- List of insecure default configurations
- Required configuration changes
- Code or config patches for secure defaults
- Security header status report
- TLS/SSL configuration assessment
- Cookie security attributes report
- Debug mode and error handling review

**Example Usage:**
```
/review-code secure-defaults-enforcer
Scope: All configuration files
Framework: Express.js
Compliance: OWASP Top 10 secure defaults
```
