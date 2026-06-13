"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, User, Loader2, Trash2, QrCode, Camera } from "lucide-react";
import { QRPhotoUpload } from "@/components/ui/QRPhotoUpload";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import type { GradeFilters, SubjectOption, GradeType } from "../_types";

interface StudentResult {
  id: string;
  full_name: string;
  class_name?: string | null;
  section?: string | null;
}

interface GradeEntryModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: GradeEntryPayload) => Promise<void>;
  saving: boolean;
  error: string;
  classes: { id: string; name: string }[];
  sections: { id: string; name: string; class_id: string }[];
  subjects: SubjectOption[];
  gradeTypes: GradeType[];
  schoolId: string;
  defaultFilters: GradeFilters;
}

export interface GradeEntryPayload {
  school_id: string;
  student_id: string;
  subject_id: string;
  class_id: string | null;
  section_id: string | null;
  grade_type_id: string | null;
  grade_type_name: string | null;
  academic_year: string;
  semester: 1 | 2;
  score: number;
  max_score: number;
  note: string | null;
  send_notification: boolean;
  status: "draft" | "confirmed";
  exam_photos: string[];
}

const fieldClasses =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition";

const DEBOUNCE_MS = 300;

export function GradeEntryModal({
  show,
  onClose,
  onSubmit,
  saving,
  error,
  sections,
  subjects,
  gradeTypes,
  schoolId,
  defaultFilters,
}: GradeEntryModalProps) {
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [subjectId, setSubjectId] = useState(defaultFilters.subjectId);
  const [gradeTypeId, setGradeTypeId] = useState(defaultFilters.gradeTypeId);
  const [gradeTypeName, setGradeTypeName] = useState("");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("");
  const [note, setNote] = useState("");
  const [sendNotification, setSendNotification] = useState(false);
  const [status, setStatus] = useState<"draft" | "confirmed">("confirmed");
  const [examPhotos, setExamPhotos] = useState<string[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [academicYear, setAcademicYear] = useState(defaultFilters.academicYear);
  const [semester, setSemester] = useState<1 | 2>(defaultFilters.semester);

  const filteredSections = sections.filter(
    (s) => !defaultFilters.classId || s.class_id === defaultFilters.classId
  );
  const [sectionId, setSectionId] = useState(defaultFilters.sectionId);

  // Reset on open
  useEffect(() => {
    if (show) {
      setStudentSearch("");
      setSelectedStudent(null);
      setStudentResults([]);
      setShowDropdown(false);
      setSubjectId(defaultFilters.subjectId);
      setGradeTypeId(defaultFilters.gradeTypeId);
      setGradeTypeName("");
      setSectionId(defaultFilters.sectionId);
      setScore("");
      setMaxScore("");
      setNote("");
      setSendNotification(false);
      setStatus("confirmed");
      setExamPhotos([]);
      setLocalFiles([]);
      setLocalPreviews([]);
      setShowQR(false);
      setAcademicYear(defaultFilters.academicYear);
      setSemester(defaultFilters.semester);
    }
  }, [show, defaultFilters]);

  // Auto-fill max_score and name from grade type
  useEffect(() => {
    if (gradeTypeId) {
      const gt = gradeTypes.find((g) => g.id === gradeTypeId);
      if (gt) {
        setMaxScore(String(gt.default_max_score));
        setGradeTypeName(gt.name);
      }
    }
  }, [gradeTypeId, gradeTypes]);

  // Debounced student search
  useEffect(() => {
    if (studentSearch.length < 2) {
      setStudentResults([]);
      setShowDropdown(false);
      return;
    }
    setStudentSearchLoading(true);
    const params = new URLSearchParams({ schoolId, search: studentSearch });
    if (defaultFilters.classId) params.set("classId", defaultFilters.classId);
    const timer = setTimeout(() => {
      fetchJsonWithAuthorizedSession<{ ok: boolean; students: StudentResult[] }>(
        `/api/web/payments/students?${params.toString()}`
      )
        .then(({ payload }) => {
          setStudentResults(payload?.students ?? []);
          setShowDropdown(true);
        })
        .catch(() => {})
        .finally(() => setStudentSearchLoading(false));
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [studentSearch, schoolId, defaultFilters.classId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Direct upload from computer — instant local preview, actual upload deferred to save
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);

  const handleDirectUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 4 - examPhotos.length - localPreviews.length;
    const toAdd = Array.from(files).slice(0, remaining);

    toAdd.forEach((file) => {
      const url = URL.createObjectURL(file);
      setLocalPreviews((prev) => [...prev, url]);
      setLocalFiles((prev) => [...prev, file]);
    });
    e.target.value = "";
  }, [examPhotos.length, localPreviews.length]);

  const selectStudent = useCallback((s: StudentResult) => {
    setSelectedStudent(s);
    setStudentSearch(s.full_name);
    setShowDropdown(false);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !subjectId || !score || !maxScore) return;

    // Upload local files first
    const uploadedUrls = [...examPhotos];
    for (const file of localFiles) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const localSessionId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const res = await fetch(`/api/public/exam-photos?sessionId=${localSessionId}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.ok) uploadedUrls.push(data.url);
      } catch { /* ignore */ }
    }

    await onSubmit({
      school_id: schoolId,
      student_id: selectedStudent.id,
      subject_id: subjectId,
      class_id: defaultFilters.classId || null,
      section_id: sectionId || null,
      grade_type_id: gradeTypeId || null,
      grade_type_name: gradeTypeName.trim() || null,
      academic_year: academicYear,
      semester,
      score: Number(score),
      max_score: Number(maxScore),
      note: note.trim() || null,
      send_notification: sendNotification,
      status,
      exam_photos: uploadedUrls,
    });
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex flex-col w-full max-w-lg max-h-[90vh] rounded-2xl bg-[var(--card-bg)] shadow-2xl overflow-hidden border border-[var(--border)]">
              {/* Header */}
              <div
                className="relative flex-shrink-0 px-6 py-5 overflow-hidden"
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
              >
                <div className="absolute top-0 end-0 w-32 h-32 rounded-full opacity-[0.08]" style={{ background: "white", transform: "translate(40%, -40%)" }} />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white/60 text-[10px] font-medium tracking-widest uppercase mb-1">إدخال درجة جديدة</p>
                    <h2 className="text-lg font-black text-white">إضافة درجة طالب</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="h-8 w-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                <form id="grade-entry-form" onSubmit={handleSubmit} className="space-y-4">
                  {/* Student search */}
                  <div className="relative">
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      الطالب <span className="text-[var(--danger)]">*</span>
                    </label>
                    <div className="relative">
                      <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)] pointer-events-none" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          if (selectedStudent && e.target.value !== selectedStudent.full_name) {
                            setSelectedStudent(null);
                          }
                        }}
                        onFocus={() => studentResults.length > 0 && setShowDropdown(true)}
                        placeholder="ابحث عن اسم الطالب..."
                        className={`${fieldClasses} ps-9`}
                        required
                        autoComplete="off"
                      />
                      {studentSearchLoading && (
                        <Loader2 size={14} className="absolute top-1/2 -translate-y-1/2 end-3 text-[var(--primary)] animate-spin" />
                      )}
                    </div>
                    {/* Dropdown */}
                    <AnimatePresence>
                      {showDropdown && studentResults.length > 0 && (
                        <motion.div
                          ref={dropdownRef}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-10 top-full mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                        >
                          {studentResults.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => selectStudent(s)}
                              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-[var(--surface-soft)] text-start transition-colors"
                            >
                              <div className="h-7 w-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                                <User size={13} className="text-[var(--primary)]" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">{s.full_name}</p>
                                {s.class_name && (
                                  <p className="text-[10px] text-[var(--text-muted)]">{s.class_name}{s.section ? ` / ${s.section}` : ""}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      المادة <span className="text-[var(--danger)]">*</span>
                    </label>
                    <select className={fieldClasses} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
                      <option value="">اختر المادة...</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Grade type */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">نوع الدرجة</label>
                    <select
                      className={fieldClasses}
                      value={gradeTypeId}
                      onChange={(e) => setGradeTypeId(e.target.value)}
                    >
                      <option value="">بدون نوع</option>
                      {gradeTypes.map((g) => (
                        <option key={g.id} value={g.id}>{g.name} (/{g.default_max_score})</option>
                      ))}
                    </select>
                  </div>

                  {/* Exam type name — free text, auto-filled from grade type */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      نوع الامتحان
                      <span className="ms-1.5 text-[10px] font-medium normal-case text-[var(--text-muted)]/70">(يمكن الكتابة يدوياً)</span>
                    </label>
                    <input
                      type="text"
                      value={gradeTypeName}
                      onChange={(e) => {
                        setGradeTypeName(e.target.value);
                        // Clear the linked grade type if user types manually
                        if (gradeTypeId) {
                          const gt = gradeTypes.find((g) => g.id === gradeTypeId);
                          if (gt && e.target.value !== gt.name) setGradeTypeId("");
                        }
                      }}
                      placeholder="مثال: اختبار شهري أكتوبر، مراجعة الفصل..."
                      className={fieldClasses}
                    />
                  </div>

                  {/* Score + Max Score */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                        الدرجة <span className="text-[var(--danger)]">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="0"
                        className={fieldClasses}
                        required
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                        الدرجة الكاملة <span className="text-[var(--danger)]">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={maxScore}
                        onChange={(e) => setMaxScore(e.target.value)}
                        placeholder="100"
                        className={fieldClasses}
                        required
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Academic year + Semester */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">السنة الدراسية</label>
                      <input
                        type="text"
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        placeholder="2025-2026"
                        className={fieldClasses}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">الفصل الدراسي</label>
                      <div className="flex rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-soft)]">
                        {([1, 2] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSemester(s)}
                            className={`flex-1 h-10 text-sm font-bold transition-colors ${
                              semester === s
                                ? "bg-[var(--primary)] text-white"
                                : "text-[var(--text-muted)] hover:bg-[var(--card-bg)]"
                            }`}
                          >
                            الفصل {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section (if available) */}
                  {filteredSections.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">الشعبة</label>
                      <select className={fieldClasses} value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                        <option value="">بدون شعبة</option>
                        {filteredSections.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">ملاحظة</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="ملاحظة اختيارية..."
                      rows={2}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition resize-none"
                    />
                  </div>

                  {/* Status toggle */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">الحالة</label>
                    <div className="flex rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-soft)]">
                      {([
                        { value: "confirmed" as const, label: "مؤكدة" },
                        { value: "draft" as const, label: "مسودة" },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatus(opt.value)}
                          className={`flex-1 h-10 text-sm font-bold transition-colors ${
                            status === opt.value
                              ? opt.value === "confirmed"
                                ? "bg-[var(--success)] text-white"
                                : "bg-[var(--warning)] text-white"
                              : "text-[var(--text-muted)] hover:bg-[var(--card-bg)]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exam photos via QR */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
                      صور الامتحان
                      <span className="ms-1.5 text-[10px] font-medium normal-case text-[var(--text-muted)]/70">({examPhotos.length + localPreviews.length}/4)</span>
                    </label>

                    {/* Photos preview (QR + local) */}
                    {(examPhotos.length > 0 || localPreviews.length > 0) && (
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {examPhotos.map((url, i) => (
                          <div key={`qr-${i}`} className="relative group aspect-square rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-soft)]">
                            <img src={url} alt={`صورة ${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {localPreviews.map((url, i) => (
                          <div key={`local-${i}`} className="relative group aspect-square rounded-xl border border-[var(--primary)]/30 overflow-hidden bg-[var(--surface-soft)]">
                            <img src={url} alt={`صورة ${examPhotos.length + i + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setLocalPreviews((p) => p.filter((_, idx) => idx !== i));
                                setLocalFiles((p) => p.filter((_, idx) => idx !== i));
                              }}
                              className="absolute top-1 end-1 h-5 w-5 rounded-md bg-[var(--danger)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload buttons */}
                    {(examPhotos.length + localPreviews.length) < 4 && (
                      <div className="flex gap-2">
                        {/* QR from phone */}
                        <button
                          type="button"
                          onClick={() => setShowQR(true)}
                          className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
                        >
                          <QrCode size={16} />
                          من الهاتف
                        </button>
                        {/* Direct from computer */}
                        <label className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm font-bold text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors cursor-pointer">
                          <Camera size={16} />
                          من الحاسبة
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleDirectUpload}
                          />
                        </label>
                      </div>
                    )}

                    {/* QR Modal — reuses student QRPhotoUpload (realtime, instant) */}
                    <QRPhotoUpload
                      schoolId={schoolId}
                      open={showQR}
                      onPhotoUploaded={(imageUrl) => {
                        setExamPhotos((prev) => [...prev, imageUrl]);
                        setShowQR(false);
                      }}
                      onCancel={() => setShowQR(false)}
                    />
                  </div>

                  {/* Send notification */}
                  <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 hover:bg-[var(--card-bg)] transition-colors">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                    />
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">إرسال إشعار للطالب</p>
                      <p className="text-[10px] text-[var(--text-muted)]">سيتلقى الطالب إشعاراً بالدرجة عبر التطبيق</p>
                    </div>
                  </label>

                  {/* Error */}
                  {error && (
                    <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-3 text-sm text-[var(--danger)] font-medium">
                      {error}
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--card-bg)] px-5 py-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-5 rounded-xl text-sm font-bold text-[var(--text-secondary)] bg-[var(--surface-soft)] border border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  form="grade-entry-form"
                  disabled={saving || !selectedStudent || !subjectId || !score || !maxScore}
                  className="inline-flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-black text-white bg-[var(--primary)] shadow-md shadow-[var(--primary)]/25 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <><Loader2 size={14} className="animate-spin" /> جاري الحفظ...</>
                  ) : (
                    "حفظ الدرجة"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
