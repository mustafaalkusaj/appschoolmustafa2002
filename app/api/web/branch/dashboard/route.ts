import { NextRequest, NextResponse } from "next/server";
import { applyBranchScopeToQuery, resolveBranchScope } from "@/lib/branch-scope";
import { resolveSchoolScopedActorContext } from "@/lib/managed-users-server";
import { jsonError } from "@/lib/route-utils";
import { getRecentAuditLogs } from "@/lib/audit/audit-log";

export async function GET(req: NextRequest) {
  const schoolId = req.nextUrl.searchParams.get("schoolId");

  const context = await resolveSchoolScopedActorContext(
    schoolId,
    { allowedRoles: ["super_admin", "admin", "employee"], roleDeniedMessage: "غير مصرح بالوصول لبيانات الفرع." },
    req.headers.get("authorization"),
  );
  if (!context.ok) {
    return jsonError(
      "message" in context ? context.message : "تعذر التحقق من الصلاحيات.",
      "status" in context ? context.status : 500,
    );
  }

  const { targetSchoolId, actorBranchId, actorSupabase } = context.value;
  const requestedBranchId = req.nextUrl.searchParams.get("branchId");
  const branchScope = resolveBranchScope(context.value, requestedBranchId);
  if (!branchScope.ok) return jsonError(branchScope.message, branchScope.status);

  const effectiveBranchId = branchScope.value.branchId ?? actorBranchId;
  const db = actorSupabase;

  // ── Parallel fetches ─────────────────────────────────────────────────────

  const [teachersResult, studentsResult, paymentsResult, expensesResult, classesResult] =
    await Promise.all([
      // Teachers for this branch
      applyBranchScopeToQuery(
        db
          .from("teachers")
          .select("id, full_name, subject, salary_type, app_status, hire_date, contract_type"),
        branchScope.value,
      )
        .eq("school_id", targetSchoolId)
        .neq("status", "deleted"),

      // Students counts by status
      applyBranchScopeToQuery(
        db.from("students").select("status"),
        branchScope.value,
      ).eq("school_id", targetSchoolId).neq("status", "deleted"),

      // Recent payments
      (() => {
        let q = db
          .from("payments")
          .select("id, amount, created_at, student_id, students(full_name, class_name)")
          .eq("school_id", targetSchoolId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (effectiveBranchId) q = q.eq("branch_id", effectiveBranchId);
        return q;
      })(),

      // Expenses this month
      (() => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        let q = db
          .from("expenses")
          .select("amount")
          .eq("school_id", targetSchoolId)
          .gte("created_at", monthStart);
        if (effectiveBranchId) q = q.eq("branch_id", effectiveBranchId);
        return q;
      })(),

      // Classes (branch-scoped)
      applyBranchScopeToQuery(
        db.from("classes").select("id, name, grade, section"),
        branchScope.value,
      )
        .eq("school_id", targetSchoolId)
        .order("grade")
        .order("name"),
    ]);

  // ── Process teachers by subject ──────────────────────────────────────────

  type TeacherRow = {
    id: string;
    full_name: string | null;
    subject: string | null;
    salary_type: string | null;
    app_status: string | null;
    hire_date: string | null;
    contract_type: string | null;
  };

  const teachers = (teachersResult.data ?? []) as TeacherRow[];

  const subjectMap = new Map<string, TeacherRow[]>();
  for (const t of teachers) {
    const key = t.subject?.trim() || "غير محدد";
    const list = subjectMap.get(key) ?? [];
    list.push(t);
    subjectMap.set(key, list);
  }

  const bySubject = Array.from(subjectMap.entries())
    .map(([subject, list]) => ({
      subject,
      count: list.length,
      teachers: list.map((t) => ({
        id: t.id,
        full_name: t.full_name ?? "—",
        salary_type: t.salary_type,
        app_status: t.app_status,
        hire_date: t.hire_date,
        contract_type: t.contract_type,
      })),
    }))
    .sort((a, b) => b.count - a.count);

  // ── Process students ─────────────────────────────────────────────────────

  type StudentRow = { status: string | null };
  const students = (studentsResult.data ?? []) as StudentRow[];
  const ACTIVE_STATUSES = ["active", "graduated", "suspended", "withdrawn"];
  const activeCount = students.filter((s) => ACTIVE_STATUSES.includes(s.status ?? "")).length;
  const transferredCount = students.filter((s) => s.status === "transferred").length;

  // ── Process finance ──────────────────────────────────────────────────────

  const expensesThisMonth = ((expensesResult.data ?? []) as { amount: number }[]).reduce(
    (sum, e) => sum + (e.amount ?? 0),
    0,
  );

  // ── Process recent payments ──────────────────────────────────────────────

  type PaymentRow = {
    id: string;
    amount: number | null;
    created_at: string | null;
    student_id: string | null;
    students: { full_name: string | null; class_name: string | null } | null;
  };
  const recentPayments = ((paymentsResult.data ?? []) as unknown as PaymentRow[]).map((p) => ({
    id: p.id,
    amount: p.amount ?? 0,
    created_at: p.created_at,
    student_name: p.students?.full_name ?? null,
    class_name: p.students?.class_name ?? null,
  }));

  // ── Process classes ──────────────────────────────────────────────────────

  type ClassRow = { id: string; name: string | null; grade: number | null; section: string | null };
  const classes = (classesResult.data ?? []) as unknown as ClassRow[];

  const classesList = classes.map((c) => ({
    id: c.id,
    name: c.name ?? `الصف ${c.grade ?? ""}${c.section ? ` - ${c.section}` : ""}`,
    grade: c.grade,
    section: c.section,
  }));

  // ── Activity logs ────────────────────────────────────────────────────────

  // Fetch by branch_id first; fall back to school_id (many logs don't carry branch_id)
  let activityLogs = effectiveBranchId
    ? await getRecentAuditLogs({ branch_id: effectiveBranchId, limit: 30 }).catch(() => [])
    : [];
  if (activityLogs.length === 0) {
    activityLogs = await getRecentAuditLogs({ school_id: targetSchoolId, limit: 30 }).catch(() => []);
  }

  // ── Response ─────────────────────────────────────────────────────────────

  return NextResponse.json({
    ok: true,
    stats: {
      students: {
        total: activeCount + transferredCount,
        active: activeCount,
        transferred: transferredCount,
      },
      teachers: {
        total: teachers.length,
        by_subject: bySubject,
      },
      classes: {
        total: classes.length,
      },
      finance: {
        expenses_this_month: expensesThisMonth,
      },
    },
    recent_payments: recentPayments,
    classes: classesList,
    activity_logs: activityLogs,
  });
}
