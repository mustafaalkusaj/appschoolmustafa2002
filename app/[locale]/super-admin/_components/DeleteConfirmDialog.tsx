"use client";

import { AlertTriangle } from "@/lib/icons";
import { ModalFrame } from "./ui";
import type { SchoolRecord, UserRecord } from "./types";

interface DeleteSchoolDialogProps {
  school: SchoolRecord | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteSchoolDialog({ school, onClose, onConfirm }: DeleteSchoolDialogProps) {
  if (!school) return null;

  return (
    <ModalFrame
      title="تأكيد أرشفة المدرسة"
      subtitle="سيتم نقل المدرسة إلى سلة المهملات بدلاً من حذفها نهائياً عند توفر أعمدة soft delete."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-[26px] border border-[rgba(240,90,90,0.18)] bg-[rgba(240,90,90,0.08)] px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-base font-black text-[var(--danger)]">
            <AlertTriangle size={18} />
            {school.name}
          </div>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            يمكن استعادة المدرسة لاحقاً من سلة المهملات بعد تطبيق بنية الأرشفة الكاملة.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="ui-button ui-button--danger" onClick={onConfirm}>
            أرشفة المدرسة
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

interface DeleteUserDialogProps {
  user: UserRecord | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteUserDialog({ user, onClose, onConfirm }: DeleteUserDialogProps) {
  if (!user) return null;

  return (
    <ModalFrame
      title="تأكيد أرشفة المستخدم"
      subtitle="سيتم نقل المستخدم إلى سلة المهملات وتعطيل حسابه داخل التطبيق."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="rounded-[26px] border border-[rgba(240,90,90,0.18)] bg-[rgba(240,90,90,0.08)] px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-base font-black text-[var(--danger)]">
            <AlertTriangle size={18} />
            {user.full_name || user.email || "مستخدم"}
          </div>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            سيتم إخفاء المستخدم من القوائم النشطة مع إمكانية استعادته لاحقاً من سلة المهملات.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="ui-button ui-button--secondary" onClick={onClose}>
            إلغاء
          </button>
          <button type="button" className="ui-button ui-button--danger" onClick={onConfirm}>
            أرشفة المستخدم
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
