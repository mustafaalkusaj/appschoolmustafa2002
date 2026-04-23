// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
/**
 * Salary Management API - Core Multi-Branch Endpoints
 * GET /api/core/salaries - List salary records with branch isolation
 * POST /api/core/salaries - Create new salary record
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createIsolatedPrismaClient } from '@/lib/services/isolated-prisma';
import { salarySchema, salaryQuerySchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const endpoint = '/api/core/salaries';
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

    // Parse and validate query parameters
    const url = new URL(req.url);
    const queryParams = {
      employeeId: url.searchParams.get('employeeId') || undefined,
      month: url.searchParams.get('month') || undefined,
      year: url.searchParams.get('year') || undefined,
      status: url.searchParams.get('status') || undefined,
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '20'
    };

    const validation = salaryQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json({ error: 'Invalid query parameters', details: errors }, { status: 400 });
    }

    const { page, limit, employeeId, month, year, status } = validation.data;
    const skip = (page - 1) * limit;

    // Create isolated DB
    const isolatedDb = createIsolatedPrismaClient(authContext);

    // Build where clause
    const whereClause: any = {};
    if (employeeId) whereClause.employeeId = employeeId;
    if (month) whereClause.month = month;
    if (year) whereClause.year = year;
    if (status) whereClause.status = status;

    // Get total count
    const total = await isolatedDb.salary.count({ where: whereClause });

    // Get paginated salaries
    const salaries = await isolatedDb.salary.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { id: true, fullNameEn: true, fullNameAr: true, position: true, baseSalary: true }
        }
      },
      skip,
      take: limit,
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    log.logResponse(200, { userId: authContext.userId });
    return NextResponse.json(
      {
        ok: true,
        salaries,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      },
      { status: 200 }
    );
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const endpoint = '/api/core/salaries';
  const log = createApiLogger({
    endpoint,
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  });

  try {
    log.logRequest('POST');

    // Require authentication
    const authResult = requireAuth(req, endpoint);
    if (authResult.response) return authResult.response;
    const authContext = authResult.auth!;

    // Only allow HR and accounting staff
    const allowedRoles = ['BRANCH_MANAGER', 'ACCOUNTANT'];
    if (!allowedRoles.includes(authContext.role)) {
      log.logAuthEvent('permission_denied', `Role ${authContext.role} cannot record salaries`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = salarySchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { employeeId, baseSalary, deductions, bonus, month, year, notes } = validation.data;

    // Verify employee exists and belongs to user's school/branch
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { schoolId: true, branchId: true, fullNameEn: true, position: true }
    });

    if (!employee) {
      log.logResponse(404, { userId: authContext.userId });
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check access
    if (
      employee.schoolId !== authContext.schoolId ||
      (authContext.branchId && employee.branchId !== authContext.branchId)
    ) {
      log.logAuthEvent('permission_denied', `Unauthorized access to employee ${employeeId}`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Cannot access this employee' }, { status: 403 });
    }

    // Check if salary record already exists for this month/year
    const existingSalary = await prisma.salary.findFirst({
      where: {
        employeeId,
        month,
        year,
        deletedAt: null
      }
    });

    if (existingSalary) {
      log.logResponse(409, { userId: authContext.userId });
      return NextResponse.json(
        { error: 'Salary record already exists for this month/year' },
        { status: 409 }
      );
    }

    // Calculate net salary
    const netSalary = baseSalary + bonus - deductions;

    // Create salary record
    const salary = await prisma.salary.create({
      data: {
        employeeId,
        baseSalary,
        deductions,
        bonus,
        netSalary,
        month,
        year,
        status: 'pending',
        notes,
        schoolId: authContext.schoolId,
        branchId: employee.branchId,
        createdBy: authContext.userId
      },
      include: {
        employee: {
          select: { fullNameEn: true, fullNameAr: true, position: true }
        }
      }
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        resource: 'Salary',
        resourceId: salary.id,
        userId: authContext.userId,
        schoolId: authContext.schoolId,
        branchId: employee.branchId,
        newValues: {
          employeeName: employee.fullNameEn,
          baseSalary,
          deductions,
          bonus,
          netSalary,
          month,
          year
        }
      }
    });

    log.logResponse(201, { userId: authContext.userId });
    return NextResponse.json({ ok: true, salary }, { status: 201 });
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
