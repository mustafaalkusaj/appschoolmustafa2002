"use client";

import { useState, useCallback } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { resolveSchoolBranchForProfile } from "@/lib/school/context";
import type { UserProfile } from "@/lib/auth";
import { ClassFee, FeeFormData } from "../_components/types";
import {
  getDashboardRecordValueByName,
  hasDuplicateDashboardFeeClass,
  normalizeDashboardEntityKey,
  resolveCanonicalDashboardClassName,
} from "./dashboardManagement";

interface UseFeeManagementProps {
  profile: UserProfile | null;
  selectedSchoolId: string | null;
  classFees: ClassFee[];
  studentCountByClass: Record<string, number>;
  availableClassNames: string[];
  onRefetch: () => Promise<void>;
  branchScoped?: boolean;
}

interface FeeMutationResponse {
  existingFee?: ClassFee | null;
  error?: { message?: string };
}

function resolveApiErrorMessage(
  payload: FeeMutationResponse | null,
  fallback: string,
) {
  return payload?.error?.message || fallback;
}

export function useFeeManagement({
  profile,
  selectedSchoolId,
  classFees,
  studentCountByClass,
  availableClassNames,
  onRefetch,
  branchScoped = false,
}: UseFeeManagementProps) {
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeForm, setFeeForm] = useState<FeeFormData>({
    class_name: "",
    total_fee: "",
    installments: "4",
    notes: "",
  });
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeError, setFeeError] = useState("");
  const [feeSuccess, setFeeSuccess] = useState("");
  const [editingFee, setEditingFee] = useState<ClassFee | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleSaveFee = useCallback(async () => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const canonicalClassName = resolveCanonicalDashboardClassName(feeForm.class_name, availableClassNames);

    setFeeError("");
    setFeeSuccess("");

    if (!canonicalClassName) {
      setFeeError("يرجى إدخال اسم الصف");
      return;
    }

    if (!feeForm.total_fee || isNaN(Number(feeForm.total_fee)) || Number(feeForm.total_fee) <= 0) {
      setFeeError("يرجى إدخال المبلغ الكلي بشكل صحيح");
      return;
    }

    if (!schoolId) {
      setFeeError("لا يمكن تحديد المدرسة الحالية");
      return;
    }

    const installments = parseInt(feeForm.installments, 10) || 1;
    const totalFee = parseFloat(feeForm.total_fee);

    setFeeLoading(true);

    try {
      if (!editingFee && hasDuplicateDashboardFeeClass(classFees, canonicalClassName)) {
        const duplicatedFee =
          classFees.find((fee) => normalizeDashboardEntityKey(fee.class_name) === normalizeDashboardEntityKey(canonicalClassName)) ?? null;

        if (duplicatedFee) {
          setEditingFee(duplicatedFee);
          setFeeForm({
            class_name: duplicatedFee.class_name,
            total_fee: String(duplicatedFee.total_fee),
            installments: String(duplicatedFee.installments),
            notes: duplicatedFee.notes || "",
          });
          setFeeError("هذا الصف لديه قسط محفوظ مسبقاً. تم فتح السجل الحالي للتعديل.");
          return;
        }
      }

      const { response, payload } = await fetchJsonWithAuthorizedSession<FeeMutationResponse>(
        "/api/web/dashboard/class-fees",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            action: "save",
            school_id: schoolId,
            branch_id: branchId,
            branch_scoped: branchScoped,
            fee_id: editingFee?.id ?? null,
            class_name: canonicalClassName,
            total_fee: totalFee,
            installments,
            notes: feeForm.notes.trim(),
          }),
        },
      );

      if (response.status === 409) {
        const duplicatedFee = payload?.existingFee ?? null;
        await onRefetch().catch(() => undefined);
        if (duplicatedFee) {
          setEditingFee(duplicatedFee);
          setFeeForm({
            class_name: duplicatedFee.class_name,
            total_fee: String(duplicatedFee.total_fee),
            installments: String(duplicatedFee.installments),
            notes: duplicatedFee.notes || "",
          });
        }
        setFeeError(resolveApiErrorMessage(payload ?? null, "هذا الصف لديه قسط محفوظ مسبقاً."));
        return;
      }

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(payload ?? null, "حدث خطأ أثناء الحفظ."));
      }

      setFeeSuccess(editingFee ? "تم تعديل سعر القسط بنجاح ✓" : "تم حفظ سعر القسط بنجاح ✓");
      await onRefetch();
      setFeeForm((current) => ({ ...current, class_name: canonicalClassName }));
      setTimeout(() => {
        setFeeSuccess("");
        setShowFeeModal(false);
        setEditingFee(null);
        setFeeForm({ class_name: "", total_fee: "", installments: "4", notes: "" });
      }, 1200);
    } catch (error) {
      setFeeError(error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ.");
    } finally {
      setFeeLoading(false);
    }
  }, [availableClassNames, branchScoped, classFees, editingFee, feeForm, onRefetch, profile, selectedSchoolId]);

  const handleDeleteFee = useCallback(async (id: string) => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });

    if (!schoolId) {
      setFeeError("لا يمكن تحديد المدرسة الحالية");
      return;
    }

    setFeeError("");
    setFeeLoading(true);

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<FeeMutationResponse>(
        "/api/web/dashboard/class-fees",
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            action: "delete",
            school_id: schoolId,
            branch_id: branchId,
            branch_scoped: branchScoped,
            fee_id: id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(resolveApiErrorMessage(payload ?? null, "تعذر حذف القسط الدراسي."));
      }

      setDeleteConfirm(null);
      await onRefetch();
    } catch (error) {
      setFeeError(error instanceof Error ? error.message : "تعذر حذف القسط الدراسي.");
    } finally {
      setFeeLoading(false);
    }
  }, [branchScoped, onRefetch, profile, selectedSchoolId]);

  const openEditFee = useCallback((cf: ClassFee) => {
    setEditingFee(cf);
    setFeeForm({
      class_name: cf.class_name,
      total_fee: String(cf.total_fee),
      installments: String(cf.installments),
      notes: cf.notes || "",
    });
    setFeeError("");
    setFeeSuccess("");
    setShowFeeModal(true);
  }, []);

  const openNewFee = useCallback(() => {
    setEditingFee(null);
    setFeeForm({ class_name: "", total_fee: "", installments: "4", notes: "" });
    setFeeError("");
    setFeeSuccess("");
    setShowFeeModal(true);
  }, []);

  const closeFeeModal = useCallback(() => {
    setShowFeeModal(false);
    setEditingFee(null);
    setFeeForm({ class_name: "", total_fee: "", installments: "4", notes: "" });
    setFeeError("");
    setFeeSuccess("");
  }, []);

  const getClassStats = useCallback((cf: ClassFee) => {
    return (
      cf.stats ?? {
        count: getDashboardRecordValueByName(studentCountByClass, cf.class_name) ?? 0,
        totalExpected: 0,
        totalPaid: 0,
        totalRemaining: 0,
        paidPct: 0,
      }
    );
  }, [studentCountByClass]);

  return {
    showFeeModal,
    setShowFeeModal,
    feeForm,
    setFeeForm,
    feeLoading,
    feeError,
    feeSuccess,
    editingFee,
    deleteConfirm,
    setDeleteConfirm,
    handleSaveFee,
    handleDeleteFee,
    openEditFee,
    openNewFee,
    closeFeeModal,
    getClassStats,
  };
}
