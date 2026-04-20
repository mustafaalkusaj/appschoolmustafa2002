# ⚡ Quick Reference Card

**For Developers:** Quick guide to use new utilities in API routes

---

## 1. Add Logging (30 seconds)

```typescript
// 1. Import
import { createApiLogger } from "@/lib/api-logger";

// 2. In your handler, add 3 lines:
const log = createApiLogger({ endpoint: "/api/your/path" });
log.logRequest("GET");
log.logResponse(200);
log.logError(error);  // in catch block
```

**Before:**
```typescript
export async function GET(req: NextRequest) {
  const data = await fetch();
  return NextResponse.json(data);
}
```

**After:**
```typescript
export async function GET(req: NextRequest) {
  const log = createApiLogger({ endpoint: "/api/your/path" });
  try {
    log.logRequest("GET");
    const data = await fetch();
    log.logResponse(200);
    return NextResponse.json(data);
  } catch (error) {
    log.logError(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

---

## 2. Add Validation (30 seconds)

```typescript
// 1. Import schema
import { studentSchema, safeValidate } from "@/lib/validators";

// 2. In your handler:
const validation = safeValidate(studentSchema, body);
if (!validation.success) {
  return NextResponse.json({ errors: validation.errors }, { status: 400 });
}
const student = validation.data;  // Now properly typed!
```

**Before:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const student = await db.students.create(body);  // No validation!
  return NextResponse.json(student);
}
```

**After:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const validation = safeValidate(studentSchema, body);
  if (!validation.success) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 });
  }
  const student = await db.students.create(validation.data);  // Validated!
  return NextResponse.json(student);
}
```

---

## 3. API Logger Methods

```typescript
const log = createApiLogger({ endpoint: "/api/endpoint" });

// Track request
log.logRequest("POST", { additionalContext: "value" });

// Track response
log.logResponse(200, { recordsProcessed: 150 });

// Track errors
log.logError(error, { endpoint: "/api/endpoint" });

// Track data changes
log.logDataModification("create", "students", studentId, {
  name: "John Doe",
  classId: "class-123"
});

// Track database operations
log.logDatabaseOperation("SELECT", "students");

// Track auth events
log.logAuthEvent("login", "Successful login");
log.logAuthEvent("failed_login", "Invalid credentials");

// Get elapsed time
const elapsed = log.getElapsedTime();  // milliseconds since request start

// Unique request ID for correlation
console.log(log.requestId);  // e.g., "abc123def"
```

---

## 4. Available Validation Schemas

```typescript
import {
  // Auth
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  
  // Students
  studentSchema,
  studentQuerySchema,
  bulkStudentImportSchema,
  
  // Payments
  paymentSchema,
  paymentQuerySchema,
  
  // Salaries
  salarySchema,
  salaryQuerySchema,
  
  // Attendance
  attendanceSchema,
  attendanceQuerySchema,
  
  // Accounts
  accountSchema,
  accountQuerySchema,
  
  // Transactions
  transactionSchema,
  transactionQuerySchema,
  
  // Employees
  employeeSchema,
  employeeQuerySchema,
  
  // Schools/Branches
  schoolSchema,
  branchSchema,
  
  // Utility functions
  safeValidate,
  getValidationError
} from "@/lib/validators";
```

---

## 5. Common Patterns

### List Endpoint with Pagination
```typescript
export async function GET(req: NextRequest) {
  const log = createApiLogger({ endpoint: "/api/items" });
  
  try {
    log.logRequest("GET");
    
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") || "20"));
    
    const [items, total] = await Promise.all([
      db.items.findMany({ skip: (page - 1) * limit, take: limit }),
      db.items.count()
    ]);
    
    log.logResponse(200);
    return NextResponse.json({
      items,
      pagination: { page, limit, total }
    });
  } catch (error) {
    log.logError(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

### Create Endpoint with Validation
```typescript
export async function POST(req: NextRequest) {
  const log = createApiLogger({ endpoint: "/api/items" });
  
  try {
    log.logRequest("POST");
    const body = await req.json();
    
    // Validate
    const validation = safeValidate(studentSchema, body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }
    
    // Create
    const item = await db.items.create({ data: validation.data });
    log.logDataModification("create", "items", item.id);
    log.logResponse(201);
    
    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (error) {
    log.logError(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
```

---

## 6. Error Response Format

```typescript
// Validation Error (400)
{
  error: "Validation failed",
  errors: {
    "email": "Invalid email address",
    "password": "Password must be at least 8 characters"
  }
}

// Not Found (404)
{
  error: "Record not found"
}

// Permission Denied (403)
{
  error: "You don't have permission to access this resource"
}

// Server Error (500)
{
  error: "An unexpected error occurred. Please try again."
}
```

---

## 7. Viewing Logs

```bash
# View app logs
tail -f logs/app.log

# View error logs only
tail -f logs/errors.log

# Search for specific request
grep "requestId: abc123" logs/app.log

# View last 100 lines
tail -100 logs/app.log

# Follow logs in real-time with grep
tail -f logs/app.log | grep "ERROR"
```

---

## 8. Testing with New Utils

```typescript
// Mock the logger
vi.mock("@/lib/logger", () => ({
  logger: {
    logApiRequest: vi.fn(),
    logApiResponse: vi.fn(),
    error: vi.fn()
  }
}));

// Test validation
expect(() => studentSchema.parse(invalid)).toThrow();
expect(() => studentSchema.parse(valid)).not.toThrow();
```

---

## 9. Checklist: Before Committing

- [ ] Added `import { createApiLogger }` to handler
- [ ] Called `log.logRequest(method)` at start
- [ ] Added try-catch wrapper
- [ ] Called `log.logResponse(status)` on success
- [ ] Called `log.logError(error)` in catch block
- [ ] Added input validation (if POST/PUT/PATCH)
- [ ] Consistent error response format
- [ ] Tested with `npm run test`
- [ ] Passed linting: `npm run lint`
- [ ] Built successfully: `npm run build`

---

## 10. Most Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module 'api-logger'" | Check import path: `@/lib/api-logger` |
| Validation errors empty | Use `issues` not `errors`: `error.issues[0]` |
| Logs not appearing | Verify `/logs` directory exists |
| Build failing | Run `npm run typecheck` to see errors |
| Tests failing | Import utilities with `vi.mock()` |

---

## Quick Stats

- **Logging coverage:** 3% → target 95%
- **Validation coverage:** 25% → target 90%
- **Error handling:** 68% → target 95%
- **API routes:** 80 total
- **Audit score:** 72/100 → target 90/100

---

## Next Steps

1. Pick a route to update
2. Add logging (30 sec)
3. Add validation (30 sec)
4. Test: `npm run test`
5. Commit & push
6. Repeat for next route

---

*Keep this card handy! Refer to it while implementing.*
