/**
 * Authentication Middleware
 * Protects API routes and extracts user context from JWT tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, verifyToken } from '@/lib/services/jwt';
import { createApiLogger } from '@/lib/api-logger';

export interface AuthContext {
  userId: string;
  email: string;
  schoolId: string;
  branchId?: string;
  role: string;
  isSinglePageUser: boolean;
}

/**
 * Extract and verify JWT token from request
 */
export function extractAuthContext(req: NextRequest): AuthContext | null {
  const authHeader = req.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
  }

  const payload = verifyToken(token);

  if (!payload) {
    return null;
  }

  return {
    userId: payload.userId,
    email: payload.email,
    schoolId: payload.schoolId,
    branchId: payload.branchId,
    role: payload.role,
    isSinglePageUser: payload.isSinglePageUser || false
  };
}

/**
 * Middleware to require authentication
 * Usage: const authContext = requireAuth(req);
 */
export function requireAuth(
  req: NextRequest,
  endpoint: string
): { auth: AuthContext; response: null } | { auth: null; response: NextResponse } {
  const authContext = extractAuthContext(req);

  if (!authContext) {
    const log = createApiLogger({
      endpoint,
      ip: req.headers.get('x-forwarded-for') || 'unknown'
    });

    log.logAuthEvent('failed_login', 'Missing or invalid authentication');

    return {
      auth: null,
      response: NextResponse.json(
        { error: 'Unauthorized: Missing or invalid authentication' },
        { status: 401 }
      )
    };
  }

  return {
    auth: authContext,
    response: null
  };
}

/**
 * Middleware to require specific role
 */
export function requireRole(
  authContext: AuthContext,
  requiredRoles: string | string[],
  endpoint: string
): { allowed: true; response: null } | { allowed: false; response: NextResponse } {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  if (!roles.includes(authContext.role)) {
    const log = createApiLogger({
      endpoint,
      userId: authContext.userId
    });

    log.logAuthEvent('permission_denied', `User ${authContext.role} attempted to access ${endpoint}`);

    return {
      allowed: false,
      response: NextResponse.json(
        {
          error: `Forbidden: This endpoint requires one of these roles: ${roles.join(', ')}`
        },
        { status: 403 }
      )
    };
  }

  return {
    allowed: true,
    response: null
  };
}

/**
 * Middleware to require branch access
 * Ensures single-page users can only access their assigned branch
 */
export function requireBranchAccess(
  authContext: AuthContext,
  requiredBranchId: string,
  endpoint: string
): { allowed: true; response: null } | { allowed: false; response: NextResponse } {
  // Super admin can access any branch
  if (authContext.role === 'super_admin' || authContext.role === 'admin') {
    return {
      allowed: true,
      response: null
    };
  }

  // Single-page users must access their assigned branch
  if (authContext.isSinglePageUser && authContext.branchId !== requiredBranchId) {
    const log = createApiLogger({
      endpoint,
      userId: authContext.userId
    });

    log.logAuthEvent(
      'permission_denied',
      `Single-page user attempted to access unauthorized branch`
    );

    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Forbidden: You do not have access to this branch' },
        { status: 403 }
      )
    };
  }

  return {
    allowed: true,
    response: null
  };
}

/**
 * Add auth context to request for downstream handlers
 */
export function injectAuthContext(req: NextRequest, authContext: AuthContext): void {
  // Store in request headers for access in route handlers
  Object.defineProperty(req, '_authContext', {
    value: authContext,
    writable: false,
    enumerable: false
  });
}

/**
 * Get auth context from request
 */
export function getAuthContext(req: NextRequest): AuthContext | null {
  return (req as any)._authContext || null;
}
