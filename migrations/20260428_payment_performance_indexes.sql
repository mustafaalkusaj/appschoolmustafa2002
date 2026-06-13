-- Migration: Add compound indexes for payment save operation optimization
-- Date: 2026-04-28
-- Purpose: Reduce payment save latency from ~800ms to <800ms (target: <500ms)
-- Estimated impact: -50ms (5-10% improvement)

-- Index for student lookups by school (used in payment save flow)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_school_id
ON students(school_id)
WHERE status IS NOT NULL;

-- Index for payment lookups by student + school (used in authoritative fee calculation)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_student_school
ON payments(student_id, school_id);

-- Index for dashboard overview queries (school_id + date ordering)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_school_date
ON payments(school_id, created_at DESC);
