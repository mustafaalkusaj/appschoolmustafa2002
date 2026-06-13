# estimate-helper

## name

Estimate Helper

## description

Provides structured estimation for tasks based on scope analysis, historical data patterns, and risk considerations. This skill helps produce reliable time and effort estimates.

**When to use this skill:**
- During sprint planning
- When scoping a new feature
- Before committing to deadlines
- When reviewing another developer's estimate
- When planning project timelines
- Any time you need to justify time requirements

## instructions

1. **Understand the Task Thoroughly**
   - Read the full requirements
   - Clarify any ambiguities
   - Understand the end goal

2. **Break Down the Task**
   - Use task-decomposer if needed
   - List all sub-tasks explicitly
   - Identify each file/module to touch

3. **Estimate Each Component**
   - Use historical data if available
   - Apply similar task comparisons
   - Consider complexity factors:
     - New vs. known patterns
     - Integration complexity
     - Testing requirements

4. **Apply Estimation Multipliers**
   - **Research/Uncertainty**: 1.5x - 3x for unfamiliar areas
   - **Integration**: 1.2x - 1.5x for external dependencies
   - **Testing**: Add 25-50% for comprehensive testing
   - **Code Review**: Add time for review cycles
   - **Buffer**: 10-20% for unexpected issues

5. **Provide Multiple Estimates**
   - **Optimistic**: Best case, everything goes smoothly
   - **Realistic**: Expected with typical issues
   - **Pessimistic**: Worst case with complications

6. **Document Assumptions**
   - What are you assuming will be straightforward?
   - What could make this take longer?
   - Are dependencies resolved?

7. **Provide Confidence Level**
   - High: 80%+ confidence in estimate
   - Medium: 50-80% confidence
   - Low: Under 50% confidence, needs more analysis

8. **Break Down by Activity**
   - Implementation
   - Testing
   - Code review
   - Documentation
   - Buffer

## expected input

- Task description or user story
- Optional: acceptance criteria
- Optional: similar past tasks for comparison
- Optional: deadline constraints

## expected output

An estimation breakdown containing:
- Task summary
- Component estimates
- Total estimate (optimistic/realistic/pessimistic)
- Confidence level
- Key assumptions
- Risk factors that could change estimate
- Breakdown by activity type

## example usage

```
User: Add email verification to user registration flow

[Using estimate-helper]

Output:
# Estimation: Email Verification Feature

## Task Summary
Add email verification to user registration with:
- Email sent after registration
- Verification link in email
- Token validation and user activation
- Resend verification option
- Verification status in user profile

## Component Breakdown

### Backend (12-16 hours)
| Component | Estimate | Notes |
|-----------|----------|-------|
| Email service setup | 2h | Integrate with SendGrid/SES |
| Email template creation | 3h | HTML email with styles |
| Token generation utility | 1h | Secure random token |
| Verification endpoint | 2h | Validate token, update user |
| User model updates | 1h | Add verified flag, token fields |
| Resend endpoint | 2h | Rate limited resend |
| Unit tests | 3h | 80% coverage target |

### Frontend (10-14 hours)
| Component | Estimate | Notes |
|-----------|----------|-------|
| Email input validation | 1h | Client-side validation |
| Success state after registration | 2h | Show "check email" message |
| Verification landing page | 3h | Handle success/error states |
| Resend verification UI | 2h | With cooldown timer |
| User profile indicator | 1h | Show verified badge |
| Loading/error states | 2h | Full state handling |

### Integration (4-6 hours)
| Component | Estimate | Notes |
|-----------|----------|-------|
| Email service testing | 2h | Integration with provider |
| End-to-end verification flow | 2h | Full happy path test |
| Error scenario testing | 2h | Invalid/expired tokens |

## Time Estimates

| Scenario | Hours | Days |
|----------|-------|------|
| Optimistic | 22h | 3 days |
| **Realistic** | **28h** | **3.5 days** |
| Pessimistic | 38h | 5 days |

**Recommended Estimate: 3.5 days (28 hours)**

## Confidence Level: Medium (65%)

## Assumptions
- Email service (SendGrid) account is already configured
- User model schema can be modified
- Frontend routing already has necessary structure
- Email templates can be created without design involvement

## Risk Factors
- **Email deliverability issues** (+4h): May need SPF/DKIM setup
- **Token security review** (+3h): Security team may require changes
- **Email template revisions** (+3h): If design feedback needed

## Breakdown by Activity
- Implementation: 16h (57%)
- Testing: 8h (29%)
- Review & Polish: 4h (14%)
- **Total: 28h**

## Buffer Recommendation
Add 20% buffer: 28h × 1.2 = **33.6 hours (4.5 days)**

## Historical Comparison
Similar feature (SMS verification) took 40 hours. Email verification is slightly simpler, estimated at 28 hours.
```
