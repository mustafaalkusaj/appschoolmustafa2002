# Authentication Hardening

**Name:** Authentication Hardening

**Description:** Reviews and strengthens authentication mechanisms, including password policies, session management, multi-factor authentication, secure token handling, and protection against brute force attacks.

**When to Use:**
- When implementing new authentication flows
- During security audits
- Before production deployment
- After security incidents related to authentication
- When integrating new identity providers
- For compliance requirements (PCI-DSS, SOC2, HIPAA)

**Instructions:**
1. Review password policy implementation (length, complexity, hashing)
2. Check password storage mechanisms (bcrypt, Argon2, PBKDF2)
3. Verify session token generation and storage
4. Check session timeout and regeneration policies
5. Review account lockout and rate limiting mechanisms
6. Evaluate MFA implementation coverage
7. Check for secure password reset flows
8. Verify OAuth/OIDC implementation security
9. Check for credential leakage in logs or errors
10. Review API authentication mechanisms

**Expected Input:**
- Authentication-related code files
- Session management configuration
- Identity provider integrations
- Password policy requirements

**Expected Output:**
- List of authentication weaknesses found
- Specific hardening recommendations
- Code changes for improved security
- Password policy compliance status
- Session security assessment
- MFA coverage report

**Example Usage:**
```
/review-code auth-hardening
Scope: Full authentication system review
Focus areas: Password hashing, session tokens, login endpoints
Compliance: SOC2 Type II requirements
```
