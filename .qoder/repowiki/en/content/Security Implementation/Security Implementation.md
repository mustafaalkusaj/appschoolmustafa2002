# Security Implementation

<cite>
**Referenced Files in This Document**
- [SECURITY.md](file://SECURITY.md)
- [proxy.ts](file://proxy.ts)
- [next.config.ts](file://next.config.ts)
- [lib/auth.ts](file://lib/auth.ts)
- [lib/rate-limit.ts](file://lib/rate-limit.ts)
- [lib/audit.ts](file://lib/audit.ts)
- [lib/supabase.ts](file://lib/supabase.ts)
- [lib/supabase-server.ts](file://lib/supabase-server.ts)
- [lib/rbac-session.ts](file://lib/rbac-session.ts)
- [app/api/rbac/session/route.ts](file://app/api/rbac/session/route.ts)
- [lib/authorized-api.ts](file://lib/authorized-api.ts)
- [lib/api-schemas.ts](file://lib/api-schemas.ts)
- [app/api/health/route.ts](file://app/api/health/route.ts)
- [lib/route-utils.ts](file://lib/route-utils.ts)
- [migrations/20260322_managed_mobile_rls.sql](file://migrations/20260322_managed_mobile_rls.sql)
- [migrations/20260322_mobile_attachments_storage.sql](file://migrations/20260322_mobile_attachments_storage.sql)
- [lib/admin-infrastructure.ts](file://lib/admin-infrastructure.ts)
- [types/roles.ts](file://types/roles.ts)
- [lib/supabase-query-helpers.ts](file://lib/supabase-query-helpers.ts)
- [lib/env/server.ts](file://lib/env/server.ts)
- [app/api/auth/login/route.ts](file://app/api/auth/login/route.ts)
</cite>

## Update Summary
**Changes Made**
- Enhanced RBAC session management with strengthened cookie secret validation for production environments
- Improved error messaging for security-critical configurations with detailed failure reasons
- Added comprehensive environment validation with Zod schema for server-side secrets
- Implemented enhanced cookie security with secure-by-default configuration
- Strengthened authentication error handling with standardized failure responses

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the multi-layered security implementation for the school management platform. It covers authentication and session management, authorization enforcement, data protection via Supabase Row-Level Security (RLS), audit logging, rate limiting, input validation, and protections against common vulnerabilities. The platform now features comprehensive security hardening including a nonce-based Content Security Policy, enhanced RBAC cookie security, dynamic security headers implemented through Next.js proxy middleware, robust query safety mechanisms, and comprehensive API schema validation using Zod for strict input sanitization and type checking.

## Project Structure
Security-related capabilities are distributed across:
- Authentication and RBAC session management in the frontend and API
- Next.js proxy middleware for dynamic security headers and CSP
- Supabase client configuration and server-side clients
- Database-level RLS policies and storage security
- Audit logging utilities
- Rate limiting middleware
- API schema validation using Zod for strict input validation
- Health monitoring endpoint for system status verification
- Admin infrastructure probing and compatibility
- Query safety helpers for preventing injection attacks
- Enhanced environment validation and error handling

```mermaid
graph TB
subgraph "Frontend"
A["lib/auth.ts<br/>User profiles, access decisions"]
B["lib/rbac-session.ts<br/>Signed RBAC cookie"]
C["lib/authorized-api.ts<br/>Authorized fetch helpers"]
end
subgraph "Edge/Middleware"
D["proxy.ts<br/>Dynamic CSP + security headers"]
E["app/api/rbac/session/route.ts<br/>RBAC session endpoint"]
F["lib/rate-limit.ts<br/>Per-user rate limiter"]
G["lib/api-schemas.ts<br/>Zod validation schemas"]
H["app/api/health/route.ts<br/>Health monitoring endpoint"]
end
subgraph "Supabase Layer"
I["lib/supabase.ts<br/>Browser client"]
J["lib/supabase-server.ts<br/>Server client + service client"]
K["migrations/*_managed_mobile_rls.sql<br/>RLS functions/policies"]
L["migrations/*_mobile_attachments_storage.sql<br/>Storage RLS"]
M["lib/admin-infrastructure.ts<br/>Feature probing"]
N["lib/supabase-query-helpers.ts<br/>Safe filter builders"]
end
O["lib/audit.ts<br/>Audit logging"]
P["lib/route-utils.ts<br/>Validation utilities"]
Q["lib/env/server.ts<br/>Enhanced environment validation"]
A --> B
B --> E
C --> E
E --> F
E --> G
E --> P
E --> Q
A --> I
E --> I
E --> J
A --> K
A --> L
N --> I
K --> A
D --> E
H --> J
Q --> E
```

**Diagram sources**
- [lib/auth.ts:1-341](file://lib/auth.ts#L1-L341)
- [lib/rbac-session.ts:1-156](file://lib/rbac-session.ts#L1-L156)
- [lib/authorized-api.ts:1-49](file://lib/authorized-api.ts#L1-L49)
- [proxy.ts:1-139](file://proxy.ts#L1-L139)
- [app/api/rbac/session/route.ts:1-144](file://app/api/rbac/session/route.ts#L1-L144)
- [lib/rate-limit.ts:1-106](file://lib/rate-limit.ts#L1-L106)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/supabase-server.ts:1-75](file://lib/supabase-server.ts#L1-L75)
- [migrations/20260322_managed_mobile_rls.sql:1-580](file://migrations/20260322_managed_mobile_rls.sql#L1-L580)
- [migrations/20260322_mobile_attachments_storage.sql:1-221](file://migrations/20260322_mobile_attachments_storage.sql#L1-L221)
- [lib/admin-infrastructure.ts:1-209](file://lib/admin-infrastructure.ts#L1-L209)
- [lib/audit.ts:1-63](file://lib/audit.ts#L1-L63)
- [lib/supabase-query-helpers.ts:1-34](file://lib/supabase-query-helpers.ts#L1-L34)
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [app/api/health/route.ts:1-73](file://app/api/health/route.ts#L1-L73)
- [lib/route-utils.ts:1-48](file://lib/route-utils.ts#L1-L48)
- [lib/env/server.ts:1-65](file://lib/env/server.ts#L1-L65)

**Section sources**
- [SECURITY.md:1-36](file://SECURITY.md#L1-L36)
- [lib/auth.ts:1-341](file://lib/auth.ts#L1-L341)
- [lib/rbac-session.ts:1-156](file://lib/rbac-session.ts#L1-L156)
- [proxy.ts:1-139](file://proxy.ts#L1-L139)
- [app/api/rbac/session/route.ts:1-144](file://app/api/rbac/session/route.ts#L1-L144)
- [lib/rate-limit.ts:1-106](file://lib/rate-limit.ts#L1-L106)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/supabase-server.ts:1-75](file://lib/supabase-server.ts#L1-L75)
- [migrations/20260322_managed_mobile_rls.sql:1-580](file://migrations/20260322_managed_mobile_rls.sql#L1-L580)
- [migrations/20260322_mobile_attachments_storage.sql:1-221](file://migrations/20260322_mobile_attachments_storage.sql#L1-L221)
- [lib/admin-infrastructure.ts:1-209](file://lib/admin-infrastructure.ts#L1-L209)
- [lib/audit.ts:1-63](file://lib/audit.ts#L1-L63)
- [lib/supabase-query-helpers.ts:1-34](file://lib/supabase-query-helpers.ts#L1-L34)
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [app/api/health/route.ts:1-73](file://app/api/health/route.ts#L1-L73)
- [lib/route-utils.ts:1-48](file://lib/route-utils.ts#L1-L48)
- [lib/env/server.ts:1-65](file://lib/env/server.ts#L1-L65)

## Core Components
- RBAC session cookie: Signed, short-lived cookie containing role, permissions, and school/subscription context. Enforced by dedicated API endpoint and validated on subsequent requests.
- Robust CSP with per-request nonce: Next.js proxy middleware generates cryptographically random nonces per request for Content Security Policy, eliminating reliance on unsafe-inline scripts.
- Enhanced RBAC cookie secret requirements: Dedicated cookie secret is now mandatory in production; explicit error thrown if not configured. Development mode allows fallback to Supabase JWT secret with warnings.
- Comprehensive security headers: Proxy middleware sets dynamic security headers (Referrer-Policy, X-Content-Type-Options, X-Frame-Options, Permissions-Policy, HSTS) per request.
- Supabase Auth integration: Frontend and server clients integrate with Supabase Auth for identity and session retrieval.
- Database RLS: Fine-grained row-level policies scoped by role, school, and subscription state; storage policies restrict media access.
- Audit logging: Structured audit logs capture actions with actor metadata and optional metadata.
- Rate limiting: Per-window counters per identifier with cleanup and standardized headers.
- API schema validation: Comprehensive Zod-based validation for all incoming requests with strict input sanitization and type checking.
- Health monitoring: Dedicated endpoint for system status verification with dependency checks and comprehensive reporting.
- Admin infrastructure probing: Detects presence of advanced admin features and warns if tables/columns are missing.
- Safe query builders: Helper functions provide secure filter construction for Supabase queries, preventing injection attacks in .or() operations.
- Enhanced environment validation: Zod-based schema validation for server-side configuration with detailed error reporting.
- Standardized error handling: Consistent error responses with detailed failure reasons for security-critical operations.

**Updated** Enhanced with strengthened RBAC cookie secret validation and improved error messaging for security-critical configurations

**Section sources**
- [lib/rbac-session.ts:1-156](file://lib/rbac-session.ts#L1-L156)
- [proxy.ts:1-139](file://proxy.ts#L1-L139)
- [app/api/rbac/session/route.ts:1-144](file://app/api/rbac/session/route.ts#L1-L144)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/supabase-server.ts:1-75](file://lib/supabase-server.ts#L1-L75)
- [migrations/20260322_managed_mobile_rls.sql:1-580](file://migrations/20260322_managed_mobile_rls.sql#L1-L580)
- [migrations/20260322_mobile_attachments_storage.sql:1-221](file://migrations/20260322_mobile_attachments_storage.sql#L1-L221)
- [lib/audit.ts:1-63](file://lib/audit.ts#L1-L63)
- [lib/rate-limit.ts:1-106](file://lib/rate-limit.ts#L1-L106)
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [app/api/health/route.ts:1-73](file://app/api/health/route.ts#L1-L73)
- [lib/admin-infrastructure.ts:1-209](file://lib/admin-infrastructure.ts#L1-L209)
- [lib/supabase-query-helpers.ts:1-34](file://lib/supabase-query-helpers.ts#L1-L34)
- [lib/env/server.ts:1-65](file://lib/env/server.ts#L1-L65)
- [lib/route-utils.ts:1-48](file://lib/route-utils.ts#L1-L48)

## Architecture Overview
The security architecture combines client-side RBAC session signing, server-side session initialization, robust CSP with nonce generation, and comprehensive security headers. All API requests are validated using Zod schemas before processing, with enhanced rate limiting and comprehensive error handling. Requests flow through rate-limited endpoints, validated against Supabase Auth and RBAC session state, enforced by database policies. The new query safety layer provides additional protection against injection attacks in database operations, while the health monitoring endpoint provides comprehensive system status verification. The enhanced environment validation ensures secure configuration management with detailed error reporting for security-critical settings.

```mermaid
sequenceDiagram
participant Client as "Browser"
participant Proxy as "proxy.ts Middleware"
participant API as "RBAC Session API"
participant Supabase as "Supabase Auth"
participant EnvValidator as "Environment Validator"
participant SchemaValidator as "Zod Schema Validator"
participant RateLimiter as "Rate Limiter"
participant QueryHelpers as "Query Safety Helpers"
participant DB as "PostgreSQL (RLS)"
participant Storage as "Storage (RLS)"
Client->>Proxy : "HTTP Request"
Proxy->>Proxy : "Generate CSP Nonce"
Proxy->>Client : "Set Security Headers + CSP"
Client->>API : "POST /api/rbac/session"
API->>EnvValidator : "Validate RBAC secret"
EnvValidator-->>API : "Validated secret or error"
API->>SchemaValidator : "Validate request data"
SchemaValidator-->>API : "Validated data or errors"
API->>RateLimiter : "Check rate limits"
RateLimiter-->>API : "Allow or block"
API->>Supabase : "Get user (header or session)"
Supabase-->>API : "User info"
API->>DB : "Fetch profile, school, subscription"
DB-->>API : "Profile data"
API->>API : "Build RBAC payload + sign"
API-->>Client : "Set signed RBAC cookie"
Client->>API : "Subsequent requests with cookie"
API->>EnvValidator : "Validate RBAC secret"
API->>SchemaValidator : "Validate request data"
API->>RateLimiter : "Check rate limits"
API->>DB : "Enforce RLS policies"
API->>Storage : "Storage RLS checks"
Storage-->>API : "Allow/Deny"
DB-->>API : "Row-filtered results"
Client->>API : "Search request with .or() filter"
API->>QueryHelpers : "Build safe filter string"
QueryHelpers-->>API : "Escaped filter string"
API->>DB : "Execute safe query"
DB-->>API : "Filtered results"
API-->>Client : "Response"
```

**Diagram sources**
- [proxy.ts:91-123](file://proxy.ts#L91-L123)
- [app/api/rbac/session/route.ts:15-143](file://app/api/rbac/session/route.ts#L15-L143)
- [lib/env/server.ts:23-54](file://lib/env/server.ts#L23-L54)
- [lib/supabase-server.ts:60-74](file://lib/supabase-server.ts#L60-L74)
- [lib/supabase-query-helpers.ts:10-33](file://lib/supabase-query-helpers.ts#L10-L33)
- [migrations/20260322_managed_mobile_rls.sql:315-577](file://migrations/20260322_managed_mobile_rls.sql#L315-L577)
- [migrations/20260322_mobile_attachments_storage.sql:176-218](file://migrations/20260322_mobile_attachments_storage.sql#L176-L218)

## Detailed Component Analysis

### Enhanced RBAC Session Management with Strengthened Cookie Secret Validation
- Purpose: Maintain a signed, server-signed cookie containing role, permissions, and school/subscription context to enforce authorization without relying solely on client-side state.
- Enhanced Secret Handling: Dedicated cookie secret is now mandatory in production; explicit error thrown if not configured. Development mode allows fallback to Supabase JWT secret with warnings.
- Environment Validation: Zod-based schema validation ensures RBAC_COOKIE_SECRET meets minimum length requirements (32+ characters) and proper formatting.
- Payload Building: Includes issuance/expiry timestamps and versioning.
- Cookie Options: HttpOnly, SameSite lax, secure in production, path "/", max age 8 hours.
- Endpoint Behavior:
  - POST initializes session by fetching profile, normalizing permissions, computing school/subscription state, building payload, signing, and setting cookie.
  - DELETE clears the cookie with immediate expiry.
  - Rate limits are enforced per endpoint.
  - Enhanced error handling with detailed failure reasons for security-critical operations.

```mermaid
flowchart TD
Start(["POST /api/rbac/session"]) --> CheckSecret["Validate RBAC_SECRET with Zod schema"]
CheckSecret --> |Missing in prod| ThrowError["Throw FATAL SECURITY ERROR"]
CheckSecret --> |Missing in dev| WarnFallback["Warn about fallback"]
CheckSecret --> |Present| GetUser["Resolve authenticated user"]
GetUser --> |Invalid| Return401["Return 401 with 'Unauthorized'"]
GetUser --> FetchProfile["Fetch user profile + school/subscription"]
FetchProfile --> BuildPayload["Build RBAC payload"]
BuildPayload --> Sign["Sign payload"]
Sign --> SetCookie["Set signed cookie"]
SetCookie --> Done(["200 OK"])
DeleteStart(["DELETE /api/rbac/session"]) --> RL["Rate limit"]
RL --> ClearCookie["Clear cookie (maxAge=0)"]
ClearCookie --> DoneDel(["200 OK"])
```

**Diagram sources**
- [lib/rbac-session.ts:21-46](file://lib/rbac-session.ts#L21-L46)
- [lib/rbac-session.ts:108-142](file://lib/rbac-session.ts#L108-L142)
- [app/api/rbac/session/route.ts:15-143](file://app/api/rbac/session/route.ts#L15-L143)
- [lib/env/server.ts:7-11](file://lib/env/server.ts#L7-L11)

**Section sources**
- [lib/rbac-session.ts:1-156](file://lib/rbac-session.ts#L1-L156)
- [app/api/rbac/session/route.ts:1-144](file://app/api/rbac/session/route.ts#L1-L144)
- [lib/env/server.ts:1-65](file://lib/env/server.ts#L1-L65)

### Enhanced Authentication and Authorization Controls
- Supabase Auth integration:
  - Browser client creation validates environment variables and throws if missing.
  - Server client supports cookie-based session persistence and service role client for privileged operations.
  - Route-level user extraction supports Bearer token fallback.
- User profile retrieval:
  - Fetches user profile, resolves role, normalizes permissions (supports custom permissions), and enriches with school/subscription context.
  - Computes access decisions based on role, path rules, and permission requirements.
  - Determines if school access is blocked based on subscription status and expiration.
- Authorized API helpers:
  - Builds headers with Bearer token from current session and exposes fetch wrappers.
- Enhanced Error Handling:
  - Standardized failure responses with specific error codes for different failure scenarios.
  - Detailed error messages for invalid credentials, profile issues, inactive accounts, and server configuration problems.

```mermaid
sequenceDiagram
participant Client as "Client"
participant SupaB as "Supabase Browser"
participant SupaS as "Supabase Server"
participant EnvValidator as "Environment Validator"
participant DB as "PostgreSQL"
Client->>SupaB : "getUser()"
SupaB-->>Client : "User"
Client->>EnvValidator : "Validate RBAC secret"
EnvValidator-->>Client : "Secret status"
Client->>DB : "Select user_profiles"
DB-->>Client : "Profile + permissions"
Client->>Client : "Compute access decision"
Client->>SupaS : "Authorized request (Bearer)"
SupaS->>DB : "RLS-enforced query"
DB-->>SupaS : "Filtered rows"
SupaS-->>Client : "Response"
```

**Diagram sources**
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/supabase-server.ts:39-74](file://lib/supabase-server.ts#L39-L74)
- [lib/auth.ts:188-267](file://lib/auth.ts#L188-L267)
- [lib/authorized-api.ts:14-25](file://lib/authorized-api.ts#L14-L25)
- [lib/env/server.ts:23-54](file://lib/env/server.ts#L23-L54)

**Section sources**
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/supabase-server.ts:1-75](file://lib/supabase-server.ts#L1-L75)
- [lib/auth.ts:1-341](file://lib/auth.ts#L1-L341)
- [lib/authorized-api.ts:1-49](file://lib/authorized-api.ts#L1-L49)
- [app/api/auth/login/route.ts:18-41](file://app/api/auth/login/route.ts#L18-L41)

### Database RLS Policies and Tenant Scoping
- Managed user functions:
  - Provide current role, school ID, student/teacher IDs, and activity status for policy evaluation.
  - Teacher/student access checks for assignments, grades, attendance, and notifications.
- RLS policies:
  - Enable RLS on relevant tables and define select/update/insert policies scoped by role and managed identifiers.
  - Student/teacher can only access their own data or data within their managed scope (class/section/school).
- Conditional policy application:
  - Policies are created only if target tables exist.
- Storage security:
  - Storage bucket "school-media" is configured private with file size limits.
  - Functions and policies restrict read/write/delete based on managed roles and object ownership.

```mermaid
erDiagram
MANAGED_USER_PROFILES {
uuid auth_user_id
text role
uuid school_id
uuid student_id
uuid teacher_id
boolean is_active
}
STUDENTS {
uuid id
uuid school_id
text class_name
text section
}
TEACHERS {
uuid id
uuid school_id
jsonb classes_taught
}
ASSIGNMENTS {
uuid id
uuid school_id
uuid student_id
text class_name
text section
text content_kind
text attachment_bucket
text attachment_path
}
ATTENDANCE_RECORDS {
uuid id
uuid school_id
uuid student_id
}
PAYMENTS {
uuid id
uuid school_id
uuid student_id
}
GRADES {
uuid id
uuid school_id
uuid student_id
}
NOTIFICATIONS {
uuid id
uuid school_id
uuid user_id
jsonb metadata
}
STORAGE_OBJECTS {
text id
text bucket_id
text name
}
MANAGED_USER_PROFILES ||--o{ STUDENTS : "manages"
MANAGED_USER_PROFILES ||--o{ TEACHERS : "manages"
STUDENTS ||--o{ ATTENDANCE_RECORDS : "generates"
STUDENTS ||--o{ ASSIGNMENTS : "has"
STUDENTS ||--o{ PAYMENTS : "has"
STUDENTS ||--o{ GRADES : "has"
TEACHERS ||--o{ ASSIGNMENTS : "creates"
TEACHERS ||--o{ ATTENDANCE_RECORDS : "updates"
STORAGE_OBJECTS ||--o{ ASSIGNMENTS : "referenced_by"
STORAGE_OBJECTS ||--o{ NOTIFICATIONS : "referenced_by"
```

**Diagram sources**
- [migrations/20260322_managed_mobile_rls.sql:7-577](file://migrations/20260322_managed_mobile_rls.sql#L7-L577)
- [migrations/20260322_mobile_attachments_storage.sql:62-218](file://migrations/20260322_mobile_attachments_storage.sql#L62-L218)

**Section sources**
- [migrations/20260322_managed_mobile_rls.sql:1-580](file://migrations/20260322_managed_mobile_rls.sql#L1-L580)
- [migrations/20260322_mobile_attachments_storage.sql:1-221](file://migrations/20260322_mobile_attachments_storage.sql#L1-L221)

### Audit Logging System
- Purpose: Track user actions, system events, and security-relevant activities for compliance and monitoring.
- Schema: Supports action type, entity type, entity ID, summary, and metadata.
- Behavior: Attempts to insert audit log using current user context; errors are logged and ignored if the audit table is missing (compatibility mode).

```mermaid
flowchart TD
Start(["logAction(payload)"]) --> GetUser["Get current user"]
GetUser --> Insert["Insert into audit_logs"]
Insert --> ErrorCheck{"Error?"}
ErrorCheck --> |Missing table| LogWarn["Log warning (ignore)"]
ErrorCheck --> |Other error| LogErr["Log error"]
ErrorCheck --> |Success| Done(["Done"])
```

**Diagram sources**
- [lib/audit.ts:40-62](file://lib/audit.ts#L40-L62)
- [lib/admin-infrastructure.ts:43-64](file://lib/admin-infrastructure.ts#L43-L64)

**Section sources**
- [lib/audit.ts:1-63](file://lib/audit.ts#L1-L63)
- [lib/admin-infrastructure.ts:1-209](file://lib/admin-infrastructure.ts#L1-L209)

### Rate Limiting
- Mechanism: In-memory Map keyed by namespace and identifier with per-window counters and reset times; periodic cleanup removes expired entries.
- Headers: Standardized X-RateLimit-* and Retry-After for client guidance.
- Usage: Applied at the RBAC session endpoints to prevent abuse.

```mermaid
flowchart TD
Req(["Incoming request"]) --> Cleanup["Cleanup expired records"]
Cleanup --> BuildKey["Build key (namespace:identifier)"]
BuildKey --> GetRecord["Lookup current record"]
GetRecord --> NewOrExisting{"New or existing?"}
NewOrExisting --> Inc["Increment count"]
Inc --> Check{"Count <= max?"}
Check --> |Yes| Allow["Proceed"]
Check --> |No| Block["429 with headers"]
```

**Diagram sources**
- [lib/rate-limit.ts:34-105](file://lib/rate-limit.ts#L34-L105)
- [app/api/rbac/session/route.ts:33-41](file://app/api/rbac/session/route.ts#L33-L41)
- [app/api/rbac/session/route.ts:131-138](file://app/api/rbac/session/route.ts#L131-L138)

**Section sources**
- [lib/rate-limit.ts:1-106](file://lib/rate-limit.ts#L1-L106)
- [app/api/rbac/session/route.ts:1-144](file://app/api/rbac/session/route.ts#L1-L144)

### API Schema Validation with Zod
- Purpose: Provide comprehensive input validation and sanitization using Zod schemas for all API endpoints.
- Schema Design: Defines strict validation rules for all request parameters, body data, and query strings.
- Input Sanitization: Automatically trims whitespace, normalizes case, and validates data types.
- Error Handling: Provides detailed validation errors with field-specific messages and standardized error responses.
- Schema Categories:
  - Authentication schemas (login, password reset)
  - Payment processing schemas (create, delete, salary payments)
  - Expense management schemas (list, create, update)
  - Dashboard query schemas (overview, lists with pagination)
  - Generic utility schemas (UUID validation, money validation, date validation)

```mermaid
flowchart TD
Request["Incoming Request"] --> Parse["Zod.safeParse()"]
Parse --> Success{"Validation Success?"}
Success --> |Yes| Sanitized["Sanitized Data"]
Success --> |No| Error["Build Zod Field Errors"]
Error --> Response["400 Validation Error Response"]
Sanitized --> Process["Process Validated Data"]
Process --> Response2["200 Success Response"]
```

**Diagram sources**
- [lib/api-schemas.ts:102-110](file://lib/api-schemas.ts#L102-L110)
- [lib/route-utils.ts:21-33](file://lib/route-utils.ts#L21-L33)

**Section sources**
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [lib/route-utils.ts:1-48](file://lib/route-utils.ts#L1-L48)

### Health Monitoring Endpoint
- Purpose: Provide comprehensive system status verification with dependency checks and detailed reporting.
- Status Checks: Validates environment configuration, database connectivity, and service role key availability.
- Response Format: Returns structured JSON with status indicators, timing information, and dependency health metrics.
- Monitoring Integration: Designed for use with health checks, load balancers, and monitoring systems.
- Error Reporting: Captures and reports specific error conditions with actionable messages.

```mermaid
flowchart TD
Start(["GET /api/health"]) --> ExtractHeaders["Extract x-request-id"]
ExtractHeaders --> StartTimer["Record start time"]
StartTimer --> EnvCheck["Check environment variables"]
EnvCheck --> |Missing| MarkUnconfigured["Mark unconfigured"]
EnvCheck --> |Present| DBCheck["Test database connection"]
DBCheck --> |Success| MarkOK["Mark OK"]
DBCheck --> |Error| MarkError["Mark Error"]
MarkOK --> BuildResponse["Build health response"]
MarkError --> BuildResponse
MarkUnconfigured --> BuildResponse
BuildResponse --> SendResponse["Return JSON response"]
```

**Diagram sources**
- [app/api/health/route.ts:7-72](file://app/api/health/route.ts#L7-L72)

**Section sources**
- [app/api/health/route.ts:1-73](file://app/api/health/route.ts#L1-L73)

### Safe Query Builders and Filter Injection Prevention
- Purpose: Provide secure methods for constructing Supabase PostgREST queries to prevent injection attacks, particularly in .or() operations.
- Filter Value Escaping: The escapeFilterValue() function escapes special characters including backslashes, percent signs, underscores, commas, parentheses, and periods to prevent filter manipulation.
- Safe OR Filters: The buildSafeOrFilter() function creates properly escaped .or() filter strings for multiple columns, ensuring user input is safely incorporated into ilike queries.
- PostgREST Security: Protects against filter injection where malicious input could manipulate query logic by exploiting delimiter characters (commas, parentheses) and wildcard characters (%, _).
- Usage Pattern: Encourages developers to use these helper functions instead of raw string concatenation when building dynamic search queries.

**Updated** Added comprehensive safe query builder components for preventing filter injection attacks

```mermaid
flowchart TD
Input["User Search Input"] --> Trim["Trim Whitespace"]
Trim --> Escape["Escape Special Characters"]
Escape --> BuildFilter["Build .or() Filter String"]
BuildFilter --> ColumnsMap["Map to Multiple Columns"]
ColumnsMap --> Join["Join with Commas"]
Join --> SafeOutput["Safe Filter String"]
SafeOutput --> SupabaseQuery["Execute Supabase Query"]
```

**Diagram sources**
- [lib/supabase-query-helpers.ts:10-33](file://lib/supabase-query-helpers.ts#L10-L33)

**Section sources**
- [lib/supabase-query-helpers.ts:1-34](file://lib/supabase-query-helpers.ts#L1-L34)

### Enhanced Environment Validation and Error Handling
- Purpose: Provide comprehensive validation and error reporting for security-critical configuration settings.
- Schema Validation: Zod-based validation ensures RBAC_COOKIE_SECRET meets minimum length requirements and proper formatting.
- Error Messaging: Detailed error messages with specific guidance for fixing configuration issues.
- Security Hardening: Explicit error throwing in production environments prevents insecure configurations from starting.
- Cookie Security: Enhanced cookie options with secure-by-default behavior based on environment and configuration overrides.

**Updated** Added comprehensive environment validation and enhanced error handling for security-critical configurations

```mermaid
flowchart TD
Config["Environment Variables"] --> Schema["Zod Schema Validation"]
Schema --> Valid{"Valid Configuration?"}
Valid --> |Yes| Proceed["Proceed with Application"]
Valid --> |No| ErrorMsg["Generate Detailed Error Message"]
ErrorMsg --> Throw["Throw Configuration Error"]
Proceed --> SecureCookies["Configure Secure Cookies"]
SecureCookies --> RBACSecret["Validate RBAC Secret"]
RBACSecret --> ProdCheck{"Production Environment?"}
ProdCheck --> |Yes| StrictCheck["Strict Secret Validation"]
ProdCheck --> |No| Fallback["Development Fallback"]
StrictCheck --> ProdError["Throw Fatal Security Error"]
Fallback --> DevWarning["Log Development Warning"]
```

**Diagram sources**
- [lib/env/server.ts:7-11](file://lib/env/server.ts#L7-L11)
- [lib/env/server.ts:23-54](file://lib/env/server.ts#L23-L54)
- [lib/rbac-session.ts:25-31](file://lib/rbac-session.ts#L25-L31)

**Section sources**
- [lib/env/server.ts:1-65](file://lib/env/server.ts#L1-L65)
- [lib/rbac-session.ts:1-156](file://lib/rbac-session.ts#L1-L156)

### Input Validation and Protection Against Common Vulnerabilities
- Input validation: Use comprehensive Zod schema validation for all user-provided inputs. Validate types, lengths, and formats before processing.
- XSS protection: Escape HTML and sanitize user-generated content rendered in templates. Use framework-safe rendering and avoid innerHTML. CSP with nonce eliminates most script injection vectors.
- CSRF protection: Enforce SameSite cookies and consider CSRF tokens for state-changing forms. Ensure all state-changing requests originate from trusted origins.
- Injection prevention: Use parameterized queries and avoid dynamic SQL construction. Validate and whitelist inputs for database operations. Implement the new safe query builders for dynamic filter construction.
- Secure headers: Dynamic security headers at the edge layer mitigate common web vulnerabilities.
- Rate limiting: Implement per-endpoint rate limiting with IP and user-based tracking to prevent abuse.
- Enhanced error handling: Standardized error responses with detailed failure reasons for security-critical operations.

**Updated** Enhanced with strengthened cookie secret validation and improved error messaging for security-critical configurations

### Practical Secure Coding Practices
- Secrets management: Store secrets in environment variables; never commit secrets to source control. Rotate keys regularly and revoke compromised ones immediately. RBAC_COOKIE_SECRET is now mandatory in production with minimum length validation.
- Least privilege: Use service role keys only where necessary and disable persistent sessions for service clients.
- Error handling: Log errors securely without exposing sensitive data. Use generic messages to clients while preserving details in logs. Implement standardized validation error handling.
- Feature detection: Use admin infrastructure probing to gracefully handle missing features and warn administrators.
- CSP compliance: Use nonce-based CSP instead of unsafe-inline scripts. Store CSP nonce in x-csp-nonce header for server components.
- Query safety: Always use the buildSafeOrFilter() helper function for dynamic search queries involving .or() operations. Never concatenate user input directly into filter strings.
- Schema validation: Implement comprehensive Zod validation for all API endpoints with strict input sanitization and type checking.
- Environment validation: Use Zod-based schema validation for all server-side configuration with detailed error reporting.
- Cookie security: Configure secure cookies by default in production environments with explicit overrides for development.

**Updated** Enhanced with comprehensive schema validation, environment validation, and cookie security practices

**Section sources**
- [SECURITY.md:30-36](file://SECURITY.md#L30-L36)
- [lib/supabase-server.ts:39-50](file://lib/supabase-server.ts#L39-L50)
- [lib/admin-infrastructure.ts:112-209](file://lib/admin-infrastructure.ts#L112-L209)
- [lib/rbac-session.ts:23-30](file://lib/rbac-session.ts#L23-L30)
- [lib/supabase-query-helpers.ts:10-33](file://lib/supabase-query-helpers.ts#L10-L33)
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [lib/env/server.ts:7-11](file://lib/env/server.ts#L7-L11)

### Vulnerability Assessment and Incident Response
- Assessment: Conduct regular dependency audits, static analysis, and dynamic scanning. Review Supabase configuration and RLS policies periodically. Test CSP nonce generation, RBAC secret requirements, query safety mechanisms, Zod validation comprehensively, and environment configuration validation.
- Reporting: Follow private reporting guidelines for security issues. Treat credential exposure, privilege escalation, and isolation failures as critical.
- Response: Rotate affected secrets, apply patches, and communicate remediation steps. Monitor audit logs and alerts for suspicious activity.

**Updated** Enhanced assessment to include comprehensive schema validation, environment validation, and health monitoring

**Section sources**
- [SECURITY.md:17-36](file://SECURITY.md#L17-L36)

### Security Monitoring, Threat Detection, and Compliance
- Monitoring: Integrate audit logs with SIEM or analytics platforms. Alert on unusual spikes in 429 responses, repeated failures, or unauthorized access attempts. Monitor for potential filter injection attempts in search functionality and validate Zod schema compliance.
- Compliance: Maintain audit trails, enforce retention policies, and ensure data minimization. Regularly review RLS coverage, storage access controls, query safety implementations, and comprehensive input validation.
- CSP monitoring: Verify nonce generation and header injection in production. Monitor for CSP violations in browser developer tools.
- Health monitoring: Use the health endpoint for automated system status verification and dependency checks.
- Environment validation: Monitor for configuration errors and security-critical misconfigurations in production environments.

### Common Security Scenarios, Penetration Testing, and Maintenance
- Scenarios: Test cross-role access, tenant isolation, storage access bypass attempts, CSP nonce bypass attempts, RBAC secret validation, filter injection attack vectors, Zod validation bypass attempts, and environment configuration validation failures.
- Pen testing: Perform authorized penetration tests focusing on RBAC session integrity, RLS bypass vectors, storage exposure, CSP nonce effectiveness, query safety mechanisms, comprehensive API validation, and environment configuration security.
- Maintenance: Apply database migrations before deploying dependent features. Re-run linters, type checks, builds, and load tests before production releases. Regularly review and update query safety practices, schema validation implementations, and environment configuration validation.

**Updated** Enhanced pen testing to include comprehensive schema validation, environment validation, and health monitoring scenarios

## Dependency Analysis
- RBAC session signing depends on a dedicated secret; absence triggers warnings or errors depending on environment.
- Enhanced environment validation uses Zod schema for comprehensive configuration validation with detailed error reporting.
- Proxy middleware generates cryptographically secure nonces and sets comprehensive security headers.
- RBAC session endpoint depends on Supabase Auth for user resolution, Supabase server client for profile/school/subscription queries, rate limiting, Zod schema validation, and enhanced error handling.
- API endpoints depend on Zod schemas for input validation, rate limiting for abuse prevention, and comprehensive error handling utilities.
- Database RLS depends on managed user functions and policies; storage RLS depends on bucket configuration and policy functions.
- Audit logging depends on Supabase client and admin infrastructure probing to handle missing tables gracefully.
- Safe query builders depend on the new supabase-query-helpers module for filter escaping and construction.
- Health monitoring endpoint depends on environment configuration and database connectivity checks.
- Authentication endpoints depend on enhanced environment validation and standardized error handling for security-critical operations.

**Updated** Added dependencies on comprehensive schema validation, environment validation, and enhanced error handling

```mermaid
graph LR
RBACSession["lib/rbac-session.ts"] --> Secret["Environment secret"]
EnvValidator["lib/env/server.ts"] --> SecretSchema["Zod Schema Validation"]
Proxy["proxy.ts"] --> Crypto["Web Crypto API"]
Proxy --> SupabaseURL["NEXT_PUBLIC_SUPABASE_URL"]
RBACRoute["app/api/rbac/session/route.ts"] --> SupaServer["lib/supabase-server.ts"]
RBACRoute --> RateLimit["lib/rate-limit.ts"]
RBACRoute --> SupaBrowser["lib/supabase.ts"]
RBACRoute --> ZodSchemas["lib/api-schemas.ts"]
RBACRoute --> EnvValidator
AuthLib["lib/auth.ts"] --> SupaBrowser
AuthLib --> RLS["migrations/*_managed_mobile_rls.sql"]
StorageRLS["migrations/*_mobile_attachments_storage.sql"] --> StoragePolicy["storage.objects policies"]
Audit["lib/audit.ts"] --> SupaBrowser
AdminInfra["lib/admin-infrastructure.ts"] --> AuthLib
QueryHelpers["lib/supabase-query-helpers.ts"] --> SupaBrowser
HealthEndpoint["app/api/health/route.ts"] --> EnvConfig["Environment Config"]
HealthEndpoint --> SupaServer
ZodUtils["lib/route-utils.ts"] --> ZodSchemas
LoginRoute["app/api/auth/login/route.ts"] --> EnvValidator
LoginRoute --> ZodUtils
```

**Diagram sources**
- [lib/rbac-session.ts:21-46](file://lib/rbac-session.ts#L21-L46)
- [lib/env/server.ts:7-11](file://lib/env/server.ts#L7-L11)
- [proxy.ts:7-16](file://proxy.ts#L7-L16)
- [proxy.ts:32-33](file://proxy.ts#L32-L33)
- [app/api/rbac/session/route.ts:22-143](file://app/api/rbac/session/route.ts#L22-L143)
- [lib/supabase-server.ts:1-75](file://lib/supabase-server.ts#L1-L75)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/rate-limit.ts:65-105](file://lib/rate-limit.ts#L65-L105)
- [lib/auth.ts:188-267](file://lib/auth.ts#L188-L267)
- [migrations/20260322_managed_mobile_rls.sql:315-577](file://migrations/20260322_managed_mobile_rls.sql#L315-L577)
- [migrations/20260322_mobile_attachments_storage.sql:176-218](file://migrations/20260322_mobile_attachments_storage.sql#L176-L218)
- [lib/audit.ts:40-62](file://lib/audit.ts#L40-L62)
- [lib/admin-infrastructure.ts:131-209](file://lib/admin-infrastructure.ts#L131-L209)
- [lib/supabase-query-helpers.ts:1-34](file://lib/supabase-query-helpers.ts#L1-L34)
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [app/api/health/route.ts:1-73](file://app/api/health/route.ts#L1-L73)
- [lib/route-utils.ts:1-48](file://lib/route-utils.ts#L1-L48)
- [app/api/auth/login/route.ts:18-41](file://app/api/auth/login/route.ts#L18-L41)

**Section sources**
- [lib/rbac-session.ts:1-156](file://lib/rbac-session.ts#L1-L156)
- [lib/env/server.ts:1-65](file://lib/env/server.ts#L1-L65)
- [proxy.ts:1-139](file://proxy.ts#L1-L139)
- [app/api/rbac/session/route.ts:1-144](file://app/api/rbac/session/route.ts#L1-L144)
- [lib/supabase-server.ts:1-75](file://lib/supabase-server.ts#L1-L75)
- [lib/supabase.ts:1-22](file://lib/supabase.ts#L1-L22)
- [lib/rate-limit.ts:1-106](file://lib/rate-limit.ts#L1-L106)
- [lib/auth.ts:1-341](file://lib/auth.ts#L1-L341)
- [migrations/20260322_managed_mobile_rls.sql:1-580](file://migrations/20260322_managed_mobile_rls.sql#L1-L580)
- [migrations/20260322_mobile_attachments_storage.sql:1-221](file://migrations/20260322_mobile_attachments_storage.sql#L1-L221)
- [lib/audit.ts:1-63](file://lib/audit.ts#L1-L63)
- [lib/admin-infrastructure.ts:1-209](file://lib/admin-infrastructure.ts#L1-L209)
- [lib/supabase-query-helpers.ts:1-34](file://lib/supabase-query-helpers.ts#L1-L34)
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [app/api/health/route.ts:1-73](file://app/api/health/route.ts#L1-L73)
- [lib/route-utils.ts:1-48](file://lib/route-utils.ts#L1-L48)
- [app/api/auth/login/route.ts:1-191](file://app/api/auth/login/route.ts#L1-L191)

## Performance Considerations
- RBAC session signing uses HMAC-SHA256; keep payloads minimal to reduce overhead.
- CSP nonce generation uses Web Crypto API; minimal performance impact but ensures cryptographic security.
- Rate limiter uses in-memory Map with periodic cleanup; monitor memory growth under high concurrency.
- RLS evaluation occurs server-side; ensure appropriate indexes on filtered columns (e.g., student_id, school_id).
- Storage RLS checks traverse related tables; maintain indexes on lookup columns.
- Safe query builders add minimal overhead through string escaping operations; benefits far outweigh performance costs.
- Zod validation adds CPU overhead for input parsing but provides comprehensive type safety and reduces downstream processing errors.
- Health monitoring endpoint performs lightweight database probes; optimize frequency for production deployments.
- Environment validation adds minimal startup overhead but prevents costly runtime errors.

**Updated** Added performance considerations for new environment validation and enhanced error handling components

## Troubleshooting Guide
- Missing Supabase environment variables: Browser client creation throws if URL or keys are missing.
- RBAC secret not configured: Production requires a dedicated secret; explicit error thrown. Development falls back with warnings.
- Enhanced environment validation errors: Zod-based validation provides detailed error messages for configuration issues.
- CSP nonce generation failing: Check Web Crypto API availability in Next.js runtime.
- Proxy middleware not applying headers: Verify matcher configuration excludes static files and API routes correctly.
- Profile not found: RBAC session endpoint returns 404 when user profile cannot be retrieved.
- Unauthorized access: RBAC session endpoint returns 401 if user is not authenticated.
- Audit table missing: Audit logging ignores missing table errors and logs a warning.
- Rate limit exceeded: RBAC endpoints return 429 with standardized headers; adjust window/max hits as needed.
- Query safety failures: If .or() filters are not working correctly, ensure buildSafeOrFilter() is being used instead of manual string concatenation.
- Schema validation failures: Check Zod error messages for specific field validation issues; ensure request data matches expected types and formats.
- Health endpoint failures: Verify environment variables, database connectivity, and service role key configuration.
- Validation utility errors: Use buildZodFieldErrors() to extract detailed validation error information.
- Authentication failure reasons: Check specific error codes for invalid credentials, profile issues, inactive accounts, and server configuration problems.

**Updated** Added troubleshooting guidance for enhanced environment validation, authentication failure reasons, and improved error handling

**Section sources**
- [lib/supabase.ts:8-19](file://lib/supabase.ts#L8-L19)
- [lib/rbac-session.ts:26-49](file://lib/rbac-session.ts#L26-L49)
- [lib/env/server.ts:35-38](file://lib/env/server.ts#L35-L38)
- [proxy.ts:125-138](file://proxy.ts#L125-L138)
- [app/api/rbac/session/route.ts:49-56](file://app/api/rbac/session/route.ts#L49-L56)
- [app/api/rbac/session/route.ts:28-30](file://app/api/rbac/session/route.ts#L28-L30)
- [lib/audit.ts:56-62](file://lib/audit.ts#L56-L62)
- [lib/rate-limit.ts:86-105](file://lib/rate-limit.ts#L86-L105)
- [lib/supabase-query-helpers.ts:10-33](file://lib/supabase-query-helpers.ts#L10-L33)
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [app/api/health/route.ts:1-73](file://app/api/health/route.ts#L1-L73)
- [lib/route-utils.ts:21-33](file://lib/route-utils.ts#L21-L33)
- [app/api/auth/login/route.ts:18-41](file://app/api/auth/login/route.ts#L18-L41)

## Conclusion
The platform implements a robust, layered security model combining Supabase Auth, signed RBAC session cookies, dynamic CSP with nonce-based approach, comprehensive security headers, database RLS, storage policies, audit logging, and rate limiting. The recent security hardening includes mandatory dedicated RBAC cookie secrets in production, comprehensive CSP implementation with per-request nonces, dynamic security headers through proxy middleware, comprehensive API schema validation using Zod for strict input sanitization and type checking, health monitoring endpoint for system status verification, enhanced environment validation with Zod-based configuration validation, and most importantly, the new buildSafeOrFilter() helper function that prevents filter injection attacks in Supabase .or() queries. The enhanced query safety layer provides additional protection against injection vulnerabilities in dynamic search functionality. The strengthened RBAC session management with enhanced cookie secret validation and improved error messaging ensures secure configuration management with detailed failure reporting. Administrators should ensure proper secret management, apply migrations before feature deployment, continuously monitor and test for vulnerabilities, verify CSP nonce generation and header injection in production environments, adopt the new safe query builder patterns throughout the application, implement comprehensive Zod validation across all API endpoints, utilize the health monitoring endpoint for automated system status verification, and leverage the enhanced environment validation for secure configuration management.

**Updated** Enhanced conclusion to highlight new schema validation, health monitoring, query safety, environment validation, and enhanced RBAC session management capabilities

## Appendices
- Security policy scope and operational expectations are documented centrally.
- Admin infrastructure probing helps identify missing features and compatibility warnings.
- RBAC_COOKIE_SECRET is now mandatory in production for enhanced security posture with minimum length validation.
- Safe query builder functions provide standardized protection against filter injection attacks.
- The buildSafeOrFilter() helper should be used universally for dynamic search queries involving .or() operations.
- Zod schema validation provides comprehensive input sanitization and type checking for all API endpoints.
- Health monitoring endpoint enables automated system status verification and dependency checks.
- Standardized error handling utilities provide consistent validation error reporting across the application.
- Enhanced environment validation ensures secure configuration management with detailed error reporting.
- Cookie security is configured by default for production environments with explicit overrides for development.

**Updated** Added information about new schema validation, health monitoring, comprehensive error handling, environment validation, and enhanced cookie security

**Section sources**
- [SECURITY.md:1-36](file://SECURITY.md#L1-L36)
- [lib/admin-infrastructure.ts:112-209](file://lib/admin-infrastructure.ts#L112-L209)
- [lib/rbac-session.ts:23-30](file://lib/rbac-session.ts#L23-L30)
- [proxy.ts:38-43](file://proxy.ts#L38-L43)
- [lib/supabase-query-helpers.ts:1-34](file://lib/supabase-query-helpers.ts#L1-L34)
- [lib/api-schemas.ts:1-202](file://lib/api-schemas.ts#L1-L202)
- [app/api/health/route.ts:1-73](file://app/api/health/route.ts#L1-L73)
- [lib/route-utils.ts:1-48](file://lib/route-utils.ts#L1-L48)
- [lib/env/server.ts:7-11](file://lib/env/server.ts#L7-L11)
- [lib/rbac-session.ts:25-31](file://lib/rbac-session.ts#L25-L31)