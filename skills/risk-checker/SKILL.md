# risk-checker

## name

Risk Checker

## description

Identifies potential risks, failure modes, and vulnerabilities in a proposed implementation or change. This skill helps anticipate problems before they occur.

**When to use this skill:**
- Before implementing a new feature
- When planning a major refactor
- Before database migrations
- When integrating with external services
- When changes affect security or data integrity
- During code review planning
- Any time you want to proactively identify problems

## instructions

1. **Understand the Change**
   - What is being changed?
   - What is the expected behavior?
   - What systems are involved?

2. **Categorize Risk Types**
   - **Technical Risks**: Code quality, performance, scalability
   - **Security Risks**: Vulnerabilities, data exposure, authentication
   - **Operational Risks**: Deployment, monitoring, recovery
   - **Business Risks**: Data loss, downtime, compliance
   - **Integration Risks**: API changes, dependency failures

3. **Identify Specific Risks**
   For each category, ask:
   - What could go wrong?
   - What happens if this fails?
   - What edge cases exist?
   - What dependencies could fail?

4. **Assess Risk Severity**
   - **Critical**: Data loss, security breach, complete system failure
   - **High**: Major feature broken, significant user impact
   - **Medium**: Degraded experience, workaround available
   - **Low**: Minor inconvenience, easily fixed

5. **Assess Probability**
   - **Likely**: Expected to occur
   - **Possible**: Might occur under certain conditions
   - **Unlikely**: Rare but possible
   - **Rare**: Very unlikely but catastrophic if occurs

6. **Mitigation Strategies**
   - For each high/critical risk, propose:
     - Prevention (avoid the risk)
     - Detection (how to catch it early)
     - Response (what to do if it occurs)

7. **Document and Prioritize**
   - List risks by priority
   - Include recommended actions
   - Set risk owners if in a team context

## expected input

- A description of the planned change or implementation
- Optional: existing codebase context
- Optional: specific concerns mentioned by user

## expected output

A risk assessment report containing:
- Risk matrix (severity × probability)
- List of identified risks with descriptions
- Impact analysis for each risk
- Mitigation strategies
- Recommended preventive measures
- Monitoring/alerting recommendations

## example usage

```
User: We're adding file upload functionality to our app with 100MB limit

[Using risk-checker]

Output:
# Risk Assessment: File Upload Feature (100MB limit)

## Risk Matrix

| Risk | Probability | Severity | Priority |
|------|-------------|----------|----------|
| DDoS via large uploads | Possible | Critical | P1 |
| Storage exhaustion | Likely | High | P1 |
| Memory exhaustion | Possible | High | P1 |
| Malicious file types | Possible | High | P1 |
| Slow upload blocking UI | Likely | Medium | P2 |
| Network timeout failures | Likely | Medium | P2 |
| Incomplete uploads cluttering storage | Likely | Medium | P2 |

## Identified Risks

### P1 - Critical/High Risks

#### 1. Storage Exhaustion
- **Description**: Users uploading many large files could fill server storage
- **Impact**: System crash, other features unavailable
- **Probability**: Likely
- **Mitigation**:
  - Implement per-user storage quotas
  - Add storage monitoring alerts at 80% capacity
  - Implement automatic cleanup of incomplete uploads after 24h

#### 2. Memory Exhaustion
- **Description**: Loading 100MB files into memory could exceed Node.js limits
- **Impact**: Server crash, memory leaks
- **Probability**: Possible
- **Mitigation**:
  - Use streaming uploads, not buffering
  - Set memory limits per request
  - Add request size validation before processing

#### 3. Malicious File Types
- **Description**: Users could upload executable files or scripts
- **Impact**: Security vulnerability if files are served publicly
- **Probability**: Possible
- **Mitigation**:
  - Validate file MIME types server-side
  - Store files outside web root
  - Use random filenames with original name metadata only
  - Scan uploads with ClamAV

### P2 - Medium Risks

#### 4. Slow Upload Blocking UI
- **Description**: Large uploads block main thread or cause unresponsive UI
- **Impact**: Poor user experience
- **Mitigation**: Use chunked uploads with progress indicator

#### 5. Network Timeout Failures
- **Description**: Slow connections may timeout before 100MB upload completes
- **Impact**: Failed uploads, frustrated users
- **Mitigation**: Implement resumable uploads, chunked transfer

#### 6. Incomplete Upload Cleanup
- **Description**: Aborted uploads leave orphan files
- **Impact**: Wasted storage
- **Mitigation**: Scheduled cleanup job, mark incomplete uploads

## Recommended Monitoring
- Storage usage per user (prometheus metric)
- Upload success/failure ratio
- Upload duration histogram
- Active upload count
- Memory usage during uploads

## Pre-launch Checklist
- [ ] Storage quota system in place
- [ ] Streaming upload implemented
- [ ] File type validation working
- [ ] Upload progress UI complete
- [ ] Cleanup job tested
- [ ] Load testing completed
- [ ] Monitoring dashboards set up
```
