import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth-middleware";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { getUnreadCount } from "@/lib/notifications/insite-service";

export async function GET(request: NextRequest) {
  const { auth, response } = requireAuth(request, "GET /api/web/notifications/insite/unread");
  if (response) return response;

  // School isolation: ignore client-supplied schoolId — use token value only
  const schoolId = auth.schoolId;

  const supabase = createServiceSupabaseClient();
  const count = await getUnreadCount(supabase, auth.userId, schoolId);

  return NextResponse.json({ ok: true, count });
}
