# rollback-planner

## name

Rollback Planner

## description

Creates contingency plans for reverting changes when things go wrong. This skill ensures safe deployments by defining clear rollback triggers, procedures, and success criteria.

**When to use this skill:**
- Before any production deployment
- When implementing breaking changes
- During database migrations
- When rolling out major features
- When updating critical infrastructure
- Any time deployment risk exists

## instructions

1. **Understand the Change**
   - What is being deployed?
   - What components are affected?
   - What is the rollback scope?

2. **Identify Rollback Triggers**
   Define clear conditions that trigger rollback:
   - **Error-based**: X% of errors exceed threshold
   - **Performance-based**: Latency exceeds SLA
   - **Business-based**: Revenue impact detected
   - **Data-based**: Data integrity issues
   - **Custom**: Feature-specific metrics

3. **Define Rollback Scope**
   - Full rollback (everything)
   - Partial rollback (specific components)
   - Gradual rollback (feature flag off)
   - Canary rollback (revert percentage)

4. **Design Rollback Procedure**
   For each component:
   - What is the pre-deployment state?
   - How do you restore it?
   - What scripts/tools are needed?
   - Who executes each step?

5. **Estimate Rollback Time**
   - Document time for each step
   - Set overall rollback window
   - Plan for partial rollback if full takes too long

6. **Plan Data Rollback** (if applicable)
   - How to restore data integrity
   - Can data be restored incrementally?
   - What about data created during the failed deployment?

7. **Create Communication Plan**
   - Internal notification procedure
   - External communication (status page)
   - Stakeholder notification chain

8. **Document Everything**
   - Step-by-step procedures
   - Commands with exact syntax
   - Verification commands
   - Emergency contacts

9. **Test the Rollback**
   - Practice in staging
   - Verify recovery time objective (RTO)
   - Update procedure based on test

## expected input

- Description of the deployment/change
- Components affected
- Deployment strategy
- Risk level assessment
- Optional: previous rollback experience

## expected output

A rollback plan document containing:
- Rollback triggers (with thresholds)
- Rollback scope definition
- Step-by-step rollback procedure
- Estimated rollback time
- Data recovery procedures
- Verification checklist
- Communication plan
- Post-rollback actions

## example usage

```
User: We're deploying a major update to our checkout flow that includes new payment processing, updated cart logic, and a redesigned checkout UI. What should our rollback plan look like?

[Using rollback-planner]

Output:
# Rollback Plan: Checkout Flow v2.0 Deployment

## Deployment Summary

| Property | Value |
|----------|-------|
| Deployment Date | [Date] |
| Deployment Window | 10:00 AM - 2:00 PM EST |
| Components | Payment service, Cart service, Checkout UI |
| Deployment Type | Blue-green deployment |
| Risk Level | HIGH |

---

## Rollback Triggers

### Primary Triggers (Immediate Rollback)

| Metric | Threshold | Window | Action |
|--------|-----------|--------|--------|
| Error Rate | > 5% of checkout attempts | 5 minutes | Rollback immediately |
| Payment Failures | > 10% increase | 5 minutes | Rollback immediately |
| Checkout Success Rate | < 90% | 10 minutes | Rollback |
| Cart Data Loss | Any customer report | Any | Rollback immediately |

### Secondary Triggers (Investigate + Prepare)

| Metric | Threshold | Window | Action |
|--------|-----------|--------|--------|
| Latency P99 | > 3 seconds | 15 minutes | Investigate, rollback if not resolved |
| Payment Provider API Errors | > 2% | 10 minutes | Investigate |
| Revenue Impact | > 5% drop | 30 minutes | Escalate to manager |

### Canary Rollback Triggers

| % Traffic | Error Rate | Action |
|-----------|------------|--------|
| 10% → 25% | > 3% | Pause rollout, investigate |
| 25% → 50% | > 2% | Rollback to 25% |
| 50% → 100% | > 1% | Full rollback |

---

## Rollback Scope Options

### Option 1: Full Rollback
- Revert all components to previous version
- Estimated time: 15-20 minutes
- Use when: Critical data issues, security problems

### Option 2: Feature Flag Rollback (Preferred)
- Disable new checkout via feature flag
- Estimated time: 2-5 minutes
- Use when: Issues isolated to new UI/features
- Most recommended for this deployment

### Option 3: Partial Rollback
- Keep payment service, rollback UI
- Estimated time: 10-15 minutes
- Use when: Issue isolated to specific component

---

## Rollback Procedure: Feature Flag Method (Recommended)

### Pre-deployment Setup
```bash
# Verify feature flag is in place
kubectl get configmap feature-flags -n production
# Should contain: CHECKOUT_V2_ENABLED=false

