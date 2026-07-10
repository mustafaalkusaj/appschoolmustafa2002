-- H15: Version-controlled RLS helper functions + C4 permissions_version trigger
-- These functions already exist in the live DB; this migration ensures they are
-- tracked in source control and can be recreated from scratch.

CREATE OR REPLACE FUNCTION public.current_app_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT role FROM public.user_profiles WHERE id = (SELECT auth.uid()) LIMIT 1),
    (SELECT role FROM public.managed_user_profiles WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.current_school_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT school_id FROM public.user_profiles WHERE id = (SELECT auth.uid()) LIMIT 1),
    (SELECT school_id FROM public.managed_user_profiles WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.current_user_can_access_branch(p_branch_id uuid, p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_branch_id IS NULL THEN
      (current_app_role() = 'super_admin' OR current_school_id() = p_school_id)
    WHEN current_app_role() = 'super_admin' THEN true
    WHEN current_school_id() IS DISTINCT FROM p_school_id THEN false
    WHEN EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND branch_id = p_branch_id
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM admin_branch_scopes
      WHERE user_id = (SELECT auth.uid())
        AND school_id = p_school_id
        AND branch_id = p_branch_id
    ) THEN true
    WHEN (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = (SELECT auth.uid()) AND branch_id IS NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM admin_branch_scopes
        WHERE user_id = (SELECT auth.uid()) AND school_id = p_school_id
      )
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM managed_user_profiles
      WHERE auth_user_id = (SELECT auth.uid())
        AND school_id = p_school_id
        AND (branch_id = p_branch_id OR branch_id IS NULL)
    ) THEN true
    ELSE false
  END
$function$;

CREATE OR REPLACE FUNCTION public.current_teacher_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT teacher_id FROM public.managed_user_profiles
  WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1;
$function$;

-- C4: Auto-bump permissions_version when school_role_id changes
CREATE OR REPLACE FUNCTION public.bump_permissions_version_on_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.school_role_id IS DISTINCT FROM NEW.school_role_id THEN
    NEW.permissions_version := COALESCE(OLD.permissions_version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_bump_permissions_version ON user_profiles;
CREATE TRIGGER trg_bump_permissions_version
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION bump_permissions_version_on_role_change();
