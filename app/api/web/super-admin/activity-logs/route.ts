import { NextRequest, NextResponse } from "next/server";

import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(request: NextRequest) {
  const context = await resolveSuperAdminActorContext(request.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  try {
    const { data, error } = await context.value.dataSupabase
      .from("audit_logs")
      .select("id, action_type, entity_type, entity_id, actor_user_id, actor_name, created_at, metadata, summary")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return jsonError(error.message, 500);
    }

    const logs = (data || []).map((log) => ({
      id: log.id,
      action: log.action_type || "create",
      target: log.entity_type?.toLowerCase() || "school",
      targetName: log.entity_id || "unknown",
      actor: log.actor_name || log.actor_user_id || "system",
      timestamp: new Date(log.created_at),
      details: log.summary || (log.metadata ? JSON.stringify(log.metadata).substring(0, 100) : "تحديث"),
    }));

    return NextResponse.json({ logs });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "خطأ في الخادم", 500);
  }
}
