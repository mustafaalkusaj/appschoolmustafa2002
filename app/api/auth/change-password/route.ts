/**
 * Change Password Endpoint
 * POST /api/auth/change-password
 * Allows authenticated users to change their password
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/middleware/auth-middleware';
import { updatePassword } from '@/lib/services/auth-service';
import { resetPasswordSchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { enforceRateLimit, getRateLimitClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const endpoint = '/api/auth/change-password';
  const log = createApiLogger({
    endpoint,
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  });

  try {
    log.logRequest('POST');

    // Require authentication
    const authResult = requireAuth(req, endpoint);
    if (authResult.response) {
      return authResult.response;
    }

    const authContext = authResult.auth!;

    // Enforce rate limit
    const rateLimited = await enforceRateLimit(req, {
      namespace: 'auth-change-password',
      windowMs: 15 * 60_000,
      maxHits: 5,
      identifier: `${getRateLimitClientIp(req)}:${authContext.userId}`
    });

    if (rateLimited) {
      log.logResponse(429, { userId: authContext.userId });
      return rateLimited;
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errors[path || 'root'] = issue.message;
      });

      log.logResponse(400, { userId: authContext.userId });
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors
        },
        { status: 400 }
      );
    }

    // Update password
    const result = await updatePassword(
      authContext.userId,
      validation.data.currentPassword,
      validation.data.newPassword
    );

    if (!result.success) {
      const statusCode =
        result.error?.code === 'INVALID_CREDENTIALS' ? 401 : 400;
      log.logResponse(statusCode, { userId: authContext.userId });
      return NextResponse.json(
        {
          error: result.error?.message,
          code: result.error?.code
        },
        { status: statusCode }
      );
    }

    log.logDataModification('update', 'users', authContext.userId, {
      action: 'password_changed'
    });

    log.logResponse(200, { userId: authContext.userId });
    return NextResponse.json(
      {
        ok: true,
        message: 'Password changed successfully'
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
