// @ts-nocheck
/**
 * Register Endpoint
 * POST /api/auth/register
 * Creates a new user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/services/auth-service';
import { registerSchema } from '@/lib/validators';
import { createApiLogger } from '@/lib/api-logger';

export async function POST(req: NextRequest) {
  const log = createApiLogger({
    endpoint: '/api/auth/register',
    ip: req.headers.get('x-forwarded-for') || 'unknown'
  });

  try {
    log.logRequest('POST');

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
      let statusCode = 400;
      if (result.code === 'USER_EXISTS') statusCode = 409;
      if (result.code === 'DATABASE_ERROR') statusCode = 500;

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
