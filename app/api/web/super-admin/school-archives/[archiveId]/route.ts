import { NextRequest, NextResponse } from "next/server";

import { isMissingTableError } from "@/lib/admin-infrastructure";
import type { SchoolArchivePayload } from "@/lib/school-archives";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ archiveId: string }> },
) {
  const { archiveId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { dataSupabase } = context.value;
  const normalizedArchiveId = archiveId.trim();
  if (!normalizedArchiveId) {
    return jsonError("معرف نسخة الأرشيف غير صالح.", 400);
  }

  const { data, error } = await dataSupabase
    .from("school_data_archives")
    .select("id, school_name, payload")
    .eq("id", normalizedArchiveId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "school_data_archives")) {
      return jsonError("جدول school_data_archives غير موجود بعد.", 500);
    }
    return jsonError(error.message || "تعذر تحميل نسخة الأرشيف المطلوبة.", 500);
  }

  if (!data) {
    return jsonError("نسخة الأرشيف المطلوبة غير موجودة.", 404);
  }

  const schoolName =
    typeof data.school_name === "string" && data.school_name.trim()
      ? data.school_name.trim()
      : "school";
  const payload = (data.payload ?? null) as SchoolArchivePayload | null;

  return new NextResponse(JSON.stringify(payload ?? {}, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(`${schoolName}-archive-${normalizedArchiveId}.json`)}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ archiveId: string }> },
) {
  const { archiveId } = await params;
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError(context.message, context.status);
  }

  const { dataSupabase } = context.value;
  const normalizedArchiveId = archiveId.trim();
  if (!normalizedArchiveId) {
    return jsonError("معرف نسخة الأرشيف غير صالح.", 400);
  }

  const { data, error } = await dataSupabase
    .from("school_data_archives")
    .delete()
    .eq("id", normalizedArchiveId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "school_data_archives")) {
      return jsonError("جدول school_data_archives غير موجود بعد.", 500);
    }
    return jsonError(error.message || "تعذر حذف نسخة الأرشيف.", 500);
  }

  if (!data) {
    return jsonError("نسخة الأرشيف المطلوبة غير موجودة.", 404);
  }

  return NextResponse.json({ ok: true, id: normalizedArchiveId });
}
