import { NextResponse } from "next/server";

import { createServiceSupabaseClient } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared server helpers for the school-transport module.
 *
 * The database deliberately gives the `driver` role almost nothing:
 * current_school_id() returns null for it, so every school-scoped policy in the
 * platform denies it, and it cannot even read public.students. That is the
 * safety property we want — a driver's phone must not be a key to the school's
 * data — but it means the driver's own screens cannot query Supabase directly
 * with his session. Instead these routes authorise him against public.drivers
 * and then read with the service client, exactly like the reports routes do.
 */

export type DriverContext = {
  driverId: string;
  schoolId: string;
  branchId: string | null;
  fullName: string;
  service: SupabaseClient;
};

export function transportError(message: string, status: number) {
  return NextResponse.json({ error: { message } }, { status });
}

/**
 * Resolve the signed-in user to an active driver row.
 *
 * Returns null when the caller is not a driver, is suspended, or was soft
 * deleted — callers must treat that as 403, never as "empty data".
 */
export async function resolveDriverContext(
  userId: string | null | undefined,
): Promise<DriverContext | null> {
  if (!userId) return null;

  const service = createServiceSupabaseClient();
  const { data, error } = await service
    .from("drivers")
    .select("id, school_id, branch_id, full_name, status, deleted_at")
    .eq("user_profile_id", userId)
    .is("deleted_at", null)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;

  return {
    driverId: data.id as string,
    schoolId: data.school_id as string,
    branchId: (data.branch_id as string | null) ?? null,
    fullName: (data.full_name as string) ?? "",
    service,
  };
}

/** Route ids the driver is responsible for right now (own + backup). */
export async function loadDriverRouteIds(ctx: DriverContext): Promise<string[]> {
  const { data } = await ctx.service
    .from("bus_routes")
    .select("id")
    .eq("school_id", ctx.schoolId)
    .is("deleted_at", null)
    .eq("is_active", true)
    .or(`driver_id.eq.${ctx.driverId},backup_driver_id.eq.${ctx.driverId}`);

  return (data ?? []).map((row) => row.id as string);
}

/** Baghdad-local calendar day; trips are keyed on it, not on UTC. */
export function baghdadToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Baghdad",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Sum a numeric column across rows in JS.
 *
 * PostgREST aggregate functions are disabled on this project (PGRST123), so
 * `.sum()` silently fails and every total renders as zero — that exact bug
 * shipped on the reports page. Never reintroduce it here.
 */
export function sumBy<T>(rows: T[], pick: (row: T) => number | null | undefined) {
  return rows.reduce<number>((total, row) => total + Number(pick(row) ?? 0), 0);
}
