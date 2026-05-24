import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/middleware/auth-middleware";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { createAnnouncement, listAnnouncements } from "@/lib/notifications/announcements-service";

export async function GET(request: NextRequest) {
  const { auth, response } = requireAuth(request, "GET /api/web/announcements");
  if (response) return response;

  const { searchParams } = request.nextUrl;
  // School isolation: super_admin may specify any schoolId; others are locked to their own
  const requestedSchoolId = searchParams.get("schoolId");
  const schoolId = auth.role === "super_admin" && requestedSchoolId ? requestedSchoolId : auth.schoolId;
  // Branch isolation: only allow branchId override for super_admin/admin without a branch scope
  const requestedBranchId = searchParams.get("branchId");
  const branchId = requestedBranchId && (auth.role === "super_admin" || !auth.branchId)
    ? requestedBranchId
    : (auth.branchId ?? undefined);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "20");

  const supabase = createServiceSupabaseClient();
  const result = await listAnnouncements(supabase, schoolId, {
    branchId: branchId ?? undefined,
    page,
    pageSize,
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  const { auth, response } = requireAuth(request, "POST /api/web/announcements");
  if (response) return response;

  const { allowed, response: roleRes } = requireRole(
    auth,
    ["admin", "super_admin"],
    "POST /api/web/announcements",
  );
  if (roleRes) return roleRes;
  if (!allowed) return roleRes;

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.body) {
    return NextResponse.json(
      { ok: false, error: "title and body are required" },
      { status: 400 },
    );
  }

  // School isolation: super_admin may specify any schoolId; others are locked to their own
  const schoolId = auth.role === "super_admin" && body.schoolId ? body.schoolId : auth.schoolId;
  const branchId = body.branchId && (auth.role === "super_admin" || !auth.branchId)
    ? body.branchId
    : (auth.branchId ?? null);

  const supabase = createServiceSupabaseClient();
  const result = await createAnnouncement(supabase, {
    schoolId,
    branchId,
    title: body.title,
    body: body.body,
    mediaUrl: body.mediaUrl,
    mediaType: body.mediaType,
    isPinned: body.isPinned ?? false,
    expiresAt: body.expiresAt,
    createdBy: auth.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: result.item }, { status: 201 });
}
