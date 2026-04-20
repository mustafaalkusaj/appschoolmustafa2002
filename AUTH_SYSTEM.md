# Authentication & Authorization System
**Built:** April 20, 2026  
**Version:** 1.0.0  

---

## Overview

This document describes the complete authentication and authorization system for the multi-branch school management application. The system is built with:

- **JWT Tokens** for stateless authentication
- **Prisma ORM** for database operations
- **Role-Based Access Control (RBAC)** for permission management
- **Branch Isolation** to prevent cross-branch data access
- **Single-Page User Guards** for restricted user access
- **Comprehensive Logging** for audit trails

---

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Request                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Auth Middleware (requireAuth)                       │
│  • Extract JWT from Authorization header                        │
│  • Verify signature and expiration                              │
│  • Reject if invalid or expired                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│         Branch Isolation Middleware (verifyBranchAccess)        │
│  • Verify resource belongs to user's school/branch              │
│  • Enforce single-page user restrictions                        │
│  • Check cascading access control                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│     Single-Page User Guard (checkPageAccess)                    │
│  • Verify user has access to specific page                      │
│  • Check action permissions (view/create/update/delete)         │
│  • Return 403 if restricted                                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Route Handler                                 │
│  • Execute business logic                                       │
│  • Access protected resources                                   │
│  • Return authenticated response                                │
└─────────────────────────────────────────────────────────────────┘
```

### Service Layer

**JWT Service** (`lib/services/jwt.ts`)
- `generateToken()` - Create new JWT with claims
- `verifyToken()` - Validate signature and expiration
- `decodeToken()` - Inspect token without verification
- `refreshToken()` - Generate new token from valid one

**Password Service** (`lib/services/password.ts`)
- `hashPassword()` - PBKDF2 hash with salt
- `verifyPassword()` - Compare password against hash
- `generateTemporaryPassword()` - Create temporary credentials
- `validatePasswordStrength()` - Check password policy

**Auth Service** (`lib/services/auth-service.ts`)
- `authenticateUser()` - Login with email/password
- `registerUser()` - Create new user account
- `getUserProfile()` - Fetch user with permissions
- `updatePassword()` - Change user password

### Middleware Layer

**Auth Middleware** (`lib/middleware/auth-middleware.ts`)
- `requireAuth()` - Enforce JWT authentication
- `requireRole()` - Check specific role requirement
- `requireBranchAccess()` - Verify branch scope access
- `requirePermission()` - Check resource permission

**Branch Isolation** (`lib/middleware/branch-isolation.ts`)
- `verifyBranchAccess()` - Validate resource ownership
- `getAccessFilter()` - Build query filters
- `verifyBatchAccess()` - Check multiple resources

**Single-Page Guard** (`lib/middleware/single-page-guard.ts`)
- `checkPageAccess()` - Verify page permission
- `grantPageAccess()` - Assign page to user
- `revokePageAccess()` - Remove page access
- `updatePageAccess()` - Modify permissions

---

## JWT Token Structure

### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload
```json
{
  "userId": "clv...",
  "email": "user@example.com",
  "schoolId": "clv...",
  "branchId": "clv...",
  "role": "ACCOUNTANT",
  "isSinglePageUser": false,
  "iat": 1713607200,
  "exp": 1713693600
}
```

### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

---

## Database Schema Integration

The authentication system works with these Prisma models:

### User Model
```prisma
model User {
  id                   String   @id @default(cuid())
  email                String   @unique
  passwordHash         String
  fullNameAr           String
  fullNameEn           String
  schoolId             String
  branchId             String?
  roleId               String
  isSinglePageUser     Boolean  @default(false)
  isActive             Boolean  @default(true)
  lastLoginAt          DateTime?
  createdAt            DateTime @default(now())
  
  school               School   @relation(fields: [schoolId], references: [id])
  branch               Branch?  @relation(fields: [branchId], references: [id])
  role                 Role     @relation(fields: [roleId], references: [id])
  pageAccess           UserPageAccess[]
}
```

### Role & Permission Models
```prisma
model Role {
  id              String   @id @default(cuid())
  schoolId        String
  code            String   // INVESTOR, ACCOUNTANT, etc
  nameAr          String
  nameEn          String
  hierarchyLevel  Int      // 1=highest, 10=lowest
  
  school          School   @relation(fields: [schoolId], references: [id])
  permissions     RolePermission[]
}

