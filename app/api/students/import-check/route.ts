import { NextRequest, NextResponse } from "next/server";

import {
  buildDuplicateStudentNameMessage,
  collectDuplicateStudentNames,
  findExistingDuplicateStudentNames,
} from "@/lib/students/import-dedup";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users/context";
import { enforceRateLimit } from "@/lib/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

export async function POST(request: NextRequest) {
  const rateLimited = await enforceRateLimit(request, {
    namespace: "students-import-check",
    windowMs: 60_000,
    maxHits: 24,
  });
  if (rateLimited) {
    return rateLimited;
  }

  const actorContext = await resolveSchoolScopedActorContext(
    null,
    {
      allowedRoles: ["admin", "super_admin"],
      roleDeniedMessage: "فحص استيراد الطلاب متاح لمدير المدرسة فقط.",
    },
    request.headers.get("authorization"),
  );

  if (!actorContext.ok) {
    return jsonError(actorContext.message, actorContext.status);
  }

  const body = (await request.json().catch(() => null)) as { names?: unknown } | null;
  const names = Array.isArray(body?.names)
    ? body.names.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  if (names.length === 0) {
    return jsonError("لم يتم إرسال أسماء صالحة لفحص التكرار.", 400);
  }

  const fileDuplicates = collectDuplicateStudentNames(names.map((fullName) => ({ fullName })));
  if (fileDuplicates.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        fileDuplicates,
        existingDuplicates: [],
        message: buildDuplicateStudentNameMessage({ fileDuplicates }),
      },
      { status: 409 },
    );
  }

  const { actorSupabase, targetSchoolId } = actorContext.value;
  const { data, error } = await actorSupabase
    .from("students")
    .select("full_name, status")
    .eq("school_id", targetSchoolId)
    .neq("status", "deleted");

  if (error) {
    return jsonError(error.message || "تعذر فحص تكرار أسماء الطلاب.", 500);
  }

  const existingDuplicates = findExistingDuplicateStudentNames(
    names,
    ((data ?? []) as Array<Record<string, unknown>>).map((row) =>
      typeof row.full_name === "string" ? row.full_name : null,
    ),
  );

  if (existingDuplicates.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        fileDuplicates: [],
        existingDuplicates,
        message: buildDuplicateStudentNameMessage({ existingDuplicates }),
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    fileDuplicates: [],
    existingDuplicates: [],
  });
}
