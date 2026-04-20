/**
 * Investor Dashboard API
 * GET /api/dashboard/investor
 * Returns aggregated statistics for all branches in school
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/middleware/auth-middleware';
import {
  getBranchesForSchool,
  getBranchWithStats,
  getSchoolBranchStats
} from '@/lib/services/branch-service';
import { createApiLogger } from '@/lib/api-logger';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const endpoint = '/api/dashboard/investor';
  const log = createApiLogger({
    endpoint,
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  });

  try {
    log.logRequest('GET');

    // Require authentication
    const authResult = requireAuth(req, endpoint);
    if (authResult.response) return authResult.response;
    const authContext = authResult.auth!;

    // Require INVESTOR role
    const roleResult = requireRole(authContext, 'INVESTOR', endpoint);
    if (roleResult.response) return roleResult.response;

    // Get school details
    const school = await prisma.school.findUnique({
      where: { id: authContext.schoolId }
    });

    if (!school) {
      log.logResponse(404, authContext.userId);
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Get all branches for school with stats
    const branches = await getBranchesForSchool(authContext.schoolId, 1, 100);

    // Get detailed stats for each branch
    const branchesWithStats = await Promise.all(
      branches.map((branch) =>
        getBranchWithStats(branch.id, authContext.schoolId, authContext)
      )
    );

    // Get aggregate statistics for whole school
    const aggregateStats = await getAggregateStatistics(authContext.schoolId);

    // Get recent activities
    const recentActivities = await getRecentActivities(authContext.schoolId, 10);

    log.logResponse(200, authContext.userId);
    return NextResponse.json(
      {
        ok: true,
        school: {
          id: school.id,
          nameAr: school.nameAr,
          nameEn: school.nameEn,
          currency: school.currency
        },
        branches: branchesWithStats,
        aggregates: aggregateStats,
        recentActivities,
        summary: {
          totalBranches: branches.length,
          totalStudents: aggregateStats.totalStudents,
          totalEmployees: aggregateStats.totalEmployees,
          totalBalance: aggregateStats.totalBalance,
          totalRevenue: aggregateStats.totalRevenue,
          averageAttendance: calculateAverageAttendance(branchesWithStats)
        }
      },
      { status: 200 }
    );
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get aggregate statistics across all branches
 */
async function getAggregateStatistics(schoolId: string) {
  const [
    totalStudents,
    totalEmployees,
    totalBalance,
    totalRevenue,
    totalExpenses
  ] = await Promise.all([
    prisma.student.count({
      where: {
        schoolId,
        status: 'active',
        deletedAt: null
      }
    }),
    prisma.employee.count({
      where: {
        schoolId,
        isActive: true
      }
    }),
    prisma.account.aggregate({
      where: {
        schoolId,
        deletedAt: null
      },
      _sum: { balance: true }
    }),
    // Total revenue (sum of credit transactions)
    prisma.transaction.aggregate({
      where: {
        schoolId,
        transactionType: 'credit'
      },
      _sum: { amount: true }
    }),
    // Total expenses (sum of debit transactions)
    prisma.transaction.aggregate({
      where: {
        schoolId,
        transactionType: 'debit'
      },
      _sum: { amount: true }
    })
  ]);

  return {
    totalStudents,
    totalEmployees,
    totalBalance: totalBalance._sum.balance || 0,
    totalRevenue: totalRevenue._sum.amount || 0,
    totalExpenses: totalExpenses._sum.amount || 0,
    netBalance: (totalBalance._sum.balance || 0) - (totalExpenses._sum.amount || 0)
  };
}

/**
 * Get recent activities across school
 */
async function getRecentActivities(schoolId: string, limit: number = 10) {
  const auditLogs = await prisma.auditLog.findMany({
    where: { schoolId },
    include: {
      user: {
        select: {
          fullNameEn: true,
          fullNameAr: true
        }
      },
      branch: {
        select: {
          nameEn: true,
          nameAr: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    resource: log.resource,
    userName: log.user.fullNameEn,
    branchName: log.branch?.nameEn,
    timestamp: log.createdAt,
    details: {
      oldValues: log.oldValues,
      newValues: log.newValues
    }
  }));
}

/**
 * Calculate average attendance across all branches
 */
function calculateAverageAttendance(branches: any[]): number {
  if (branches.length === 0) return 0;

  const totalAttendance = branches.reduce((sum, branch) => sum + branch.attendanceRate, 0);
  return Math.round(totalAttendance / branches.length);
}
