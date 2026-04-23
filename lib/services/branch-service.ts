// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Branch Service
 * Handles branch management, isolation, and access control
 * Core service for multi-branch architecture
 */

import { prisma } from '@/lib/prisma';
import { createApiLogger } from '@/lib/api-logger';
import type { AuthContext } from '@/lib/middleware/auth-middleware';

export interface BranchCreateRequest {
  schoolId: string;
  nameAr: string;
  nameEn: string;
  branchCode: string;
  principalName?: string;
  phoneNumber?: string;
}

export interface BranchWithStats {
  id: string;
  nameAr: string;
  nameEn: string;
  branchCode: string;
  principalName?: string;
  isActive: boolean;
  studentCount: number;
  employeeCount: number;
  accountBalance: number;
  monthlyRevenue: number;
  attendanceRate: number;
}

export interface BranchAccessCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Get all branches for a school (Investor only)
 */
export async function getBranchesForSchool(
  schoolId: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    const branches = await prisma.branch.findMany({
      where: {
        schoolId,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        branchCode: true,
        principalName: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            students: { where: { deletedAt: null } },
            employees: true,
            accounts: true
          }
        }
      },
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' }
    });

    return branches;
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
}

/**
 * Get single branch with detailed statistics
 * Used by investors and branch managers
 */
export async function getBranchWithStats(
  branchId: string,
  schoolId: string,
  authContext: AuthContext
): Promise<BranchWithStats | null> {
  const log = createApiLogger({
    endpoint: '/api/branches/[branchId]/stats',
    userId: authContext.userId
  });

  try {
    // Verify access
    const access = await verifyBranchAccess(authContext, branchId, schoolId);
    if (!access.allowed) {
      log.logAuthEvent('permission_denied', `Unauthorized branch access: ${branchId}`);
      return null;
    }

    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        schoolId,
        deletedAt: null
      }
    });

    if (!branch) return null;

    // Get statistics
    const [
      studentCount,
      employeeCount,
      totalBalance,
      monthlyRevenue,
      presentStudents,
      totalStudents
    ] = await Promise.all([
      prisma.student.count({
        where: {
          branchId,
          status: 'active',
          deletedAt: null
        }
      }),
      prisma.employee.count({
        where: {
          branchId,
          isActive: true
        }
      }),
      prisma.account.aggregate({
        where: {
          branchId,
          deletedAt: null
        },
        _sum: { balance: true }
      }),
      // Monthly revenue (sum of credit transactions for current month)
      getMonthlyRevenue(branchId),
      // Attendance calculation
      prisma.attendance.count({
        where: {
          branchId,
          status: 'present',
          attendanceDate: {
            gte: new Date(new Date().setDate(1)) // First day of month
          }
        }
      }),
      prisma.attendance.count({
        where: {
          branchId,
          attendanceDate: {
            gte: new Date(new Date().setDate(1))
          }
        }
      })
    ]);

    const attendanceRate = totalStudents > 0
      ? Math.round((presentStudents / totalStudents) * 100)
      : 0;

    return {
      id: branch.id,
      nameAr: branch.nameAr,
      nameEn: branch.nameEn,
      branchCode: branch.branchCode,
      principalName: branch.principalName,
      isActive: branch.isActive,
      studentCount,
      employeeCount,
      accountBalance: totalBalance._sum.balance || 0,
      monthlyRevenue,
      attendanceRate
    };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { branchId, schoolId }
    );
    return null;
  }
}

/**
 * Create new branch
 */
export async function createBranch(
  req: BranchCreateRequest,
  createdByUserId: string,
  endpoint: string
) {
  const log = createApiLogger({
    endpoint,
    userId: createdByUserId
  });

  try {
    log.logRequest('POST');

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { id: req.schoolId }
    });

    if (!school) {
      log.logResponse(404);
      return { success: false, error: 'School not found' };
    }

    // Check branch code uniqueness
    const existing = await prisma.branch.findFirst({
      where: { branchCode: req.branchCode }
    });

    if (existing) {
      log.logResponse(409);
      return { success: false, error: 'Branch code already exists' };
    }

    // Create branch
    const branch = await prisma.branch.create({
      data: {
        schoolId: req.schoolId,
        nameAr: req.nameAr,
        nameEn: req.nameEn,
        branchCode: req.branchCode,
        principalName: req.principalName,
        phoneNumber: req.phoneNumber,
        isActive: true
      }
    });

    // Create default accounts for this branch
    await createDefaultAccounts(branch.id, req.schoolId);

    log.logDataModification('create', 'branches', branch.id, {
      nameAr: req.nameAr,
      nameEn: req.nameEn,
      branchCode: req.branchCode
    });

    log.logResponse(201);
    return { success: true, branch };
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return { success: false, error: 'Failed to create branch' };
  }
}

