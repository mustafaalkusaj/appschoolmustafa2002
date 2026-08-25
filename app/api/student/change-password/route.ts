import { NextRequest, NextResponse } from "next/server";
import { resolveStudentContext, unauthorized } from "@/lib/student-api";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const ctx = await resolveStudentContext(req);
  if (!ctx) return unauthorized();

  let body: { current_password?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const { current_password, new_password } = body;
  if (!current_password || !new_password) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  if (new_password.length < 6) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }

  const { supabase, userId } = ctx;

  const { data: profile } = await supabase
    .from("managed_user_profiles")
    .select("email")
    .eq("auth_user_id", userId)
    .maybeSingle();

  const email = (profile as Record<string, unknown>)?.email as string | undefined;
  if (!email) {
    return NextResponse.json({ ok: false, error: "no_email" }, { status: 400 });
  }

  const verifyClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: signInError } = await verifyClient.auth.signInWithPassword({
    email,
    password: current_password,
  });

  if (signInError) {
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userId,
    { password: new_password },
  );

  if (updateError) {
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
