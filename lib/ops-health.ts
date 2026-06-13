import "server-only";

import type { NextRequest } from "next/server";

type HealthAccessMode = "public" | "token-protected" | "disabled";

export function resolveHealthAccessMode(healthcheckToken: string | null | undefined, isProduction: boolean): HealthAccessMode {
  if (healthcheckToken && healthcheckToken.trim().length > 0) {
    return "token-protected";
  }

  return isProduction ? "disabled" : "public";
}

export function isAuthorizedHealthRequest(
  request: Pick<NextRequest, "headers">,
  healthcheckToken: string | null | undefined,
  isProduction: boolean,
) {
  const mode = resolveHealthAccessMode(healthcheckToken, isProduction);

  if (mode === "public") {
    return true;
  }

  if (mode === "disabled") {
    return false;
  }

  const providedToken =
    request.headers.get("x-health-token")?.trim() ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  return Boolean(providedToken && healthcheckToken && providedToken === healthcheckToken);
}
