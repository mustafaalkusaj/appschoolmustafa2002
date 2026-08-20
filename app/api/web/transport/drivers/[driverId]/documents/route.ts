import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { routeUserHasPermission } from "@/lib/route-permissions";
import { uploadFile, deleteFile } from "@/lib/storage";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { transportError } from "@/lib/transport/server";

type Ctx = { params: Promise<{ driverId: string }> };

async function authorize(req: NextRequest, schoolId: string | null, permission: "view_transport" | "manage_transport") {
  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "transport_manager"], roleDeniedMessage: "النقل المدرسي متاح للإدارة فقط." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return {
      ok: false as const,
      error: transportError("message" in context ? context.message : "غير مصرح.", "status" in context ? context.status : 403),
    };
  }
  const { actorSupabase, actorUserId, targetSchoolId } = context.value;
  if (!(await routeUserHasPermission(actorSupabase, actorUserId, permission))) {
    return { ok: false as const, error: transportError("ليس لديك صلاحية النقل المدرسي.", 403) };
  }
  const rateLimited = await enforceRateLimit(req, {
    namespace: "transport-driver-docs", windowMs: 60_000, maxHits: 60, identifier: actorUserId,
  });
  if (rateLimited) return { ok: false as const, error: rateLimited };
  return { ok: true as const, actorSupabase, targetSchoolId };
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { driverId } = await params;
  const auth = await authorize(req, req.nextUrl.searchParams.get("schoolId"), "view_transport");
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const { data: driver } = await actorSupabase
    .from("drivers")
    .select("id")
    .eq("id", driverId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!driver) return transportError("السائق غير موجود.", 404);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table exists in DB, generated types stale
  const { data, error } = await (actorSupabase as any)
    .from("driver_documents")
    .select("id, slot_number, label, photo_url, created_at")
    .eq("driver_id", driverId)
    .eq("school_id", targetSchoolId)
    .order("slot_number", { ascending: true });
  if (error) return transportError("تعذر تحميل المستمسكات.", 500);

  return NextResponse.json(
    { ok: true, documents: data ?? [] },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { driverId } = await params;

  const formData = await req.formData().catch(() => null);
  if (!formData) return transportError("بيانات غير صالحة.", 400);

  const schoolId = formData.get("school_id") as string | null;
  const auth = await authorize(req, schoolId, "manage_transport");
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const slotRaw = formData.get("slot_number");
  const slot = Number(slotRaw);
  if (!slot || slot < 1 || slot > 8) return transportError("رقم الخانة يجب ان يكون بين 1 و 8.", 400);

  const label = (formData.get("label") as string || "").trim();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return transportError("الملف مطلوب.", 400);
  if (file.size > 5 * 1024 * 1024) return transportError("حجم الملف اكبر من 5 ميغابايت.", 400);
  if (!file.type.startsWith("image/")) return transportError("يجب ان يكون الملف صورة.", 400);

  const { data: driver } = await actorSupabase
    .from("drivers")
    .select("id, branch_id")
    .eq("id", driverId)
    .eq("school_id", targetSchoolId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!driver) return transportError("السائق غير موجود.", 404);

  const service = createServiceSupabaseClient();
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${targetSchoolId}/${driverId}/slot_${slot}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  let photoUrl: string;
  try {
    photoUrl = await uploadFile(service, "driver-documents", storagePath, buf, file.type);
  } catch (e) {
    return transportError(`فشل رفع الصورة: ${e instanceof Error ? e.message : "خطأ"}`, 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table exists in DB, generated types stale
  const { error } = await (service as any)
    .from("driver_documents")
    .upsert(
      {
        school_id: targetSchoolId,
        branch_id: driver.branch_id,
        driver_id: driverId,
        slot_number: slot,
        label,
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "driver_id,slot_number" },
    );
  if (error) return transportError("تعذر حفظ المستمسك.", 500);

  return NextResponse.json({ ok: true, photo_url: photoUrl }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { driverId } = await params;
  const auth = await authorize(req, req.nextUrl.searchParams.get("schoolId"), "manage_transport");
  if (!auth.ok) return auth.error;
  const { actorSupabase, targetSchoolId } = auth;

  const slotRaw = req.nextUrl.searchParams.get("slot");
  const slot = Number(slotRaw);
  if (!slot || slot < 1 || slot > 8) return transportError("رقم الخانة مطلوب.", 400);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table exists in DB, generated types stale
  const { data: doc } = await (actorSupabase as any)
    .from("driver_documents")
    .select("id, photo_url")
    .eq("driver_id", driverId)
    .eq("slot_number", slot)
    .eq("school_id", targetSchoolId)
    .maybeSingle();
  if (!doc) return transportError("المستمسك غير موجود.", 404);

  const service = createServiceSupabaseClient();

  const urlPath = doc.photo_url.split("/driver-documents/").pop();
  if (urlPath) {
    try { await deleteFile(service, "driver-documents", decodeURIComponent(urlPath)); } catch {}
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any)
    .from("driver_documents")
    .delete()
    .eq("id", doc.id);
  if (error) return transportError("تعذر حذف المستمسك.", 500);

  return NextResponse.json({ ok: true });
}
