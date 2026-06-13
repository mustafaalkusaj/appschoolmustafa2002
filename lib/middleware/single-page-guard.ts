// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Single-Page User Guard Middleware
 * Restricts single-page users to their assigned pages
 * Enforces the isSinglePageUser and pageAccess restrictions
 * NOTE: Uses Prisma client. Migration to Supabase planned for future release.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createApiLogger } from '@/lib/api-logger';
import type { AuthContext } from './auth-middleware';

export type PageAction = 'view' | 'create' | 'update' | 'delete';

/**
 * Check if user has access to a specific page and action
 */
export async function checkPageAccess(
  authContext: AuthContext,
  pageCode: string,
  action: PageAction,
  endpoint: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const log = createApiLogger({
    endpoint,
    userId: authContext.userId
  });

  try {
    // Super admin and unrestricted users have full access
    if (!authContext.isSinglePageUser || authContext.role === 'SUPER_ADMIN') {
      return { allowed: true };
    }

    // Check user's page access permissions
    const pageAccess = await prisma.userPageAccess.findUnique({
      where: {
        userId_pageCode: {
          userId: authContext.userId,
          pageCode
        }
      }
    });

    // No access record = no access
    if (!pageAccess) {
      log.logAuthEvent(
        'permission_denied',
        `User attempted to access page ${pageCode} without permission`
      );

      return {
        allowed: false,
        response: NextResponse.json(
          { error: 'You do not have access to this page' },
          { status: 403 }
        )
      };
    }

    // Check specific action permission
    const canPerformAction = getActionPermission(pageAccess, action);

    if (!canPerformAction) {
      log.logAuthEvent(
        'permission_denied',
        `User attempted to perform ${action} on page ${pageCode}`
      );

      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: `You do not have permission to ${action} on this page`
          },
          { status: 403 }
        )
      };
    }

    return { allowed: true };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint, pageCode, action }
    );

    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Get all pages accessible to a user
 */
export async function getUserAccessiblePages(
  userId: string
): Promise<
  Array<{
    pageCode: string;
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }>
> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Non-single-page users have access to all pages
    if (!user?.isSinglePageUser) {
      return [];
    }

    const pages = await prisma.userPageAccess.findMany({
      where: { userId },
      select: {
        pageCode: true,
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true
      }
    });

    return pages;
  } catch (error) {
    console.error('Error fetching user accessible pages:', error);
    return [];
  }
}

/**
 * Grant page access to a user
 */
export async function grantPageAccess(
  userId: string,
  pageCode: string,
  permissions: {
    canView?: boolean;
    canCreate?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  },
  _createdByUserId: string
): Promise<{ success: boolean; error?: string }> {
  const log = createApiLogger({
    endpoint: '/api/admin/users/page-access'
  });

  try {
    // First, verify the user exists and is single-page
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.isSinglePageUser) {
      return { success: false, error: 'User is not a single-page user' };
    }

    // Create or update page access
    const pageAccess = await prisma.userPageAccess.upsert({
      where: {
        userId_pageCode: {
          userId,
          pageCode
        }
      },
      create: {
        userId,
        pageCode,
        canView: permissions.canView ?? false,
        canCreate: permissions.canCreate ?? false,
        canUpdate: permissions.canUpdate ?? false,
        canDelete: permissions.canDelete ?? false
      },
      update: {
        canView: permissions.canView !== undefined ? permissions.canView : undefined,
        canCreate: permissions.canCreate !== undefined ? permissions.canCreate : undefined,
        canUpdate: permissions.canUpdate !== undefined ? permissions.canUpdate : undefined,
        canDelete: permissions.canDelete !== undefined ? permissions.canDelete : undefined
      }
    });

    log.logDataModification(
      'create',
      'user_page_access',
      pageAccess.id,
      {
        userId,
        pageCode,
        permissions: permissions as Record<string, unknown>
      }
    );

    return { success: true };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { userId, pageCode }
    );

    return { success: false, error: 'Failed to grant page access' };
  }
}

/**
 * Revoke page access from a user
 */
export async function revokePageAccess(
  userId: string,
  pageCode: string,
  _deletedByUserId: string
): Promise<{ success: boolean; error?: string }> {
  const log = createApiLogger({
    endpoint: '/api/admin/users/page-access'
  });

  try {
    const pageAccess = await prisma.userPageAccess.findUnique({
      where: {
        userId_pageCode: {
          userId,
          pageCode
        }
      }
    });

    if (!pageAccess) {
      return { success: false, error: 'Page access not found' };
    }

    await prisma.userPageAccess.delete({
      where: {
        userId_pageCode: {
          userId,
          pageCode
        }
      }
    });

    log.logDataModification(
      'delete',
      'user_page_access',
      pageAccess.id
    );

    return { success: true };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { userId, pageCode }
    );

    return { success: false, error: 'Failed to revoke page access' };
  }
}

/**
 * Update page access permissions
 */
export async function updatePageAccess(
  userId: string,
  pageCode: string,
  permissions: {
    canView?: boolean;
    canCreate?: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  },
  _updatedByUserId: string
): Promise<{ success: boolean; error?: string }> {
  const log = createApiLogger({
    endpoint: '/api/admin/users/page-access'
  });

  try {
    const pageAccess = await prisma.userPageAccess.findUnique({
      where: {
        userId_pageCode: {
          userId,
          pageCode
        }
      }
    });

    if (!pageAccess) {
      return { success: false, error: 'Page access not found' };
    }

    const updated = await prisma.userPageAccess.update({
      where: {
        userId_pageCode: {
          userId,
          pageCode
        }
      },
      data: {
        ...(permissions.canView !== undefined && { canView: permissions.canView }),
        ...(permissions.canCreate !== undefined && { canCreate: permissions.canCreate }),
        ...(permissions.canUpdate !== undefined && { canUpdate: permissions.canUpdate }),
        ...(permissions.canDelete !== undefined && { canDelete: permissions.canDelete })
      }
    });

    log.logDataModification(
      'update',
      'user_page_access',
      updated.id,
      {
        changes: permissions as Record<string, unknown>
      }
    );

    return { success: true };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { userId, pageCode }
    );

    return { success: false, error: 'Failed to update page access' };
  }
}

/**
 * Helper function to check specific action permission
 */
function getActionPermission(
  pageAccess: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  },
  action: PageAction
): boolean {
  switch (action) {
    case 'view':
      return pageAccess.canView;
    case 'create':
      return pageAccess.canCreate;
    case 'update':
      return pageAccess.canUpdate;
    case 'delete':
      return pageAccess.canDelete;
    default:
      return false;
  }
}

/**
 * Check read-only access (view-only)
 */
export function isReadOnlyAccess(
  pageAccess: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }
): boolean {
  return pageAccess.canView && !pageAccess.canCreate && !pageAccess.canUpdate && !pageAccess.canDelete;
}
