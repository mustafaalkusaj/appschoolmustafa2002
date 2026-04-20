// @ts-nocheck
/**
 * Transaction Management API - Core Multi-Branch Endpoints
 * GET /api/core/transactions - List transactions with branch isolation
 * POST /api/core/transactions - Record new transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { createIsolatedPrismaClient } from '@/lib/services/isolated-prisma';
import { transactionSchema, transactionQuerySchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const endpoint = '/api/core/transactions';
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
      accountId: url.searchParams.get('accountId') || undefined,
      transactionType: url.searchParams.get('transactionType') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '50'
    };

    const validation = transactionQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json({ error: 'Invalid query parameters', details: errors }, { status: 400 });
    }

    const { page, limit, accountId, transactionType, startDate, endDate } = validation.data;
    const skip = (page - 1) * limit;

    // Create isolated DB
    const isolatedDb = createIsolatedPrismaClient(authContext);

    // Build where clause
    const whereClause: any = {};
    if (accountId) whereClause.accountId = accountId;
    if (transactionType) whereClause.transactionType = transactionType;
    if (startDate || endDate) {
      whereClause.transactionDate = {};
      if (startDate) whereClause.transactionDate.gte = new Date(startDate);
      if (endDate) whereClause.transactionDate.lte = new Date(endDate);
    }

    // Get total count
    const total = await isolatedDb.transaction.count({ where: whereClause });

    // Get paginated transactions
    const transactions = await isolatedDb.transaction.findMany({
      where: whereClause,
      include: {
        account: {
          select: { id: true, accountCode: true, accountNameEn: true, accountNameAr: true }
        }
      },
      skip,
      take: limit,
      orderBy: { transactionDate: 'desc' }
    });

    log.logResponse(200, { userId: authContext.userId });
    return NextResponse.json(
      {
        ok: true,
        transactions,
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
  const endpoint = '/api/core/transactions';
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

    // Only allow accountants to record transactions
    const allowedRoles = ['ACCOUNTANT', 'BRANCH_MANAGER'];
    if (!allowedRoles.includes(authContext.role)) {
      log.logAuthEvent('permission_denied', `Role ${authContext.role} cannot record transactions`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = transactionSchema.safeParse(body);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        errors[issue.path.join('.')] = issue.message;
      });
      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    const { accountId, amount, transactionDate, transactionType, description, referenceNumber } = validation.data;

    // Verify account exists and belongs to user's school/branch
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { schoolId: true, branchId: true, balance: true, accountCode: true }
    });

    if (!account) {
      log.logResponse(404, { userId: authContext.userId });
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Check access
    if (
      account.schoolId !== authContext.schoolId ||
      (authContext.branchId && account.branchId !== authContext.branchId)
    ) {
      log.logAuthEvent('permission_denied', `Unauthorized access to account ${accountId}`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json({ error: 'Forbidden: Cannot access this account' }, { status: 403 });
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        accountId,
        amount,
        transactionDate: new Date(transactionDate),
        transactionType,
        description,
        referenceNumber,
        schoolId: authContext.schoolId,
        branchId: account.branchId,
        createdBy: authContext.userId
      },
      include: {
        account: {
          select: { accountCode: true, accountNameEn: true, accountNameAr: true }
        }
      }
    });

    // Update account balance
    const newBalance = transactionType === 'credit'
      ? account.balance + amount
      : account.balance - amount;

    await prisma.account.update({
      where: { id: accountId },
      data: { balance: newBalance }
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        action: 'CREATE',
        resource: 'Transaction',
        resourceId: transaction.id,
        userId: authContext.userId,
        schoolId: authContext.schoolId,
        branchId: account.branchId,
        newValues: {
          accountCode: account.accountCode,
          amount,
          type: transactionType,
          date: transactionDate,
          description
        }
      }
    });

    log.logResponse(201, { userId: authContext.userId });
    return NextResponse.json({ ok: true, transaction, newBalance }, { status: 201 });
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
