# Incident Summary Writer

## Name
incident-summary-writer

## Description
Creates structured incident summaries and post-mortems. Produces clear documentation of what happened, impact, timeline, and actions to prevent recurrence.

**When to use:**
- After resolving a production incident
- Creating post-mortem documentation
- Reporting to stakeholders about an outage
- Capturing learnings from a failure
- Building a knowledge base of past issues

## Instructions

1. **Gather facts**: Collect timeline, impact, and root cause
2. **Identify timeline**: When was it detected, escalated, resolved
3. **Document impact**: Users affected, duration, business impact
4. **Explain root cause**: What technically caused the incident
5. **Review response**: How was it detected and resolved
6. **Extract learnings**: What could be done differently
7. **Define action items**: Specific tasks to prevent recurrence
8. **Format professionally**: Use clear structure and plain language

## Expected Input

- Incident timeline and events
- Root cause analysis
- Impact metrics (duration, users affected, etc.)
- Detection and resolution methods used
- Team involved in response

## Expected Output

- Structured incident summary document
- Timeline of events
- Root cause explanation
- Impact assessment
- Lessons learned
- Action items with owners and deadlines

## Example Usage

```
User: Write an incident summary for the database outage on March 15.
Duration: 45 minutes, 12,000 users affected, root cause was
index fragmentation during peak migration.

Skill will:
1. Structure the information into a professional document
2. Create a clear timeline
3. Quantify impact
4. Explain root cause clearly
5. Define action items for prevention
```

## Output Format

```markdown
# Incident Report: [Title]

## Summary
[2-3 sentence overview]

## Impact
- **Duration**: [start] to [end] ([X hours/minutes])
- **Users Affected**: [number or percentage]
- **Services Impacted**: [list]
- **Business Impact**: [description]

## Timeline
| Time | Event |
|------|-------|
| HH:MM | Event description |
| ... | ... |

## Root Cause
[Technical explanation of what caused the incident]

## Detection & Response
**Detected by**: [how it was discovered]
**Time to detect**: [duration]
**Time to resolve**: [duration]

## Lessons Learned
### What Went Well
- [positive observation]

### What Could Be Improved
- [improvement opportunity]

## Action Items
| Action | Owner | Priority | Due Date |
|--------|-------|----------|----------|
| ... | ... | ... | ... |

## Related Documentation
[links to relevant docs, runbooks, configs]
```
