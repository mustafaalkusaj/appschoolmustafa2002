import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";

const BUCKET = "school-media";

function matchesTarget(
  assignment: Record<string, unknown>,
  student: { id: string; className: string | null; section: string | null },
) {
  const studentId =
    typeof assignment.student_id === "string" ? assignment.student_id : null;
  const className =
    typeof assignment.class_name === "string"
      ? assignment.class_name.trim().toLowerCase()
      : "";
  const section =
    typeof assignment.section === "string"
      ? assignment.section.trim().toLowerCase()
      : "";
  return (
    studentId === student.id ||
    (!studentId &&
      className === (student.className ?? "").trim().toLowerCase() &&
      section === (student.section ?? "").trim().toLowerCase())
  );
}

export async function POST(req: NextRequest) {
  try {
    const context = await resolveMobileRouteContext(req);
    if (context.ok === false) return context.response;

    const limited = await enforceRateLimit(req, {
      namespace: "mobile-storage-download-url",
      windowMs: 60 * 60_000,
      maxHits: 120,
      identifier: context.value.authUserId,
    });
    if (limited) return limited;

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const bucket = typeof body?.bucket === "string" ? body.bucket.trim() : "";
    const path = typeof body?.path === "string" ? body.path.trim() : "";
    const downloadName =
      typeof body?.file_name === "string"
        ? body.file_name.trim().slice(0, 180)
        : "";
    const schoolPrefix = `${context.value.schoolId}/`;

    if (
      bucket !== BUCKET ||
      !path.startsWith(schoolPrefix) ||
      path.includes("..")
    ) {
      return NextResponse.json(
        { ok: false, error: "مسار الملف غير صالح." },
        { status: 403 },
      );
    }

    const { serviceSupabase, authUserId, schoolId, role, account } =
      context.value;
    let allowed = false;

    if (role === "teacher" && account.teacher?.id) {
      allowed = path.startsWith(`${schoolId}/${account.teacher.id}/`);
    }

    if (!allowed) {
      const notification = await serviceSupabase
        .from("notifications")
        .select("id")
        .eq("school_id", schoolId)
        .eq("user_id", authUserId)
        .contains("metadata", {
          attachment_path: path,
          attachment_bucket: BUCKET,
        })
        .limit(1)
        .maybeSingle();
      allowed = Boolean(notification.data && !notification.error);
    }

    if (!allowed) {
      const assignmentResponse = await serviceSupabase
        .from("assignments")
        .select("student_id, class_name, section")
        .eq("school_id", schoolId)
        .eq("attachment_bucket", BUCKET)
        .eq("attachment_path", path)
        .limit(20);

      if (assignmentResponse.error) {
        return NextResponse.json(
          { ok: false, error: "تعذر التحقق من الملف." },
          { status: 500 },
        );
      }

      const assignments = (assignmentResponse.data ?? []) as Record<
        string,
        unknown
      >[];
      if (role === "student" && account.student?.id) {
        allowed = assignments.some((assignment) =>
          matchesTarget(assignment, {
            id: account.student!.id,
            className: account.student!.class_name,
            section: account.student!.section,
          }),
        );
      } else if (role === "parent") {
        const links = await serviceSupabase
          .from("parent_student_links")
          .select("student_id")
          .eq("parent_user_id", authUserId)
          .eq("school_id", schoolId);
        const studentIds = (links.data ?? [])
          .map((row) => row.student_id)
          .filter(Boolean);
        if (studentIds.length > 0) {
          const students = await serviceSupabase
            .from("students")
            .select("id, class_name, section")
            .in("id", studentIds)
            .eq("school_id", schoolId);
          allowed = (students.data ?? []).some((student) =>
            assignments.some((assignment) =>
              matchesTarget(assignment, {
                id: student.id,
                className: student.class_name,
                section: student.section,
              }),
            ),
          );
        }
      }
    }

    if (!allowed) {
      return NextResponse.json(
        { ok: false, error: "لا تملك صلاحية فتح هذا الملف." },
        { status: 403 },
      );
    }

    const { data, error } = await serviceSupabase.storage
      .from(BUCKET)
      .createSignedUrl(
        path,
        15 * 60,
        downloadName ? { download: downloadName } : undefined,
      );
    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: "تعذر إنشاء رابط تنزيل آمن." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: { signed_url: data.signedUrl, expires_in: 900 },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
