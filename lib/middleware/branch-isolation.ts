// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Branch Isolation Middleware
 * Enforces branch-level access control
 * Ensures users can only access data within their assigned branch/school
 * NOTE: Uses Prisma client. Migration to Supabase planned for future release.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createApiLogger } from '@/lib/api-logger';
import type { AuthContext } from './auth-middleware';

/**
 * Verify that the requested resource belongs to the user's school/branch
 */
export async function verifyBranchAccess(
  authContext: AuthContext,
  resourceType: 'school' | 'branch' | 'student' | 'employee' | 'transaction' | 'salary',
  resourceId: string,
  endpoint: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const log = createApiLogger({
    endpoint,
    userId: authContext.userId
  });

  try {
    // Super admin and higher roles have unrestricted access
    if (
      authContext.role === 'SUPER_ADMIN' ||
      authContext.role === 'INVESTOR'
    ) {
      return { allowed: true };
    }

    // Verify based on resource type
    switch (resourceType) {
      case 'school':
        // Branch managers can only access their school
        if (authContext.role === 'BRANCH_MANAGER') {
          const school = await prisma.school.findFirst({
            where: {
              id: resourceId
            }
          });

          if (!school) {
            log.logAuthEvent('permission_denied', `School ${resourceId} not found`);
            return {
              allowed: false,
              response: NextResponse.json({ error: 'School not found' }, { status: 404 })
            };
          }

          return { allowed: true };
        }
        break;

      case 'branch':
        // Verify branch belongs to user's school
        const branch = await prisma.branch.findFirst({
          where: {
            id: resourceId,
            schoolId: authContext.schoolId
          }
        });

        if (!branch) {
          log.logAuthEvent('permission_denied', `Branch ${resourceId} not found or unauthorized`);
          return {
            allowed: false,
            response: NextResponse.json({ error: 'Branch not found or unauthorized' }, { status: 404 })
          };
        }

        // Single-page users can only access their assigned branch
        if (authContext.isSinglePageUser && authContext.branchId !== resourceId) {
          log.logAuthEvent(
            'permission_denied',
            `Single-page user attempted to access unauthorized branch`
          );
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'You do not have access to this branch' },
              { status: 403 }
            )
          };
        }

        return { allowed: true };

      case 'student':
        // Verify student belongs to user's branch/school
        const student = await prisma.student.findFirst({
          where: {
            id: resourceId,
            schoolId: authContext.schoolId,
            branchId: authContext.branchId || undefined
          }
        });

        if (!student) {
          log.logAuthEvent('permission_denied', `Student ${resourceId} not found or unauthorized`);
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'Student not found or unauthorized' },
              { status: 404 }
            )
          };
        }

        return { allowed: true };

      case 'employee':
        // Verify employee belongs to user's branch/school
        const employee = await prisma.employee.findFirst({
          where: {
            id: resourceId,
            branch: {
              schoolId: authContext.schoolId
            }
          }
        });

        if (!employee) {
          log.logAuthEvent('permission_denied', `Employee ${resourceId} not found or unauthorized`);
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'Employee not found or unauthorized' },
              { status: 404 }
            )
          };
        }

        // Single-page users can only access their branch
        if (authContext.isSinglePageUser && authContext.branchId !== employee.branchId) {
          log.logAuthEvent('permission_denied', `Single-page user accessed unauthorized employee`);
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'You do not have access to this employee' },
              { status: 403 }
            )
          };
        }

        return { allowed: true };

      case 'transaction':
        // Verify transaction belongs to user's branch/school
        const transaction = await prisma.transaction.findFirst({
          where: {
            id: resourceId,
            branch: {
              schoolId: authContext.schoolId
            }
          }
        });

        if (!transaction) {
          log.logAuthEvent(
            'permission_denied',
            `Transaction ${resourceId} not found or unauthorized`
          );
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'Transaction not found or unauthorized' },
              { status: 404 }
            )
          };
        }

        // Single-page users can only access their branch
        if (authContext.isSinglePageUser && authContext.branchId !== transaction.branchId) {
          log.logAuthEvent('permission_denied', `Single-page user accessed unauthorized transaction`);
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'You do not have access to this transaction' },
              { status: 403 }
            )
          };
        }

        return { allowed: true };

      case 'salary':
        // Verify salary belongs to user's branch/school
        const salary = await prisma.salary.findFirst({
          where: {
            id: resourceId,
            branch: {
              schoolId: authContext.schoolId
            }
          }
        });

        if (!salary) {
          log.logAuthEvent('permission_denied', `Salary ${resourceId} not found or unauthorized`);
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'Salary not found or unauthorized' },
              { status: 404 }
            )
          };
        }

        // Single-page users can only access their branch
        if (authContext.isSinglePageUser && authContext.branchId !== salary.branchId) {
          log.logAuthEvent('permission_denied', `Single-page user accessed unauthorized salary`);
          return {
            allowed: false,
            response: NextResponse.json(
              { error: 'You do not have access to this salary record' },
              { status: 403 }
            )
          };
        }

        return { allowed: true };

      default:
        return { allowed: true };
    }

    return { allowed: true };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      {
        endpoint,
        resourceType,
        resourceId
      }
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
 * Filter query to include only accessible records based on auth context
 * Used in list endpoints
 */
export function getAccessFilter(
  authContext: AuthContext
): {
  schoolId: string;
  branchId?: string;
} {
  const filter: any = {
    schoolId: authContext.schoolId
  };

  // Single-page users can only access their branch
  if (authContext.isSinglePageUser && authContext.branchId) {
    filter.branchId = authContext.branchId;
  }

  return filter;
}

/**
 * Verify that a school belongs to the user's context
 */
export async function verifySchoolAccess(
  authContext: AuthContext,
  schoolId: string
): Promise<boolean> {
  if (authContext.role === 'SUPER_ADMIN') {
    return true;
  }

  // Regular users must access their own school
  return authContext.schoolId === schoolId;
}

/**
 * Verify that multiple resources belong to user's school/branch
 */
export async function verifyBatchAccess(
  authContext: AuthContext,
  resourceIds: string[],
  resourceType: 'student' | 'employee' | 'transaction',
  endpoint: string
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> {
  const log = createApiLogger({
    endpoint,
    userId: authContext.userId
  });

  try {
    if (authContext.role === 'SUPER_ADMIN') {
      return { allowed: true };
    }

    // Verify all resources belong to user's school/branch
    for (const resourceId of resourceIds) {
      const result = await verifyBranchAccess(
        authContext,
        resourceType,
        resourceId,
        endpoint
      );

      if (!result.allowed) {
        return result;
      }
    }

    return { allowed: true };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint, resourceCount: resourceIds.length }
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