# Confirm previous version is ready
kubectl get deployment checkout-service -n production
# Should show: REPLICAS=10
```

### Execution Steps

| Step | Action | Who | Time | Verification |
|------|--------|-----|------|--------------|
| 1 | **Confirm rollback trigger** | On-call | 1 min | Check metrics dashboard |
| 2 | **Declare rollback** | Tech Lead | 1 min | Slack: #incident |
| 3 | **Disable feature flag** | DevOps | 1 min | `kubectl set env deployment/checkout-service -n production CHECKOUT_V2_ENABLED=false` |
| 4 | **Verify flag updated** | DevOps | 1 min | Check flag state in configmap |
| 5 | **Restart pods to pick up change** | DevOps | 3 min | `kubectl rollout restart deployment/checkout-service -n production` |
| 6 | **Verify old version serving** | QA | 2 min | Test checkout flow manually |
| 7 | **Confirm metrics stabilize** | On-call | 5 min | Watch error rate drop |
| 8 | **Lock deployment pipeline** | DevOps | 1 min | Disable auto-deploy in CI |
| 9 | **Begin investigation** | Team Lead | - | Start post-mortem |

**Total Estimated Time: 15 minutes**

---

## Rollback Procedure: Full Blue-Green Rollback

Use this if feature flag rollback fails or for more serious issues.

### Execution Steps

| Step | Action | Who | Time | Verification |
|------|--------|-----|------|--------------|
| 1 | **Switch DNS to blue** | DevOps | 5 min | `aws route53 change-resource-record-sets --change-batch file://dns-switch-blue.json` |
| 2 | **Verify traffic on blue** | DevOps | 3 min | Check CloudWatch metrics |
| 3 | **Scale down green** | DevOps | 2 min | `kubectl scale deployment/checkout-service-v2 --replicas=0 -n production` |
| 4 | **Verify database migrations** | DBA | 5 min | Run migration rollback scripts |
| 5 | **Confirm old version healthy** | QA | 5 min | Smoke test critical paths |
| 6 | **Notify stakeholders** | Tech Lead | 2 min | Email + Status page |

**Total Estimated Time: 20-25 minutes**

---

## Data Rollback Procedures

### Scenario: Bad data written during deployment

**Step 1: Stop the bleed**
```sql
-- Immediately disable writes to affected tables
REVOKE INSERT, UPDATE ON cart_items FROM app_user;
REVOKE INSERT, UPDATE ON orders FROM app_user;
```

**Step 2: Assess scope**
```sql
-- Find records created after deployment time
SELECT COUNT(*) FROM orders 
WHERE created_at > '2024-01-15 10:00:00' 
AND status = 'pending';

-- Check for inconsistencies
SELECT * FROM cart_items 
WHERE updated_at > '2024-01-15 10:00:00'
AND user_id NOT IN (SELECT id FROM users);
```

**Step 3: Plan recovery**
- Option A: Delete bad records (if users can re-submit)
- Option B: Restore from pre-deployment backup
- Option C: Manual reconciliation

**Step 4: Execute recovery**
```sql
-- Example: Delete bad orders
BEGIN;
DELETE FROM orders WHERE created_at > '2024-01-15 10:00:00' AND status = 'pending';
DELETE FROM cart_items WHERE updated_at > '2024-01-15 10:00:00';
COMMIT;
```

---

## Verification Checklist

After any rollback, verify:

### Application Health
- [ ] Homepage loads
- [ ] User login works
- [ ] Product catalog accessible
- [ ] Checkout flow completes (test order)
- [ ] Payment processing works
- [ ] Order confirmation emails sent

### Data Integrity
- [ ] No duplicate orders
- [ ] Cart data consistent
- [ ] User sessions intact
- [ ] Inventory accurate

### Metrics
- [ ] Error rate < 0.5%
- [ ] Response time normal
- [ ] Success rate > 99%
- [ ] No anomalies in logs

---

## Communication Plan

### Internal (During Rollback)

| Time | Action | Channel |
|------|--------|---------|
| T+0 | Declare rollback | Slack: #incidents |
| T+5 | Update team | Slack: #checkout-team |
| T+15 | Status update | Slack: #engineering |
| T+30 | Resolution or escalation | All channels |

### External

| Status | Action | Channel |
|--------|--------|---------|
| Investigating | "We're investigating an issue with checkout" | Status page |
| Rollback in progress | "Checkout is temporarily unavailable" | Status page + Twitter |
| Rollback complete | "Checkout has been restored. Some orders may need to be resubmitted." | Status page + Email |

### Stakeholder Notification

| Role | When | Method |
|------|------|--------|
| Engineering Manager | Immediate | Slack DM |
| Product Manager | Within 5 min | Slack DM |
| VP Engineering | If > 30 min | Phone call |
| CEO | If > 60 min | Phone call |

---

## Post-Rollback Actions

### Immediate (First Hour)
- [ ] Document timeline of events
- [ ] Capture relevant logs and metrics
- [ ] Notify affected customers if needed
- [ ] Update status page to "Resolved"

### Investigation Phase (24-48 hours)
- [ ] Conduct RCA (Root Cause Analysis)
- [ ] Identify fix for the triggering issue
- [ ] Update monitoring/alerting
- [ ] Plan re-deployment approach

### Prevention Phase (1 week)
- [ ] Add regression tests for the issue
- [ ] Improve rollback procedure documentation
- [ ] Consider additional canary checks
- [ ] Share learnings with team

---

## Emergency Contacts

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| On-call Engineer | PagerDuty | [Number] | @oncall |
| Tech Lead | [Name] | [Number] | @[name] |
| DevOps Lead | [Name] | [Number] | @[name] |
| Database Lead | [Name] | [Number] | @[name] |
| AWS Support | Premium | 1-800-xxx | Support Console |

---

## Rollback Decision Matrix

```
Issue Detected
     │
     ├─► Can you isolate via feature flag?
     │       ├─► YES: Disable flag, monitor
     │       │        └─► Resolved? → Continue investigation
     │       └─► NO: ↓
     │
     ├─► Is data integrity affected?
     │       ├─► YES: Full rollback immediately
     │       └─► NO: ↓
     │
     ├─► Are customers impacted?
     │       ├─► YES: Full rollback
     │       └─► NO: Investigate further
     │
     └─► Error rate > 5%?
             ├─► YES: Full rollback
             └─► NO: Partial or feature flag rollback
```
