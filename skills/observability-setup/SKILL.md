# Observability Setup

**Name:** Observability Setup

**Description:** Implements comprehensive security observability including logging, monitoring, alerting, and tracing to detect, investigate, and respond to security incidents effectively.

**When to Use:**
- When building new services
- During security infrastructure setup
- Before production deployment
- After security incidents
- When implementing compliance requirements
- When adding new attack surfaces

**Instructions:**
1. Define security events requiring logging (auth failures, privilege changes, data access)
2. Implement structured security logging with appropriate context
3. Set up monitoring dashboards for security metrics
4. Configure alerts for suspicious activities
5. Implement request tracing for incident investigation
6. Ensure log integrity and tamper-proofing
7. Review log retention policies
8. Check for PII/sensitive data in logs
9. Set up anomaly detection baselines
10. Document incident response procedures

**Expected Input:**
- Application architecture
- Existing logging/monitoring infrastructure
- Security event requirements
- Compliance logging requirements

**Expected Output:**
- Security event catalog
- Logging implementation guidelines
- Alert rule definitions
- Dashboard configurations
- Monitoring coverage report
- Incident investigation playbook snippets
- PII handling recommendations for logs

**Example Usage:**
```
/review-code observability-setup
Scope: Authentication and data access logging
Events: Login attempts, privilege escalation, data exports
Compliance: PCI-DSS log retention and monitoring
```
