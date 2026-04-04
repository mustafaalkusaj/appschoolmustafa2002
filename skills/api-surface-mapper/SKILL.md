# api-surface-mapper

## Name

API Surface Mapper

## Description

Maps all public APIs including REST endpoints, GraphQL operations, RPC calls, and WebSocket events. This skill provides a complete view of how external clients interact with the application.

**When to use:**
- When integrating with an API
- When documenting the API for consumers
- When auditing API completeness and consistency
- When planning API versioning strategies
- When testing API coverage
- When understanding client-server boundaries

## Instructions

1. **Identify API definitions:**
   - REST: Route files, OpenAPI/Swagger specs, Express routes
   - GraphQL: Schema files, resolver definitions
   - RPC: tRPC procedures, gRPC service definitions
   - WebSocket: Socket.io events, WS handlers
   - Webhook handlers: Callback endpoints

2. **Document each endpoint/operation:**

   **For REST:**
   - HTTP method and path
   - Request parameters and body schema
   - Response schema and status codes
   - Authentication requirements
   - Rate limiting

   **For GraphQL:**
   - Query/Mutation/Subscription name
   - Variables and types
   - Return type
   - Authorization rules

3. **Group by domain/feature:**
   - Users, Auth, Products, Orders, etc.
   - Internal vs external APIs
   - Version boundaries

4. **Identify patterns and inconsistencies:**
   - Naming conventions
   - Error response formats
   - Authentication methods
   - Pagination strategies
   - Versioning approach

## Expected Input

- API type to focus on (REST, GraphQL, all)
- Domain to map (optional, e.g., "users", "payments")

## Expected Output

```markdown
# API Surface Map

## REST API (v1)

### Authentication
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | /api/auth/login | User login | None |
| POST | /api/auth/register | User registration | None |
| POST | /api/auth/refresh | Refresh token | Refresh token |
| POST | /api/auth/logout | Invalidate session | Bearer |

### Users
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /api/users | List users | Admin |
| GET | /api/users/:id | Get user | Owner/Admin |
| PATCH | /api/users/:id | Update user | Owner |
| DELETE | /api/users/:id | Delete user | Admin |

## Endpoint Details

### POST /api/auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "user": { "id": "1", "email": "user@example.com" }
}
```

**Errors:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid input |
| 401 | Wrong credentials |
| 429 | Too many attempts |

## GraphQL Schema (Queries)
```graphql
type Query {
  me: User
  users(filter: UserFilter, limit: Int, offset: Int): [User!]!
  user(id: ID!): User
}
```

## GraphQL Schema (Mutations)
```graphql
type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}
```

## WebSocket Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join:room` | `{ roomId: string }` | Join a chat room |
| `leave:room` | `{ roomId: string }` | Leave a chat room |
| `message:send` | `{ roomId, content }` | Send message |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `{ id, roomId, content, user }` | New message |
| `user:joined` | `{ roomId, user }` | User joined |
| `user:left` | `{ roomId, user }` | User left |

## API Patterns

### Consistency Issues
⚠️ `/users` uses camelCase, `/orders` uses snake_case in response
⚠️ `/auth/*` returns 200 on failure, `/api/*` returns 400/401

### Pagination
| Endpoint | Strategy |
|----------|----------|
| GET /users | cursor-based |
| GET /orders | offset-based |
| GET /products | page-based |

## Security Summary
- All `/api/*` endpoints require Bearer token
- Admin endpoints require `role: admin` in JWT
- Rate limit: 100 req/min per IP (login: 10 req/min)
```

## Example Usage

```
Load skill: api-surface-mapper
Focus: GraphQL API
Domain: payments
Output: Complete GraphQL schema mapping for payments
```

**Best used when integrating with the API, documenting it for consumers, or auditing API design consistency.**
