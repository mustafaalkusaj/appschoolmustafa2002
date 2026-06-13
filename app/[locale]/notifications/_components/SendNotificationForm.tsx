"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Send, AlertCircle, CheckCircle2, Users, GraduationCap, School,
  BookOpen, Layers, User, Bell, AlertTriangle, Ban, Search, Loader2,
  Image, Video, ExternalLink, Pin, Upload, X,
} from "@/lib/icons";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { useRuntimeBranding } from "@/hooks/brand/useRuntimeBranding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/brand/brand-utils";
import type {
  NotificationTargetType, NotificationPriority, NotificationCategory,
  NotificationTemplate, NotificationMediaType,
} from "@/lib/notifications/types";

interface Props {
  schoolId: string;
  branchId?: string;
  locale: string;
  onSuccess?: () => void;
}

interface ClassItem { id: string; name: string; sections?: string[] }
interface TeacherItem { id: string; full_name: string | null; subject: string | null; auth_user_id: string | null; classes_taught?: { grade: string; section: string }[] }

const PRIORITY_OPTIONS: NotificationPriority[] = ["normal", "important", "urgent"];
const CATEGORY_OPTIONS: NotificationCategory[] = ["general", "exams", "homework", "holiday", "financial", "activity"];
const TARGET_TYPES: NotificationTargetType[]   = ["all", "students", "teachers", "class", "section", "person"];

const PRIORITY_CONFIG: Record<NotificationPriority, { color: string; bg: string; border: string; label: string; desc: string }> = {
  normal:    { color: "var(--text-secondary)", bg: "var(--surface-soft)",                                    border: "var(--border)",                                        label: "عادي",  desc: "إشعار روتيني"    },
  important: { color: "var(--warning)",        bg: "color-mix(in srgb, var(--warning) 8%, transparent)",     border: "color-mix(in srgb, var(--warning) 40%, transparent)", label: "مهم",   desc: "يستلزم الانتباه" },
  urgent:    { color: "var(--danger)",         bg: "color-mix(in srgb, var(--danger) 8%, transparent)",      border: "color-mix(in srgb, var(--danger) 40%, transparent)",  label: "عاجل",  desc: "أمر طارئ"        },
};
const PRIORITY_ICONS: Record<NotificationPriority, React.ElementType> = { normal: Bell, important: AlertTriangle, urgent: Ban };

const TARGET_ICONS: Record<NotificationTargetType, React.ReactNode> = {
  all: <Users size={13} />, students: <GraduationCap size={13} />, teachers: <School size={13} />,
  class: <BookOpen size={13} />, section: <Layers size={13} />, person: <User size={13} />,
};

const CATEGORY_EMOJIS: Record<NotificationCategory, string> = {
  general: "🔔", exams: "📝", homework: "📚", holiday: "🎉", financial: "💳", activity: "⚽",
};

const TEMPLATE_CONFIG: Record<NotificationTemplate, { label: string; emoji: string; color: string; bg: string; desc: string }> = {
  default:     { label: "افتراضي",   emoji: "📋", color: "var(--primary)",  bg: "color-mix(in srgb, var(--primary) 10%, transparent)",  desc: "شكل قياسي"         },
  alert:       { label: "تنبيه",     emoji: "🚨", color: "var(--danger)",   bg: "color-mix(in srgb, var(--danger) 10%, transparent)",   desc: "بارز ولافت للنظر"  },
  celebration: { label: "احتفالي",   emoji: "🎉", color: "var(--success)",  bg: "color-mix(in srgb, var(--success) 10%, transparent)",  desc: "للمناسبات السارة"  },
  info:        { label: "معلوماتي",  emoji: "ℹ️", color: "#2563EB",         bg: "rgba(37,99,235,0.08)",                                  desc: "إرشادات وتوضيحات" },
  reminder:    { label: "تذكير",     emoji: "⏰", color: "var(--warning)",  bg: "color-mix(in srgb, var(--warning) 10%, transparent)",  desc: "تذكير بموعد أو مهمة" },
};
const TEMPLATE_OPTIONS: NotificationTemplate[] = ["default", "alert", "celebration", "info", "reminder"];

