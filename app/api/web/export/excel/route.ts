/**
 * Generic styled Excel export route.
 * Accepts JSON body with sheet definitions, returns a styled xlsx file.
 * The client fetches its own data (through authed APIs), then posts it here for formatting.
 */

import { NextRequest, NextResponse } from "next/server";

import { buildStyledWorkbook, type WorkbookDef } from "@/lib/excel-builder";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(req: NextRequest) {
  // Light auth check — caller must be authenticated
  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "التصدير يتطلب تسجيل الدخول.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  let body: WorkbookDef & { filename?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("بيانات غير صالحة.", 400);
  }

  if (!body?.sheets?.length) {
    return jsonError("لا توجد بيانات للتصدير.", 400);
  }

  // Sanity limit: prevent giant payloads
  const totalRows = body.sheets.reduce((sum, s) => sum + (s.rows?.length ?? 0), 0);
  if (totalRows > 50_000) {
    return jsonError("حجم البيانات كبير جداً للتصدير.", 400);
  }

  try {
    const buffer = await buildStyledWorkbook({ sheets: body.sheets });
    const filename = body.filename ?? `تصدير_${Date.now()}.xlsx`;

    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch {
    return jsonError("تعذر إنشاء ملف التصدير.", 500);
  }
}
