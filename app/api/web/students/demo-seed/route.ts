import { NextRequest, NextResponse } from "next/server";

import { resolveSchoolBranchId, resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { StudentStatus } from "@/types/student";

const DEFAULT_TARGET_COUNT = 30_000;
const MAX_TARGET_COUNT = 30_000;
const INSERT_BATCH_SIZE = 1_000;
const DEMO_ADDRESS_MARKER = "بيانات تجريبية مولدة تلقائياً";
const CLASS_NAMES = [
  "الصف الأول",
  "الصف الثاني",
  "الصف الثالث",
  "الصف الرابع",
  "الصف الخامس",
  "الصف السادس",
  "الصف السابع",
  "الصف الثامن",
  "الصف التاسع",
  "الصف العاشر",
  "الصف الحادي عشر",
  "الصف الثاني عشر",
];
const SECTION_NAMES = ["أ", "ب", "ج", "د", "هـ"];
const DEMO_STATUSES: StudentStatus[] = ["active", "active", "active", "graduated", "archived", "withdrawn"];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

function normalizeTargetCount(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_TARGET_COUNT;
  }

  return Math.min(MAX_TARGET_COUNT, Math.max(1_000, parsed));
}

function padSerial(value: number) {
  return String(value).padStart(5, "0");
}

function buildDemoStudents(options: {
  schoolId: string;
  branchId: string | null;
  startIndex: number;
  count: number;
}) {
  return Array.from({ length: options.count }, (_, index) => {
    const serial = options.startIndex + index;
    const classIndex = serial % CLASS_NAMES.length;
    const sectionIndex = serial % SECTION_NAMES.length;
    const totalFee = 250_000 + classIndex * 20_000 + (serial % 5) * 15_000;
    const discountValue = serial % 8 === 0 ? 25_000 : serial % 5 === 0 ? 10_000 : 0;
    const netFee = Math.max(0, totalFee - discountValue);
    const paidRatio = (serial % 6) / 5;
    const paidFee = Math.min(netFee, Math.round(netFee * paidRatio));

    return {
      school_id: options.schoolId,
      branch_id: options.branchId,
      full_name: `طالب تجريبي ${padSerial(serial)}`,
      class_name: CLASS_NAMES[classIndex],
      section: SECTION_NAMES[sectionIndex],
      phone: `07${String(900_000_000 + serial).slice(-9)}`,
      address: DEMO_ADDRESS_MARKER,
      total_fee: totalFee,
      paid_fee: paidFee,
      discount_value: discountValue,
      status: DEMO_STATUSES[serial % DEMO_STATUSES.length],
    };
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const requestedSchoolId = typeof body?.schoolId === "string" ? body.schoolId : null;
  const targetCount = normalizeTargetCount(body?.targetCount);

  const context = await resolveSchoolScopedActorContext(
    requestedSchoolId,
    {
      allowedRoles: ["super_admin", "admin"],
      roleDeniedMessage: "توليد البيانات التجريبية متاح للمدير فقط.",
    },
    req.headers.get("authorization"),
  );

  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من صلاحيات المستخدم.",
      "status" in context ? context.status : 500,
    );
  }

  const { actorSupabase, targetSchoolId } = context.value;
  const branchId = await resolveSchoolBranchId(actorSupabase, targetSchoolId).catch(() => null);
  const serviceSupabase = createServiceSupabaseClient();

  const { count: existingDemoCount, error: countError } = await serviceSupabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", targetSchoolId)
    .eq("address", DEMO_ADDRESS_MARKER);

  if (countError) {
    return jsonError(countError.message || "تعذر حساب السجلات التجريبية الحالية.", 500);
  }

  const existingCount = existingDemoCount ?? 0;
  const missingCount = Math.max(0, targetCount - existingCount);

  if (missingCount === 0) {
    return NextResponse.json({
      ok: true,
      createdCount: 0,
      totalDemoStudents: existingCount,
      targetCount,
      message: `المدرسة الحالية تحتوي بالفعل على ${existingCount.toLocaleString("en-US")} طالب تجريبي.`,
    });
  }

  for (let offset = 0; offset < missingCount; offset += INSERT_BATCH_SIZE) {
    const batchCount = Math.min(INSERT_BATCH_SIZE, missingCount - offset);
    const batch = buildDemoStudents({
      schoolId: targetSchoolId,
      branchId,
      startIndex: existingCount + offset + 1,
      count: batchCount,
    });

    const { error } = await serviceSupabase.from("students").insert(batch);
    if (error) {
      return jsonError(error.message || "تعذر إنشاء البيانات التجريبية.", 500);
    }
  }

  return NextResponse.json({
    ok: true,
    createdCount: missingCount,
    totalDemoStudents: existingCount + missingCount,
    targetCount,
    message: `تم توليد ${missingCount.toLocaleString("en-US")} طالب تجريبي للمدرسة الحالية.`,
  });
}
