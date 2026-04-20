// @ts-nocheck
/**
 * Individual Student API - Core Multi-Branch Endpoints
 * GET /api/core/students/[studentId] - Get student details
 * PUT /api/core/students/[studentId] - Update student
 * DELETE /api/core/students/[studentId] - Soft delete student
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createIsolatedPrismaClient } from '@/lib/services/isolated-prisma';
import { studentSchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { prisma } from '@/lib/prisma';

interface RouteContext {
  params: Promise<{ studentId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const endpoint = '/api/core/students/[studentId]';
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

    const { studentId } = await context.params;

    // Create isolated DB
    const isolatedDb = createIsolatedPrismaClient(authContext);

    // Get student (auto-filtered by schoolId/branchId)
    const student = await isolatedDb.student.findUnique({
      where: { id: studentId },
      include: {
        class: { select: { id: true, nameAr: true, nameEn: true } },
        branch: { select: { id: true, nameAr: true, nameEn: true } },
        attendances: {
          select: { id: true, attendanceDate: true, status: true },
          orderBy: { attendanceDate: 'desc' },
          take: 10
        }
      }
    });

    if (!student) {
      log.logResponse(404, { userId: authContext.userId });
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    log.logResponse(200, { userId: authContext.userId });
    return NextResponse.json({ ok: true, student }, { status: 200 });
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const endpoint = '/api/core/students/[studentId]';
  const log = createApiLogger({
    endpoint,
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  });

  try {
    log.logRequest('PUT');

    // Require authentication
    const authResult = requireAuth(req, endpoint);
    if (authResult.response) return authResult.response;
    const authContext = authResult.auth!;

    // Only allow admins and branch managers to update
    const allowedRoles = ['INVESTOR', 'BRANCH_MANAGER', 'ACCOUNTANT'];
    if (!allowedRoles.includes(authContext.role)) {
      log.logAuthEvent('permission_denied', `Role ${authContext.role} cannot update students`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { studentId } = await context.params;

    // Verify student exists and user has access
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true, branchId: true, nameAr: true, nameEn: true, status: true }
    });

    if (!existingStudent) {
      log.logResponse(404, { userId: authContext.userId });
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Check access
    if (
      existingStudent.schoolId !== authContext.schoolId ||
      (authContext.branchId && existingStudent.branchId !== authContext.branchId)
    ) {
      log.logAuthEvent('permission_denied', `Unauthorized access to student ${studentId}`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Cannot access this student' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const updateSchema = studentSchema.partial();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // Update student
    const updateData: any = {};
    const oldValues: any = { ...existingStudent };

    if (validation.data.nameAr !== undefined) updateData.nameAr = validation.data.nameAr;
    if (validation.data.nameEn !== undefined) updateData.nameEn = validation.data.nameEn;
    if (validation.data.status !== undefined) updateData.status = validation.data.status;

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
      include: {
        class: { select: { nameAr: true, nameEn: true } },
        branch: { select: { nameAr: true, nameEn: true } }
      }
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        resource: 'Student',
        resourceId: studentId,
        userId: authContext.userId,
        schoolId: authContext.schoolId,
        branchId: existingStudent.branchId,
        oldValues,
        newValues: updateData
      }
    });

    log.logResponse(200, { userId: authContext.userId });
    return NextResponse.json({ ok: true, student: updatedStudent }, { status: 200 });
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const endpoint = '/api/core/students/[studentId]';
  const log = createApiLogger({
    endpoint,
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  });

  try {
    log.logRequest('DELETE');

    // Require authentication
    const authResult = requireAuth(req, endpoint);
    if (authResult.response) return authResult.response;
    const authContext = authResult.auth!;

    // Only allow investors and branch managers to delete
    const allowedRoles = ['INVESTOR', 'BRANCH_MANAGER'];
    if (!allowedRoles.includes(authContext.role)) {
      log.logAuthEvent('permission_denied', `Role ${authContext.role} cannot delete students`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    const { studentId } = await context.params;

    // Verify student exists and user has access
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true, branchId: true, nameAr: true, nameEn: true }
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

    // Soft delete
    const deletedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { deletedAt: new Date() },
      include: {
        class: { select: { nameAr: true, nameEn: true } },
        branch: { select: { nameAr: true, nameEn: true } }
      }
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        resource: 'Student',
        resourceId: studentId,
        userId: authContext.userId,
        schoolId: authContext.schoolId,
        branchId: student.branchId,
        oldValues: { nameAr: student.nameAr, nameEn: student.nameEn }
      }
    });

    log.logResponse(200, { userId: authContext.userId });
    return NextResponse.json({ ok: true, message: 'Student deleted successfully' }, { status: 200 });
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
