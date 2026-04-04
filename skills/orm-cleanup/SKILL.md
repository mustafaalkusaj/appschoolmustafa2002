# ORM Code Cleaner

## Name
orm-cleanup

## Description
Refactors ORM (Object-Relational Mapping) code to follow best practices, improve performance, and maintain consistency. Identifies N+1 query patterns, inefficient eager loading, and anti-patterns in ORM usage.

**When to use:**
- Code review of ORM usage
- Performance troubleshooting
- Refactoring legacy ORM code
- Training developers on ORM best practices
- Pre-deployment review
- Reducing database load

## Instructions

1. Review ORM query patterns in the code
2. Identify inefficient patterns (N+1, missing includes, etc.)
3. Check for proper use of query builders
4. Verify eager vs lazy loading appropriateness
5. Look for raw SQL that could use ORM features
6. Check for mass assignment vulnerabilities
7. Verify transaction handling
8. Suggest refactored code with explanations
9. Provide performance impact estimate

## Expected Input

```
- ORM framework (Eloquent, TypeORM, SQLAlchemy, ActiveRecord, etc.)
- Code snippet or file path
- Context of the operation (controller, model, service)
- Any existing performance issues noted
```

## Expected Output

```
- Identified issues with severity level
- Before/after code comparison
- Performance impact estimate
- Best practice recommendations
- Alternative approaches
```

## Example Usage

**Input (Laravel/Eloquent):**
```php
$users = User::all();
foreach ($users as $user) {
    echo $user->posts->count();
}
```

**Output:**
```
Issue: N+1 Query Problem (HIGH)
- 1 query for users + N queries for posts
- For 100 users: 101 database queries

Refactored:
$users = User::withCount('posts')->get();
// OR
$users = User::with('posts')->get();

Impact: Reduces 101 queries to 2 queries (98% improvement)

Additional Recommendations:
- Add $withCount = ['posts'] to User model
- Use pagination for large result sets
```
