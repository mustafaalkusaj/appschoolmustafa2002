"use client";

import { useTranslations } from "next-intl";
import { Copy, Printer } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { ManagedUserAccountCard } from "../_types";

interface AccountCardModalProps {
  accountCard: ManagedUserAccountCard | null;
  /** The plaintext password from a reset action (one-time reveal). If not provided, shows a placeholder message. */
  revealedPassword?: string | null;
  onPrint: (card: ManagedUserAccountCard, autoPrint: boolean) => void;
  onCopy: () => void;
  onClose: () => void;
}

export function AccountCardModal({ accountCard, revealedPassword, onPrint, onCopy, onClose }: AccountCardModalProps) {
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
            <p className="text-lg font-bold text-[var(--primary)]">
              {accountCard.full_name}
            </p>
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--surface-soft)] border border-[var(--border)]">
            <p className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">
              {t("classSection")}
            </p>
            <p className="text-lg font-bold text-[var(--primary)]">
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
              {visiblePassword || "••••••••"}
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
