"use client";

// Account card modal for displaying teacher/student credentials

import { BookOpen, CircleOff, Copy, Printer } from "@/lib/icons";
import { SchoolLogo } from "@/components/brand";
import type { ManagedUserAccountCard } from "@/lib/managed-users";

type AccountCardModalProps = {
  accountCard: ManagedUserAccountCard | null;
  revealedPassword: string | null;
  onClose: () => void;
  onCopy: () => void;
  onPrint: (card: ManagedUserAccountCard, autoPrint: boolean) => void;
};

export function AccountCardModal({
  accountCard,
  revealedPassword,
  onClose,
  onCopy,
  onPrint,
}: AccountCardModalProps) {
  if (!accountCard) return null;

  return (
    <div
      className="ui-backdrop flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="ui-dialog w-full max-w-[760px] overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-sm font-black text-[var(--text-primary)]">
                <Printer size={15} />
                بطاقة حساب التطبيق جاهزة
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">{accountCard.school_name}</h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                اطبع البطاقة أو انسخ بيانات الدخول المؤقتة ثم سلّمها إلى {accountCard.role === "student" ? "الطالب" : "المعلم"}.
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              onClick={onClose}
              aria-label="إغلاق"
            >
              <CircleOff size={18} />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)]">
            استخدم زر الطباعة لتسليم بيانات الدخول مباشرة للطالب/المدرس، أو انسخ البيانات يدويًا عند الحاجة.
          </div>

          <div className="flex justify-center">
            <div className="flex items-center gap-3 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-5 py-4">
              <SchoolLogo
                src={accountCard.school_logo_url}
                alt="شعار المدرسة"
                label={accountCard.school_name}
                size={56}
                className="rounded-[18px] border border-[var(--border)] bg-white"
              />
              <div className="text-right">
                <div className="text-sm font-black text-[var(--text-secondary)]">المدرسة</div>
                <div className="text-lg font-black text-[var(--text-primary)]">{accountCard.school_name}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
              <div className="text-sm font-black text-[var(--text-secondary)]">الاسم الكامل</div>
              <div className="mt-2 text-xl font-black text-[var(--text-primary)]">{accountCard.full_name}</div>
              <div className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {accountCard.role === "student" ? "حساب طالب" : "حساب مدرس"}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
              <div className="text-sm font-black text-[var(--text-secondary)]">الصف والشعبة</div>
              <div className="mt-2 text-xl font-black text-[var(--text-primary)]">
                {accountCard.class_name || "—"}
              </div>
              <div className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                {accountCard.section ? `الشعبة ${accountCard.section}` : "كل الشعب أو غير محددة"}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <div className="text-sm font-black text-[var(--text-secondary)]">معرّف الدخول</div>
              <div className="mt-2 text-lg font-black text-[var(--text-primary)]" dir="ltr">
                {accountCard.login_identifier}
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-soft)] p-5">
              <div className="text-sm font-black text-[var(--text-secondary)]">كلمة المرور المؤقتة</div>
              <div
                className="mt-2 text-lg font-black"
                dir="ltr"
                style={{ color: revealedPassword && revealedPassword !== "••••••••" ? "var(--text-primary)" : "#888" }}
              >
                {revealedPassword && revealedPassword !== "••••••••" ? revealedPassword : "••••••••"}
              </div>
              {(!revealedPassword || revealedPassword === "••••••••") && (
                <div className="mt-2 text-xs text-[var(--text-tertiary)]">
                  كلمة المرور تم تعيينها — لا يمكن استرجاعها. استخدم "إعادة ضبط المرور" لإنشاء كلمة مرور جديدة.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <div className="mb-3 inline-flex items-center gap-2 text-base font-black text-[var(--text-primary)]">
              <BookOpen size={16} />
              تعليمات تسجيل الدخول
            </div>
            <ol className="space-y-2 pr-5 text-sm leading-8 text-[var(--text-secondary)]">
              {accountCard.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="ui-button ui-button--secondary inline-flex items-center gap-2"
              onClick={onCopy}
            >
              <Copy size={16} />
              نسخ البيانات
            </button>
            <button
              type="button"
              className="ui-button ui-button--primary inline-flex items-center gap-2"
              onClick={() => onPrint(accountCard, true)}
            >
              <Printer size={16} />
              طباعة بطاقة الدخول
            </button>
            <button type="button" className="ui-button ui-button--secondary" onClick={onClose}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
