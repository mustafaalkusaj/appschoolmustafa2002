"use client";

import { useState } from "react";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";

type AdType = "image" | "countdown" | "video" | "document";

interface AdItem {
  id: string;
  type: AdType;
  title: string;
  body: string | null;
  bg_color: string | null;
  image_url: string | null;
  target_date: string | null;
  social_url: string | null;
  social_label: string | null;
  video_url: string | null;
  doc_url: string | null;
  doc_pages: number | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  schoolId: string;
  onSuccess: () => void;
  item?: AdItem;
}

const AD_TYPES: { value: AdType; label: string; emoji: string }[] = [
  { value: "image",     label: "صورة",   emoji: "🖼️" },
  { value: "countdown", label: "عداد",   emoji: "⏳" },
  { value: "video",     label: "فيديو",  emoji: "🎬" },
  { value: "document",  label: "مستند",  emoji: "📄" },
];

export function CreateAdModal({ open, onClose, schoolId, onSuccess, item }: Props) {
  const isEdit = Boolean(item);

  const [type,        setType]        = useState<AdType>(item?.type        ?? "image");
  const [title,       setTitle]       = useState(item?.title               ?? "");
  const [body,        setBody]        = useState(item?.body                ?? "");
  const [bgColor,     setBgColor]     = useState(item?.bg_color            ?? "#4F46E5");
  const [isActive,    setIsActive]    = useState(item?.is_active           ?? true);
  const [imageUrl,    setImageUrl]    = useState(item?.image_url           ?? "");
  const [targetDate,  setTargetDate]  = useState(
    item?.target_date ? item.target_date.slice(0, 16) : "",
  );
  const [socialUrl,   setSocialUrl]   = useState(item?.social_url         ?? "");
  const [socialLabel, setSocialLabel] = useState(item?.social_label       ?? "");
  const [videoUrl,    setVideoUrl]    = useState(item?.video_url          ?? "");
  const [docUrl,      setDocUrl]      = useState(item?.doc_url            ?? "");
  const [docPages,    setDocPages]    = useState<string>(
    item?.doc_pages != null ? String(item.doc_pages) : "",
  );
  const [startsAt,    setStartsAt]    = useState(
    item?.starts_at ? item.starts_at.slice(0, 16) : "",
  );
  const [endsAt,      setEndsAt]      = useState(
    item?.ends_at ? item.ends_at.slice(0, 16) : "",
  );

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function reset() {
    setType("image"); setTitle(""); setBody(""); setBgColor("#4F46E5");
    setIsActive(true); setImageUrl(""); setTargetDate(""); setSocialUrl("");
    setSocialLabel(""); setVideoUrl(""); setDocUrl(""); setDocPages("");
    setStartsAt(""); setEndsAt(""); setError(null);
  }

  function handleClose() {
    if (!isEdit) reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        schoolId,
        type,
        title:       title.trim(),
        body:        body.trim()        || undefined,
        bgColor:     bgColor            || undefined,
        isActive,
        imageUrl:    imageUrl.trim()    || undefined,
        targetDate:  targetDate         || undefined,
        socialUrl:   socialUrl.trim()   || undefined,
        socialLabel: socialLabel.trim() || undefined,
        videoUrl:    videoUrl.trim()    || undefined,
        docUrl:      docUrl.trim()      || undefined,
        docPages:    docPages           ? Number(docPages) : undefined,
        startsAt:    startsAt           || undefined,
        endsAt:      endsAt             || undefined,
      };

      const res = isEdit
        ? await fetchWithAuthorizedSession(`/api/web/ads/${item!.id}`, {
            method: "PUT",
            headers: withJsonHeaders(),
            body: JSON.stringify(payload),
          })
        : await fetchWithAuthorizedSession("/api/web/ads", {
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
        setError(data?.error?.message ?? data?.error ?? "حدث خطأ");
      }
    } catch {
      setError("حدث خطأ، تحقق من الاتصال");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition";
  const labelClass = "text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider";

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <ModalHeader title={isEdit ? "تعديل الإعلان" : "إضافة إعلان جديد"} onClose={handleClose} />
      <form onSubmit={(e) => void handleSubmit(e)}>
        <ModalBody className="space-y-5">

          {/* Type selector */}
          <div className="space-y-2">
            <label className={labelClass}>نوع الإعلان</label>
            <div className="flex flex-wrap gap-2">
              {AD_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all",
                    )}
                    style={
                      active
                        ? { borderColor: "var(--primary)", background: "var(--primary)", color: "white" }
                        : { borderColor: "var(--border)", background: "var(--surface-soft)", color: "var(--text-muted)" }
                    }
                  >
                    {t.emoji} {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className={labelClass}>العنوان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="عنوان الإعلان..."
              className={inputClass}
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <label className={labelClass}>النص <span className="normal-case font-normal">(اختياري)</span></label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="وصف مختصر..."
              className={cn(inputClass, "resize-none")}
            />
          </div>

          {/* Background color */}
          <div className="space-y-1.5">
            <label className={labelClass}>لون الخلفية</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-10 w-16 rounded-xl border border-[var(--border)] cursor-pointer"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                placeholder="#4F46E5"
                className={cn(inputClass, "flex-1")}
              />
            </div>
          </div>

          {/* Type-specific fields */}
          {type === "image" && (
            <div className="space-y-1.5">
              <label className={labelClass}>رابط الصورة</label>
              <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          )}

          {type === "countdown" && (
            <>
              <div className="space-y-1.5">
                <label className={labelClass}>صورة الخلفية (اختياري)</label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>تاريخ الهدف</label>
                <input type="datetime-local" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputClass} />
              </div>
            </>
          )}

          {type === "video" && (
            <div className="space-y-1.5">
              <label className={labelClass}>رابط الفيديو</label>
              <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          )}

          {type === "document" && (
            <>
              <div className="space-y-1.5">
                <label className={labelClass}>رابط المستند</label>
                <input type="url" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>عدد الصفحات <span className="normal-case font-normal">(اختياري)</span></label>
                <input type="number" min={1} value={docPages} onChange={(e) => setDocPages(e.target.value)} placeholder="248" className={inputClass} />
              </div>
            </>
          )}

          {/* Social link (image + countdown) */}
          {(type === "image" || type === "countdown") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={labelClass}>رابط التواصل <span className="normal-case font-normal">(اختياري)</span></label>
                <input type="url" value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} placeholder="https://..." className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>نص الزر</label>
                <input type="text" value={socialLabel} onChange={(e) => setSocialLabel(e.target.value)} placeholder="تابعنا..." className={inputClass} />
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelClass}>يبدأ من <span className="normal-case font-normal">(اختياري)</span></label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>ينتهي في <span className="normal-case font-normal">(اختياري)</span></label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-soft)] transition">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm font-medium text-[var(--text-primary)]">نشط الآن</span>
          </label>

          {error && <p className="text-sm text-[var(--danger)] font-medium">{error}</p>}
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" type="button" onClick={handleClose} disabled={loading}>
            إلغاء
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة الإعلان"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
