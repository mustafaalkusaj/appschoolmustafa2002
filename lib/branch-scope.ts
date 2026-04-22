import type { SchoolScopedActorContext } from "@/lib/managed-users/types";

type BranchScopedActorLike = Pick<SchoolScopedActorContext, "actorBranchId" | "allowedBranchIds">;

type BranchScopeQueryLike = {
  eq: (column: string, value: unknown) => BranchScopeQueryLike;
  in: (column: string, values: unknown[]) => BranchScopeQueryLike;
};

export type ResolvedBranchScope = {
  branchId: string | null;
  branchIds: string[];
  cacheKeySuffix: string;
};

function normalizeBranchId(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function uniqueBranchIds(actor: BranchScopedActorLike) {
  return Array.from(
    new Set([
      ...(Array.isArray(actor.allowedBranchIds) ? actor.allowedBranchIds : [])
        .map((value) => normalizeBranchId(value))
        .filter((value): value is string => Boolean(value)),
      normalizeBranchId(actor.actorBranchId),
    ].filter((value): value is string => Boolean(value))),
  );
}

export function resolveBranchScope(
  actor: BranchScopedActorLike,
  requestedBranchId?: string | null,
  accessDeniedMessage = "لا يمكنك الوصول إلى بيانات هذا الفرع.",
): { ok: true; value: ResolvedBranchScope } | { ok: false; status: number; message: string } {
  const normalizedRequestedBranchId = normalizeBranchId(requestedBranchId);
  const actorBranchIds = uniqueBranchIds(actor);

  if (normalizedRequestedBranchId) {
    if (actorBranchIds.length > 0 && !actorBranchIds.includes(normalizedRequestedBranchId)) {
      return { ok: false, status: 403, message: accessDeniedMessage };
    }

    return {
      ok: true,
      value: {
        branchId: normalizedRequestedBranchId,
        branchIds: [normalizedRequestedBranchId],
        cacheKeySuffix: `branch:${normalizedRequestedBranchId}`,
      },
    };
  }

  const cacheKeySuffix =
    actorBranchIds.length === 0
      ? "school"
      : actorBranchIds.length === 1
        ? `branch:${actorBranchIds[0]}`
        : `branches:${[...actorBranchIds].sort().join(",")}`;

  return {
    ok: true,
    value: {
      branchId: actorBranchIds.length === 1 ? actorBranchIds[0] : null,
      branchIds: actorBranchIds,
      cacheKeySuffix,
    },
  };
}

export function applyBranchScopeToQuery<TQuery>(
  query: TQuery,
  branchScope: ResolvedBranchScope,
  column = "branch_id",
) {
  const scoped = query as unknown as BranchScopeQueryLike;

  if (branchScope.branchId) {
    return scoped.eq(column, branchScope.branchId) as unknown as TQuery;
  }

  if (branchScope.branchIds.length > 0) {
    return scoped.in(column, branchScope.branchIds) as unknown as TQuery;
  }

  return query;
}

export function resolveBranchIdForWrite(
  branchScope: ResolvedBranchScope,
  requestedBranchId?: string | null,
): { ok: true; value: string | null } | { ok: false; status: number; message: string } {
  const normalizedRequestedBranchId = normalizeBranchId(requestedBranchId);
  if (normalizedRequestedBranchId) {
    if (branchScope.branchIds.length > 0 && !branchScope.branchIds.includes(normalizedRequestedBranchId)) {
      return { ok: false, status: 403, message: "لا يمكنك الحفظ على هذا الفرع." };
    }
    return { ok: true, value: normalizedRequestedBranchId };
  }

  if (branchScope.branchId) {
    return { ok: true, value: branchScope.branchId };
  }

  if (branchScope.branchIds.length === 1) {
    return { ok: true, value: branchScope.branchIds[0] };
  }

  if (branchScope.branchIds.length > 1) {
    return { ok: false, status: 400, message: "يجب تحديد الفرع قبل حفظ هذا السجل." };
  }

  return { ok: true, value: null };
}
