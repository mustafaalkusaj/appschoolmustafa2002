import { NextRequest, NextResponse } from "next/server";

import { resolveMobileRouteContext } from "@/lib/mobile-api-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

type Params = { params: Promise<{ id: string }> };

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
    const { data, error } = await supabase
      .from("assignment_submissions")
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
    const { data, error } = await supabase
      .from("assignment_submissions")
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
