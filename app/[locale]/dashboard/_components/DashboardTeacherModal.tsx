"use client";

import { useState } from "react";
import { TeacherFormModal } from "@/app/[locale]/teachers/_components/TeacherFormModal";
import type { TeacherFormData } from "@/app/[locale]/teachers/_types";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

interface DashboardTeacherModalProps {
  show: boolean;
  schoolId: string | null;
  branchId?: string | null;
  locale: "ar" | "en";
  onClose: () => void;
  onSuccess: () => void;
}

export function DashboardTeacherModal({ show, schoolId, branchId, locale, onClose, onSuccess }: DashboardTeacherModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async (form: TeacherFormData & { photo?: string }) => {
    if (!schoolId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuthorizedSession("/api/web/teachers", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({ ...form, school_id: schoolId, branch_id: branchId ?? null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setError(data?.error?.message || "فشل الحفظ");
        return;
      }
      onClose();
      onSuccess();
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeacherFormModal
      show={show}
      editing={null}
      loading={loading}
      error={error}
      onConfirm={handleConfirm}
      onClose={() => { setError(""); onClose(); }}
      locale={locale}
    />
  );
}
