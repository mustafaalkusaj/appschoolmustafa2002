# Permission Auditor

**Name:** Permission Auditor

**Description:** Audits access control mechanisms, role-based permissions, file system permissions, and API authorization to ensure users can only access resources they are authorized for.

**When to Use:**
- When implementing new features with access control
- During access control code review
- After adding new user roles or permissions
- Before granting new service integrations
- During compliance audits
- When investigating unauthorized access incidents

**Instructions:**
1. Map all user roles and permission levels
2. Review authorization checks at each protected resource
3. Check for privilege escalation vulnerabilities
4. Verify principle of least privilege is followed
5. Audit file and directory permissions
6. Review API endpoint authorization
7. Check for insecure direct object references (IDOR)
8. Verify cross-tenant data isolation
9. Review admin/superuser access controls
10. Check for horizontal and vertical privilege escalation

**Expected Input:**
- Code files implementing authorization logic
- Role and permission definitions
- User role assignments
- Protected resource endpoints

**Expected Output:**
- Complete permission matrix/audit trail
- List of missing or weak authorization checks
- Privilege escalation vulnerability findings
- IDOR vulnerability report
- File permission issues
- Remediation recommendations with code examples
- Access control test cases

**Example Usage:**
```
/review-code permission-auditor
Scope: All API endpoints and admin functions
Roles to audit: Admin, Editor, Viewer, Guest
Focus: IDOR vulnerabilities and privilege escalation
```
