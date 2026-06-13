"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { compressDocumentImage } from "@/lib/students/image-utils";

type DocType = "national_id" | "passport" | "certificate" | "contract" | "other";

type TeacherDocument = {
  id: string;
  teacher_id: string;
  school_id: string;
  doc_type: DocType;
  title: string;
  expiry_date: string | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
};

interface Props {
  teacherId: string;
  schoolId: string | null;
  canManage: boolean;
  locale: "ar" | "en";
}

const DOC_TYPE_LABELS: Record<DocType, { ar: string; en: string }> = {
  national_id: { ar: "هوية وطنية", en: "National ID" },
  passport: { ar: "جواز سفر", en: "Passport" },
  certificate: { ar: "شهادة", en: "Certificate" },
  contract: { ar: "عقد", en: "Contract" },
  other: { ar: "أخرى", en: "Other" },
};

const DOC_TYPE_COLORS: Record<DocType, string> = {
  national_id: "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/20",
  passport: "bg-[var(--info-soft)] text-[var(--info)] border-[var(--info)]/20",
  certificate: "bg-[var(--success-soft)] text-[var(--success)] border-[var(--success)]/20",
  contract: "bg-[var(--warning-soft)] text-[var(--warning)] border-[var(--warning)]/20",
  other: "bg-[var(--surface-soft)] text-[var(--text-muted)] border-[var(--border)]",
};

function formatDate(value: string | null, locale: "ar" | "en"): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(locale === "ar" ? "ar-IQ-u-nu-latn" : "en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function isExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  try {
    const diff = new Date(expiry).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // within 30 days
  } catch {
    return false;
  }
}

function isExpired(expiry: string | null): boolean {
  if (!expiry) return false;
  try {
    return new Date(expiry).getTime() < Date.now();
  } catch {
    return false;
  }
}

