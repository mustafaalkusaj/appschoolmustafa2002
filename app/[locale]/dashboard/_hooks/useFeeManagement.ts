"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { detectAppSchemaCompat } from "@/lib/schema-compat";
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
    const compat = await detectAppSchemaCompat();
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
    const installments = parseInt(feeForm.installments) || 1;
    const total_fee = parseFloat(feeForm.total_fee);
    const installment_amount = Math.round(total_fee / installments);
    const loadExistingFee = async () => {
      let query = supabase
        .from("class_fees")
        .select("id, class_name, total_fee, installments, installment_amount, notes, created_at")
        .eq("class_name", canonicalClassName)
        .limit(1);
      if (schoolId && compat.classFeesSchoolScope) {
        query = query.eq("school_id", schoolId);
      }
      if (branchScoped && branchId && compat.classFeesBranchScope) {
        query = query.eq("branch_id", branchId);
      }
      if (editingFee) {
        query = query.neq("id", editingFee.id);
      }
      const { data, error } = await query.maybeSingle();
      if (error) {
        return null;
      }
      return (data as ClassFee | null) ?? null;
    };

    setFeeLoading(true);
    let mutationError = "";

    if (editingFee) {
      let query = supabase
        .from("class_fees")
        .update({
          class_name: canonicalClassName,
          total_fee,
          installments,
          installment_amount,
          notes: feeForm.notes.trim(),
        })
        .eq("id", editingFee.id);
      if (schoolId && compat.classFeesSchoolScope) {
        query = query.eq("school_id", schoolId);
      }
      if (branchScoped && branchId && compat.classFeesBranchScope) {
        query = query.eq("branch_id", branchId);
      }
      const { error } = await query;
      if (error) {
        mutationError = "حدث خطأ أثناء التعديل: " + error.message;
      } else {
        setFeeSuccess("تم تعديل سعر القسط بنجاح ✓");
      }
    } else {
      if (!schoolId) {
        setFeeError("لا يمكن تحديد المدرسة الحالية");
        setFeeLoading(false);
        return;
      }
      const existingFee =
        hasDuplicateDashboardFeeClass(classFees, canonicalClassName)
          ? classFees.find((fee) => normalizeDashboardEntityKey(fee.class_name) === normalizeDashboardEntityKey(canonicalClassName)) ?? null
          : await loadExistingFee();
      if (existingFee) {
        await onRefetch().catch(() => undefined);
        setEditingFee(existingFee);
        setFeeForm({
          class_name: existingFee.class_name,
          total_fee: String(existingFee.total_fee),
          installments: String(existingFee.installments),
          notes: existingFee.notes || "",
        });
        setFeeError("هذا الصف لديه قسط محفوظ مسبقاً. تم فتح السجل الحالي للتعديل.");
        setFeeLoading(false);
        return;
      }
      const payload: Record<string, unknown> = {
        ...(compat.classFeesSchoolScope ? { school_id: schoolId } : {}),
        class_name: canonicalClassName,
        total_fee,
        installments,
        installment_amount,
        notes: feeForm.notes.trim(),
      };
      if (branchScoped && branchId && compat.classFeesBranchScope) {
        payload.branch_id = branchId;
      }
      const { error } = await supabase.from("class_fees").insert(payload);
      if (error) {
        if (error.code === "23505") {
          const duplicatedFee = await loadExistingFee();
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
          mutationError = "هذا الصف لديه قسط محفوظ مسبقاً. استخدم التعديل بدلاً من إضافة سجل جديد.";
        } else {
          mutationError = "حدث خطأ أثناء الحفظ: " + error.message;
        }
      } else {
        setFeeSuccess("تم حفظ سعر القسط بنجاح ✓");
      }
    }
    setFeeLoading(false);
    if (mutationError) {
      setFeeError(mutationError);
      return;
    }

    await onRefetch();
    setFeeForm((current) => ({ ...current, class_name: canonicalClassName }));
    setTimeout(() => {
      setFeeSuccess("");
      setShowFeeModal(false);
      setEditingFee(null);
      setFeeForm({ class_name: "", total_fee: "", installments: "4", notes: "" });
    }, 1200);
  }, [availableClassNames, branchScoped, profile, selectedSchoolId, feeForm, editingFee, classFees, onRefetch]);

  const handleDeleteFee = useCallback(async (id: string) => {
    const { school_id: schoolId, branch_id: branchId } = await resolveSchoolBranchForProfile(profile, {
      selectedSchoolId,
    });
    const compat = await detectAppSchemaCompat();
    let query = supabase.from("class_fees").delete().eq("id", id);
    if (schoolId && compat.classFeesSchoolScope) {
      query = query.eq("school_id", schoolId);
    }
    if (branchScoped && branchId && compat.classFeesBranchScope) {
      query = query.eq("branch_id", branchId);
    }
    await query;
    setDeleteConfirm(null);
    await onRefetch();
  }, [branchScoped, profile, selectedSchoolId, onRefetch]);

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