model Permission {
  id          String   @id @default(cuid())
  schoolId    String
  code        String   // students.view, accounts.create, etc
  resource    String   // students, accounts, etc
  action      String   // view, create, update, delete
  
  school      School   @relation(fields: [schoolId], references: [id])
  roles       RolePermission[]
}
```

### Single-Page Access Model
```prisma
model UserPageAccess {
  id        String   @id @default(cuid())
  userId    String
  pageCode  String   // students, accounts, salaries
  canView   Boolean  @default(false)
  canCreate Boolean  @default(false)
  canUpdate Boolean  @default(false)
  canDelete Boolean  @default(false)
  
  user      User     @relation(fields: [userId], references: [id])
  
  @@unique([userId, pageCode])
}
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user with credentials

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password-123"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clv...",
    "email": "user@example.com",
    "fullNameEn": "John Doe",
    "fullNameAr": "جون دو",
    "schoolId": "clv...",
    "branchId": "clv...",
    "role": "ACCOUNTANT",
    "isSinglePageUser": false
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

#### POST /api/auth/register
Create new user account

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "fullNameEn": "Jane Doe",
  "fullNameAr": "جين دو",
  "schoolId": "clv...",
  "branchId": "clv...",
  "roleId": "clv..."
}
```

**Success Response (201):**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clv...",
    "email": "newuser@example.com",
    "fullNameEn": "Jane Doe",
    "fullNameAr": "جين دو",
    "schoolId": "clv...",
    "branchId": "clv...",
    "role": "EMPLOYEE",
    "isSinglePageUser": false
  }
}
```

#### GET /api/auth/me
Get authenticated user profile

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200):**
```json
{
  "ok": true,
  "user": {
    "id": "clv...",
    "email": "user@example.com",
    "fullNameEn": "John Doe",
    "fullNameAr": "جون دو",
    "schoolId": "clv...",
    "branchId": "clv...",
    "role": "ACCOUNTANT",
    "isSinglePageUser": false,
    "isActive": true,
    "permissions": ["students.view", "accounts.create"]
  }
}
```

#### POST /api/auth/change-password
Update user password

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request:**
```json
{
  "currentPassword": "old-password-123",
  "newPassword": "NewSecurePass456!",
  "confirmPassword": "NewSecurePass456!"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "message": "Password changed successfully"
}
```

---

## Usage Examples

### Using Authentication in API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, requireBranchAccess } from '@/lib/middleware/auth-middleware';
import { verifyBranchAccess } from '@/lib/middleware/branch-isolation';
import { createApiLogger } from '@/lib/api-logger';

