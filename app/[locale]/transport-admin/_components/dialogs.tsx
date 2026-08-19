"use client";

import { useState } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { cn } from "@/lib/brand/brand-utils";
import { AlertTriangle, Copy, CheckCircle2, Eye, EyeOff } from "@/lib/icons";
import type { Credentials } from "./types";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader title={title} />
      <ModalBody>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]">
            <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />
          </div>
          <p className="text-sm text-[var(--text-secondary)] pt-2">{message}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          disabled={loading}
          className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors"
        >
          الغاء
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="rounded-xl bg-[var(--danger)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {loading ? "جاري..." : (confirmLabel || "حذف")}
        </button>
      </ModalFooter>
    </Modal>
  );
}

export function CredentialsDialog({
  open,
  onClose,
  credentials,
}: {
  open: boolean;
  onClose: () => void;
  credentials: Credentials | null;
}) {
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyField = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!credentials) return null;

  const fields = [
    { label: "اسم المستخدم", value: credentials.username },
    { label: "البريد", value: credentials.email },
    { label: "كلمة المرور", value: credentials.password, secret: true },
  ];

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader title="بيانات الدخول" description="انسخ البيانات الآن — لن تُعرض مجدداً" />
      <ModalBody>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.label} className="rounded-xl border border-[var(--border)] p-3">
              <p className="text-[10px] font-medium text-[var(--text-muted)] mb-1">{f.label}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-[var(--text-primary)] select-all" dir="ltr">
                  {f.secret && !showPass ? "••••••••••••" : f.value}
                </code>
                {f.secret && (
                  <button
                    onClick={() => setShowPass(!showPass)}
                    className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button
                  onClick={() => copyField(f.label, f.value)}
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--success)]"
                >
                  {copied === f.label ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          onClick={onClose}
          className="rounded-xl bg-[var(--success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-colors"
        >
          تم
        </button>
      </ModalFooter>
    </Modal>
  );
}
