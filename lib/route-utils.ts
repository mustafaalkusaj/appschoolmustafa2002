import { NextResponse } from "next/server";
import type { ZodError } from "zod";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Returns true if the string is a valid UUID v1-v5. */
export function isValidUUID(value: string): boolean {
  return UUID_RE.test(value);
}

export function jsonError(message: string, status: number, fieldErrors?: Record<string, string>) {
  return NextResponse.json(
    {
      error: {
        message,
        ...(fieldErrors && Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function buildZodFieldErrors(error: ZodError) {
  return error.issues.reduce<Record<string, string>>((acc, issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!acc[path]) {
      acc[path] = issue.message;
    }
    return acc;
  }, {});
}

export function jsonValidationError(error: ZodError, fallback = "تحقق من الحقول المطلوبة ثم أعد المحاولة.") {
  return jsonError(fallback, 400, buildZodFieldErrors(error));
}

export function jsonCached(data: unknown, maxAgeSec = 30, swr = 60) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": `private, s-maxage=${maxAgeSec}, stale-while-revalidate=${swr}`,
      Vary: "Authorization, Cookie",
    },
  });
}

export function logRouteError(scope: string, error: unknown, meta?: Record<string, unknown>) {
  console.error(`[${scope}]`, {
    ...(meta ?? {}),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  });
}

/**
 * Log a Supabase/internal error server-side and return a safe generic message to the client.
 * Use this instead of returning `error.message` directly in API responses to avoid leaking
 * table names, column names, or constraint names from Supabase error messages.
 */
export function jsonServerError(
  scope: string,
  error: unknown,
  fallback: string,
  status = 500,
  meta?: Record<string, unknown>,
) {
  logRouteError(scope, error, meta);
  return jsonError(fallback, status);
}