export async function GET(req: NextRequest) {
  const endpoint = '/api/students/list';
  const log = createApiLogger({ endpoint });

  try {
    log.logRequest('GET');

    // 1. Require authentication
    const authResult = requireAuth(req, endpoint);
    if (authResult.response) return authResult.response;
    const authContext = authResult.auth!;

    // 2. Require specific role
    const roleResult = requireRole(authContext, ['ACCOUNTANT', 'BRANCH_MANAGER'], endpoint);
    if (roleResult.response) return roleResult.response;

    // 3. Get student list from database
    const students = await prisma.student.findMany({
      where: {
        schoolId: authContext.schoolId,
        ...(authContext.isSinglePageUser && { branchId: authContext.branchId })
      }
    });

    log.logResponse(200, authContext.userId);
    return NextResponse.json({ ok: true, students });

  } catch (error) {
    log.logError(error as Error, { endpoint });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
```

### Using Authentication in Server Components

```typescript
import { extractAuthContext } from '@/lib/middleware/auth-middleware';
import { cookies } from 'next/headers';

export async function getAuthContext() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;

  if (!token) return null;

  const payload = verifyToken(token);
  return payload ? {
    userId: payload.userId,
    email: payload.email,
    schoolId: payload.schoolId,
    branchId: payload.branchId,
    role: payload.role
  } : null;
}
```

### Checking Page Access

```typescript
import { checkPageAccess } from '@/lib/middleware/single-page-guard';
import { AuthContext } from '@/lib/middleware/auth-middleware';

export async function verifyAccess(
  authContext: AuthContext,
  pageCode: string,
  action: 'view' | 'create' | 'update' | 'delete'
) {
  const result = await checkPageAccess(
    authContext,
    pageCode,
    action,
    '/api/students'
  );

  if (!result.allowed) {
    return { allowed: false, statusCode: 403 };
  }

  return { allowed: true, statusCode: 200 };
}
```

---

## Access Control Levels

### 1. School-Level Access
```typescript
// Super admin can access any school
// Regular admins can access only their school

if (authContext.role === 'SUPER_ADMIN') {
  // Access all schools
} else {
  // Filter by: schoolId = authContext.schoolId
}
```

### 2. Branch-Level Access
```typescript
// Branch managers can access only their branch
// Single-page users can access only their assigned branch

if (authContext.isSinglePageUser) {
  // Filter by: branchId = authContext.branchId
} else {
  // Branch manager/Accountant can access any branch in school
}
```

### 3. Page-Level Access (Single-Page Users)
```typescript
const pageAccess = await checkPageAccess(
  authContext,
  'students',
  'create'
);

if (!pageAccess.allowed) {
  // User doesn't have access
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 4. Row-Level Access (Data Isolation)
```typescript
// All queries must filter by school/branch
const data = await prisma.model.findMany({
  where: {
    schoolId: authContext.schoolId,
    branchId: authContext.branchId || undefined
  }
});
```

---

## Security Features

### Password Security
- PBKDF2 hashing with 100,000 iterations
- Random salt generation
- Timing-safe comparison
- Password strength validation

### JWT Security
- HMAC-SHA256 signing
- Signature verification
- Expiration checking
- Token refresh mechanism

### Access Control
- Branch isolation at middleware level
- Role-based permission checks
- Single-page user restrictions
- Cascading delete protection via foreign keys

### Audit Logging
- All authentication events logged
- Failed login attempts tracked
- Password changes recorded
- User profile updates logged

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# JWT Configuration
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN_MS=86400000

# Optional
NODE_ENV=development
LOG_LEVEL=debug
```

---

## Testing the System

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 2. Get Profile
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### 3. Change Password
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "old-password",
    "newPassword": "new-password",
    "confirmPassword": "new-password"
  }'
```

---

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `USER_INACTIVE` | 403 | User account is disabled |
| `USER_EXISTS` | 409 | Email already registered |
| `INVALID_SCHOOL` | 400 | School ID not found |
| `INVALID_BRANCH` | 400 | Branch not in school |
| `INVALID_ROLE` | 400 | Role not in school |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## Deployment Checklist

- [ ] Set `JWT_SECRET` to secure random value
- [ ] Set `DATABASE_URL` to production database
- [ ] Enable HTTPS only for production
- [ ] Configure rate limiting for auth endpoints
- [ ] Set up database backups
- [ ] Enable audit log shipping
- [ ] Configure monitoring/alerting
- [ ] Test password reset flow
- [ ] Verify branch isolation with test data

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-20 | Initial release with JWT, PBKDF2, branch isolation |

---

*Last Updated: 2026-04-20*  
*Maintainer: Claude AI Assistant*
