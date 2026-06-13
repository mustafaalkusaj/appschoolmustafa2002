"use client";

import { useTranslations } from "next-intl";
import { Copy, Printer, RefreshCw, MessageCircle, Smartphone } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { ManagedUserAccountCard } from "../_types";
import { buildWhatsAppShareLink, buildLoginCardMessage } from "@/lib/whatsapp";
import { buildSmsLink } from "@/lib/sms";

interface AccountCardModalProps {
  accountCard: ManagedUserAccountCard | null;
  /** The plaintext password from a reset action (one-time reveal). If not provided, shows a placeholder message. */
  revealedPassword?: string | null;
  /** Phone number for WhatsApp/SMS sharing (student or guardian phone). */
  sharePhone?: string | null;
  onPrint: (card: ManagedUserAccountCard, autoPrint: boolean) => void;
  onCopy: () => void;
  onClose: () => void;
  onResetPassword?: () => void;
  resettingPassword?: boolean;
}

export function AccountCardModal({ accountCard, revealedPassword, sharePhone, onPrint, onCopy, onClose, onResetPassword, resettingPassword }: AccountCardModalProps) {
  const t = useTranslations("students.modals.accountCard");

  if (!accountCard) return null;

  const visiblePassword =
    (revealedPassword && revealedPassword !== "••••••••" ? revealedPassword : null) ||
    (accountCard.temporary_password && accountCard.temporary_password !== "••••••••"
      ? accountCard.temporary_password
      : null);

  return (
    <Modal open={!!accountCard} onClose={onClose} size="xl">
      <ModalHeader title={t("title")} onClose={onClose} />

      <ModalBody>
        {/* Account Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-soft)] border border-[var(--border)]">
            <p className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
              {t("fullName")}
            </p>
            <p className="!text-[1.1rem] !font-black leading-none text-[var(--primary)]">
              {accountCard.full_name}
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-soft)] border border-[var(--border)]">
            <p className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
              {t("classSection")}
            </p>
            <p className="!text-[1.1rem] !font-black leading-none text-[var(--primary)]">
              {[accountCard.class_name, accountCard.section ? t("section", { name: accountCard.section }) : null]
                .filter(Boolean)
                .join(" • ") || "—"}
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-soft)] border border-[var(--border)]">
            <p className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
              {t("loginId")}
            </p>
            <p className="text-lg font-bold text-[var(--primary)] text-start ltr" dir="ltr">
              {accountCard.login_identifier}
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-soft)] border border-[var(--border)]">
            <p className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
              {t("tempPassword")}
            </p>
            <p
              className={`text-lg font-bold text-start ltr break-all ${visiblePassword ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
              dir="ltr"
            >
              {visiblePassword || t("passwordHidden")}
            </p>
            {!visiblePassword && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {t("passwordSet")}
              </p>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-soft)] border border-[var(--border)]">
          <p className="text-sm font-bold text-[var(--primary)] mb-3">
            {t("instructions")}
          </p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm text-[var(--text-secondary)]">
            {accountCard.instructions.map((instruction) => (
              <li key={instruction}>{instruction}</li>
            ))}
          </ol>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" onClick={onCopy}>
          <Copy className="h-4 w-4" />
          {t("copy")}
        </Button>
        {onResetPassword && (
          <Button variant="ghost" onClick={onResetPassword} disabled={resettingPassword}>
            <RefreshCw className={`h-4 w-4 ${resettingPassword ? "animate-spin" : ""}`} />
            إعادة تعيين السر
          </Button>
        )}
        {sharePhone && visiblePassword && (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                const url = buildWhatsAppShareLink(sharePhone, {
                  username: accountCard.login_identifier,
                  password: visiblePassword,
                  studentName: accountCard.full_name,
                });
                window.open(url, "_blank", "noopener");
              }}
            >
              <MessageCircle className="h-4 w-4" />
              مشاركة عبر واتساب
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const msg = buildLoginCardMessage({
                  username: accountCard.login_identifier,
                  password: visiblePassword,
                  studentName: accountCard.full_name,
                });
                const url = buildSmsLink(sharePhone, msg);
                window.open(url, "_self");
              }}
            >
              <Smartphone className="h-4 w-4" />
              إرسال SMS
            </Button>
          </>
        )}
        <Button variant="outline" onClick={() => onPrint(accountCard, true)}>
          <Printer className="h-4 w-4" />
          {t("print")}
        </Button>
        <Button variant="primary" onClick={onClose}>
          {t("close")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
