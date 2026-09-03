import { NextRequest, NextResponse } from "next/server";
import { RBAC_COOKIE_NAME, verifyRBACSession } from "@/lib/rbac-session";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface TeacherContext {
  userId: string;
  schoolId: string;
  teacherId: string;
  fullName: string | null;
  supabase: SupabaseClient<Database>;
}

export async function resolveTeacherContext(
  req: NextRequest,
): Promise<TeacherContext | null> {
  const session = await verifyRBACSession(
    req.cookies.get(RBAC_COOKIE_NAME)?.value,
  );
  if (!session?.userActive || session.role !== "teacher" || !session.schoolId) {
    return null;
  }

  const supabase = createServiceSupabaseClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("auth_user_id", session.userId)
    .eq("school_id", session.schoolId)
    .maybeSingle();

  let teacherId =
    typeof (profile as Record<string, unknown>)?.id === "string"
      ? ((profile as Record<string, unknown>).id as string)
      : null;

  if (!teacherId) {
    const { data: managed } = await supabase
      .from("managed_user_profiles")
      .select("auth_user_id")
      .eq("auth_user_id", session.userId)
      .eq("school_id", session.schoolId)
      .maybeSingle();

    if (managed) {
      teacherId = session.userId;
    }
  }

  if (!teacherId) return null;

  return {
    userId: session.userId,
    schoolId: session.schoolId,
    teacherId,
    fullName: (profile as Record<string, unknown>)?.full_name as string | null,
    supabase,
  };
}

export function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

export function serverError(message: string) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 500 },
  );
}