export function DocumentsTab({ teacherId, schoolId, canManage, locale }: Props) {
  const isEn = locale === "en";

  const [documents, setDocuments] = useState<TeacherDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formDocType, setFormDocType] = useState<DocType>("national_id");
  const [formTitle, setFormTitle] = useState("");
  const [formExpiry, setFormExpiry] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const buildUrl = useCallback(
    (extra = "") =>
      `/api/web/teachers/${teacherId}/documents${schoolId ? `?schoolId=${schoolId}` : ""}${extra}`,
    [teacherId, schoolId],
  );

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        documents: TeacherDocument[];
      }>(buildUrl());
      if (!response.ok || !payload?.ok) {
        setError(isEn ? "Failed to load documents." : "تعذر تحميل الوثائق.");
      } else {
        setDocuments(payload.documents ?? []);
      }
    } catch {
      setError(isEn ? "Failed to load documents." : "تعذر تحميل الوثائق.");
    } finally {
      setLoading(false);
    }
  }, [buildUrl, isEn]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const resetForm = () => {
    setFormDocType("national_id");
    setFormTitle("");
    setFormExpiry("");
    setFormNotes("");
    setFormError(null);
    setFormImageUrl(null);
    if (formImagePreview) {
      URL.revokeObjectURL(formImagePreview);
      setFormImagePreview(null);
    }
    setImageUploadError(null);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setImageUploadError(null);

    // Optimistic preview immediately
    const previewUrl = URL.createObjectURL(file);
    setFormImagePreview(previewUrl);

    try {
      const isPdf = file.type === "application/pdf";
      // Step 1: compress client-side (skip for PDF)
      const uploadBlob = isPdf ? file : await compressDocumentImage(file);
      const uploadMime = isPdf ? "application/pdf" : "image/webp";

      // Step 2: get presigned URL from server (sends JSON only, no file bytes)
      const signRes = await fetch(`/api/web/teachers/${teacherId}/documents/photo-upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: schoolId || "",
          mimeType: uploadMime,
          fileSizeBytes: uploadBlob.size,
        }),
      });
      const signData = await signRes.json().catch(() => null);
      if (!signRes.ok) {
        throw new Error(signData?.error?.message || (isEn ? "Failed to get upload URL." : "تعذر إنشاء رابط الرفع."));
      }

      // Step 3: upload blob DIRECTLY to Supabase Storage (no server relay)
      const uploadRes = await fetch(signData.signedUrl as string, {
        method: "PUT",
        headers: { "Content-Type": uploadMime },
        body: uploadBlob,
      });
      if (!uploadRes.ok) {
        throw new Error(isEn ? "Failed to upload image." : "تعذر رفع الصورة.");
      }

      setFormImageUrl(signData.publicUrl as string);
      setFormImagePreview(null);
      URL.revokeObjectURL(previewUrl);
    } catch (err) {
      setFormImagePreview(null);
      URL.revokeObjectURL(previewUrl);
      setImageUploadError(err instanceof Error ? err.message : (isEn ? "Failed to upload image." : "تعذر رفع الصورة."));
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError(isEn ? "Document title is required." : "عنوان الوثيقة مطلوب.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean }>(
        `/api/web/teachers/${teacherId}/documents`,
        {
          method: "POST",
          headers: withJsonHeaders(),
          body: JSON.stringify({
            school_id: schoolId,
            doc_type: formDocType,
            title: formTitle.trim(),
            expiry_date: formExpiry.trim() || null,
            notes: formNotes.trim() || null,
            image_url: formImageUrl,
          }),
        },
      );
      if (!response.ok || !payload?.ok) {
        setFormError(isEn ? "Failed to add document." : "تعذر إضافة الوثيقة.");
      } else {
        resetForm();
        setShowForm(false);
        await loadDocuments();
      }
    } catch {
      setFormError(isEn ? "Failed to add document." : "تعذر إضافة الوثيقة.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId: string) => {
    const confirmed = window.confirm(
      isEn ? "Delete this document?" : "هل تريد حذف هذه الوثيقة؟",
    );
    if (!confirmed) return;
    setDeletingId(docId);
    try {
      const params = new URLSearchParams({ documentId: docId });
      if (schoolId) params.set("schoolId", schoolId);
      const { response } = await fetchJsonWithAuthorizedSession(
        `/api/web/teachers/${teacherId}/documents?${params.toString()}`,
        { method: "DELETE" },
      );
      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      }
    } catch {
      // silent — user can retry
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {isEn ? "Documents" : "الوثائق"}
        </h3>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (showForm) {
                resetForm();
              }
              setShowForm((v) => !v);
            }}
          >
            {showForm
              ? isEn ? "Cancel" : "إلغاء"
              : isEn ? "Add Document" : "إضافة وثيقة"}
          </Button>
        )}
      </div>

      {/* Inline add form */}
      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-5 flex flex-col gap-3"
        >
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {isEn ? "New Document" : "وثيقة جديدة"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Doc type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                {isEn ? "Type" : "نوع الوثيقة"}
              </label>
              <select
                value={formDocType}
                onChange={(e) => setFormDocType(e.target.value as DocType)}
                className="border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-soft)] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
              >
                {(Object.entries(DOC_TYPE_LABELS) as [DocType, { ar: string; en: string }][]).map(
                  ([key, labels]) => (
                    <option key={key} value={key}>
                      {isEn ? labels.en : labels.ar}
                    </option>
                  ),
                )}
              </select>
            </div>

            {/* Expiry date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                {isEn ? "Expiry Date (optional)" : "تاريخ الانتهاء (اختياري)"}
              </label>
              <DatePicker value={formExpiry || undefined} onChange={(v) => setFormExpiry(v ?? "")} />
            </div>

            {/* Title — full width */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                {isEn ? "Title" : "عنوان الوثيقة"}
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={isEn ? "e.g. National ID No. 123456" : "مثال: هوية وطنية رقم 123456"}
                className="border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-soft)] text-[var(--text-primary)] outline-none focus:border-[var(--primary)]"
                dir="auto"
              />
            </div>

            {/* Notes — full width */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                {isEn ? "Notes (optional)" : "ملاحظات (اختياري)"}
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm bg-[var(--surface-soft)] text-[var(--text-primary)] outline-none focus:border-[var(--primary)] resize-none"
                dir="auto"
              />
            </div>

            {/* Document image upload — full width */}
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                {isEn ? "Document Image (optional)" : "صورة الوثيقة (اختياري)"}
              </label>

              {(formImageUrl || formImagePreview) ? (
                <div className="relative w-full">
                  <img
                    src={formImagePreview ?? formImageUrl!}
                    alt=""
                    className="w-full max-h-48 object-contain rounded-lg border border-[var(--card-border)] bg-[var(--surface-soft)] cursor-pointer"
                    onClick={() => setLightboxUrl(formImageUrl ?? formImagePreview)}
                  />
                  {!imageUploading && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formImagePreview) URL.revokeObjectURL(formImagePreview);
                        setFormImageUrl(null);
                        setFormImagePreview(null);
                      }}
                      className="absolute top-1 end-1 bg-[var(--danger)] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs leading-none"
                      title={isEn ? "Remove" : "حذف"}
                    >
                      ×
                    </button>
                  )}
                  {imageUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                      <span className="text-white text-xs">{isEn ? "Uploading…" : "جاري الرفع…"}</span>
                    </div>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--card-border)] rounded-lg p-5 cursor-pointer hover:border-[var(--primary)] transition-colors">
                  <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-[var(--text-muted)]">
                    {imageUploading
                      ? isEn ? "Uploading…" : "جاري الرفع…"
                      : isEn ? "Click to attach image or PDF" : "اضغط لإرفاق صورة أو PDF"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    disabled={imageUploading}
                    onChange={(e) => void handleImageChange(e)}
                  />
                </label>
              )}

              {imageUploadError && (
                <p className="text-xs text-[var(--danger)]">{imageUploadError}</p>
              )}
            </div>
          </div>

          {formError && <p className="text-xs text-[var(--danger)]">{formError}</p>}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting
                ? isEn ? "Saving..." : "جاري الحفظ..."
                : isEn ? "Save" : "حفظ"}
            </Button>
          </div>
        </form>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 h-20"
            />
          ))}
        </div>
      ) : error ? (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 flex flex-col items-center gap-3">
          <p className="text-[var(--danger)] text-sm">{error}</p>
          <button
            type="button"
            onClick={() => void loadDocuments()}
            className="text-xs text-[var(--primary)] underline"
          >
            {isEn ? "Retry" : "إعادة المحاولة"}
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-12 flex flex-col items-center gap-2">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--text-muted)]"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <p className="text-sm text-[var(--text-muted)]">
            {isEn ? "No documents added yet." : "لا توجد وثائق مضافة بعد."}
          </p>
          {canManage && (
            <p className="text-xs text-[var(--text-muted)]">
              {isEn
                ? "Use the button above to add the first document."
                : "استخدم الزر أعلاه لإضافة أول وثيقة."}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((doc) => {
            const typeLabel = DOC_TYPE_LABELS[doc.doc_type] ?? DOC_TYPE_LABELS.other;
            const typeColor = DOC_TYPE_COLORS[doc.doc_type] ?? DOC_TYPE_COLORS.other;
            const expired = isExpired(doc.expiry_date);
            const expiringSoon = !expired && isExpiringSoon(doc.expiry_date);

            return (
              <div
                key={doc.id}
                className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 flex flex-col gap-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeColor}`}
                    >
                      {isEn ? typeLabel.en : typeLabel.ar}
                    </span>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {doc.title}
                    </p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      disabled={deletingId === doc.id}
                      onClick={() => void handleDelete(doc.id)}
                      className="text-xs text-[var(--danger)] hover:underline flex-shrink-0 disabled:opacity-50"
                    >
                      {deletingId === doc.id
                        ? isEn ? "Deleting..." : "جاري الحذف..."
                        : isEn ? "Delete" : "حذف"}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {doc.expiry_date && (
                    <span
                      className={[
                        "text-xs font-medium",
                        expired
                          ? "text-[var(--danger)]"
                          : expiringSoon
                          ? "text-[var(--warning)]"
                          : "text-[var(--text-muted)]",
                      ].join(" ")}
                    >
                      {expired
                        ? isEn ? "Expired: " : "منتهية: "
                        : expiringSoon
                        ? isEn ? "Expires soon: " : "تنتهي قريباً: "
                        : isEn ? "Expires: " : "تنتهي: "}
                      {formatDate(doc.expiry_date, locale)}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-muted)]">
                    {isEn ? "Added: " : "أضيفت: "}
                    {formatDate(doc.created_at, locale)}
                  </span>
                </div>

                {doc.notes && (
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                    {doc.notes}
                  </p>
                )}

                {doc.image_url && (
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(doc.image_url)}
                    className="mt-1 self-start"
                  >
                    <img
                      src={doc.image_url}
                      alt=""
                      className="h-20 w-auto rounded-lg border border-[var(--card-border)] object-cover hover:opacity-80 transition-opacity"
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 end-4 text-white bg-black/50 rounded-full w-8 h-8 flex items-center justify-center text-lg"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
