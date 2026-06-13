import { NextResponse } from "next/server";
import type { ZodError } from "zod";

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
