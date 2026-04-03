# Authentication Security

<cite>
**Referenced Files in This Document**
- [lib/auth.ts](file://lib/auth.ts)
- [lib/rbac-session.ts](file://lib/rbac-session.ts)
- [app/api/rbac/session/route.ts](file://app/api/rbac/session/route.ts)
- [lib/supabase.ts](file://lib/supabase.ts)
- [lib/supabase-server.ts](file://lib/supabase-server.ts)
- [types/roles.ts](file://types/roles.ts)
- [00990090/school-accounting-system/backend/src/utils/jwt.js](file://00990090/school-accounting-system/backend/src/utils/jwt.js)
- [00990090/school-accounting-system/backend/src/middleware/auth.js](file://00990090/school-accounting-system/backend/src/middleware/auth.js)
- [lib/managed-users/credentials.ts](file://lib/managed-users/credentials.ts)
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts)
- [migrations/20260401_000000_remove_plaintext_passwords.sql](file://migrations/20260401_000000_remove_plaintext_passwords.sql)
- [lib/managed-users/account-cards.ts](file://lib/managed-users/account-cards.ts)
- [lib/managed-users-server.ts](file://lib/managed-users-server.ts)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive password security implementation section covering SHA-256 hashing and secure random password generation
- Updated managed user credential management to reflect the removal of plaintext passwords
- Enhanced authentication flow documentation to include password reset and credential verification processes
- Added security considerations for password storage and transmission
- Updated migration documentation to reflect database schema changes

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Password Security Implementation](#password-security-implementation)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)

## Introduction
This document explains the authentication and authorization security implementation across the project. It covers:
- Supabase-based authentication integration
- JWT usage in the legacy accounting system
- RBAC enforcement via a signed session cookie
- Session lifecycle: initialization, validation, refresh, and termination
- Real-time session synchronization and security mitigations against hijacking and theft
- Secure password management with SHA-256 hashing and secure random generation
- Managed user credential system with encrypted password storage
- Secure patterns, token validation, and session termination processes
- Common vulnerability mitigations

## Project Structure
The authentication stack spans client-side utilities, serverless API endpoints, and shared RBAC definitions:
- Client-side Supabase SDK usage and user profile retrieval
- RBAC session cookie signing and validation
- Supabase server client creation and bearer token extraction
- Role and permission definitions
- Legacy JWT utilities and middleware for the accounting system
- Managed user credential management with secure password handling
- Password reset and verification systems

```mermaid
graph TB
subgraph "Client"
A["lib/auth.ts<br/>getUserProfile(), RBAC session helpers"]
B["lib/supabase.ts<br/>createBrowserClient()"]
C["lib/managed-users/account-cards.ts<br/>Password display logic"]
end
subgraph "Serverless API"
D["app/api/rbac/session/route.ts<br/>POST/DELETE RBAC cookie"]
E["lib/supabase-server.ts<br/>createRouteSupabaseClient()<br/>getRouteAuthenticatedUser()"]
F["app/api/dashboard/users/[authUserId]/reset-password/route.ts<br/>Password reset endpoint"]
end
subgraph "Managed User System"
G["lib/managed-users/credentials.ts<br/>Password generation & hashing"]
H["migrations/20260401_000000_remove_plaintext_passwords.sql<br/>Database schema migration"]
I["lib/managed-users-server.ts<br/>Credential management interface"]
end
subgraph "Shared"
J["lib/rbac-session.ts<br/>signRBACSession(), verifyRBACSession()"]
K["types/roles.ts<br/>roles, permissions, rules"]
L["lib/managed-users/account-cards.ts<br/>One-time password reveal"]
end
subgraph "Legacy Accounting"
M["00990090/.../jwt.js<br/>generateToken(), verifyToken()"]
N["00990090/.../auth.js<br/>authMiddleware(), authorizeRole()"]
end
A --> B
A --> J
A --> K
A --> D
D --> E
D --> J
D --> K
E --> B
F --> G
F --> I
G --> H
C --> L
M --> N
```

**Diagram sources**
- [lib/auth.ts:239-267](file://lib/auth.ts#L239-L267)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)
- [lib/supabase-server.ts:52-74](file://lib/supabase-server.ts#L52-L74)
- [lib/rbac-session.ts:112-142](file://lib/rbac-session.ts#L112-L142)
- [types/roles.ts:47-72](file://types/roles.ts#L47-L72)
- [lib/managed-users/credentials.ts:54-67](file://lib/managed-users/credentials.ts#L54-L67)
- [migrations/20260401_000000_remove_plaintext_passwords.sql:1-15](file://migrations/20260401_000000_remove_plaintext_passwords.sql#L1-L15)
- [lib/managed-users-server.ts:1-68](file://lib/managed-users-server.ts#L1-L68)
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:17-87](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L17-L87)
- [lib/managed-users/account-cards.ts:92-118](file://lib/managed-users/account-cards.ts#L92-L118)
- [00990090/school-accounting-system/backend/src/utils/jwt.js:12-36](file://00990090/school-accounting-system/backend/src/utils/jwt.js#L12-L36)
- [00990090/school-accounting-system/backend/src/middleware/auth.js:10-40](file://00990090/school-accounting-system/backend/src/middleware/auth.js#L10-L40)

**Section sources**
- [lib/auth.ts:239-267](file://lib/auth.ts#L239-L267)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)
- [lib/supabase-server.ts:52-74](file://lib/supabase-server.ts#L52-L74)
- [lib/rbac-session.ts:112-142](file://lib/rbac-session.ts#L112-L142)
- [types/roles.ts:47-72](file://types/roles.ts#L47-L72)
- [lib/managed-users/credentials.ts:54-67](file://lib/managed-users/credentials.ts#L54-L67)
- [migrations/20260401_000000_remove_plaintext_passwords.sql:1-15](file://migrations/20260401_000000_remove_plaintext_passwords.sql#L1-L15)
- [lib/managed-users-server.ts:1-68](file://lib/managed-users-server.ts#L1-L68)
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:17-87](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L17-L87)
- [lib/managed-users/account-cards.ts:92-118](file://lib/managed-users/account-cards.ts#L92-L118)
- [00990090/school-accounting-system/backend/src/utils/jwt.js:12-36](file://00990090/school-accounting-system/backend/src/utils/jwt.js#L12-L36)
- [00990090/school-accounting-system/backend/src/middleware/auth.js:10-40](file://00990090/school-accounting-system/backend/src/middleware/auth.js#L10-L40)

## Core Components
- Supabase client and server utilities:
  - Browser client creation and environment validation
  - Server client with cookie persistence and bearer token extraction
- RBAC session cookie:
  - Payload composition with role, permissions, and context flags
  - HMAC signing with a dedicated secret and base64url encoding
  - Cookie options enforcing httpOnly, sameSite, and secure flags
- Role and permission model:
  - Known roles and normalized permissions
  - Route access and permission rules
- Client-side RBAC session helpers:
  - Initialize and clear RBAC session cookie
  - Sign-out clears both Supabase session and RBAC cookie
- Legacy JWT utilities and middleware:
  - Token generation and verification
  - Request authentication and role-based authorization
- Managed user credential system:
  - Secure temporary password generation using crypto.randomBytes()
  - SHA-256 hashing for password storage
  - One-time password reveal mechanism for account cards
  - Database migration removing plaintext password storage

**Section sources**
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/supabase-server.ts:52-74](file://lib/supabase-server.ts#L52-L74)
- [lib/rbac-session.ts:56-152](file://lib/rbac-session.ts#L56-L152)
- [types/roles.ts:47-72](file://types/roles.ts#L47-L72)
- [lib/auth.ts:273-340](file://lib/auth.ts#L273-L340)
- [00990090/school-accounting-system/backend/src/utils/jwt.js:12-36](file://00990090/school-accounting-system/backend/src/utils/jwt.js#L12-L36)
- [00990090/school-accounting-system/backend/src/middleware/auth.js:10-40](file://00990090/school-accounting-system/backend/src/middleware/auth.js#L10-L40)
- [lib/managed-users/credentials.ts:54-67](file://lib/managed-users/credentials.ts#L54-L67)
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:17-87](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L17-L87)

## Architecture Overview
The authentication flow integrates Supabase for identity with a signed RBAC session cookie for local authorization decisions and managed user credential system for secure password management.

```mermaid
sequenceDiagram
participant U as "User"
participant SB as "Supabase Client"
participant API as "Next.js API /api/rbac/session"
participant SRV as "Supabase Server Client"
participant SEC as "RBAC Cookie"
participant MC as "Managed Credentials"
U->>SB : "Sign in via Supabase"
SB-->>U : "Supabase session (access/refresh)"
U->>API : "POST /api/rbac/session (Authorization : Bearer)"
API->>SRV : "createRouteSupabaseClient()"
SRV-->>API : "Authenticated user"
API->>SRV : "Fetch user_profile + school/subscription"
API->>SEC : "Set signed RBAC cookie (httpOnly, sameSite, secure)"
SEC-->>U : "Secure cookie stored"
U->>MC : "Password reset request"
MC->>MC : "Generate secure temporary password"
MC->>MC : "Store SHA-256 hash in database"
MC-->>U : "One-time password reveal"
U->>API : "Subsequent requests"
API->>SEC : "Verify RBAC cookie signature and expiry"
SEC-->>API : "Decoded payload (role, permissions, flags)"
API-->>U : "Authorized response"
```

**Diagram sources**
- [lib/auth.ts:273-340](file://lib/auth.ts#L273-L340)
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)
- [lib/supabase-server.ts:52-74](file://lib/supabase-server.ts#L52-L74)
- [lib/rbac-session.ts:112-142](file://lib/rbac-session.ts#L112-L142)
- [lib/managed-users/credentials.ts:54-67](file://lib/managed-users/credentials.ts#L54-L67)
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:17-87](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L17-L87)

## Detailed Component Analysis

### Supabase Authentication Integration
- Client-side:
  - Creates a browser client with validated environment variables
  - Retrieves current user and merges Supabase metadata into the profile
- Server-side:
  - Builds a server client with cookie handling
  - Extracts Bearer token from Authorization header if present, otherwise uses session
  - Validates the token and returns the authenticated user

Security highlights:
- Environment checks prevent misconfiguration
- Bearer token fallback ensures robust session validation
- Server client respects cookie store for SSR and middleware scenarios

**Section sources**
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/supabase-server.ts:52-74](file://lib/supabase-server.ts#L52-L74)
- [lib/auth.ts:239-267](file://lib/auth.ts#L239-L267)

### RBAC Session Cookie Implementation
- Payload composition includes role, permissions, school flags, and timestamps
- Signing uses HMAC-SHA256 with a dedicated secret; base64url encoding for compactness
- Cookie options enforce httpOnly, sameSite=Lax, secure in production, and a fixed maxAge
- Verification validates signature, version, and expiry before decoding

```mermaid
flowchart TD
Start(["Initialize RBAC Session"]) --> CheckSecret["Check RBAC_COOKIE_SECRET availability"]
CheckSecret --> SecretOK{"Secret configured?"}
SecretOK --> |No| Abort["Abort (no signing)"]
SecretOK --> |Yes| BuildPayload["Build payload with role, permissions,<br/>school flags, timestamps"]
BuildPayload --> Sign["HMAC-SHA256 sign payload"]
Sign --> Encode["Base64Url encode payload + signature"]
Encode --> SetCookie["Set httpOnly, sameSite=Lax, secure cookie"]
SetCookie --> Done(["RBAC session ready"])
Abort --> Done
```

**Diagram sources**
- [lib/rbac-session.ts:19-50](file://lib/rbac-session.ts#L19-L50)
- [lib/rbac-session.ts:56-119](file://lib/rbac-session.ts#L56-L119)
- [lib/rbac-session.ts:144-152](file://lib/rbac-session.ts#L144-L152)

**Section sources**
- [lib/rbac-session.ts:56-152](file://lib/rbac-session.ts#L56-L152)

### Role-Based Access Control (RBAC) Enforcement
- Role and permission definitions:
  - Known roles and normalized permissions
  - Route access rules and permission rules per path
- Client-side access decision:
  - Determines allowed paths, read-only modes, and reasons for denial
  - Checks school and subscription status for access validity
- Server-side RBAC session endpoint:
  - Validates user, loads profile and related context
  - Normalizes permissions (custom or default)
  - Builds and signs RBAC payload, sets cookie

```mermaid
flowchart TD
A["Incoming Request"] --> B["Extract Supabase session or Bearer token"]
B --> C{"Authenticated user?"}
C --> |No| D["Return 401 Unauthorized"]
C --> |Yes| E["Load user_profile + school/subscription"]
E --> F{"Role supported?"}
F --> |No| G["Clear RBAC cookie and 403"]
F --> |Yes| H["Normalize permissions (custom/default)"]
H --> I["Build RBAC payload + sign"]
I --> J["Set RBAC cookie and 200 OK"]
```

**Diagram sources**
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)
- [types/roles.ts:47-72](file://types/roles.ts#L47-L72)
- [lib/rbac-session.ts:112-142](file://lib/rbac-session.ts#L112-L142)

**Section sources**
- [types/roles.ts:47-72](file://types/roles.ts#L47-L72)
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)

### Session Lifecycle: Initialization, Validation, Refresh, Termination
- Initialization:
  - Client calls RBAC session API with Authorization header
  - Server validates token, loads profile, normalizes permissions, and sets signed cookie
- Validation:
  - Subsequent requests rely on verified RBAC cookie for local decisions
  - Server can re-validate session if needed
- Refresh:
  - Client can reinitialize RBAC session after successful Supabase sign-in
  - Optional strict mode throws on failure for robust UX
- Termination:
  - Sign-out clears Supabase session and deletes RBAC cookie
  - API DELETE endpoint clears the cookie on demand

```mermaid
sequenceDiagram
participant C as "Client"
participant S as "Supabase"
participant A as "RBAC API"
participant K as "RBAC Cookie"
C->>S : "Sign in"
C->>A : "POST /api/rbac/session (Bearer)"
A->>K : "Set signed cookie"
C->>A : "GET subsequent requests"
A->>K : "Verify signature/expiry"
K-->>A : "Allow/deny"
C->>S : "Sign out"
C->>A : "DELETE /api/rbac/session"
A->>K : "Expire cookie"
```

**Diagram sources**
- [lib/auth.ts:323-340](file://lib/auth.ts#L323-L340)
- [app/api/rbac/session/route.ts:135-154](file://app/api/rbac/session/route.ts#L135-L154)
- [lib/rbac-session.ts:144-152](file://lib/rbac-session.ts#L144-L152)

**Section sources**
- [lib/auth.ts:323-340](file://lib/auth.ts#L323-L340)
- [app/api/rbac/session/route.ts:135-154](file://app/api/rbac/session/route.ts#L135-L154)

### Legacy JWT-Based Authentication (Accounting System)
- Utilities:
  - Generates tokens with id, email, name, role and expiration
  - Verifies tokens using the configured secret
- Middleware:
  - Extracts Bearer token from Authorization header
  - Verifies token and attaches user to request
  - Role-based authorization checks

Security notes:
- Token expiration enforced during verification
- Clear error responses for invalid/expired tokens
- Role gating prevents unauthorized actions

**Section sources**
- [00990090/school-accounting-system/backend/src/utils/jwt.js:12-36](file://00990090/school-accounting-system/backend/src/utils/jwt.js#L12-L36)
- [00990090/school-accounting-system/backend/src/middleware/auth.js:10-40](file://00990090/school-accounting-system/backend/src/middleware/auth.js#L10-L40)

### Real-Time Session Synchronization
- Client initializes RBAC session upon successful Supabase sign-in
- On sign-out, both Supabase session and RBAC cookie are cleared
- Rate limiting protects RBAC session endpoints from abuse

Operational guidance:
- Call RBAC session initialization after Supabase sign-in
- Use strict mode to surface errors during initialization
- Clear RBAC session on sign-out to prevent stale authorizations

**Section sources**
- [lib/auth.ts:273-340](file://lib/auth.ts#L273-L340)
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)

## Password Security Implementation

### Secure Temporary Password Generation
The system implements secure random password generation using Node.js crypto.randomBytes() for creating unpredictable temporary passwords for managed users.

```mermaid
flowchart TD
Start(["Generate Temporary Password"]) --> Seed["Generate 8 cryptographically secure random bytes"]
Seed --> Alphabet["Use predefined alphabet:<br/>ABCDEFGHJKLMNPQRSTUVWXYZ<br/>abcdefghijkmnopqrstuvwxyz23456789"]
Alphabet --> Prefix["Add 'Sch-' prefix"]
Prefix --> Build["Build 12-character password<br/>using random bytes modulo alphabet length"]
Build --> Return["Return secure temporary password"]
```

**Diagram sources**
- [lib/managed-users/credentials.ts:55-62](file://lib/managed-users/credentials.ts#L55-L62)

**Section sources**
- [lib/managed-users/credentials.ts:55-62](file://lib/managed-users/credentials.ts#L55-L62)

### SHA-256 Password Hashing
All passwords are securely hashed using SHA-256 before storage in the database, eliminating plaintext password exposure.

- Password hashing process:
  - Input password is passed through SHA-256 cryptographic hash function
  - Hash output is stored as hexadecimal string in the database
  - Original plaintext password is never stored or transmitted
- Security benefits:
  - One-way cryptographic transformation prevents reverse engineering
  - SHA-256 provides strong collision resistance
  - Eliminates risk of plaintext password exposure in database dumps

**Section sources**
- [lib/managed-users/credentials.ts:65-66](file://lib/managed-users/credentials.ts#L65-L66)

### Database Schema Migration
A comprehensive migration removes plaintext password storage and implements secure hash-based verification:

```mermaid
flowchart TD
Migration["Database Migration Process"] --> AddColumns["Add temporary_password_hash<br/>and has_pending_setup columns"]
AddColumns --> MigrateData["Migrate existing plaintext<br/>passwords to SHA-256 hashes"]
MigrateData --> SetFlags["Set has_pending_setup=true<br/>for migrated accounts"]
SetFlags --> DropColumn["Drop plaintext temporary_password<br/>column"]
DropColumn --> Complete["Migration Complete"]
```

**Diagram sources**
- [migrations/20260401_000000_remove_plaintext_passwords.sql:2-14](file://migrations/20260401_000000_remove_plaintext_passwords.sql#L2-L14)

**Section sources**
- [migrations/20260401_000000_remove_plaintext_passwords.sql:1-15](file://migrations/20260401_000000_remove_plaintext_passwords.sql#L1-L15)

### Password Reset Workflow
The password reset system provides secure temporary password generation and controlled disclosure:

```mermaid
sequenceDiagram
participant Admin as "Administrator"
participant API as "Password Reset API"
participant Auth as "Supabase Auth"
participant DB as "Managed Credentials DB"
Admin->>API : "POST /api/dashboard/users/[authUserId]/reset-password"
API->>API : "Generate secure temporary password"
API->>Auth : "Update user password"
Auth-->>API : "Password updated"
API->>DB : "Store SHA-256 hash with has_pending_setup=true"
DB-->>API : "Credential updated"
API-->>Admin : "Return account card with one-time password"
```

**Diagram sources**
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:58-86](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L58-L86)
- [lib/managed-users/credentials.ts:408-433](file://lib/managed-users/credentials.ts#L408-L433)

**Section sources**
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:17-87](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L17-L87)
- [lib/managed-users/credentials.ts:408-433](file://lib/managed-users/credentials.ts#L408-L433)

### One-Time Password Disclosure
The system implements secure password disclosure through account cards with controlled visibility:

- Account cards display masked passwords by default
- One-time reveal mechanism shows plaintext password temporarily
- Password masking prevents accidental exposure in screenshots
- Immediate masking after display reduces security risk

**Section sources**
- [lib/managed-users/account-cards.ts:92-118](file://lib/managed-users/account-cards.ts#L92-L118)

## Dependency Analysis
- Client depends on Supabase for identity and on RBAC cookie for authorization
- Serverless API depends on Supabase server client and RBAC signing utilities
- RBAC signing relies on a dedicated secret separate from JWT secrets
- Role and permission logic is centralized in shared types
- Managed user credential system depends on secure password generation and hashing utilities
- Password reset endpoints integrate with both Supabase auth and credential management
- Database migration ensures secure credential storage across the system

```mermaid
graph LR
AUTH["lib/auth.ts"] --> SB["lib/supabase.ts"]
AUTH --> RBAC["lib/rbac-session.ts"]
AUTH --> API["app/api/rbac/session/route.ts"]
API --> SRV["lib/supabase-server.ts"]
API --> RBAC
API --> ROLE["types/roles.ts"]
MCRED["lib/managed-users/credentials.ts"] --> MIG["migrations/20260401_000000_remove_plaintext_passwords.sql"]
MCRED --> RESET["app/api/dashboard/users/[authUserId]/reset-password/route.ts"]
RESET --> AUTH
RESET --> MCRED
LEGJWT["00990090/.../jwt.js"] --> LEGMW["00990090/.../auth.js"]
```

**Diagram sources**
- [lib/auth.ts:239-267](file://lib/auth.ts#L239-L267)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/rbac-session.ts:112-142](file://lib/rbac-session.ts#L112-L142)
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)
- [lib/supabase-server.ts:52-74](file://lib/supabase-server.ts#L52-L74)
- [types/roles.ts:47-72](file://types/roles.ts#L47-L72)
- [lib/managed-users/credentials.ts:54-67](file://lib/managed-users/credentials.ts#L54-L67)
- [migrations/20260401_000000_remove_plaintext_passwords.sql:1-15](file://migrations/20260401_000000_remove_plaintext_passwords.sql#L1-L15)
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:17-87](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L17-L87)
- [00990090/school-accounting-system/backend/src/utils/jwt.js:12-36](file://00990090/school-accounting-system/backend/src/utils/jwt.js#L12-L36)
- [00990090/school-accounting-system/backend/src/middleware/auth.js:10-40](file://00990090/school-accounting-system/backend/src/middleware/auth.js#L10-L40)

**Section sources**
- [lib/auth.ts:239-267](file://lib/auth.ts#L239-L267)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/rbac-session.ts:112-142](file://lib/rbac-session.ts#L112-L142)
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)
- [lib/supabase-server.ts:52-74](file://lib/supabase-server.ts#L52-L74)
- [types/roles.ts:47-72](file://types/roles.ts#L47-L72)
- [lib/managed-users/credentials.ts:54-67](file://lib/managed-users/credentials.ts#L54-L67)
- [migrations/20260401_000000_remove_plaintext_passwords.sql:1-15](file://migrations/20260401_000000_remove_plaintext_passwords.sql#L1-L15)
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:17-87](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L17-L87)
- [00990090/school-accounting-system/backend/src/utils/jwt.js:12-36](file://00990090/school-accounting-system/backend/src/utils/jwt.js#L12-L36)
- [00990090/school-accounting-system/backend/src/middleware/auth.js:10-40](file://00990090/school-accounting-system/backend/src/middleware/auth.js#L10-L40)

## Performance Considerations
- RBAC cookie signing is lightweight and performed server-side on session init
- Client-side access decisions rely on cookie verification, reducing server round-trips
- Rate limits protect RBAC session endpoints from abuse
- Using httpOnly and secure flags minimizes exposure risks
- SHA-256 hashing is computationally efficient for password verification
- Secure random password generation uses optimized crypto.randomBytes() implementation
- Database migration ensures optimal storage performance with proper indexing

## Troubleshooting Guide
Common issues and resolutions:
- Missing RBAC secret in production:
  - Configure a dedicated RBAC_COOKIE_SECRET; fallbacks are not recommended for production
- RBAC session not initializing:
  - Ensure Authorization header contains a valid Bearer token or that Supabase session exists
  - Use strict mode to surface initialization errors
- Session denied unexpectedly:
  - Verify role and permissions normalization
  - Check school and subscription status flags embedded in the RBAC payload
- Legacy JWT errors:
  - Confirm JWT_SECRET and expiration configuration
  - Validate token presence and format in Authorization header
- Password reset failures:
  - Verify Supabase auth service connectivity
  - Check managed user credential table existence and permissions
  - Ensure SHA-256 hashing function availability in database
- Credential storage errors:
  - Confirm database migration completion
  - Verify temporary_password_hash column exists
  - Check has_pending_setup flag functionality

**Section sources**
- [lib/rbac-session.ts:19-50](file://lib/rbac-session.ts#L19-L50)
- [lib/auth.ts:273-340](file://lib/auth.ts#L273-L340)
- [app/api/rbac/session/route.ts:14-133](file://app/api/rbac/session/route.ts#L14-L133)
- [00990090/school-accounting-system/backend/src/utils/jwt.js:12-36](file://00990090/school-accounting-system/backend/src/utils/jwt.js#L12-L36)
- [00990090/school-accounting-system/backend/src/middleware/auth.js:10-40](file://00990090/school-accounting-system/backend/src/middleware/auth.js#L10-L40)
- [app/api/dashboard/users/[authUserId]/reset-password/route.ts:17-87](file://app/api/dashboard/users/[authUserId]/reset-password/route.ts#L17-L87)
- [lib/managed-users/credentials.ts:408-433](file://lib/managed-users/credentials.ts#L408-L433)

## Conclusion
The system combines Supabase authentication with a signed RBAC session cookie to deliver secure, scalable authorization. Client-side helpers streamline session initialization and termination, while serverless endpoints centralize validation and cookie management. Dedicated secrets, httpOnly cookies, and strict error handling mitigate common threats. The legacy JWT utilities remain compatible for the accounting subsystem, ensuring a cohesive security posture across the platform.

**Updated** The authentication system now includes comprehensive password security measures with SHA-256 hashing, secure random password generation, and safe credential storage practices. The managed user credential system implements one-time password disclosure with masking to minimize security risks during account setup and administration processes.