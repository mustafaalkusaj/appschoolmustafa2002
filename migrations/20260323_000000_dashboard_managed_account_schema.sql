DO $$
BEGIN
  IF to_regprocedure('public.current_app_role()') IS NOT NULL
     AND to_regprocedure('public.current_school_id()') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS managed_user_profiles_admin_manage_policy ON public.managed_user_profiles';
    EXECUTE $policy$
      CREATE POLICY managed_user_profiles_admin_manage_policy
      ON public.managed_user_profiles
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS managed_user_credentials_admin_manage_policy ON public.managed_user_credentials';
    EXECUTE $policy$
      CREATE POLICY managed_user_credentials_admin_manage_policy
      ON public.managed_user_credentials
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
    $policy$;
  END IF;
END
$$;