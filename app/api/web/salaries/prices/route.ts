import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { invalidateSchoolCacheDomains } from "@/lib/server-cache";

type PriceEntry = {
  grade: string;
  price: number;
};

export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const schoolId = typeof body?.school_id === "string" ? body.school_id.trim() : "";
  const entries = Array.isArray(body?.entries) ? body.entries : [];

  if (!schoolId) {
    return jsonError("معرف المدرسة مطلوب.", 400);
  }

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin"], roleDeniedMessage: "إدارة أسعار المحاضرات متاحة للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const { actorSupabase, actorUserId, targetSchoolId } = context.value;

  const rateLimited = await enforceRateLimit(req, {
    namespace: "salaries-prices-write",
    windowMs: 60_000,
    maxHits: 30,
    identifier: actorUserId,
  });
  if (rateLimited) return rateLimited;

  const canManage = await routeUserHasPermission(actorSupabase, actorUserId, "manage_salaries");
  if (!canManage) return jsonError("ليس لديك صلاحية إدارة أسعار المحاضرات.", 403);

  const sanitized: PriceEntry[] = (entries as unknown[])
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === "object")
    .filter((e) => typeof e.grade === "string" && e.grade.trim())
    .map((e) => ({
      grade: (e.grade as string).trim(),
      price: Math.max(0, Number(e.price ?? 0) || 0),
    }));

  for (const { grade, price } of sanitized) {
    const { data: existing } = await actorSupabase
      .from("lecture_prices")
      .select("id")
      .eq("school_id", targetSchoolId)
      .eq("grade", grade)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await actorSupabase
        .from("lecture_prices")
        .update({ price_per_lecture: price })
        .eq("id", existing.id)
        .eq("school_id", targetSchoolId);
      if (error) return jsonError(error.message || "تعذر تحديث السعر.", 500);
    } else {
      const { error } = await actorSupabase
        .from("lecture_prices")
        .insert({ school_id: targetSchoolId, grade, price_per_lecture: price });
      if (error) return jsonError(error.message || "تعذر إضافة السعر.", 500);
    }
  }

  invalidateSchoolCacheDomains(targetSchoolId, ["reports-overview"]);

  return NextResponse.json({ ok: true, updated: sanitized.length });
}
