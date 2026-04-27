import type { NextRequest } from "next/server";

export function readOpsBearerToken(request: Pick<NextRequest, "headers" | "nextUrl">) {
  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token) {
      return token;
    }
  }

  return request.nextUrl.searchParams.get("token")?.trim() || null;
}

export function isOpsTokenAuthorized(
  request: Pick<NextRequest, "headers" | "nextUrl">,
  expectedTokens: Array<string | null | undefined>,
) {
  const providedToken = readOpsBearerToken(request);
  if (!providedToken) {
    return false;
  }

  return expectedTokens.some((token) => token && token === providedToken);
}