/**
 * Verify user's access to a branch
 * Returns false if:
 * - User is not an investor/admin
 * - User's branch doesn't match requested branch
 * - Branch is not in user's school
 */
export async function verifyBranchAccess(
  authContext: AuthContext,
  branchId: string,
  schoolId: string
): Promise<BranchAccessCheckResult> {
  // Investor (no branchId) can access any branch in their school
  if (!authContext.branchId && authContext.role === 'INVESTOR') {
    return { allowed: true };
  }

  // Verify branch belongs to user's school
  if (authContext.schoolId !== schoolId) {
    return {
      allowed: false,
      reason: 'Branch not in your school'
    };
  }

  // Single-page users and branch-level users must match their branch
  if (authContext.isSinglePageUser && authContext.branchId !== branchId) {
    return {
      allowed: false,
      reason: 'You do not have access to this branch'
    };
  }

  // Non-single-page branch users must match their branch
  if (!authContext.isSinglePageUser && authContext.branchId !== branchId && authContext.branchId) {
    return {
      allowed: false,
      reason: 'You only have access to your assigned branch'
    };
  }

  return { allowed: true };
}

/**
 * Get branches accessible to user based on role
 */
export async function getAccessibleBranches(authContext: AuthContext) {
  if (!authContext.branchId || authContext.role === 'INVESTOR') {
    // Investor: all branches in school
    return await prisma.branch.findMany({
      where: {
        schoolId: authContext.schoolId,
        isActive: true,
        deletedAt: null
      },
      select: { id: true, nameEn: true, nameAr: true }
    });
  }

  // Other roles: only their assigned branch
  return await prisma.branch.findMany({
    where: {
      id: authContext.branchId,
      schoolId: authContext.schoolId,
      isActive: true,
      deletedAt: null
    },
    select: { id: true, nameEn: true, nameAr: true }
  });
}

/**
 * Helper: Create default accounts for new branch
 */
async function createDefaultAccounts(branchId: string, schoolId: string) {
  const accountTypes = [
    { code: 'STU_ACC', nameAr: 'حسابات الطلاب', nameEn: 'Student Accounts', type: 'student' },
    { code: 'INC_ACC', nameAr: 'الإيرادات', nameEn: 'Income Accounts', type: 'income' },
    { code: 'EXP_ACC', nameAr: 'المصروفات', nameEn: 'Expense Accounts', type: 'expense' },
    { code: 'SAL_ACC', nameAr: 'حسابات الرواتب', nameEn: 'Salary Accounts', type: 'salary' }
  ];

  for (const acc of accountTypes) {
    await prisma.account.create({
      data: {
        branchId,
        schoolId,
        accountCode: acc.code,
        accountNameAr: acc.nameAr,
        accountNameEn: acc.nameEn,
        accountType: acc.type,
        balance: 0
      }
    });
  }
}

/**
 * Helper: Calculate monthly revenue for branch
 */
async function getMonthlyRevenue(branchId: string): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const result = await prisma.transaction.aggregate({
    where: {
      branchId,
      transactionType: 'credit',
      transactionDate: {
        gte: monthStart,
        lte: monthEnd
      }
    },
    _sum: { amount: true }
  });

  return result._sum.amount ? Number(result._sum.amount) : 0;
}

/**
 * Get branch counts for investor dashboard (quick stats)
 */
export async function getSchoolBranchStats(schoolId: string) {
  try {
    const stats = await prisma.branch.findMany({
      where: {
        schoolId,
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        _count: {
          select: {
            students: { where: { deletedAt: null } },
            employees: true
          }
        }
      }
    });

    return stats.reduce(
      (acc: { totalBranches: number; totalStudents: number; totalEmployees: number }, branch: { _count: { students: number; employees: number } }) => ({
        totalBranches: acc.totalBranches + 1,
        totalStudents: acc.totalStudents + branch._count.students,
        totalEmployees: acc.totalEmployees + branch._count.employees
      }),
      { totalBranches: 0, totalStudents: 0, totalEmployees: 0 }
    );
  } catch (error) {
    console.error('Error calculating branch stats:', error);
    return { totalBranches: 0, totalStudents: 0, totalEmployees: 0 };
  }
}
