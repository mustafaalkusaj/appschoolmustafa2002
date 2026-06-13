import { NextRequest, NextResponse } from "next/server";
import { isMissingTableError } from "@/lib/admin-infrastructure";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
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

  const { actorSupabase } = context.value;
  const normalizedId = archiveId.trim();
  if (!normalizedId) {
    return jsonError("معرف الأرشيف غير صالح.", 400);
  }

  const { data, error } = await actorSupabase
    .from("account_archives")
    .delete()
    .eq("id", normalizedId)
    .select("id, archive_year, school_id")
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "account_archives")) {
      return jsonError("جدول account_archives غير موجود بعد.", 500);
    }
    return jsonError(error.message || "تعذر حذف الأرشيف.", 500);
  }

  if (!data) {
    return jsonError("الأرشيف المطلوب غير موجود.", 404);
  }

  return NextResponse.json({ ok: true, id: normalizedId, archive_year: data.archive_year });
}
