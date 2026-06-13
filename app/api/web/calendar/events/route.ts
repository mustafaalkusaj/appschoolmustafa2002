import { NextRequest, NextResponse } from "next/server";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { jsonError } from "@/lib/route-utils";
import { resolveBranchScope, resolveBranchIdForWrite } from "@/lib/branch-scope";
import { createInsiteNotification } from "@/lib/notifications/insite-service";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const schoolId = searchParams.get("schoolId");
  const year = searchParams.get("year") || new Date().getFullYear().toString();
  const month = searchParams.get("month"); // optional, 1-12
  const type = searchParams.get("type"); // optional filter
  const requestedBranchId = searchParams.get("branchId") ?? searchParams.get("branch_id");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    {
      allowedRoles: ["super_admin", "admin", "employee"],
      roleDeniedMessage: "عرض التقويم متاح ضمن نطاق المدرسة الحالية فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) {
    return jsonError(branchScope.message, branchScope.status);
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "calendar-events-list",
    windowMs: 60_000,
    maxHits: 120,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  // Build date range
  let startDate: string;
  let endDate: string;
  if (month) {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  } else {
    startDate = `${year}-01-01`;
    endDate = `${year}-12-31`;
  }

  const { targetSchoolId } = context.value;

  // Use the service-role client for calendar_events: the table's RLS pins
  // visibility to the user's own school, and 4/7 super_admins have school_id
  // NULL, so the anon client returned only global events for them. App-level
  // school/branch scoping below is the real boundary.
  const serviceSupabase = createServiceSupabaseClient();

  let query = serviceSupabase
    .from("calendar_events")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  // Always scope to this school: show global events OR school-specific events.
  // If a branch is requested, additionally filter branch-specific events.
  if (branchScope.value.branchId) {
    query = query.or(`is_global.eq.true,and(school_id.eq.${targetSchoolId},or(branch_id.is.null,branch_id.eq.${branchScope.value.branchId}))`);
  } else if (branchScope.value.branchIds.length > 0) {
    query = query.or(`is_global.eq.true,and(school_id.eq.${targetSchoolId},or(branch_id.is.null,branch_id.in.(${branchScope.value.branchIds.join(",")})))`);
  } else {
    query = query.or(`is_global.eq.true,school_id.eq.${targetSchoolId}`);
  }

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true, events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const context = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "إدارة التقويم متاحة للإدارة فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const rateLimited = await enforceRateLimit(req, {
    namespace: "calendar-events-create",
    windowMs: 60_000,
    maxHits: 20,
    identifier: context.value.actorUserId,
  });
  if (rateLimited) return rateLimited;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("طلب غير صالح.", 400);
  }

  const { title, title_en, date, end_date, type, hijri_date, description, color, branch_id, target_class, target_section } = body as {
    title?: string;
    title_en?: string;
    date?: string;
    end_date?: string;
    type?: string;
    hijri_date?: string;
    description?: string;
    color?: string;
    branch_id?: string;
    target_class?: string;
    target_section?: string;
  };

  if (!title || !date || !type) {
    return jsonError("الحقول المطلوبة: title, date, type.", 400);
  }

  const validTypes = ["holiday", "religious", "national", "school", "exam", "vacation", "custom"];
  if (!validTypes.includes(type)) {
    return jsonError("نوع الحدث غير صالح.", 400);
  }

  // Resolve branch scope for write — validate the requested branch_id against actor's allowed branches
  const branchScopeForWrite = resolveBranchScope(context.value, branch_id ?? null);
  if (!branchScopeForWrite.ok) {
    return jsonError(branchScopeForWrite.message, branchScopeForWrite.status);
  }

  const resolvedBranchId = resolveBranchIdForWrite(branchScopeForWrite.value, branch_id ?? null);
  if (!resolvedBranchId.ok) {
    return jsonError(resolvedBranchId.message, resolvedBranchId.status);
  }

  const { actorSupabase, targetSchoolId } = context.value;

  // Service-role for the calendar_events write (RLS would block super_admins
  // whose school_id is NULL); app-level scoping pins school_id + branch below.
  const serviceSupabase = createServiceSupabaseClient();

  const { data, error } = await serviceSupabase
    .from("calendar_events")
    .insert({
      title: String(title),
      title_en: title_en ? String(title_en) : null,
      date: String(date),
      end_date: end_date ? String(end_date) : null,
      type: String(type),
      hijri_date: hijri_date ? String(hijri_date) : null,
      description: description ? String(description) : null,
      color: color ? String(color) : null,
      school_id: targetSchoolId,
      branch_id: resolvedBranchId.value,
      is_global: false,
      is_recurring: false,
      target_class: target_class ? String(target_class) : null,
      target_section: target_section ? String(target_section) : null,
      created_by: context.value.actorUserId,
    })
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  // Auto-notify teachers and students about new event (fire-and-forget)
  const eventTypeLabels: Record<string, string> = {
    holiday: "عطلة",
    religious: "مناسبة دينية",
    national: "يوم وطني",
    school: "حدث مدرسي",
    exam: "امتحان",
    vacation: "إجازة",
    custom: "حدث",
  };
  const typeLabel = eventTypeLabels[String(type)] ?? "حدث";
  const notifTitle = `📅 ${typeLabel}: ${String(title)}`;
  const notifBody = description ? String(description) : `${typeLabel} بتاريخ ${String(date)}`;

  // Notify both teachers and students (non-blocking)
  void Promise.allSettled([
    createInsiteNotification(actorSupabase, {
      schoolId: targetSchoolId,
      branchId: resolvedBranchId.value ?? undefined,
      type: "insite",
      title: notifTitle,
      body: notifBody,
      target: { targetType: "teachers" },
      priority: type === "exam" ? "important" : "normal",
      category: "activity",
      sentByUserId: context.value.actorUserId,
    }),
    createInsiteNotification(actorSupabase, {
      schoolId: targetSchoolId,
      branchId: resolvedBranchId.value ?? undefined,
      type: "insite",
      title: notifTitle,
      body: notifBody,
      target: { targetType: "students" },
      priority: type === "exam" ? "important" : "normal",
      category: "activity",
      sentByUserId: context.value.actorUserId,
    }),
  ]).catch(() => { /* notification failure should not block event creation */ });

  return NextResponse.json({ ok: true, event: data }, { status: 201 });
}
