import "server-only";
import { createServiceSupabaseClient } from "@/lib/supabase-server";

export type AuditLogInput = {
  actor_user_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  actor_source?: "app" | "telegram_ops_bot" | "api";
  action_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  summary?: string | null;
  school_id?: string | null;
  branch_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  // never throws — fire and forget
  try {
    const supabase = createServiceSupabaseClient();
    await supabase.from("audit_logs").insert({
      actor_user_id: input.actor_user_id ?? null,
      actor_name: input.actor_name ?? null,
      actor_email: input.actor_email ?? null,
      actor_role: input.actor_role ?? null,
      actor_source: input.actor_source ?? "app",
      action_type: input.action_type,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      summary: input.summary ?? null,
      school_id: input.school_id ?? null,
      branch_id: input.branch_id ?? null,
      ip_address: input.ip_address ?? null,
      user_agent: input.user_agent ? input.user_agent.slice(0, 500) : null,
      metadata: maskAuditMetadata(input.metadata ?? {}),
    });
  } catch {
    // swallow — audit log must not break the main flow
  }
}

// Strip sensitive keys from metadata before storing
export function maskAuditMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const SENSITIVE_KEYS = /password|token|secret|key|authorization|bearer/i;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.test(k)) {
      result[k] = "[redacted]";
    } else if (typeof v === "string" && v.length > 500) {
      result[k] = v.slice(0, 500) + "…";
    } else {
      result[k] = v;
    }
  }
  return result;
}

export async function getRecentAuditLogs(
  opts: {
    limit?: number;
    action_type?: string;
    entity_type?: string;
    school_id?: string;
  } = {},
): Promise<Array<Record<string, unknown>>> {
  try {
    const supabase = createServiceSupabaseClient();
    let q = supabase
      .from("audit_logs")
      .select(
        "id, created_at, actor_name, actor_email, actor_role, actor_source, action_type, entity_type, entity_id, summary, school_id, branch_id, metadata",
      )
      .order("created_at", { ascending: false })
      .limit(opts.limit ?? 20);

    if (opts.action_type) q = q.eq("action_type", opts.action_type);
    if (opts.entity_type) q = q.eq("entity_type", opts.entity_type);
    if (opts.school_id) q = q.eq("school_id", opts.school_id);

    const { data } = await q;
    return (data ?? []) as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}
