/**
 * Attendance Management API - Core Multi-Branch Endpoints
 * GET /api/core/attendance - List attendance records with branch isolation
 * POST /api/core/attendance - Create new attendance record
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createIsolatedPrismaClient } from '@/lib/services/isolated-prisma';
import { attendanceSchema, attendanceQuerySchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const endpoint = '/api/core/attendance';
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
      studentId: url.searchParams.get('studentId') || undefined,
      classId: url.searchParams.get('classId') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      status: url.searchParams.get('status') || undefined,
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '50'
    };

    const validation = attendanceQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json({ error: 'Invalid query parameters', details: errors }, { status: 400 });
    }

    const { page, limit, studentId, classId, startDate, endDate, status } = validation.data;
    const skip = (page - 1) * limit;

    // Create isolated DB
    const isolatedDb = createIsolatedPrismaClient(authContext);

    // Build where clause
    const whereClause: any = {};
    if (studentId) whereClause.studentId = studentId;
    if (classId) whereClause.student = { classId };
    if (status) whereClause.status = status;
    if (startDate || endDate) {
      whereClause.attendanceDate = {};
      if (startDate) whereClause.attendanceDate.gte = new Date(startDate);
      if (endDate) whereClause.attendanceDate.lte = new Date(endDate);
    }

    // Get total count
    const total = await isolatedDb.attendance.count({ where: whereClause });

    // Get paginated records
    const records = await isolatedDb.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          select: { id: true, nameEn: true, nameAr: true, registrationNumber: true }
        }
      },
      skip,
      take: limit,
      orderBy: { attendanceDate: 'desc' }
    });

    log.logResponse(200, { userId: authContext.userId });
    return NextResponse.json(
      {
        ok: true,
        records,
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
  const endpoint = '/api/core/attendance';
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

    // Only allow specific roles to record attendance
    const allowedRoles = ['BRANCH_MANAGER', 'ATTENDANCE_OFFICER', 'ACCOUNTANT'];
    if (!allowedRoles.includes(authContext.role)) {
      log.logAuthEvent('permission_denied', `Role ${authContext.role} cannot record attendance`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = attendanceSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { studentId, attendanceDate, status, notes } = validation.data;

    // Verify student exists and belongs to user's school/branch
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true, branchId: true, nameEn: true }
    });

    if (!student) {
      log.logResponse(404, { userId: authContext.userId });
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check access
    if (
      student.schoolId !== authContext.schoolId ||
      (authContext.branchId && student.branchId !== authContext.branchId)
    ) {
      log.logAuthEvent('permission_denied', `Unauthorized access to student ${studentId}`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Cannot access this student' }, { status: 403 });
    }

    // Check if record already exists for this date
    const existingRecord = await prisma.attendance.findFirst({
      where: {
        studentId,
        attendanceDate: new Date(attendanceDate),
        deletedAt: null
      }
    });

    if (existingRecord) {
      log.logResponse(409, { userId: authContext.userId });
      return NextResponse.json(
        { error: 'Attendance record already exists for this date' },
        { status: 409 }
      );
    }

    // Create attendance record
    const record = await prisma.attendance.create({
      data: {
        studentId,
        attendanceDate: new Date(attendanceDate),
        status,
        notes,
        schoolId: authContext.schoolId,
        branchId: student.branchId,
        createdBy: authContext.userId
      },
      include: {
        student: { select: { nameEn: true, nameAr: true, registrationNumber: true } }
      }
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        resource: 'Attendance',
        resourceId: record.id,
        userId: authContext.userId,
        schoolId: authContext.schoolId,
        branchId: student.branchId,
        newValues: {
          studentName: student.nameEn,
          date: attendanceDate,
          status,
          notes
        }
      }
    });

    log.logResponse(201, { userId: authContext.userId });
    return NextResponse.json({ ok: true, record }, { status: 201 });
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
