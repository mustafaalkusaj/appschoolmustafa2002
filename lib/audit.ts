import { supabase } from "./supabase";
import { isMissingTableError } from "./admin-infrastructure";

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "restore"
  | "login" 
  | "logout" 
  | "role_change" 
  | "subscription_renew"
  | "export"
  | "import";

export type EntityType = 
  | "school" 
  | "user" 
  | "subscription" 
  | "student" 
  | "payment" 
  | "expense" 
  | "branch"
  | "role";

export interface AuditLogPayload {
  action_type: AuditAction;
  entity_type: EntityType;
  entity_id?: string;
  summary: string;
  metadata?: Record<string, any>;
}

/**
 * Logs an action to the audit_logs table.
 * Can be called from client or server components.
 * Note: actor_id, ip_address, etc. should ideally be handled by a database trigger or server-side logic
 * for maximum security, but for now we'll pass what we can.
 */
export async function logAction(payload: AuditLogPayload) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    const { error } = await supabase.from("audit_logs").insert({
      actor_id: user?.id,
      actor_email: user?.email,
      actor_name: user?.user_metadata?.full_name || user?.email,
      action_type: payload.action_type,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      summary: payload.summary,
      metadata: payload.metadata || {},
    });

    if (error && !isMissingTableError(error, "audit_logs")) {
      console.error("Failed to log audit action:", error);
    }
  } catch (err) {
    console.error("Audit log error:", err);
  }
}
