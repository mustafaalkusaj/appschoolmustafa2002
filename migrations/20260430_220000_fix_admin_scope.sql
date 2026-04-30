-- Fix admin user scope to allow group-level access
-- Update all admin users to have group_admin scope instead of branch scope

UPDATE public.user_profiles
SET
  scope = 'group',
  scope_level = 'group_admin',
  branch_id = NULL
WHERE
  role = 'admin'
  AND (scope != 'group' OR scope_level IS NULL OR branch_id IS NOT NULL);

