/**
 * Employee Management API - Core Multi-Branch Endpoints
 * GET /api/core/employees - List employees with branch isolation
 * POST /api/core/employees - Create new employee
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createIsolatedPrismaClient } from '@/lib/services/isolated-prisma';
import { employeeSchema, employeeQuerySchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const endpoint = '/api/core/employees';
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
      position: url.searchParams.get('position') || undefined,
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '20'
    };

    const validation = employeeQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, authContext.userId);
      return NextResponse.json({ error: 'Invalid query parameters', details: errors }, { status: 400 });
    }

    const { page, limit, position } = validation.data;
    const skip = (page - 1) * limit;

    // Create isolated DB
    const isolatedDb = createIsolatedPrismaClient(authContext);

    // Build where clause
    const whereClause: any = { isActive: true };
    if (position) whereClause.position = position;

    // Get total count
    const total = await isolatedDb.employee.count({ where: whereClause });

    // Get paginated employees
    const employees = await isolatedDb.employee.findMany({
      where: whereClause,
      include: {
        branch: { select: { nameAr: true, nameEn: true } },
        salaries: {
          select: { id: true, baseSalary: true, month: true, year: true, status: true },
          orderBy: { year: 'desc', month: 'desc' },
          take: 3
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    log.logResponse(200, authContext.userId);
    return NextResponse.json(
      {
        ok: true,
        employees,
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
  const endpoint = '/api/core/employees';
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

    // Only allow investors and branch managers to create employees
    const allowedRoles = ['INVESTOR', 'BRANCH_MANAGER'];
    if (!allowedRoles.includes(authContext.role)) {
      log.logAuthEvent('permission_denied', `Role ${authContext.role} cannot create employees`);
      log.logResponse(403, authContext.userId);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = employeeSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, authContext.userId);
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { employeeCode, fullNameAr, fullNameEn, position, email, phone, baseSalary, hireDate } = validation.data;

    // Get the branch for the employee
    let branchId: string;
    if (authContext.branchId) {
      branchId = authContext.branchId;
    } else {
      // Investors need to specify
      const branchIdParam = body.branchId;
      if (!branchIdParam) {
        log.logResponse(400, authContext.userId);
        return NextResponse.json({ error: 'branchId is required for investors' }, { status: 400 });
      }
      branchId = branchIdParam;
    }

    // Verify branch exists and belongs to school
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { schoolId: true }
    });

    if (!branch || branch.schoolId !== authContext.schoolId) {
      log.logResponse(404, authContext.userId);
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Check if employee code already exists in this branch
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        schoolId: authContext.schoolId,
        branchId,
        employeeCode
      }
    });

    if (existingEmployee) {
      log.logResponse(409, authContext.userId);
      return NextResponse.json(
        { error: 'Employee code already exists in this branch' },
        { status: 409 }
      );
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeCode,
        fullNameAr,
        fullNameEn,
        position,
        email,
        phone,
        baseSalary,
        hireDate: new Date(hireDate),
        isActive: true,
        schoolId: authContext.schoolId,
        branchId,
        createdBy: authContext.userId
      },
      include: {
        branch: { select: { nameAr: true, nameEn: true } }
      }
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        resource: 'Employee',
        resourceId: employee.id,
        userId: authContext.userId,
        schoolId: authContext.schoolId,
        branchId,
        newValues: {
          employeeCode,
          fullNameEn,
          position,
          baseSalary,
          hireDate
        }
      }
    });

    log.logResponse(201, authContext.userId);
    return NextResponse.json({ ok: true, employee }, { status: 201 });
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
