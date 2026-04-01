"use client";

import { AppIcon } from "@/components/AppIcon";
import type { StudentWithFees } from "../_types";

interface DeleteConfirmModalProps {
  show: boolean;
  isReadOnlyView: boolean;
  canDeleteStudents: boolean;
  selectedStudent: StudentWithFees | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  show,
  isReadOnlyView,
  canDeleteStudents,
  selectedStudent,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (isReadOnlyView || !canDeleteStudents || !show || !selectedStudent) return null;

  return (
    <div className="overlay">
      <div className="modal modal-sm">
        <div className="del-ico">
          <AppIcon token="🗑️" size={26} />
        </div>
        <div className="mh" style={{ justifyContent: "center" }}>
          <div className="mt">تأكيد الحذف</div>
        </div>
        <div className="del-msg">
          هل تريد حذف الطالب
          <br />
          <strong>"{selectedStudent.full_name}"</strong>؟
          <br />
          <span style={{ color: "var(--gray)", fontSize: ".8rem" }}>
            سيتم نقله لقائمة المحذوفين ويمكن استعادته لاحقاً
          </span>
        </div>
        <div className="fa">
          <button className="bs-danger" onClick={onConfirm}>
            نعم، احذف
          </button>
          <button className="bc" onClick={onCancel}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
