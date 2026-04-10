"use client";

import * as React from "react";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ConfirmDialogTone = "danger" | "primary";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function WarningIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        fill="currentColor"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── ConfirmDialog Component ───────────────────────────────────────────────────

export function ConfirmDialog({
  open,
  title,
  description = "",
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const isDanger = tone === "danger";

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" closeOnBackdrop={!busy}>
      <ModalBody className="p-5">
        {/* Header with Icon and Title */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={cn(
              "shrink-0",
              "w-11 h-11",
              "flex items-center justify-center",
              "rounded-[var(--radius-md)]",
              isDanger
                ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                : "bg-[var(--primary)]/10 text-[var(--primary)]"
            )}
          >
            {isDanger ? <WarningIcon /> : <InfoIcon />}
          </div>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-[var(--text-primary)] mb-1">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter className="p-5 pt-0 border-t-0">
        <Button
          variant={isDanger ? "destructive" : "primary"}
          onClick={() => void handleConfirm()}
          disabled={busy}
          loading={busy}
          className="flex-1"
        >
          {busy ? "جارٍ التنفيذ..." : confirmLabel}
        </Button>
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={busy}
          className="flex-1"
        >
          {cancelLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
