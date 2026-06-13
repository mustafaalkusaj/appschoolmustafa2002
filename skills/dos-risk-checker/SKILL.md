# DoS Risk Checker

**Name:** DoS Risk Checker

**Description:** Identifies potential denial of service vulnerabilities, including resource exhaustion, algorithmic complexity attacks, infinite loops, memory leaks, and lack of rate limiting.

**When to Use:**
- Before deploying new endpoints or features
- When processing user-uploaded content
- For API endpoints with heavy computation
- During security architecture review
- After DoS incidents or near-misses
- For high-traffic public endpoints

**Instructions:**
1. Identify resource-intensive operations (file processing, DB queries, API calls)
2. Check for algorithmic complexity vulnerabilities (ReDoS, quadratic algorithms)
3. Review input size limits and validation
4. Verify rate limiting implementation
5. Check for infinite loops or unbounded recursion
6. Review memory management and leak potential
7. Check connection pool limits and timeouts
8. Verify proper resource cleanup (file handles, connections)
9. Review cache and pagination implementations
10. Check for third-party service timeout configurations

**Expected Input:**
- Code with potential resource-intensive operations
- API endpoints and their expected load
- Third-party service integrations
- File processing logic

**Expected Output:**
- List of potential DoS vectors
- Resource exhaustion vulnerability findings
- ReDoS pattern matches
- Missing rate limiting findings
- Timeout configuration recommendations
- Resource cleanup issues
- Mitigation strategies for each finding

**Example Usage:**
```
/review-code dos-risk-checker
Scope: All API endpoints and data processing
Focus: Regex patterns, file uploads, database queries
Check: Rate limiting on public endpoints
```
