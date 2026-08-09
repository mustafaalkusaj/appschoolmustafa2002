import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

// `assignment_submissions` is not present in the generated Database types
// yet, so we intentionally bypass the typed `.from()` overloads for this
// table while preserving existing runtime behavior.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assignmentSubmissionsTable(client: unknown): any {
  return (client as { from: (table: string) => unknown }).from(
    "assignment_submissions",
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: assignmentId } = await params;
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) return context.response;

    const { schoolId, account } = context.value;
    const studentId = account.student?.id;
    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "لا يوجد حساب طالب مرتبط." },
        { status: 403 },
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await assignmentSubmissionsTable(supabase)
      .select("id, notes, file_url, file_name, file_mime_type, submitted_at")
      .eq("school_id", schoolId)
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({ ok: true, submission: data ?? null });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

interface SubmitBody {
  notes?: string;
  file_url?: string;
  file_name?: string;
  file_mime_type?: string;
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: assignmentId } = await params;
    const context = await resolveMobileRouteContext(req, "student");
    if (context.ok === false) return context.response;

    // Submissions carry user content; keep the write path from becoming a
    // spam amplifier.
    const rateLimited = await enforceRateLimit(req, {
      namespace: "mobile-student-assignment-submit",
      windowMs: 10 * 60_000,
      maxHits: 20,
      identifier: context.value.authUserId,
    });
    if (rateLimited) return rateLimited;

    const { schoolId, account } = context.value;
    const studentId = account.student?.id;
    if (!studentId) {
      return NextResponse.json(
        { ok: false, error: "لا يوجد حساب طالب مرتبط." },
        { status: 403 },
      );
    }

    const body = (await req.json()) as SubmitBody;
    const { notes, file_url, file_name, file_mime_type } = body;

    if (!notes && !file_url) {
      return NextResponse.json(
        { ok: false, error: "يجب إرفاق ملاحظة أو ملف على الأقل." },
        { status: 400 },
      );
    }

    const supabase = createServiceSupabaseClient();
    const { data, error } = await assignmentSubmissionsTable(supabase)
      .upsert(
        {
          school_id: schoolId,
          assignment_id: assignmentId,
          student_id: studentId,
          notes: notes ?? null,
          file_url: file_url ?? null,
          file_name: file_name ?? null,
          file_mime_type: file_mime_type ?? null,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "assignment_id,student_id" },
      )
      .select("id, notes, file_url, file_name, file_mime_type, submitted_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, submission: data });
  } catch {
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
