-- Grade entries: enforce one row per (school, student, subject, year, semester, grade_type).
--
-- Context: the Excel grade import (app/api/web/grades/import/route.ts) now creates
-- ONE grade entry per non-null component column (oral/homework/monthly/midterm/final),
-- each with its own grade_type_id and max_score. upsertGradeEntry() in
-- lib/grades/grade-entries-server.ts upserts on this natural key via
--   ON CONFLICT (school_id, student_id, subject_id, academic_year, semester, grade_type_id)
--
-- Previously NO unique constraint existed on grade_entries, so:
--   1. the old onConflict (without grade_type_id) had no backing index and always
--      hit error 42P10, silently falling back to plain INSERT (created duplicates);
--   2. multiple components for the same student/subject/semester would now collide
--      under any key that omits grade_type_id and overwrite each other.
--
-- grade_type_id is NULLABLE (synthetic-fallback imports pass NULL). A plain UNIQUE
-- index treats NULLs as distinct, which would defeat dedup for those rows, so the
-- index uses NULLS NOT DISTINCT (Postgres 15+, which all current Supabase projects
-- run). A single non-partial unique index over the exact column list is required so
-- that ON CONFLICT (column-list) inference in upsertGradeEntry() can match it — a
-- partial or expression index would NOT be inferable by that ON CONFLICT form.

-- Collapse any pre-existing duplicates before adding the index, keeping the most
-- recently updated row for each natural key (NULL grade_type_id grouped together).
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        school_id,
        student_id,
        subject_id,
        academic_year,
        semester,
        grade_type_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.grade_entries
)
DELETE FROM public.grade_entries g
USING ranked r
WHERE g.id = r.id
  AND r.rn > 1;

-- Unique index backing the upsert's ON CONFLICT target. NULLS NOT DISTINCT makes a
-- NULL grade_type_id behave as a single value so synthetic-fallback rows still dedup.
CREATE UNIQUE INDEX IF NOT EXISTS uq_grade_entries_natural_key
  ON public.grade_entries (
    school_id,
    student_id,
    subject_id,
    academic_year,
    semester,
    grade_type_id
  )
  NULLS NOT DISTINCT;
