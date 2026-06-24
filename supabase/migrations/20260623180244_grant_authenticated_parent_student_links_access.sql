-- Data API object privileges are required before the existing admin/parent
-- RLS policies can authorize individual rows.
GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.parent_student_links
TO authenticated;
