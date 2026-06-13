# Test Data Generator

## Name
seed-generator

## Description
Generates realistic test data and seed files for database testing. Creates data that follows business logic rules, maintains referential integrity, and produces statistically realistic distributions.

**When to use:**
- Setting up development environments
- Creating test fixtures
- Load testing preparation
- Demo data generation
- Unit and integration testing
- Performance testing with realistic data volumes

## Instructions

1. Analyze target tables and relationships
2. Identify required relationships (foreign keys)
3. Determine realistic data distributions
4. Generate base entities first (parent tables)
5. Generate dependent entities (child tables)
6. Apply business rules and constraints
7. Ensure referential integrity
8. Include data variation for edge cases
9. Provide both SQL and ORM formats if applicable

## Expected Input

```
- Target tables and their structure
- Required record counts
- Relationship requirements
- Data distribution requirements (e.g., 80% active, 20% inactive)
- Any specific patterns or ranges needed
- Format preference (SQL, JSON, ORM factory)
```

## Expected Output

```
- Complete seed script/file
- Population order (respecting dependencies)
- Variable data where appropriate
- Configurable counts
- Cleanup script
- Usage instructions
```

## Example Usage

**Input:**
Generate 50 users, 200 orders (average 4 per user), and 500 order_items for a shopping app.

**Output:**
```sql
-- Seed: users
INSERT INTO users (name, email, status, created_at) VALUES
('John Doe', 'john@example.com', 'active', NOW() - INTERVAL '30 days'),
('Jane Smith', 'jane@example.com', 'active', NOW() - INTERVAL '15 days'),
-- ... 48 more users with realistic variation
('User 50', 'user50@example.com', 'inactive', NOW() - INTERVAL '60 days');

-- Seed: orders (distributed across users)
-- Each user has 2-6 orders with varied statuses
INSERT INTO orders (user_id, status, total, created_at) VALUES
(1, 'completed', 125.50, NOW() - INTERVAL '20 days'),
(1, 'pending', 45.00, NOW() - INTERVAL '2 days'),
-- ... more orders with realistic status distribution
-- (60% completed, 25% pending, 15% cancelled)

-- Seed: order_items (1-5 items per order)
-- Links to products with realistic pricing and quantities
```

Configuration option: `SCALE_FACTOR=10` to generate 10x data for load testing.
