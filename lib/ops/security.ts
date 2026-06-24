import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export function readOpsBearerToken(request: Pick<NextRequest, "headers" | "nextUrl">) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) {
      return token;
    }
  }

  return null;
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

export function isOpsTokenAuthorized(
  request: Pick<NextRequest, "headers" | "nextUrl">,
  expectedTokens: Array<string | null | undefined>,
) {
  const providedToken = readOpsBearerToken(request);
  if (!providedToken) {
    return false;
  }

  return expectedTokens.some((token) => Boolean(token) && constantTimeEquals(token as string, providedToken));
}
