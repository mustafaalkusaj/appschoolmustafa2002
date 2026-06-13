-- Migration 000011: Fix SECURITY DEFINER warnings
-- Action: revoke EXECUTE on soft_delete_entity from authenticated
-- (trigger-only function, not meant to be called via REST API)
-- Remaining SECURITY DEFINER functions are intentional:
--   current_app_role, current_school_id, get_current_user_school_id,
--   current_user_can_access_branch — used inside RLS policies
--   create_payment_atomic, soft_delete_student, log_audit_action,
--   can_manage_logo_bucket_object — called from server-side API routes

REVOKE EXECUTE ON FUNCTION public.soft_delete_entity() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_entity() FROM anon;
