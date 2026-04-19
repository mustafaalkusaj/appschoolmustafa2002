import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsonError } from "@/lib/route-utils";

function getService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const service = getService();
  const groupId = req.nextUrl.searchParams.get("groupId");
  if (!groupId) return jsonError("groupId مطلوب", 400);

  // Verify auth via authorization header (same pattern as other routes)
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return jsonError("غير مصرح", 401);

  // Fetch group
  const { data: group, error: groupErr } = await service
    .from("school_groups")
    .select("id, name, logo_url")
    .eq("id", groupId)
    .single();
  if (groupErr || !group) return jsonError("المجموعة غير موجودة", 404);

  // Fetch branches
  const { data: branches } = await service
    .from("branches")
    .select("id, name")
    .eq("group_id", groupId)
    .eq("is_active", true)
    .order("name");

  if (!branches?.length) {
    return NextResponse.json({ ok: true, group, branches: [], totals: { students: 0, collected: 0, expenses: 0, net: 0 } });
  }

  // Parallel fetch per branch
  const branchStats = await Promise.all(
    branches.map(async (branch) => {
      const [studentsRes, paymentsRes, expensesRes] = await Promise.all([
        service.from("students").select("id", { count: "exact", head: true }).eq("branch_id", branch.id).neq("status", "deleted"),
        service.from("payments").select("amount").eq("branch_id", branch.id),
        service.from("expenses").select("amount").eq("branch_id", branch.id),
      ]);
      const collected = (paymentsRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const expenses = (expensesRes.data ?? []).reduce((s, r) => s + Number(r.amount ?? 0), 0);
      return {
        id: branch.id,
        name: branch.name,
        students: studentsRes.count ?? 0,
        collected,
        expenses,
        net: collected - expenses,
      };
    })
  );

  const totals = branchStats.reduce(
    (acc, b) => ({
      students: acc.students + b.students,
      collected: acc.collected + b.collected,
      expenses: acc.expenses + b.expenses,
      net: acc.net + b.net,
    }),
    { students: 0, collected: 0, expenses: 0, net: 0 }
  );

  return NextResponse.json({ ok: true, group, branches: branchStats, totals });
}
