import { NextRequest, NextResponse } from "next/server";

import {
  buildSchoolArchivePayload,
  persistSchoolArchiveSnapshot,
} from "@/lib/school-archives";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> },
) {
  const { schoolId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return jsonError("معرف المدرسة غير صالح.", 400);
  }

  const { dataSupabase, actorUserId } = context.value;

  try {
    const payload = await buildSchoolArchivePayload(dataSupabase, normalizedSchoolId);
    const schoolName =
      typeof payload.school.name === "string" && payload.school.name.trim()
        ? payload.school.name.trim()
        : "school";

    const warnings = [...(payload.warnings ?? [])];
    try {
      await persistSchoolArchiveSnapshot(dataSupabase, {
        schoolId: normalizedSchoolId,
        schoolName,
        actorUserId,
        source: "manual_export",
        payload,
      });
    } catch (snapshotError) {
      warnings.push(
        snapshotError instanceof Error
          ? snapshotError.message
          : "تم تجاوز حفظ نسخة الأرشيف الداخلية، لكن ملف التصدير تم تجهيزه.",
      );
    }
    payload.warnings = warnings;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(`${schoolName}-archive-${Date.now()}.json`)}"`,
        "Cache-Control": "no-store",
        "X-School-Archive-Warnings-Count": String(warnings.length),
      },
    });
  } catch (error) {
    console.error("school export error", error);
    return jsonError(
      error instanceof Error ? error.message : "تعذر تصدير بيانات المدرسة.",
      500,
    );
  }
}
