-- Fix RLS policies for attendance tables that have RLS enabled but zero policies.
-- With RLS enabled and no policies, all access is blocked for every role.
-- Pattern: service_role bypasses RLS entirely (app does all filtering server-side),
-- authenticated users may SELECT rows scoped to their own school_id via JWT claim.

-- ============================================================
-- attendance_audit_log
-- ============================================================
CREATE POLICY "service_role_all" ON attendance_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_school_select" ON attendance_audit_log
  FOR SELECT TO authenticated
  USING (school_id = (SELECT (auth.jwt() ->> 'school_id')::uuid));

-- ============================================================
-- attendance_qr_codes
-- ============================================================
CREATE POLICY "service_role_all" ON attendance_qr_codes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_school_select" ON attendance_qr_codes
  FOR SELECT TO authenticated
  USING (school_id = (SELECT (auth.jwt() ->> 'school_id')::uuid));

-- ============================================================
-- attendance_settings
-- ============================================================
CREATE POLICY "service_role_all" ON attendance_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_school_select" ON attendance_settings
  FOR SELECT TO authenticated
  USING (school_id = (SELECT (auth.jwt() ->> 'school_id')::uuid));
