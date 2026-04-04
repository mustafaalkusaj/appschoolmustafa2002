# Database Deployment Planner

## Name
db-rollout-planner

## Description
Creates comprehensive deployment plans for database changes that minimize downtime and risk. Includes rollback strategies, feature flags, zero-downtime migration patterns, and validation procedures.

**When to use:**
- Production deployment planning
- Large schema changes
- High-traffic database modifications
- Critical system updates
- Multi-environment rollout coordination
- Risk assessment for database changes

## Instructions

1. Analyze the scope of database changes
2. Assess potential downtime risks
3. Determine zero-downtime migration strategy
4. Plan phased rollout if needed
5. Design rollback procedures
6. Create pre-deployment checklist
7. Plan monitoring and validation steps
8. Document communication plan
9. Estimate total deployment time

## Expected Input

```
- Database changes to deploy (migrations, scripts)
- Current database version/state
- Deployment environment (production, staging, etc.)
- Application release timeline
- Maintenance window availability
- Traffic patterns and peak hours
```

## Expected Output

```
- Deployment phases and timeline
- Zero-downtime migration approach
- Rollback procedures with steps
- Pre-deployment checklist
- Monitoring metrics to watch
- Post-deployment validation
- Risk assessment and mitigations
- Communication templates
```

## Example Usage

**Input:**
Add new `categories` table, modify `products` table (add column), create index on `products.category_id`

**Output:**
```
DATABASE DEPLOYMENT PLAN
========================
Date: 2024-01-15 | Window: 2:00-4:00 AM UTC
Estimated Duration: 45 minutes

PHASE 1: Pre-Deployment (Before maintenance window)
- [ ] Backup complete database (users table priority)
- [ ] Test migration on staging environment
- [ ] Verify application compatibility
- [ ] Prepare rollback scripts
- [ ] Notify on-call team

PHASE 2: Zero-Downtime Migration
Step 1 (5 min): Create categories table
  - Safe: New table, no locking
  
Step 2 (15 min): Add category_id to products
  - Strategy: Add nullable column first
  - No downtime: Uses ALGORITHM=INPLACE on MySQL
  
Step 3 (10 min): Backfill category_id (batch 1000)
  - Run during low traffic
  - Monitor: Replication lag < 5s
  
Step 4 (5 min): Add NOT NULL constraint
  - Requires all rows populated first
  
Step 5 (10 min): Create index
  - Use ONLINE option if available

PHASE 3: Validation (15 min)
- [ ] Verify table structures
- [ ] Test application queries
- [ ] Monitor error rates
- [ ] Check slow query log

PHASE 4: Rollback (If needed)
- [ ] Execute rollback migration
- [ ] Verify data integrity
- [ ] Test application functionality

Risk Level: MEDIUM
Mitigation: Feature flag allows disabling category features
```
