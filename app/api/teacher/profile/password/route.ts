import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolveTeacherContext, unauthorized } from "@/lib/teacher-api";

export async function POST(req: NextRequest) {
  const ctx = await resolveTeacherContext(req);
  if (!ctx) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_body" },
      { status: 400 },
    );
  }

  const currentPassword = body.current_password as string | undefined;
  const newPassword = body.new_password as string | undefined;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "passwords_required" },
      { status: 400 },
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { ok: false, error: "password_too_short" },
      { status: 400 },
    );
  }

  const { data: profile } = await ctx.supabase
    .from("user_profiles")
    .select("email")
    .eq("id", ctx.userId)
    .single();

  const email = (profile as Record<string, unknown> | null)?.email as
    | string
    | undefined;

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "email_not_found" },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const verifyClient = createClient(supabaseUrl, supabaseAnonKey);
  const { error: signInErr } = await verifyClient.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInErr) {
    return NextResponse.json(
      { ok: false, error: "current_password_wrong" },
      { status: 403 },
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { error: updateErr } = await adminClient.auth.admin.updateUserById(
    ctx.userId,
    { password: newPassword },
  );

  if (updateErr) {
    return NextResponse.json(
      { ok: false, error: "update_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: { updated: true } });
}
