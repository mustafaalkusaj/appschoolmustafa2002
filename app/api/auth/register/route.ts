/**
 * Register Endpoint
 * POST /api/auth/register
 * Creates a new user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/auth-service';
import { registerSchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';
import { enforceRateLimit, getRateLimitClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const log = createApiLogger({
    endpoint: '/api/auth/register',
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  });

  try {
    log.logRequest('POST');

    // Enforce rate limit
    const rateLimited = await enforceRateLimit(req, {
      namespace: 'auth-register',
      windowMs: 15 * 60_000,
      maxHits: 5,
      identifier: getRateLimitClientIp(req)
    });

    if (rateLimited) {
      log.logResponse(429);
      return rateLimited;
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errors[path || 'root'] = issue.message;
      });

      log.logResponse(400);
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors
        },
        { status: 400 }
      );
    }

    // Register user
    const { fullName, ...rest } = validation.data;
    const result = await registerUser({
      ...rest,
      fullNameEn: fullName,
      fullNameAr: fullName,
      roleId: 'employee',
    });

    // Check for errors
    if ('code' in result) {
      // Prevent user enumeration: always return generic message for USER_EXISTS
      if (result.code === 'USER_EXISTS') {
        log.logResponse(200);
        return NextResponse.json(
          {
            ok: true,
            message: 'تم إرسال رابط التأكيد إلى بريدك الإلكتروني'
          },
          { status: 200 }
        );
      }

      const statusCode = result.code === 'DATABASE_ERROR' ? 500 : 400;
      log.logResponse(statusCode);
      return NextResponse.json(
        {
          error: result.message,
          code: result.code
        },
        { status: statusCode }
      );
    }

    // Success response
    log.logResponse(201);
    return NextResponse.json(
      {
        ok: true,
        token: result.token,
        user: result.user
      },
      { status: 201 }
    );
  } catch (error) {
    log.logError(
      error instanceof Error ? error : new Error(String(error)),
      { endpoint: '/api/auth/register' }
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
