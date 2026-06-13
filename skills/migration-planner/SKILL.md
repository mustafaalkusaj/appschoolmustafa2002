# migration-planner

## name

Migration Planner

## description

Creates comprehensive migration plans for transitioning between systems, database schemas, libraries, or infrastructure. This skill ensures migrations happen safely with minimal downtime.

**When to use this skill:**
- Database schema changes
- Library/framework upgrades
- Moving to new infrastructure
- Data warehouse migrations
- API version upgrades
- Breaking changes in dependencies
- Cloud provider transitions

## instructions

1. **Understand the Current State**
   - Document current system architecture
   - Identify all systems/components involved
   - Map data flows
   - Identify dependencies

2. **Define the Target State**
   - What does the new system look like?
   - What are the benefits of migration?
   - What are the non-negotiable requirements?

3. **Inventory What Needs Migration**
   - Data (volumes, formats, relationships)
   - Code/Configurations
   - User data/settings
   - Historical records
   - Third-party integrations

4. **Choose Migration Strategy**
   - **Big Bang**: Migrate all at once
     - Pros: Simple, quick
     - Cons: High risk, no rollback
   - **Phased**: Migrate in stages
     - Pros: Lower risk, can learn along the way
     - Cons: Longer, more complex
   - **Parallel Run**: Run both systems simultaneously
     - Pros: Safe, can validate
     - Cons: Expensive, sync complexity
   - **Feature Toggle**: Gradual rollout
     - Pros: Very safe, instant rollback
     - Cons: Technical overhead

5. **Plan Each Phase**
   - Define clear start/end criteria
   - Identify rollback points
   - Set success metrics
   - Plan communication strategy

6. **Design Data Migration Scripts**
   - Extract scripts
   - Transform logic
   - Load strategy
   - Validation checks
   - Idempotent where possible

7. **Plan for Data Integrity**
   - Backup strategy
   - Checksum validation
   - Partial migration recovery
   - Data reconciliation

8. **Document the Runbook**
   - Pre-migration checklist
   - Migration steps (numbered)
   - Post-migration verification
   - Rollback procedures
   - Emergency contacts

## expected input

- Current system description
- Target system description
- Migration scope
- Optional: timeline constraints
- Optional: acceptable downtime window
- Optional: historical data requirements

## expected output

A comprehensive migration plan containing:
- Executive summary
- Current vs target state
- Migration strategy selection
- Phase-by-phase breakdown
- Data migration details
- Risk mitigation
- Rollback procedures
- Verification checklist
- Communication plan
- Timeline

## example usage

