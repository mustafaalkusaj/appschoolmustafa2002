# Endpoint Generator

## Description
Creates API endpoint definitions with proper HTTP methods, routing, validation, and documentation.

## When to Use
- Setting up new API routes
- Need consistent endpoint structure
- Building backend integration layer

## Instructions
1. Define endpoint path and HTTP method
2. Specify request/response schemas
3. Add validation rules and middleware
4. Generate typed client functions
5. Include error handling patterns
6. Add API documentation comments

## Expected Input
```
Endpoint: /api/users/:id/avatar
Method: POST
Purpose: Upload user profile picture
Body: multipart/form-data (image)
Response: { url: string, thumbnailUrl: string }
Auth: Required (Bearer token)
Rate limit: 10 requests/minute
```

## Expected Output
```
// Server (Express/Fastify)
POST /api/users/:id/avatar
  - Auth middleware
  - File upload handling (multer/sharp)
  - Response: { url, thumbnailUrl }

// Client (typed function)
async function uploadUserAvatar(userId: string, file: File): Promise<AvatarResponse>
```

## Example Usage
```
User: Generate endpoints for blog posts (list, get, create, update, delete, search)
Assistant: [Creates all 6 RESTful endpoints with validation, pagination, search, and typed client functions]
```
