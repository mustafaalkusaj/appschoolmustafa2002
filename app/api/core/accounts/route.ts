/**
 * Account Management API - Core Multi-Branch Endpoints
 * GET /api/core/accounts - List accounts with branch isolation
 * POST /api/core/accounts - Create new account
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createIsolatedPrismaClient } from '@/lib/services/isolated-prisma';
import { accountSchema, accountQuerySchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const endpoint = '/api/core/accounts';
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
      accountType: url.searchParams.get('accountType') || undefined,
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '20'
    };

    const validation = accountQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, authContext.userId);
      return NextResponse.json({ error: 'Invalid query parameters', details: errors }, { status: 400 });
    }

    const { page, limit, accountType } = validation.data;
    const skip = (page - 1) * limit;

    // Create isolated DB
    const isolatedDb = createIsolatedPrismaClient(authContext);

    // Build where clause
    const whereClause: any = {};
    if (accountType) whereClause.accountType = accountType;

    // Get total count
    const total = await isolatedDb.account.count({ where: whereClause });

    // Get paginated accounts
    const accounts = await isolatedDb.account.findMany({
      where: whereClause,
      include: {
        branch: { select: { nameAr: true, nameEn: true } },
        transactions: {
          select: { id: true, amount: true, transactionType: true, transactionDate: true },
          orderBy: { transactionDate: 'desc' },
          take: 5
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
        accounts,
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
  const endpoint = '/api/core/accounts';
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

    // Only allow investors and accountants to create accounts
    const allowedRoles = ['INVESTOR', 'BRANCH_MANAGER', 'ACCOUNTANT'];
    if (!allowedRoles.includes(authContext.role)) {
      log.logAuthEvent('permission_denied', `Role ${authContext.role} cannot create accounts`);
      log.logResponse(403, authContext.userId);
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = accountSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, authContext.userId);
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { accountCode, accountNameAr, accountNameEn, accountType, balance } = validation.data;

    // Get the branch for the account
    let branchId: string;
    if (authContext.branchId) {
      branchId = authContext.branchId;
    } else {
      // Investors need to specify or use first branch (for now, require in body)
      const body2 = await req.json();
      branchId = body2.branchId;
      if (!branchId) {
        log.logResponse(400, authContext.userId);
        return NextResponse.json({ error: 'branchId is required for investors' }, { status: 400 });
      }
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

    // Check if account code already exists in this branch
    const existingAccount = await prisma.account.findFirst({
      where: {
        schoolId: authContext.schoolId,
        branchId,
        accountCode,
        deletedAt: null
      }
    });

    if (existingAccount) {
      log.logResponse(409, authContext.userId);
      return NextResponse.json(
        { error: 'Account code already exists in this branch' },
        { status: 409 }
      );
    }

    // Create account
    const account = await prisma.account.create({
      data: {
        accountCode,
        accountNameAr,
        accountNameEn,
        accountType,
        balance: balance || 0,
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
        resource: 'Account',
        resourceId: account.id,
        userId: authContext.userId,
        schoolId: authContext.schoolId,
        branchId,
        newValues: {
          accountCode,
          accountNameEn,
          accountType,
          balance
        }
      }
    });

    log.logResponse(201, authContext.userId);
    return NextResponse.json({ ok: true, account }, { status: 201 });
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
