/**
 * Branch Management API
 * GET /api/branches - List all branches (investor) or current branch (branch manager)
 * POST /api/branches - Create new branch (investors only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/middleware/auth-middleware';
import { getBranchesForSchool, createBranch, getAccessibleBranches } from '@/lib/services/branch-service';
import { branchSchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';

export async function GET(req: NextRequest) {
  const endpoint = '/api/branches';
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

    // Get query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let branches;

    // Investor: get all branches
    if (!authContext.branchId) {
      branches = await getBranchesForSchool(authContext.schoolId, page, limit);
    } else {
      // Other users: only get accessible branches
      branches = await getAccessibleBranches(authContext);
    }

    log.logResponse(200, authContext.userId);
    return NextResponse.json(
      {
        ok: true,
        branches,
        pagination: {
          page,
          limit,
          total: branches.length
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

export async function POST(req: NextRequest) {
  const endpoint = '/api/branches';
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

    // Require INVESTOR role
    const roleResult = requireRole(authContext, 'INVESTOR', endpoint);
    if (roleResult.response) return roleResult.response;

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = branchSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errors[path || 'root'] = issue.message;
      });

      log.logResponse(400, authContext.userId);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors
        },
        { status: 400 }
      );
    }

    // Ensure branchCode is provided
    if (!validation.data.branchCode) {
      validation.data.branchCode = validation.data.nameEn
        .toLowerCase()
        .replace(/\s+/g, '_');
    }

    // Create branch
    const result = await createBranch(
      {
        schoolId: authContext.schoolId,
        ...validation.data
      },
      authContext.userId,
      endpoint
    );

    if (!result.success) {
      const statusCode =
        result.error?.includes('already exists') ? 409 : 400;
      log.logResponse(statusCode, authContext.userId);
      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    log.logResponse(201, authContext.userId);
    return NextResponse.json(
      {
        ok: true,
        branch: result.branch
      },
      { status: 201 }
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
