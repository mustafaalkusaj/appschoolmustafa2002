import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/middleware/auth-middleware";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import {
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/notifications/announcements-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { auth, response } = requireAuth(request, "PUT /api/web/announcements/[id]");
  if (response) return response;

  const { allowed, response: roleRes } = requireRole(
    auth,
    ["admin", "super_admin"],
    "PUT /api/web/announcements/[id]",
  );
  if (roleRes) return roleRes;
  if (!allowed) return roleRes;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  // School isolation: super_admin may specify any schoolId; others locked to their own
  const schoolId = auth.role === "super_admin" && body.schoolId ? body.schoolId : auth.schoolId;

  const supabase = createServiceSupabaseClient();
  const result = await updateAnnouncement(supabase, id, schoolId, {
    title:     body.title,
    body:      body.body,
    isPinned:  typeof body.isPinned === "boolean" ? body.isPinned : undefined,
    mediaUrl:  body.mediaUrl  !== undefined ? (body.mediaUrl  || null) : undefined,
    mediaType: body.mediaType !== undefined ? (body.mediaType || null) : undefined,
    expiresAt: body.expiresAt !== undefined ? (body.expiresAt || null) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { auth, response } = requireAuth(request, "DELETE /api/web/announcements/[id]");
  if (response) return response;

  const { allowed, response: roleRes } = requireRole(
    auth,
    ["admin", "super_admin"],
    "DELETE /api/web/announcements/[id]",
  );
  if (roleRes) return roleRes;
  if (!allowed) return roleRes;

  const { id } = await params;
  // School isolation: super_admin may specify any schoolId; others locked to their own
  const requestedSchoolId = request.nextUrl.searchParams.get("schoolId");
  const schoolId = auth.role === "super_admin" && requestedSchoolId ? requestedSchoolId : auth.schoolId;

  const supabase = createServiceSupabaseClient();
  const result = await deleteAnnouncement(supabase, id, schoolId);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
