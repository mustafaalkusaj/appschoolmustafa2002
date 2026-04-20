/**
 * Get Current User Endpoint
 * GET /api/auth/me
 * Returns the authenticated user's profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { getUserProfile } from '@/lib/services/auth-service';
import { createApiLogger } from '@/lib/api-logger';

export async function GET(req: NextRequest) {
  const endpoint = '/api/auth/me';
  const log = createApiLogger({
    endpoint,
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  });

  try {
    log.logRequest('GET');

    // Require authentication
    const authResult = requireAuth(req, endpoint);
    if (authResult.response) {
      return authResult.response;
    }

    const authContext = authResult.auth!;

    // Get user profile
    const profile = await getUserProfile(authContext.userId);

    if (!profile) {
      log.logResponse(404, authContext.userId);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    log.logResponse(200, authContext.userId);
    return NextResponse.json(
      {
        ok: true,
        user: profile
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