```
User: We need to migrate our PostgreSQL database from version 11 to version 15, and we're running on AWS RDS.

[Using migration-planner]

Output:
# Database Migration Plan: PostgreSQL 11 → 15 on AWS RDS

## Executive Summary
Migrate production PostgreSQL database from version 11.18 to version 15.7 on AWS RDS with < 30 minutes downtime and zero data loss.

**Migration Type**: In-place upgrade with major version change
**Estimated Duration**: 4-6 hours (including verification)
**Downtime Window**: 30 minutes (maintenance window)
**Risk Level**: Medium-High

---

## Current State

| Property | Value |
|----------|-------|
| Database Engine | PostgreSQL 11.18 |
| Instance Class | db.r5.xlarge |
| Storage | 500GB (200GB used) |
| RDS Type | Single-AZ |
| Backup Retention | 7 days |
| Applications | 3 (API, Worker, Admin) |

---

## Target State

| Property | Value |
|----------|-------|
| Database Engine | PostgreSQL 15.7 |
| Instance Class | db.r5.2xlarge (upgrade for performance) |
| Storage | 500GB (auto-scale to 1TB) |
| RDS Type | Multi-AZ (new requirement) |
| Backup Retention | 14 days |
| Performance | 20% improvement expected |

---

## Migration Strategy

**Selected: Big Bang with Pre-validation**

Rationale:
- Simpler than phased for database upgrades
- Less risk than parallel (no dual-write complexity)
- In-place upgrade is supported by AWS RDS
- Acceptable downtime window (30 min)

---

## Pre-Migration Phase (1-2 weeks before)

### 1. Create Development Clone
```
- Clone RDS instance to dev environment
- Test upgrade on dev clone first
- Verify all application compatibility
```

### 2. Compatibility Testing
- [ ] Run PostgreSQL 15 compatibility check
- [ ] Test all SQL queries and stored procedures
- [ ] Verify application database drivers
- [ ] Test backup/restore procedures
- [ ] Document any required changes

### 3. Pre-migration Validations
- [ ] Full database backup completed
- [ ] All read replicas caught up
- [ ] No long-running transactions
- [ ] Application logs clean (no errors)

### 4. Communication
- [ ] Notify stakeholders of downtime window
- [ ] Update status page
- [ ] Prepare post-migration announcement

---

## Migration Phase (Maintenance Window)

### Pre-flight Checklist (30 min before)
- [ ] Verify latest automated backup completed
- [ ] Enable maintenance mode in application
- [ ] Disconnect all clients except migration scripts
- [ ] Confirm rollback resources available

### Step-by-Step Migration

| Step | Action | Duration | Verification |
|------|--------|----------|--------------|
| 1 | Create manual snapshot | 10 min | Snapshot visible in AWS console |
| 2 | Create parameter group for PG15 | 5 min | Group created with compatible settings |
| 3 | Initiate database upgrade | 5 min | AWS begins upgrade process |
| 4 | Wait for upgrade to complete | 15-30 min | Instance status = "available" |
| 5 | Verify version | 1 min | `SELECT version()` returns 15.x |
| 6 | Update parameter group | 5 min | Apply optimized PG15 parameters |
| 7 | Reboot instance | 3 min | Instance restarts |
| 8 | Run ANALYZE on all tables | 10 min | Statistics updated |
| 9 | Verify indexes | 5 min | Check for invalid indexes |
| 10 | Enable Multi-AZ | 10 min | Secondary AZ syncs |

**Total Estimated Downtime: 25-45 minutes**

### Post-Migration Verification

#### Data Integrity
- [ ] Row counts match pre-migration
- [ ] Checksums verified for critical tables
- [ ] Foreign key relationships intact
- [ ] No orphaned records

#### Application Connectivity
- [ ] API service connects successfully
- [ ] Worker service connects successfully
- [ ] Admin panel accessible
- [ ] Health checks passing

#### Performance
- [ ] Sample queries run within expected time
- [ ] No new deadlocks
- [ ] Connection pooling working

#### Feature Flags
- [ ] Migration flag set to "complete"
- [ ] Monitoring dashboards updated

---

## Rollback Plan

### If Critical Issues Found During Migration

**Trigger**: Any data integrity issue or application failure that can't be resolved in 30 minutes.

**Rollback Procedure**:
1. Stop all application connections
2. Restore from pre-migration snapshot
   ```
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier my-db-restored \
     --db-snapshot-identifier pre-migration-snapshot
   ```
3. Wait for restore to complete (10-20 min)
4. Update connection strings
5. Verify application connectivity
6. Declare rollback complete

**Rollback Time**: 30-45 minutes
**Data Loss**: None (from snapshot)

### Rollback Decision Tree

```
Issue detected during migration?
    │
    ├─► YES: Can it be fixed in 30 min?
    │       ├─► YES: Fix and continue
    │       └─► NO: Rollback
    │
    └─► NO: Continue monitoring
         └─► Post-migration issues?
              ├─► YES: Patches only, no full rollback
              └─► NO: Migration complete
```

---

## Post-Migration (1 week after)

### Immediate (Day 1)
- [ ] Monitor error rates
- [ ] Watch performance metrics
- [ ] Keep old snapshot for 72 hours

### Short-term (Week 1)
- [ ] Fine-tune PostgreSQL 15 parameters
- [ ] Review query performance improvements
- [ ] Update documentation with new version
- [ ] Archive old backup snapshots

### Long-term (Month 1)
- [ ] Deprecate old connection strings
- [ ] Update DR runbooks
- [ ] Conduct post-mortem

---

## Timeline

| Date | Activity |
|------|----------|
| Week -2 | Create dev clone, test upgrade |
| Week -1 | Compatibility testing, final prep |
| Day -3 | Final backup, pre-migration checks |
| Day -1 | Communication, maintenance mode ready |
| **Migration Day** | Execute migration during window |
| Day +1 | Post-migration monitoring |
| Week +1 | Performance tuning |

---

## Team & Contacts

| Role | Name | Contact |
|------|------|---------|
| Migration Lead | [Name] | [Contact] |
| DBA | [Name] | [Contact] |
| Application Lead | [Name] | [Contact] |
| AWS Support | | Premium Support |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Application incompatibility | Medium | High | Pre-test on dev clone |
| Upgrade takes longer than window | Low | Medium | Timebox, rollback if exceeded |
| Data corruption | Very Low | Critical | Pre-migration backup + snapshot |
| Performance regression | Low | Medium | Post-migration tuning period |
```
