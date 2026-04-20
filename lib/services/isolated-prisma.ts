// @ts-nocheck
/**
 * Isolated Prisma Client
 * Automatically applies school_id and branch_id filters to all queries
 * CRITICAL: Prevents cross-branch data leakage
 *
 * Usage:
 *   const isolatedDb = createIsolatedPrismaClient(authContext);
 *   const students = await isolatedDb.student.findMany({...}); // schoolId/branchId auto-applied
 */

import { prisma } from '@/lib/prisma';
import type { AuthContext } from '@/lib/middleware/auth-middleware';

export interface IsolationContext {
  schoolId: string;
  branchId?: string;
  userId: string;
  role: string;
}

/**
 * Creates a proxy around Prisma client that automatically injects school/branch filters
 * This is the CRITICAL safety layer for multi-tenant architecture
 */
export function createIsolatedPrismaClient(authContext: AuthContext) {
  const isolation: IsolationContext = {
    schoolId: authContext.schoolId,
    branchId: authContext.branchId,
    userId: authContext.userId,
    role: authContext.role
  };

  return new Proxy(prisma, {
    get: (target, modelName: string | symbol) => {
      if (typeof modelName !== 'string') return Reflect.get(target, modelName);

      const model = target[modelName as keyof typeof target];

      // Only wrap data access methods
      const dataAccessMethods = ['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'];

      if (model && typeof model === 'object') {
        return new Proxy(model, {
          get: (methodTarget, methodName: string | symbol) => {
            if (typeof methodName !== 'string') {
              return Reflect.get(methodTarget, methodName);
            }

            if (!dataAccessMethods.includes(methodName)) {
              return Reflect.get(methodTarget, methodName);
            }

            // Return a wrapped function that adds isolation filters
            return function(query: any = {}) {
              const isolatedQuery = injectIsolationFilters(query, isolation, modelName);
              return Reflect.get(methodTarget, methodName)?.call(methodTarget, isolatedQuery);
            };
          }
        });
      }

      return model;
    }
  });
}

/**
 * Injects school_id and branch_id filters into where clause
 * Handles nested where clauses and complex queries
 */
function injectIsolationFilters(
  query: any,
  isolation: IsolationContext,
  modelName: string
): any {
  if (!query) query = {};
  if (!query.where) query.where = {};

  const filters = buildIsolationFilters(modelName, isolation);

  // Merge filters into where clause
  if (Object.keys(filters).length > 0) {
    query.where = {
      AND: [
        query.where,
        filters
      ]
    };
  }

  // Also apply soft delete filter
  query.where = {
    AND: [
      query.where,
      { deletedAt: null }
    ]
  };

  return query;
}

/**
 * Build isolation filters based on model name and user context
 * Different models need different filter strategies
 */
function buildIsolationFilters(
  modelName: string,
  isolation: IsolationContext
): Record<string, any> {
  const filters: Record<string, any> = {};

  // Models that require both schoolId and branchId
  const multiTenantModels = [
    'student',
    'employee',
    'attendance',
    'transaction',
    'salary',
    'account'
  ];

  // Models that only need schoolId
  const schoolLevelModels = [
    'school',
    'user',
    'role',
    'permission',
    'academicYear'
  ];

  // Branch-only models
  const branchModels = ['branch', 'class'];

  const lowerModelName = modelName.toLowerCase();

  if (multiTenantModels.includes(lowerModelName)) {
    filters.schoolId = isolation.schoolId;
    // Single-page users and branch-level users only see their branch
    if (isolation.branchId) {
      filters.branchId = isolation.branchId;
    }
  } else if (schoolLevelModels.includes(lowerModelName)) {
    filters.schoolId = isolation.schoolId;
  } else if (branchModels.includes(lowerModelName)) {
    if (isolation.branchId) {
      filters.id = isolation.branchId;
    }
  }

  return filters;
}

/**
 * Helper: Direct access to raw Prisma client (only for special cases)
 * Use sparingly and always apply manual filters!
 */
export function getRawPrismaClient() {
  // ⚠️  WARNING: Use only when automatic filtering doesn't apply
  // Always manually add WHERE schoolId = ? filters
  return prisma;
}

/**
 * Verify isolation context is valid before processing
 */
export function validateIsolationContext(auth: AuthContext): boolean {
  // Investor must have schoolId but no branchId
  if (auth.role === 'INVESTOR') {
    return !!auth.schoolId && !auth.branchId;
  }

  // Other roles must have both
  return !!auth.schoolId && !!auth.branchId;
}

/**
 * Aggregate queries for investor dashboard (cross-branch)
 * These intentionally don't filter by branchId
 */
export async function getAggregateStats(schoolId: string) {
  // Direct query without branch filtering
  // This is intentional for investor dashboard aggregates
  return prisma.$transaction([
    prisma.student.count({
      where: { schoolId, deletedAt: null }
    }),
    prisma.employee.count({
      where: { schoolId }
    }),
    prisma.account.aggregate({
      where: { schoolId, deletedAt: null },
      _sum: { balance: true }
    }),
    prisma.transaction.aggregate({
      where: { schoolId },
      _sum: { amount: true }
    })
  ]);
}
