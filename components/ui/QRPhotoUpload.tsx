"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { getSupabase } from "@/lib/supabase";
import { Modal, ModalHeader, ModalBody } from "@/components/ui/modal";
import { cn } from "@/lib/brand/brand-utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface QRPhotoUploadProps {
  schoolId: string;
  studentId?: string;
  onPhotoUploaded: (imageUrl: string) => void;
  onCancel: () => void;
  open: boolean;
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export function QRPhotoUpload({ schoolId, studentId, onPhotoUploaded, onCancel, open }: QRPhotoUploadProps) {
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState(600);
  const [status, setStatus] = useState<"generating" | "waiting" | "success" | "expired" | "error">("generating");
  const [errorMsg, setErrorMsg] = useState("");
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);

  const createSession = useCallback(async () => {
    setStatus("generating");
    setErrorMsg("");

    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("upload_sessions")
        .insert({
          school_id: schoolId,
          student_id: studentId || null,
          status: "pending",
        })
        .select("token, expires_at")
        .single();

      if (error || !data) throw error || new Error("Failed to create session");

      setToken(data.token);
      setExpiresAt(new Date(data.expires_at));
      setTimeLeft(Math.max(0, Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)));
      setStatus("waiting");

      // Subscribe to realtime
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
      }

      const channel = sb
        .channel(`upload-${data.token}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "upload_sessions",
            filter: `token=eq.${data.token}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new as { status: string; image_url: string | null };
            if (row.status === "completed" && row.image_url) {
              setStatus("success");
              setTimeout(() => onPhotoUploaded(row.image_url!), 800);
            }
          },
        )
        .subscribe();

      channelRef.current = channel;
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "فشل إنشاء جلسة الرفع");
    }
  }, [schoolId, studentId, onPhotoUploaded]);

  // Create session on mount
  useEffect(() => {
    if (open) createSession();

    return () => {
      if (channelRef.current) {
        const sb = getSupabase();
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (status !== "waiting" || !expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setStatus("expired");
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const uploadUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/ar/upload/${token}`
    : "";

  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <ModalHeader title="التقاط صورة بالهاتف" onClose={onCancel} />
      <ModalBody className="pb-6">
        <div className="text-center space-y-4">
          {/* Generating */}
          {status === "generating" && (
            <div className="py-8">
              <div className="w-10 h-10 border-4 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[var(--text-muted)]">جاري إنشاء رمز QR...</p>
            </div>
          )}

          {/* Waiting — show QR */}
          {status === "waiting" && token && (
            <>
              <p className="text-sm text-[var(--text-secondary)]">
                امسح الرمز بالهاتف لالتقاط صورة الطالب
              </p>

              <div className="inline-block p-4 bg-white rounded-2xl border border-[var(--border)] shadow-sm">
                <QRCodeSVG
                  value={uploadUrl}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>

              {/* Timer */}
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold",
                timeLeft > 60
                  ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                  : "bg-red-50 text-red-600",
              )}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {minutes}:{String(seconds).padStart(2, "0")}
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                بانتظار التقاط الصورة من الهاتف...
              </p>

              {/* Loading dots */}
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse"
                    style={{ animationDelay: `${i * 300}ms` }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="py-6 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-[var(--success)] flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-bold text-[var(--success)]">تم استلام الصورة بنجاح!</p>
            </div>
          )}

          {/* Expired */}
          {status === "expired" && (
            <div className="py-6 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-bold text-amber-600">انتهت صلاحية الرمز</p>
              <button
                onClick={createSession}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                إنشاء رمز جديد
              </button>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="py-6 space-y-4">
              <p className="text-sm text-[var(--danger)]">{errorMsg}</p>
              <button
                onClick={createSession}
                className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-bold hover:opacity-90 transition-opacity"
              >
                إعادة المحاولة
              </button>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