const MEDIA_CONFIG: Record<NotificationMediaType, { label: string; icon: React.ElementType; color: string }> = {
  image: { label: "صورة",  icon: Image,        color: "var(--primary)" },
  video: { label: "فيديو", icon: Video,        color: "var(--danger)"  },
  link:  { label: "رابط",  icon: ExternalLink, color: "var(--success)" },
};

const TITLE_MAX = 120;
const BODY_MAX  = 2000;

function SectionCard({ step, title, color, children }: { step: number; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <div className="h-1 w-full" style={{ background: color }} />
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ background: color }}>
            {step}
          </div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SendNotificationForm({ schoolId, branchId, locale, onSuccess }: Props) {
  const branding = useRuntimeBranding();
  const t      = useTranslations("notifications.form");
  const tTypes = useTranslations("notifications.targetTypes");

  const [title,    setTitle]    = useState("");
  const [body,     setBody]     = useState("");
  const [priority, setPriority] = useState<NotificationPriority>("normal");
  const [category, setCategory] = useState<NotificationCategory>("general");
  const [template, setTemplate] = useState<NotificationTemplate>("default");
  const [mediaUrl,  setMediaUrl]  = useState("");
  const [mediaType, setMediaType] = useState<NotificationMediaType | null>(null);
  const [targetType,    setTargetType]    = useState<NotificationTargetType>("all");
  const [targetClass,   setTargetClass]   = useState("");
  const [targetSection, setTargetSection] = useState("");
  const [channels, setChannels] = useState<string[]>(["insite"]);
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const [classes,        setClasses]        = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [teachers,         setTeachers]         = useState<TeacherItem[]>([]);
  const [loadingTeachers,  setLoadingTeachers]  = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [teacherSearch,    setTeacherSearch]    = useState("");
  const [teacherFilter,    setTeacherFilter]    = useState("");

  const [uploading,       setUploading]       = useState(false);
  const [uploadError,     setUploadError]     = useState<string | null>(null);
  const [uploadProgress,  setUploadProgress]  = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    setUploadProgress(0);

    const isVideo = VIDEO_MIME.includes(file.type);

    if (isVideo) {
      // ── فيديو: signed URL مباشر لـ Supabase (يتجاوز Vercel) ──
      try {
        const params = new URLSearchParams({ filename: file.name, contentType: file.type, schoolId });
        const urlRes = await fetch(`/api/web/notifications/upload-url?${params.toString()}`);
        const urlData = await urlRes.json().catch(() => null);
        if (!urlRes.ok || !urlData?.ok) {
          setUploadError(urlData?.error ?? "تعذر الحصول على رابط الرفع");
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", urlData.signedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setMediaUrl(urlData.publicUrl);
              setUploadProgress(100);
              resolve();
            } else {
              reject(new Error(`رمز الحالة ${xhr.status}`));
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
      // ── صورة: route عادي مع validation ──
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("schoolId", schoolId);
        const res  = await fetch("/api/web/notifications/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setMediaUrl(data.url);
          setUploadProgress(100);
        } else {
          setUploadError(data?.error ?? "فشل رفع الصورة");
        }
      } catch {
        setUploadError("فشل رفع الصورة، تحقق من الاتصال");
      } finally {
        setUploading(false);
      }
    }
  }

  useEffect(() => {
    if (targetType !== "class" && targetType !== "section") return;
    if (classes.length > 0) return;
    setLoadingClasses(true);
    fetchWithAuthorizedSession(`/api/web/dashboard/structure?schoolId=${schoolId}${branchId ? `&branchId=${branchId}` : ""}`)
      .then((r) => r.json()).then((data) => { if (data?.ok && data.classes) setClasses(data.classes as ClassItem[]); })
      .catch(() => {}).finally(() => setLoadingClasses(false));
  }, [targetType, schoolId, branchId, classes.length]);

  useEffect(() => {
    if (targetType !== "teachers" && targetType !== "class" && targetType !== "section") return;
    if (teachers.length > 0) return;
    setLoadingTeachers(true);
    fetchWithAuthorizedSession(`/api/web/teachers?schoolId=${schoolId}&status=active&pageSize=200`)
      .then((r) => r.json())
      .then((data) => {
        const list = data?.teachers ?? data?.data ?? data?.items ?? [];
        if (Array.isArray(list)) setTeachers(list as TeacherItem[]);
      })
      .catch(() => {}).finally(() => setLoadingTeachers(false));
  }, [targetType, schoolId, teachers.length]);

  function handleTargetTypeChange(type: NotificationTargetType) {
    setTargetType(type); setTargetClass(""); setTargetSection("");
    setSelectedTeachers([]); setTeacherSearch(""); setTeacherFilter("");
  }

  function toggleTeacher(uid: string) {
    setSelectedTeachers((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  }

  function toggleChannel(ch: string) {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setLoading(true); setFeedback(null);
    try {
      const res = await fetchWithAuthorizedSession("/api/web/notifications/send-all", {
        method: "POST", headers: withJsonHeaders(),
        body: JSON.stringify({
          schoolId, branchId,
          title: title.trim(), body: body.trim(),
          priority, category, template, channels,
          mediaUrl:  mediaUrl.trim()  || undefined,
          mediaType: mediaType || undefined,
          target: {
            targetType,
            targetClass:   targetClass   || undefined,
            targetSection: targetSection || undefined,
            targetUserIds: (targetType === "teachers" && selectedTeachers.length > 0) ? selectedTeachers : undefined,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setFeedback({ ok: true, message: t("success", { count: data.recipientCount ?? 0 }) });
        setTitle(""); setBody(""); setPriority("normal"); setCategory("general");
        setTemplate("default"); setMediaUrl(""); setMediaType(null);
        handleTargetTypeChange("all"); setChannels(["insite"]);
        onSuccess?.();
      } else {
        setFeedback({ ok: false, message: data?.error ?? t("error") });
      }
    } catch {
      setFeedback({ ok: false, message: t("error") });
    } finally {
      setLoading(false);
    }
  }

  const priorityCfg        = PRIORITY_CONFIG[priority];
  const templateCfg        = TEMPLATE_CONFIG[template];
  const selectedClassObj   = classes.find((c) => c.name === targetClass);
  const teacherFilterObj   = teachers.find((tc) => tc.id === teacherFilter);
  const displayClasses     = teacherFilter && teacherFilterObj?.classes_taught?.length
    ? classes.filter((cls) => (teacherFilterObj.classes_taught ?? []).some((ct) => ct.grade === cls.name))
    : classes;
  const availableSections  = (() => {
    const secs = selectedClassObj?.sections ?? [];
    if (!teacherFilter || !teacherFilterObj?.classes_taught?.length) return secs;
    return secs.filter((sec) =>
      (teacherFilterObj.classes_taught ?? []).some((ct) => ct.grade === targetClass && ct.section === sec)
    );
  })();
  const filteredTeachers   = teachers.filter((tc) => {
    const q = teacherSearch.toLowerCase();
    return !q || (tc.full_name ?? "").toLowerCase().includes(q) || (tc.subject ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 space-y-4">

        {/* ── 1: المحتوى ── */}
        <SectionCard step={1} title={t("heading")} color="var(--primary)">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">{t("title")}</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder={t("titlePlaceholder")} required
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] focus:bg-[var(--card-bg)] transition-all"
              />
              <p className="text-end text-[11px] text-[var(--text-muted)] mt-1">{title.length}/{TITLE_MAX}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">{t("body")}</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                placeholder={t("bodyPlaceholder")} required rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] focus:bg-[var(--card-bg)] transition-all resize-none"
              />
              <p className="text-end text-[11px] text-[var(--text-muted)] mt-1">{body.length}/{BODY_MAX}</p>
            </div>
          </div>
        </SectionCard>

        {/* ── 2: التصميم والوسائط ── */}
        <SectionCard step={2} title="تصميم الإشعار والوسائط" color="#7C3AED">
          <div className="space-y-5">

            {/* Template selector */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">شكل الإشعار</label>
              <div className="grid grid-cols-5 gap-2">
                {TEMPLATE_OPTIONS.map((tpl) => {
                  const cfg      = TEMPLATE_CONFIG[tpl];
                  const isActive = template === tpl;
                  return (
                    <button key={tpl} type="button" onClick={() => setTemplate(tpl)}
                      className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all duration-200 hover:-translate-y-0.5"
                      style={isActive ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : { borderColor: "var(--border)", background: "var(--surface-soft)", color: "var(--text-muted)" }}
                    >
                      {isActive && (
                        <motion.div layoutId="template-bg" className="absolute inset-0 rounded-xl" style={{ background: cfg.bg }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                      )}
                      <div className="relative">
                        <span className="text-xl block">{cfg.emoji}</span>
                        <span className="text-[10px] font-bold block mt-0.5">{cfg.label}</span>
                        <span className="text-[9px] opacity-60 block mt-0.5 leading-tight">{cfg.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Media attachment */}
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                إرفاق وسائط <span className="normal-case text-[10px] font-normal text-[var(--text-muted)]">(اختياري)</span>
              </label>

              {/* Media type selector */}
              <div className="flex gap-2 mb-3">
                <button type="button" onClick={() => setMediaType(null)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all",
                    mediaType === null ? "border-[var(--border)] bg-[var(--text-muted)] text-white" : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-muted)]"
                  )}>
                  بدون
                </button>
                {(Object.entries(MEDIA_CONFIG) as [NotificationMediaType, typeof MEDIA_CONFIG[NotificationMediaType]][]).map(([type, cfg]) => {
                  const MediaIcon = cfg.icon;
                  const isActive  = mediaType === type;
                  return (
                    <button key={type} type="button" onClick={() => setMediaType(type)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                      style={isActive ? { borderColor: cfg.color, background: cfg.color, color: "white" } : { borderColor: "var(--border)", background: "var(--surface-soft)", color: "var(--text-muted)" }}
                    >
                      <MediaIcon size={12} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {/* hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={
                  mediaType === "image"
                    ? "image/jpeg,image/png,image/webp,image/gif"
                    : "video/mp4,video/webm,video/quicktime"
                }
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                  e.target.value = "";
                }}
              />

              {/* Media input area */}
              <AnimatePresence>
                {mediaType !== null && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="overflow-hidden space-y-3">

                    {/* Upload zone (image & video only) */}
                    {(mediaType === "image" || mediaType === "video") && (
                      <div>
                        {/* Drop zone / upload button */}
                        {!mediaUrl ? (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-[#7C3AED]/40 bg-[rgba(124,58,237,0.04)] text-[var(--text-muted)] hover:border-[#7C3AED] hover:bg-[rgba(124,58,237,0.08)] transition-all group disabled:opacity-60"
                          >
                            {uploading ? (
                              <>
                                <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
                                <span className="text-xs font-semibold text-[#7C3AED]">جارٍ الرفع...</span>
                                {uploadProgress > 0 && (
                                  <div className="w-40 mt-1">
                                    <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                                      <motion.div
                                        className="h-full rounded-full"
                                        style={{ background: "#7C3AED" }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${uploadProgress}%` }}
                                        transition={{ ease: "easeOut", duration: 0.3 }}
                                      />
                                    </div>
                                    <p className="text-[10px] text-center text-[#7C3AED] font-bold mt-0.5">{uploadProgress}%</p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <Upload size={24} className="group-hover:text-[#7C3AED] transition-colors" />
                                <div className="text-center">
                                  <p className="text-xs font-bold group-hover:text-[#7C3AED] transition-colors">
                                    {mediaType === "image" ? "اضغط لرفع صورة" : "اضغط لرفع فيديو"}
                                  </p>
                                  <p className="text-[10px] mt-0.5">
                                    {mediaType === "image" ? "JPEG, PNG, WEBP, GIF — حتى 5 ميجا" : "MP4, WEBM — حتى 50 ميجا"}
                                  </p>
                                </div>
                              </>
                            )}
                          </button>
                        ) : (
                          /* Preview with remove button */
                          <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-soft)]">
                            {mediaType === "image" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={mediaUrl} alt="معاينة" className="w-full max-h-48 object-contain" />
                            ) : (
                              <video src={mediaUrl} controls className="w-full max-h-48" />
                            )}
                            <button
                              type="button"
                              onClick={() => { setMediaUrl(""); setUploadError(null); }}
                              className="absolute top-2 end-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {/* Upload error */}
                        {uploadError && (
                          <p className="text-xs text-[var(--danger)] flex items-center gap-1 mt-1">
                            <AlertCircle size={12} /> {uploadError}
                          </p>
                        )}

                        {/* OR separator + URL fallback */}
                        {!mediaUrl && !uploading && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-px bg-[var(--border)]" />
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">أو أدخل رابط</span>
                            <div className="flex-1 h-px bg-[var(--border)]" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* URL input — always for link, fallback for image/video */}
                    {(mediaType === "link" || (!mediaUrl && !uploading)) && (
                      <div className="relative">
                        <ExternalLink size={14} className="absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)]" />
                        <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                          placeholder={
                            mediaType === "image" ? "https://example.com/image.jpg"
                            : mediaType === "video" ? "https://youtube.com/watch?v=..."
                            : "https://example.com/page"
                          }
                          className="w-full ps-9 pe-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition"
                        />
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SectionCard>

        {/* ── 3: الأولوية والتصنيف ── */}
        <SectionCard step={3} title="الأولوية والتصنيف" color="var(--warning)">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t("priority")}</label>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITY_OPTIONS.map((p) => {
                  const PriorityIcon = PRIORITY_ICONS[p];
                  const cfg = PRIORITY_CONFIG[p]; const isActive = priority === p;
                  return (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className="relative p-3.5 rounded-xl border-2 text-center transition-all duration-200 hover:-translate-y-0.5"
                      style={isActive ? { borderColor: cfg.color, background: cfg.bg, color: cfg.color } : { borderColor: "var(--border)", background: "var(--surface-soft)", color: "var(--text-muted)" }}
                    >
                      {isActive && <motion.div layoutId="priority-bg" className="absolute inset-0 rounded-xl" style={{ background: cfg.bg }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
                      <div className="relative">
                        <PriorityIcon className="mx-auto mb-1.5" size={22} />
                        <span className="text-xs font-black block">{cfg.label}</span>
                        <span className="text-[10px] opacity-70 block mt-0.5">{cfg.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t("category")}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all duration-150 hover:-translate-y-0.5",
                      category === c ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm" : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40"
                    )}>
                    {CATEGORY_EMOJIS[c]} {t(`categories.${c}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── 4: المستلمون ── */}
        <SectionCard step={4} title="المستلمون" color="var(--success)">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {TARGET_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => handleTargetTypeChange(type)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all duration-150",
                    targetType === type ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] hover:border-[var(--success)]/40"
                  )}>
                  {TARGET_ICONS[type]}{tTypes(type)}
                </button>
              ))}
            </div>

            {/* Class picker */}
            <AnimatePresence>
              {(targetType === "class" || targetType === "section") && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 space-y-2">
                    {/* Teacher filter */}
                    {teachers.filter((tc) => tc.classes_taught?.length).length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5 mb-1.5"><School size={12} />فلتر حسب الأستاذ</p>
                        <select
                          value={teacherFilter}
                          onChange={(e) => { setTeacherFilter(e.target.value); setTargetClass(""); setTargetSection(""); }}
                          className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30 transition mb-2"
                        >
                          <option value="">كل الصفوف</option>
                          {teachers.filter((tc) => tc.classes_taught?.length).map((tc) => (
                            <option key={tc.id} value={tc.id}>{tc.full_name ?? "أستاذ"}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <p className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5"><BookOpen size={12} />اختر الصف</p>
                    {loadingClasses ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-1"><Loader2 size={13} className="animate-spin" />جاري التحميل...</div>
                    ) : displayClasses.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)] py-1">{teacherFilter ? "لا توجد صفوف مخصصة لهذا الأستاذ" : "لا توجد صفوف مسجّلة"}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {displayClasses.map((cls) => (
                          <button key={cls.id ?? cls.name} type="button" onClick={() => { setTargetClass(cls.name); setTargetSection(""); }}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                              targetClass === cls.name ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:border-[var(--success)]/50"
                            )}>
                            {cls.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Section picker */}
            <AnimatePresence>
              {targetType === "section" && targetClass && availableSections.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 space-y-2">
                    <p className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5"><Layers size={12} />اختر الشعبة</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availableSections.map((sec) => (
                        <button key={sec} type="button" onClick={() => setTargetSection(sec)}
                          className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                            targetSection === sec ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:border-[var(--primary)]/50"
                          )}>
                          {sec}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              {targetType === "section" && targetClass && availableSections.length === 0 && !loadingClasses && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <input type="text" value={targetSection} onChange={(e) => setTargetSection(e.target.value)}
                    placeholder="اكتب اسم الشعبة"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Teachers picker */}
            <AnimatePresence>
              {targetType === "teachers" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5"><School size={12} />تحديد الأساتذة</p>
                      {selectedTeachers.length > 0 && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--success) 12%, transparent)", color: "var(--success)" }}>
                          {selectedTeachers.length} محدد
                        </span>
                      )}
                    </div>
                    {selectedTeachers.length === 0 && <p className="text-[11px] text-[var(--text-muted)]">بدون تحديد = إرسال لجميع الأساتذة</p>}
                    <div className="relative">
                      <Search size={13} className="absolute top-1/2 -translate-y-1/2 start-3 text-[var(--text-muted)]" />
                      <input type="text" value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} placeholder="ابحث عن أستاذ..."
                        className="w-full ps-8 pe-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--success)]/30 transition"
                      />
                    </div>
                    {loadingTeachers ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] py-2"><Loader2 size={13} className="animate-spin" />جاري تحميل الأساتذة...</div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1 -mx-1 px-1">
                        {filteredTeachers.length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)] py-2">لا توجد نتائج</p>
                        ) : filteredTeachers.map((teacher) => {
                          const uid = teacher.auth_user_id ?? teacher.id;
                          const checked = selectedTeachers.includes(uid);
                          return (
                            <button key={teacher.id} type="button" onClick={() => toggleTeacher(uid)}
                              className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-start transition-all",
                                checked ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)]" : "border-transparent hover:border-[var(--border)] hover:bg-[var(--card-bg)]"
                              )}>
                              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all"
                                style={checked ? { borderColor: "var(--success)", background: "var(--success)" } : { borderColor: "var(--border)", background: "transparent" }}>
                                {checked && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{teacher.full_name ?? "أستاذ"}</p>
                                {teacher.subject && <p className="text-[10px] text-[var(--text-muted)] truncate">{teacher.subject}</p>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {selectedTeachers.length > 0 && (
                      <button type="button" onClick={() => setSelectedTeachers([])} className="text-[11px] text-[var(--danger)] hover:underline">
                        إلغاء تحديد الكل
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SectionCard>

        {/* ── 5: القنوات + إرسال ── */}
        <SectionCard step={5} title="قنوات الإرسال والإرسال" color="var(--danger)">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Insite */}
              <button type="button" onClick={() => toggleChannel("insite")}
                className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 text-center",
                  channels.includes("insite") ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]" : "border-[var(--border)] bg-[var(--surface-soft)] opacity-60"
                )}>
                <span className="text-2xl">🔔</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: channels.includes("insite") ? "var(--primary)" : "var(--text-muted)" }}>داخل الموقع</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">إشعار في لوحة الإدارة</p>
                </div>
                {channels.includes("insite") && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--primary)", color: "white" }}>مفعّل</span>}
              </button>

              {/* Push */}
              <button type="button" onClick={() => toggleChannel("push")}
                className={cn("flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150 text-center",
                  channels.includes("push") ? "border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_8%,transparent)]" : "border-[var(--border)] bg-[var(--surface-soft)] opacity-60"
                )}>
                <span className="text-2xl">📱</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: channels.includes("push") ? "var(--success)" : "var(--text-muted)" }}>إرسال عبر التطبيق</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">إشعار فوري على الهاتف</p>
                </div>
                {channels.includes("push") && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--success)", color: "white" }}>مفعّل</span>}
              </button>
            </div>

            <AnimatePresence>
              {feedback && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={cn("flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border",
                    feedback.ok ? "bg-[color-mix(in_srgb,var(--success)_8%,transparent)] text-[var(--success)] border-[var(--success)]/20"
                               : "bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] text-[var(--danger)] border-[var(--danger)]/20"
                  )}>
                  {feedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {feedback.message}
                </motion.div>
              )}
            </AnimatePresence>

            <Button type="submit" disabled={loading || !title.trim() || !body.trim() || channels.length === 0}
              className="w-full gap-2 font-bold" style={{ minHeight: 48 }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {loading ? t("sending") : t("send")}
            </Button>
          </div>
        </SectionCard>
      </form>

      {/* ── Sticky Preview ── */}
      <div className="hidden md:block w-72 flex-shrink-0">
        <div className="sticky top-6 space-y-4">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">معاينة الإشعار</p>
          <div className="rounded-[28px] overflow-hidden border-4 shadow-xl" style={{ borderColor: "var(--border)" }}>
            <div className="h-7 flex items-center justify-between px-4 text-[10px]" style={{ background: "var(--surface-soft)", color: "var(--text-muted)" }}>
              <span>9:41</span><span>▌▌▌ WiFi 🔋</span>
            </div>
            <div className="p-3" style={{ background: "var(--card-bg)" }}>
              <div className="rounded-2xl overflow-hidden border" style={{ borderColor: templateCfg.color, background: templateCfg.bg }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: templateCfg.bg }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-base">{templateCfg.emoji}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold" style={{ color: templateCfg.color }}>{branding.schoolName || "مدرستك"}</p>
                    <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>الآن · {templateCfg.label}</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border flex-shrink-0"
                    style={{ color: priorityCfg.color, background: priorityCfg.bg, borderColor: priorityCfg.border }}>
                    {priorityCfg.label}
                  </span>
                </div>
                <div className="px-3 py-2.5 space-y-1" style={{ background: "var(--card-bg)" }}>
                  <p className="text-xs font-bold line-clamp-2 leading-snug" style={{ color: "var(--text-primary)" }}>
                    {title || <span style={{ color: "var(--text-muted)", fontWeight: 400, fontStyle: "italic" }}>عنوان الإشعار...</span>}
                  </p>
                  <p className="text-[11px] line-clamp-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {body || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>نص الإشعار...</span>}
                  </p>
                  {mediaUrl && mediaType && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-medium" style={{ color: MEDIA_CONFIG[mediaType].color }}>
                      {mediaType === "image" && "🖼️"}{mediaType === "video" && "🎬"}{mediaType === "link" && "🔗"}
                      <span className="truncate">{MEDIA_CONFIG[mediaType].label} مرفق</span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2 border-t flex items-center gap-2" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{CATEGORY_EMOJIS[category]} {t(`categories.${category}`)}</span>
                  <span style={{ color: "var(--border)" }}>·</span>
                  <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>{TARGET_ICONS[targetType]}<span className="mr-0.5">{tTypes(targetType)}</span></span>
                  {channels.includes("push") && <><span style={{ color: "var(--border)" }}>·</span><span className="text-[10px]" style={{ color: "var(--success)" }}>📱</span></>}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-3 text-xs space-y-1.5 leading-relaxed border" style={{ background: "var(--surface-soft)", borderColor: "var(--border)" }}>
            <p className="font-bold" style={{ color: "var(--text-secondary)" }}>💡 نصائح:</p>
            <p style={{ color: "var(--text-muted)" }}>• اجعل العنوان قصيراً وواضحاً</p>
            <p style={{ color: "var(--text-muted)" }}>• حدد الجمهور المناسب</p>
            <p style={{ color: "var(--text-muted)" }}>• فعّل &ldquo;إرسال عبر التطبيق&rdquo; للإشعارات الفورية</p>
            <p style={{ color: "var(--text-muted)" }}>• اختر قالباً يناسب طبيعة الرسالة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
