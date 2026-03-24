import { NextRequest, NextResponse } from "next/server";

import { detectAdminInfrastructure, isInfrastructureCompatError } from "@/lib/admin-infrastructure";
import { detectAppSchemaCompatWithClient } from "@/lib/schema-compat";
import { resolveSuperAdminActorContext } from "@/lib/super-admin-server";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

type CreateSchoolBody = {
  name?: unknown;
  address?: unknown;
  phone?: unknown;
  owner_email?: unknown;
  city?: unknown;
  logo_url?: unknown;
  primary_color?: unknown;
  secondary_color?: unknown;
  plan?: unknown;
};

export async function POST(req: NextRequest) {
  const context = await resolveSuperAdminActorContext(req.headers.get("authorization"));
  if (!context.ok) {
    return jsonError("message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.", "status" in context ? context.status : 500);
  }

  const body = (await req.json().catch(() => null)) as CreateSchoolBody | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const plan = body?.plan === "premium" || body?.plan === "enterprise" ? body.plan : "basic";

  if (!name) {
    return jsonError("اسم المدرسة مطلوب.", 400);
  }

  const { actorSupabase } = context.value;
  const [infrastructure, schemaCompat] = await Promise.all([
    detectAdminInfrastructure(actorSupabase),
    detectAppSchemaCompatWithClient(actorSupabase),
  ]);

  const schoolPayload = {
    name,
    address: typeof body?.address === "string" && body.address.trim() ? body.address.trim() : null,
    phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
    owner_email: typeof body?.owner_email === "string" && body.owner_email.trim() ? body.owner_email.trim() : null,
    city: typeof body?.city === "string" && body.city.trim() ? body.city.trim() : null,
    logo_url: typeof body?.logo_url === "string" && body.logo_url.trim() ? body.logo_url.trim() : null,
    ...(schemaCompat.schoolColors
      ? {
          primary_color:
            typeof body?.primary_color === "string" && body.primary_color.trim() ? body.primary_color.trim() : null,
          secondary_color:
            typeof body?.secondary_color === "string" && body.secondary_color.trim() ? body.secondary_color.trim() : null,
        }
      : {}),
    plan,
    is_active: true,
  };

  const { data: school, error: schoolError } = await actorSupabase
    .from("schools")
    .insert(schoolPayload)
    .select("id, name, address, phone, owner_email, city, logo_url, primary_color, secondary_color, plan, is_active, created_at")
    .single();

  if (schoolError || !school) {
    return jsonError(schoolError?.message || "تعذر إنشاء المدرسة.", 500);
  }

  const startDate = new Date().toISOString().split("T")[0];
  const endDate = new Date(Date.now() + 365 * DAY_IN_MS).toISOString().split("T")[0];
  const { data: subscription, error: subscriptionError } = await actorSupabase
    .from("subscriptions")
    .insert({
      school_id: school.id,
      plan,
      status: "active",
      start_date: startDate,
      end_date: endDate,
    })
    .select("id, school_id, plan, status, start_date, end_date, created_at")
    .single();

  if (subscriptionError || !subscription) {
    await actorSupabase.from("schools").delete().eq("id", school.id);
    return jsonError(subscriptionError?.message || "تعذر إنشاء اشتراك المدرسة.", 500);
  }

  let branchSkipped = !infrastructure.branches;
  if (!branchSkipped) {
    const branchPayload = {
      school_id: school.id,
      name: "الفرع الرئيسي",
      ...(schemaCompat.branchesIsMain ? { is_main: true } : {}),
    };

    const { error: branchError } = await actorSupabase.from("branches").insert(branchPayload);
    if (branchError) {
      if (isInfrastructureCompatError(branchError)) {
        branchSkipped = true;
      } else {
        await actorSupabase.from("subscriptions").delete().eq("id", subscription.id);
        await actorSupabase.from("schools").delete().eq("id", school.id);
        return jsonError(branchError.message || "تعذر إنشاء الفرع الرئيسي.", 500);
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      school,
      subscription,
      schemaCompat,
      branchSkipped,
    },
    { status: 201 },
  );
}
