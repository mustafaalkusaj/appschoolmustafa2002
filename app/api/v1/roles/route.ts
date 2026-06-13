import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { jsonError } from "@/lib/route-utils";

const createRoleSchema = z.object({
  key: z.string().min(2).max(64).regex(/^[a-z0-9_]+$/, "key: حروف صغيرة وأرقام وشرطة سفلية فقط"),
  name_ar: z.string().min(2).max(100),
});

export async function GET(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const { data, error } = await service
    .from("school_roles")
    .select("id, key, name_ar, is_system, color, created_at")
    .eq("school_id", targetSchoolId)
    .order("created_at");

  if (error) return jsonError("تعذر تحميل الأدوار", 500);

  return NextResponse.json({ ok: true, roles: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    { allowedRoles: ["admin", "super_admin"], roleDeniedMessage: "غير مصرح" },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "غير مصرح", "status" in context ? context.status : 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createRoleSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("بيانات غير صحيحة", 400);
  }

  const { targetSchoolId } = context.value;
  const service = createServiceSupabaseClient();

  const { data, error } = await service
    .from("school_roles")
    .insert({ school_id: targetSchoolId, key: parsed.data.key, name_ar: parsed.data.name_ar })
    .select("id, key, name_ar, is_system, color, created_at")
    .single();

  if (error) {
    if (error.code === "23505") return jsonError("هذا المفتاح مستخدم مسبقاً في هذه المدرسة", 409);
    return jsonError("تعذر إنشاء الدور", 500);
  }

  return NextResponse.json({ ok: true, role: data }, { status: 201 });
}
