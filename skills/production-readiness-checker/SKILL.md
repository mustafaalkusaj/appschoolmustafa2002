# Production Readiness Checker

**Name:** Production Readiness Checker

**Description:** Comprehensive checklist review to ensure applications meet production readiness criteria including security controls, reliability, scalability, monitoring, and operational excellence.

**When to Use:**
- Before production deployment
- During release readiness reviews
- After significant architecture changes
- For quarterly production audits
- When onboarding new services
- Before SOC2/ISO27001 compliance reviews

**Instructions:**
1. Review security controls implementation:
   - Authentication and authorization
   - Data encryption (in transit and at rest)
   - Input validation and output encoding
   - Secrets management
   - Security headers
2. Check operational readiness:
   - Health checks and graceful degradation
   - Rate limiting and throttling
   - Circuit breakers
   - Timeouts and retry policies
3. Verify observability:
   - Structured logging
   - Metrics and monitoring
   - Distributed tracing
   - Alerting rules
4. Review configuration management:
   - Environment-specific configs
   - Feature flags
   - Secrets rotation
5. Check backup and recovery:
   - Data backup procedures
   - Disaster recovery plans
   - Failover mechanisms
6. Review documentation:
   - Runbooks
   - Architecture documentation
   - Security policies

**Expected Input:**
- Application codebase
- Infrastructure configurations
- Deployment procedures
- Security requirements
- Compliance framework requirements

**Expected Output:**
- Production readiness checklist with pass/fail status
- Security controls gap analysis
- Operational readiness assessment
- Critical issues blocking production
- Recommended fixes with priorities
- Sign-off checklist for release

**Example Usage:**
```
/review-code production-readiness-checker
Scope: Full production readiness audit
Framework: SOC2 Type II requirements
Environment: Cloud-native microservices
```
