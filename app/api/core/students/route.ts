/**
 * Student Management API - Core Multi-Branch Endpoints
 * GET /api/core/students - List students with branch isolation
 * POST /api/core/students - Create new student
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createIsolatedPrismaClient } from '@/lib/services/isolated-prisma';
import { studentSchema, studentQuerySchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const endpoint = '/api/core/students';
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
      classId: url.searchParams.get('classId') || undefined,
      status: url.searchParams.get('status') || undefined,
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '20'
    };

    const validation = studentQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, authContext.userId);
      return NextResponse.json({ error: 'Invalid query parameters', details: errors }, { status: 400 });
    }

    const { page, limit, classId, status } = validation.data;
    const skip = (page - 1) * limit;

    // Create isolated DB (auto-applies schoolId/branchId filters)
    const isolatedDb = createIsolatedPrismaClient(authContext);

    // Build where clause
    const whereClause: any = {};
    if (classId) whereClause.classId = classId;
    if (status) whereClause.status = status;

    // Get total count
    const total = await isolatedDb.student.count({
      where: whereClause
    });

    // Get paginated students
    const students = await isolatedDb.student.findMany({
      where: whereClause,
      include: {
        class: {
          select: { nameAr: true, nameEn: true }
        },
        branch: {
          select: { nameAr: true, nameEn: true }
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
        students,
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
  const endpoint = '/api/core/students';
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

    // Only allow admins, branch managers, and accountants to create students
    const allowedRoles = ['INVESTOR', 'BRANCH_MANAGER', 'ACCOUNTANT'];
    if (!allowedRoles.includes(authContext.role)) {
      log.logAuthEvent('permission_denied', `Role ${authContext.role} cannot create students`);
      log.logResponse(403, authContext.userId);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = studentSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, authContext.userId);
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { classId, nameAr, nameEn, registrationNumber, dateOfBirth, status } = validation.data;

    // Verify class exists and belongs to user's school/branch
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { schoolId: true, branchId: true }
    });

    if (!classRecord) {
      log.logResponse(404, authContext.userId);
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Verify user has access to this class's branch
    if (
      classRecord.schoolId !== authContext.schoolId ||
      (authContext.branchId && classRecord.branchId !== authContext.branchId)
    ) {
      log.logAuthEvent('permission_denied', `Unauthorized access to class ${classId}`);
      log.logResponse(403, authContext.userId);
      return NextResponse.json({ error: 'Forbidden: Cannot access this class' }, { status: 403 });
    }

    // Get the branch from the class
    const branchId = classRecord.branchId;

    // Create student
    const student = await prisma.student.create({
      data: {
        nameAr,
        nameEn,
        registrationNumber,
        dateOfBirth: new Date(dateOfBirth),
        status,
        schoolId: authContext.schoolId,
        branchId,
        classId,
        createdBy: authContext.userId
      },
      include: {
        class: { select: { nameAr: true, nameEn: true } },
        branch: { select: { nameAr: true, nameEn: true } }
      }
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        resource: 'Student',
        resourceId: student.id,
        userId: authContext.userId,
        schoolId: authContext.schoolId,
        branchId,
        newValues: {
          nameAr: student.nameAr,
          nameEn: student.nameEn,
          registrationNumber: student.registrationNumber,
          status: student.status
        }
      }
    });

    log.logResponse(201, authContext.userId);
    return NextResponse.json(
      { ok: true, student },
      { status: 201 }
    );
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
