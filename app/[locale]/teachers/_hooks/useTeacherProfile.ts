"use client";
import { useState, useEffect, useCallback } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import type { TeacherRecord } from "../_types";

export type TeacherScheduleEntry = {
  id: string;
  day: string;
  period: number;
  subject: string | null;
  class: string | null;
  section: string | null;
  room: string | null;
};

export type TeacherSalaryEntry = {
  id: string;
  month: string;
  gross_salary: number;
  deductions: number;
  is_paid: boolean;
};

export type TeacherLeave = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string | null;
  status: string;
  created_at: string;
};

export type TeacherEvaluation = {
  id: string;
  evaluation_date: string;
  overall_score: number | null;
  overall_grade: string | null;
  discipline_score: number | null;
  curriculum_score: number | null;
  student_results_score: number | null;
  cooperation_score: number | null;
  notes: string | null;
  created_at: string;
};

export function useTeacherProfile(teacherId: string, schoolId: string | null) {
  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [schedule, setSchedule] = useState<TeacherScheduleEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [salaries, setSalaries] = useState<TeacherSalaryEntry[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);

  const [leaves, setLeaves] = useState<TeacherLeave[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);

  const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>([]);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);

  const fetchTeacher = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; teacher: TeacherRecord; message?: string }>(
        `/api/web/teachers/${teacherId}?schoolId=${schoolId}`
      );
      if (response.ok && payload?.ok) {
        setTeacher(payload.teacher);
      } else {
        setError(payload?.message || "تعذر تحميل بيانات المعلم");
      }
    } catch {
      setError("تعذر تحميل بيانات المعلم");
    } finally {
      setLoading(false);
    }
  }, [teacherId, schoolId]);

  const fetchSchedule = useCallback(async () => {
    if (!schoolId) return;
    setScheduleLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; schedule: TeacherScheduleEntry[] }>(
        `/api/web/teachers/${teacherId}/schedule?schoolId=${schoolId}`
      );
      if (response.ok && payload?.ok) {
        setSchedule(payload.schedule ?? []);
      }
    } finally {
      setScheduleLoading(false);
    }
  }, [teacherId, schoolId]);

  const fetchSalaries = useCallback(async () => {
    if (!schoolId) return;
    setSalaryLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; salaries: TeacherSalaryEntry[] }>(
        `/api/web/teachers/${teacherId}/salary?schoolId=${schoolId}`
      );
      if (response.ok && payload?.ok) {
        setSalaries(payload.salaries ?? []);
      }
    } finally {
      setSalaryLoading(false);
    }
  }, [teacherId, schoolId]);

  const fetchLeaves = useCallback(async () => {
    if (!schoolId) return;
    setLeavesLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; leaves: TeacherLeave[] }>(
        `/api/web/teachers/${teacherId}/leaves?schoolId=${schoolId}`
      );
      if (response.ok && payload?.ok) {
        setLeaves(payload.leaves ?? []);
      }
    } finally {
      setLeavesLoading(false);
    }
  }, [teacherId, schoolId]);

  const fetchEvaluations = useCallback(async () => {
    if (!schoolId) return;
    setEvaluationsLoading(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; evaluations: TeacherEvaluation[] }>(
        `/api/web/teachers/${teacherId}/evaluations?schoolId=${schoolId}`
      );
      if (response.ok && payload?.ok) {
        setEvaluations(payload.evaluations ?? []);
      }
    } finally {
      setEvaluationsLoading(false);
    }
  }, [teacherId, schoolId]);

  const updateTeacher = useCallback(async (updates: Partial<TeacherRecord>) => {
    if (!schoolId || !teacher) throw new Error("no context");
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; teacher: TeacherRecord; message?: string }>(
      `/api/web/teachers/${teacherId}`,
      { method: "PATCH", headers: withJsonHeaders(), body: JSON.stringify({ ...updates, school_id: schoolId }) }
    );
    if (!response.ok || !payload?.ok) throw new Error(payload?.message || "تعذر التحديث");
    setTeacher(payload.teacher);
    return payload.teacher;
  }, [teacherId, schoolId, teacher]);

  useEffect(() => { void fetchTeacher(); }, [fetchTeacher]);

  return {
    teacher,
    loading,
    error,
    refetch: fetchTeacher,
    updateTeacher,
    schedule,
    scheduleLoading,
    fetchSchedule,
    salaries,
    salaryLoading,
    fetchSalaries,
    leaves,
    leavesLoading,
    fetchLeaves,
    evaluations,
    evaluationsLoading,
    fetchEvaluations,
  };
}
