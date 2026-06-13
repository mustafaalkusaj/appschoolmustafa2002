"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, Image, Video, FileText, ExternalLink, Pin } from "@/lib/icons";
import { cn } from "@/lib/brand/brand-utils";
import type { AnnouncementListItem, AnnouncementMediaType } from "@/lib/notifications/types";

interface Props {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  branchId?: string;
  onSuccess: () => void;
  /** إذا مُرِّر item → وضع التعديل */
  item?: AnnouncementListItem;
}

const MEDIA_TYPES: { value: AnnouncementMediaType; label: string; icon: React.ElementType; accept: string; maxMB: number }[] = [
  { value: "image", label: "صورة",  icon: Image,        accept: "image/jpeg,image/png,image/webp,image/gif", maxMB: 5   },
  { value: "video", label: "فيديو", icon: Video,        accept: "video/mp4,video/webm,video/quicktime",      maxMB: 500 },
  { value: "pdf",   label: "PDF",   icon: FileText,     accept: "application/pdf",                           maxMB: 20  },
  { value: "link",  label: "رابط",  icon: ExternalLink, accept: "",                                          maxMB: 0   },
];

const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];

export function CreateAnnouncementModal({ open, onClose, schoolId, branchId, onSuccess, item }: Props) {
  const t = useTranslations("notifications.announcements");
  const isEdit = Boolean(item);

  const [title,     setTitle]     = useState(item?.title    ?? "");
  const [body,      setBody]      = useState(item?.body     ?? "");
  const [isPinned,  setIsPinned]  = useState(item?.isPinned ?? false);
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt ? item.expiresAt.slice(0, 16) : "");
  const [mediaUrl,  setMediaUrl]  = useState(item?.mediaUrl  ?? "");
  const [mediaType, setMediaType] = useState<AnnouncementMediaType | "">(item?.mediaType ?? "");

  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [uploading,      setUploading]      = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError,    setUploadError]    = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setTitle(""); setBody(""); setIsPinned(false); setExpiresAt("");
    setMediaUrl(""); setMediaType(""); setError(null);
    setUploadError(null); setUploadProgress(0);
  }

  function handleClose() {
    if (!isEdit) reset();
    onClose();
  }

  async function handleFileUpload(file: File) {
    setUploading(true); setUploadError(null); setUploadProgress(0);
    const isVideo = VIDEO_MIME.includes(file.type);

    if (isVideo) {
      try {
        const params = new URLSearchParams({ filename: file.name, contentType: file.type, schoolId });
        const urlRes = await fetch(`/api/web/notifications/upload-url?${params.toString()}`);
        const urlData = await urlRes.json().catch(() => null);
        if (!urlRes.ok || !urlData?.ok) { setUploadError(urlData?.error ?? "تعذر رفع الفيديو"); return; }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", urlData.signedUrl as string);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setMediaUrl(urlData.publicUrl as string);
              setUploadProgress(100);
              resolve();
            } else {
              reject(new Error(`رمز ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("خطأ في الشبكة"));
          xhr.send(file);
        });
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "فشل رفع الفيديو");
      } finally {
        setUploading(false);
      }
    } else {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("schoolId", schoolId);
        const res  = await fetch("/api/web/notifications/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setMediaUrl(data.url as string);
          setUploadProgress(100);
        } else {
          setUploadError(data?.error ?? "فشل رفع الملف");
        }
      } catch {
        setUploadError("فشل رفع الملف، تحقق من الاتصال");
      } finally {
        setUploading(false);
      }
    }
  }

  const selectedMediaCfg = MEDIA_TYPES.find((m) => m.value === mediaType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true); setError(null);
    try {
      const payload = {
        schoolId, branchId,
        title: title.trim(),
        body:  body.trim(),
        isPinned,
        expiresAt: expiresAt || undefined,
        mediaUrl:  mediaUrl.trim()  || undefined,
        mediaType: mediaType        || undefined,
      };

      const res = isEdit
        ? await fetchWithAuthorizedSession(`/api/web/announcements/${item!.id}`, {
            method: "PUT",
            headers: withJsonHeaders(),
            body: JSON.stringify(payload),
          })
        : await fetchWithAuthorizedSession("/api/web/announcements", {
            method: "POST",
            headers: withJsonHeaders(),
            body: JSON.stringify(payload),
          });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        if (!isEdit) reset();
        onSuccess();
        onClose();
      } else {
        setError(data?.error ?? t("createError"));
      }
    } catch {
      setError(t("createError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <ModalHeader title={isEdit ? "تعديل الإعلان" : t("createTitle")} onClose={handleClose} />
      <form onSubmit={(e) => void handleSubmit(e)}>
        <ModalBody className="space-y-5">

          {/* عنوان */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t("formTitle")}</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder={t("formTitlePlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition" />
          </div>

          {/* نص */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{t("formBody")}</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4}
              placeholder={t("formBodyPlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition resize-none" />
          </div>

          {/* نوع المرفق */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              مرفق <span className="normal-case font-normal">(اختياري)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => { setMediaType(""); setMediaUrl(""); setUploadError(null); }}
                className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all",
                  !mediaType
                    ? "border-[var(--text-muted)] bg-[var(--text-muted)] text-white"
                    : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]"
                )}>بدون</button>

              {MEDIA_TYPES.map((mt) => {
                const Icon = mt.icon;
                const active = mediaType === mt.value;
                return (
                  <button key={mt.value} type="button"
                    onClick={() => { setMediaType(mt.value); setMediaUrl(""); setUploadError(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                    style={active
                      ? { borderColor: "var(--primary)", background: "var(--primary)", color: "white" }
                      : { borderColor: "var(--border)", background: "var(--surface-soft)", color: "var(--text-muted)" }
                    }
                  >
                    <Icon size={12} />{mt.label}
                  </button>
                );
              })}
            </div>

            {/* hidden file input */}
            <input ref={fileInputRef} type="file" className="hidden"
              accept={selectedMediaCfg?.accept ?? ""}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); e.target.value = ""; }}
            />

            {/* Upload zone (صورة / فيديو / PDF) */}
            {mediaType && mediaType !== "link" && (
              <div className="space-y-2">
                {!mediaUrl ? (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="w-full flex flex-col items-center justify-center gap-2 py-7 rounded-xl border-2 border-dashed border-[var(--primary)]/30 bg-[color-mix(in_srgb,var(--primary)_3%,transparent)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)] transition-all group disabled:opacity-60"
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={22} className="animate-spin text-[var(--primary)]" />
                        <span className="text-xs font-semibold text-[var(--primary)]">جارٍ الرفع...</span>
                        {uploadProgress > 0 && (
                          <div className="w-36">
                            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                              <motion.div className="h-full rounded-full bg-[var(--primary)]"
                                initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
                                transition={{ ease: "easeOut", duration: 0.3 }} />
                            </div>
                            <p className="text-[10px] text-center text-[var(--primary)] font-bold mt-0.5">{uploadProgress}%</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload size={22} className="group-hover:text-[var(--primary)] transition-colors" />
                        <div className="text-center">
                          <p className="text-xs font-bold group-hover:text-[var(--primary)] transition-colors">
                            {mediaType === "image" ? "اضغط لرفع صورة"
                              : mediaType === "video" ? "اضغط لرفع فيديو"
                              : "اضغط لرفع PDF"}
                          </p>
                          <p className="text-[10px] mt-0.5 opacity-70">
                            {selectedMediaCfg ? `حتى ${selectedMediaCfg.maxMB} ميجا` : ""}
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-soft)]">
                    {mediaType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaUrl} alt="معاينة" className="w-full max-h-44 object-contain" />
                    ) : mediaType === "video" ? (
                      <video src={mediaUrl} controls className="w-full max-h-44" />
                    ) : (
                      <div className="flex items-center gap-3 p-4">
                        <FileText size={28} className="text-[var(--danger)] flex-shrink-0" />
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {mediaUrl.split("/").pop()}
                        </span>
                      </div>
                    )}
                    <button type="button" onClick={() => { setMediaUrl(""); setUploadError(null); }}
                      className="absolute top-2 end-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {uploadError && <p className="text-xs text-[var(--danger)]">{uploadError}</p>}

                {!mediaUrl && !uploading && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-[var(--border)]" />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">أو أدخل رابط</span>
                      <div className="flex-1 h-px bg-[var(--border)]" />
                    </div>
                    <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition" />
                  </>
                )}
              </div>
            )}

            {/* رابط فقط */}
            {mediaType === "link" && (
              <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition" />
            )}
          </div>

          {/* تاريخ الانتهاء */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {t("formExpiresAt")} <span className="normal-case font-normal">(اختياري)</span>
            </label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition" />
          </div>

          {/* تثبيت */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-soft)] transition">
            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]" />
            <div className="flex items-center gap-2">
              <Pin size={14} className="text-[var(--warning)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">{t("formPinned")}</span>
            </div>
          </label>

          {error && <p className="text-sm text-[var(--danger)] font-medium">{error}</p>}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" type="button" onClick={handleClose} disabled={loading}>{t("cancel")}</Button>
          <Button type="submit" disabled={loading || uploading || !title.trim() || !body.trim()}>
            {loading ? t("saving") : isEdit ? "حفظ التعديلات" : t("save")}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
