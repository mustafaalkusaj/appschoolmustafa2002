# Permission Checker

## Name
permission-checkler

## Description
Builds a permission/authorization system to control access to resources and actions. This skill creates role-based access control (RBAC) or attribute-based access control (ABAC) systems for backend applications.

**When to use:**
- When you need to restrict access to certain resources or endpoints
- When implementing role-based permissions (admin, user, moderator, etc.)
- When building multi-tenant applications with tenant-specific permissions
- When you need fine-grained control over who can do what
- When implementing API authorization
- When you need to audit who accessed what

## Instructions

1. **Define permission model** - Roles, permissions, and their relationships
2. **Create permission matrix** - Map roles to allowed actions
3. **Build permission service** - Logic to check and enforce permissions
4. **Create middleware** - Guards to protect routes/endpoints
5. **Implement decorators** - For method-level authorization
6. **Add ownership checks** - Users can only modify their own resources
7. **Build admin interface** - For managing roles and permissions

## Expected Input

```javascript
{
  "model": "RBAC", // or "ABAC", "hybrid"
  "roles": ["admin", "moderator", "user", "guest"],
  "permissions": [
    "users:read", "users:write", "users:delete",
    "posts:read", "posts:write", "posts:delete",
    "comments:read", "comments:write", "comments:delete"
  ],
  "framework": "Express",
  "storage": "database" // or "config-file"
}
```

## Expected Output

```javascript
// Permission matrix and enforcement system
{
  "admin": ["*"], // All permissions
  "moderator": ["users:read", "posts:*", "comments:*"],
  "user": ["posts:read", "posts:write", "comments:*"],
  "guest": ["posts:read", "comments:read"]
}
```

## Example Usage

**Input:**
```
Build a permission system for a blog platform.
Roles: admin, author, user, guest
Resources: posts, comments, users
Actions: create, read, update, delete
Include: middleware, service, and database schema.
```

**Output:**
```typescript
// types/permission.ts
export enum Role {
  ADMIN = 'admin',
  AUTHOR = 'author',
  USER = 'user',
  GUEST = 'guest'
}

export enum Resource {
  USERS = 'users',
  POSTS = 'posts',
  COMMENTS = 'comments'
}

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage'
}

export type Permission = `${Resource}:${Action}`;

// config/permissions.ts
export const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: ['*'], // All permissions
  [Role.AUTHOR]: [
    'posts:create', 'posts:read', 'posts:update', 'posts:delete', // Own posts
    'comments:create', 'comments:read', 'comments:update', 'comments:delete' // Own comments
  ],
  [Role.USER]: [
    'posts:read', 'comments:create', 'comments:read', 'comments:update', 'comments:delete' // Own comments
  ],
  [Role.GUEST]: [
    'posts:read', 'comments:read'
  ]
};

// services/PermissionService.ts
export class PermissionService {
  constructor(private userRepository: UserRepository) {}

  hasPermission(role: Role, permission: Permission): boolean {
    const permissions = rolePermissions[role];
    if (permissions.includes('*')) return true;
    return permissions.includes(permission);
  }

  hasResourcePermission(
    role: Role,
    resource: Resource,
    action: Action,
    ownerId?: string,
    userId?: string
  ): boolean {
    const permission = `${resource}:${action}` as Permission;
    
    if (!this.hasPermission(role, permission)) return false;

    // Ownership check for non-admin roles
    if (role !== Role.ADMIN && ownerId && userId && ownerId !== userId) {
      // Check if user has manage permission (can manage others' resources)
      return this.hasPermission(role, `${resource}:manage` as Permission);
    }

    return true;
  }

  async canAccessResource(userId: string, resource: Resource, action: Action, resourceOwnerId?: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    return this.hasResourcePermission(user.role, resource, action, resourceOwnerId, userId);
  }
}

// middleware/authorize.ts
export const authorize = (
  resource: Resource,
  action: Action,
  options: { checkOwnership?: boolean } = {}
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new UnauthorizedError('Authentication required');

    const permissionService = new PermissionService(userRepository);
    
    const resourceOwnerId = options.checkOwnership ? req.params.resourceOwnerId : undefined;
    const hasPermission = await permissionService.canAccessResource(
      user.id,
      resource,
      action,
      resourceOwnerId
    );

    if (!hasPermission) {
      throw new ForbiddenError('You do not have permission to perform this action');
    }

    next();
  };
};

// middleware/authorizeMultiple.ts - for multiple permission checks
export const authorizeAny = (...permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) throw new UnauthorizedError('Authentication required');

    const permissionService = new PermissionService(userRepository);
    const hasAny = permissions.some(p => permissionService.hasPermission(user.role, p));

    if (!hasAny) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

// Usage in routes
router.delete('/posts/:id', 
  authenticate,
  authorize(Resource.POSTS, Action.DELETE, { checkOwnership: true }),
  postController.delete
);

router.get('/users', 
  authenticate,
  authorizeAny('users:read', 'users:manage'),
  userController.list
);

// Decorator approach for class methods
export const RequirePermission = (resource: Resource, action: Action) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const user = args[0]?.user;
      if (!user) throw new UnauthorizedError();

      const permissionService = new PermissionService(userRepository);
      const hasPermission = await permissionService.canAccessResource(
        user.id, resource, action
      );

      if (!hasPermission) throw new ForbiddenError();

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
};

// In service
class PostService {
  @RequirePermission(Resource.POSTS, Action.DELETE)
  async deletePost(userId: string, postId: string) {
    const post = await this.postRepository.findById(postId);
    if (post.authorId !== userId) {
      throw new ForbiddenError('Cannot delete another author\'s post');
    }
    return this.postRepository.delete(postId);
  }
}
```

## Permission Models Comparison

| Model | Best For | Pros | Cons |
|-------|----------|------|------|
| RBAC | Simple role systems | Easy to understand, manage | Limited granularity |
| ABAC | Complex, dynamic rules | Highly flexible | Complex to implement |
| Hybrid | Most applications | Best of both | More complexity |

## Best Practices

- **Principle of Least Privilege** - Grant minimum permissions needed
- **Defense in Depth** - Check permissions at multiple layers
- **Ownership Validation** - Users own their resources by default
- **Audit Logging** - Log all permission checks and denials
- **Centralize Logic** - Don't scatter permission checks across codebase
- **Fail Closed** - Default to deny if permission check fails
