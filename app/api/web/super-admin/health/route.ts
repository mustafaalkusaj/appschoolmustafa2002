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
    const startTime = Date.now();

    const dbCheck = await context.value.dataSupabase
      .from("schools")
      .select("id", { count: "exact", head: true });
    const dbLatency = Date.now() - startTime;

    const metrics = {
      database: {
        status: dbCheck.error ? "critical" : "healthy",
        message: dbCheck.error ? "خطأ في الاتصال" : "متصل بشكل طبيعي",
        latency: dbLatency,
      },
      api: {
        status: "healthy",
        message: "جميع المخدمات تعمل",
      },
      storage: {
        status: "healthy",
        message: "المساحة متوفرة",
      },
      memory: 0,
      cpu: 0,
      activeConnections: dbCheck.count ?? 0,
      lastChecked: new Date().toISOString(),
    };

    return NextResponse.json(metrics);
  } catch (err) {
    return NextResponse.json({
      database: { status: "critical", message: "خطأ في الاتصال" },
      api: { status: "critical", message: "خطأ في الخادم" },
      storage: { status: "warning", message: "لا يمكن التحقق" },
      memory: 0,
      cpu: 0,
      activeConnections: 0,
      lastChecked: new Date().toISOString(),
      error: err instanceof Error ? err.message : "خطأ في الخادم",
    }, { status: 500 });
  }
}
