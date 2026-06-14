"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnv } from "@/lib/env/public";
import { cn } from "@/lib/brand/brand-utils";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type SessionStatus = "loading" | "ready" | "capturing" | "uploading" | "success" | "expired" | "error";

/* ── Anon Supabase client ──────────────────────────────────────────────────── */

function getAnonSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/* ── Compress image ────────────────────────────────────────────────────────── */

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 800;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round((h / w) * MAX); w = MAX; }
        else { w = Math.round((w / h) * MAX); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
        "image/webp",
        0.82,
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

/* ── Page ──────────────────────────────────────────────────────────────────── */

export default function MobileUploadPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStatus("error"); setErrorMsg("رابط غير صالح"); return; }

    const sb = getAnonSupabase();
    sb.from("upload_sessions")
      .select("id, status, expires_at")
      .eq("token", token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setStatus("error"); setErrorMsg("رابط غير صالح أو منتهي الصلاحية"); return; }
        if (data.status === "completed") { setStatus("success"); return; }
        if (data.status === "expired" || new Date(data.expires_at) < new Date()) {
          setStatus("expired"); return;
        }
        setStatus("ready");
      });
  }, [token]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturedFile(file);
    setPreview(URL.createObjectURL(file));
    setStatus("capturing");
  };

  const handleUpload = async () => {
    if (!capturedFile || !token) return;
    setStatus("uploading");
    setErrorMsg("");

    try {
      const compressed = await compressImage(capturedFile);
      const formData = new FormData();
      formData.append("token", token);
      formData.append("file", compressed, "photo.webp");

      const res = await fetch("/api/web/upload/mobile", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error?.message || "فشل رفع الصورة");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "فشل رفع الصورة");
    }
  };

  const handleRetake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setCapturedFile(null);
    setStatus("ready");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f4f8] to-[#e2e8f0] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-[#059669] to-[#10b981] px-6 py-5 text-white text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/20 flex items-center justify-center">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-bold">التقاط صورة الطالب</h1>
          <p className="text-sm text-white/80 mt-1">التقط صورة واضحة للطالب</p>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Loading */}
          {status === "loading" && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-[#e2e8f0] border-t-[#059669] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">جاري التحقق...</p>
            </div>
          )}

          {/* Ready — show capture button */}
          {status === "ready" && (
            <div className="text-center py-8 space-y-5">
              <div className="w-28 h-28 mx-auto rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <label className="block">
                <span className={cn(
                  "inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold text-base",
                  "bg-gradient-to-l from-[#059669] to-[#10b981] shadow-lg shadow-emerald-200",
                  "active:scale-95 transition-transform cursor-pointer",
                )}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  التقاط صورة
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={handleCapture}
                />
              </label>
              <p className="text-xs text-gray-400">أو اختر صورة من المعرض</p>
            </div>
          )}

          {/* Capturing — preview + confirm */}
          {status === "capturing" && preview && (
            <div className="text-center py-4 space-y-4">
              <div className="w-40 h-40 mx-auto rounded-2xl overflow-hidden border-2 border-[#059669] shadow-lg">
                <img src={preview} alt="معاينة" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm text-gray-600 font-semibold">هل الصورة واضحة؟</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleUpload}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#059669] text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  رفع الصورة
                </button>
                <button
                  onClick={handleRetake}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm active:scale-95 transition-transform"
                >
                  إعادة التقاط
                </button>
              </div>
            </div>
          )}

          {/* Uploading */}
          {status === "uploading" && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-[#e2e8f0] border-t-[#059669] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600 font-semibold">جاري رفع الصورة...</p>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#059669] flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">تم بنجاح!</h2>
              <p className="text-sm text-gray-500">تم رفع الصورة. يمكنك إغلاق هذه الصفحة.</p>
            </div>
          )}

          {/* Expired */}
          {status === "expired" && (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">انتهت صلاحية الرابط</h2>
              <p className="text-sm text-gray-500">يرجى إنشاء رمز QR جديد من الكمبيوتر.</p>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800">حدث خطأ</h2>
              <p className="text-sm text-gray-500">{errorMsg || "تعذر إتمام العملية"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
