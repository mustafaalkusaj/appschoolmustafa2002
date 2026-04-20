// @ts-nocheck
/**
 * Branch Details API
 * GET /api/branches/detail?branchId=<id>
 * Returns detailed statistics for a specific branch
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { getBranchWithStats, verifyBranchAccess } from '@/lib/services/branch-service';
import { createApiLogger } from '@/lib/api-logger';

export async function GET(req: NextRequest) {
  const endpoint = '/api/branches/detail';
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

    // Get branch ID from query
    const url = new URL(req.url);
    const branchId = url.searchParams.get('branchId');

    if (!branchId) {
      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json(
        { error: 'branchId is required' },
        { status: 400 }
      );
    }

    // Verify access to this branch
    const access = await verifyBranchAccess(authContext, branchId, authContext.schoolId);
    if (!access.allowed) {
      log.logAuthEvent('permission_denied', `Unauthorized access to branch: ${branchId}`);
      log.logResponse(403, { userId: authContext.userId });
      return NextResponse.json(
        { error: 'You do not have access to this branch' },
        { status: 403 }
      );
    }

    // Get branch details with stats
    const branchData = await getBranchWithStats(branchId, authContext.schoolId, authContext);

    if (!branchData) {
      log.logResponse(404, { userId: authContext.userId });
      return NextResponse.json(
        { error: 'Branch not found' },
        { status: 404 }
      );
    }

    log.logResponse(200, { userId: authContext.userId });
    return NextResponse.json(
      {
        ok: true,
        branch: branchData
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
