"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ImagePlus, Trash2, Send, CheckCircle2 } from "lucide-react";
import type { GradeEntry } from "../_types";

interface EditGradeModalProps {
  entry: GradeEntry | null;
  show: boolean;
  schoolId: string;
  onClose: () => void;
  onSubmit: (entryId: string, data: EditGradePayload) => Promise<void>;
  saving: boolean;
  error: string;
}

export interface EditGradePayload {
  score: number;
  max_score: number;
  grade_type_name: string | null;
  note: string | null;
  status: "draft" | "confirmed";
}

const fieldClasses =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition";

export function EditGradeModal({ entry, show, schoolId, onClose, onSubmit, saving, error }: EditGradeModalProps) {
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [gradeTypeName, setGradeTypeName] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"draft" | "confirmed">("draft");

  // Photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry && show) {
      setScore(String(entry.score ?? ""));
      setMaxScore(String(entry.max_score ?? 100));
      setGradeTypeName(entry.grade_type_name ?? "");
      setNote(entry.note ?? "");
      setStatus(entry.status === "locked" ? "confirmed" : (entry.status as "draft" | "confirmed"));
      setPhotos(Array.isArray((entry as GradeEntry & { exam_photos?: string[] }).exam_photos)
        ? ((entry as GradeEntry & { exam_photos?: string[] }).exam_photos ?? [])
        : []);
      setPhotoError("");
      setSendSuccess(false);
    }
  }, [entry, show]);

  const scoreNum = parseFloat(score);
  const maxNum = parseFloat(maxScore);
  const pct = !isNaN(scoreNum) && !isNaN(maxNum) && maxNum > 0 ? Math.round((scoreNum / maxNum) * 100) : null;
  const isValid = !isNaN(scoreNum) && !isNaN(maxNum) && maxNum > 0 && scoreNum >= 0 && scoreNum <= maxNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!entry || !isValid) return;
    await onSubmit(entry.id, {
      score: scoreNum,
      max_score: maxNum,
      grade_type_name: gradeTypeName.trim() || null,
      note: note.trim() || null,
      status,
    });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !entry) return;
    if (photos.length >= 4) { setPhotoError("الحد الأقصى 4 صور."); return; }
    setUploadingPhoto(true);
    setPhotoError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("entryId", entry.id);
      fd.append("schoolId", schoolId);
      const res = await fetch("/api/web/grades/exam-photos", { method: "POST", body: fd });
      const json = await res.json() as { ok?: boolean; photos?: string[]; error?: { message?: string } };
      if (json.ok && json.photos) setPhotos(json.photos);
      else setPhotoError(json.error?.message ?? "تعذر رفع الصورة.");
    } catch {
      setPhotoError("خطأ في رفع الصورة.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePhoto(url: string) {
    if (!entry) return;
    const params = new URLSearchParams({ entryId: entry.id, schoolId, url });
    const res = await fetch(`/api/web/grades/exam-photos?${params.toString()}`, { method: "DELETE" });
    const json = await res.json() as { ok?: boolean; photos?: string[] };
    if (json.ok && json.photos) setPhotos(json.photos);
  }

  async function handleSendPhotos() {
    if (!entry || photos.length === 0) return;
    setSending(true);
    setSendSuccess(false);
    try {
      const res = await fetch("/api/web/grades/exam-photos/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, schoolId }),
      });
      const json = await res.json() as { ok?: boolean };
      if (json.ok) { setSendSuccess(true); setTimeout(() => setSendSuccess(false), 4000); }
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  return (
    <AnimatePresence>
      {show && entry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-[var(--card-bg)] border border-[var(--border)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] flex-shrink-0">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">تعديل الدرجة</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {entry.student_name ?? "—"} · {entry.subject_name ?? "—"}
                  {entry.teacher_name && <span className="mr-1 opacity-60">· {entry.teacher_name}</span>}
                </p>
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* نوع الامتحان */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">نوع الامتحان</label>
                  <input
                    type="text"
                    value={gradeTypeName}
                    onChange={(e) => setGradeTypeName(e.target.value)}
                    placeholder="مثال: امتحان الفصل الثاني"
                    className={fieldClasses}
                  />
                </div>

                {/* Score row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">الدرجة المحصلة</label>
                    <input type="number" min={0} max={maxNum || undefined} step="0.5" value={score} onChange={(e) => setScore(e.target.value)} className={fieldClasses} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">الدرجة الكاملة</label>
                    <input type="number" min={1} step="0.5" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} className={fieldClasses} required />
                  </div>
                </div>

                {pct !== null && (
                  <div className={`text-center text-2xl font-black tabular-nums ${pct >= 90 ? "text-emerald-500" : pct >= 75 ? "text-blue-500" : pct >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {pct}%
                  </div>
                )}

                {/* الحالة */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">الحالة</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as "draft" | "confirmed")} className={fieldClasses}>
                    <option value="draft">مسودة</option>
                    <option value="confirmed">مؤكدة</option>
                  </select>
                </div>

                {/* ملاحظة */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">ملاحظة</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="ملاحظة اختيارية..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition resize-none" />
                </div>

                {/* ── صور الامتحان ─────────────────────────────────────────── */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                      صور الامتحان ({photos.length}/4)
                    </label>
                    {photos.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSendPhotos}
                        disabled={sending}
                        className="flex items-center gap-1.5 px-3 h-7 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {sending ? <Loader2 size={12} className="animate-spin" /> : sendSuccess ? <CheckCircle2 size={12} /> : <Send size={12} />}
                        {sendSuccess ? "تم الإرسال" : "إرسال للطالب"}
                      </button>
                    )}
                  </div>

                  {/* Photo grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((url) => (
                      <div key={url} className="relative group aspect-square rounded-xl overflow-hidden border border-[var(--border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="صورة امتحان" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(url)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    {photos.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="aspect-square rounded-xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-1 text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors disabled:opacity-50"
                      >
                        {uploadingPhoto ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                        {!uploadingPhoto && <span className="text-[9px] font-semibold">إضافة</span>}
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />

                  {photoError && <p className="text-xs text-[var(--danger)]">{photoError}</p>}
                  {sendSuccess && <p className="text-xs text-emerald-600 font-semibold">✓ تم إرسال الصور للطالب بنجاح</p>}
                </div>

                {error && <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/8 rounded-xl px-3 py-2">{error}</p>}

                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors">
                    إلغاء
                  </button>
                  <button type="submit" disabled={saving || !isValid} className="flex-1 h-10 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
