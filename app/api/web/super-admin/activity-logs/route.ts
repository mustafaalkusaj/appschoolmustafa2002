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
      .select("id, action, table_name, record_id, user_id, created_at, changes")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return jsonError(error.message, 500);
    }

    const logs = (data || []).map((log) => ({
      id: log.id,
      action: log.action || "create",
      target: log.table_name?.replace("public.", "").toLowerCase() || "school",
      targetName: log.record_id || "unknown",
      actor: log.user_id || "system",
      timestamp: new Date(log.created_at),
      details: log.changes ? JSON.stringify(log.changes).substring(0, 100) : "تحديث",
    }));

    return NextResponse.json({ logs });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "خطأ في الخادم", 500);
  }
}
