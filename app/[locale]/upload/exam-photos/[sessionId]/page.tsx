"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";

const MAX_PHOTOS = 4;

export default function ExamPhotoUploadPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setError("");
      setUploading(true);

      for (let i = 0; i < files.length && photos.length + i < MAX_PHOTOS; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        try {
          const res = await fetch(
            `/api/public/exam-photos?sessionId=${sessionId}`,
            { method: "POST", body: formData },
          );
          const data = await res.json();
          if (data.ok) {
            setPhotos((prev) => [...prev, data.url]);
          } else {
            setError(data.error || "فشل الرفع");
          }
        } catch {
          setError("حدث خطأ أثناء رفع الصورة");
        }
      }

      setUploading(false);
      e.target.value = "";
    },
    [sessionId, photos.length],
  );

  const remaining = MAX_PHOTOS - photos.length;

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)",
        padding: "24px 16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 20,
          padding: "28px 20px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: 28,
            }}
          >
            📷
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", margin: 0 }}>
            رفع صور الامتحان
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
            يمكنك رفع حتى {MAX_PHOTOS} صور
          </p>
        </div>

        {/* Photos grid */}
        {photos.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {photos.map((url, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "2px solid #e2e8f0",
                }}
              >
                <img
                  src={url}
                  alt={`صورة ${i + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {remaining > 0 && !done ? (
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "32px 16px",
              border: "2px dashed #cbd5e1",
              borderRadius: 16,
              cursor: uploading ? "wait" : "pointer",
              background: uploading ? "#f8fafc" : "#fafafa",
              transition: "all 0.2s",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 36 }}>{uploading ? "⏳" : "📸"}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#334155" }}>
              {uploading ? "جاري الرفع..." : "اضغط لاختيار الصور"}
            </span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              متبقي {remaining} {remaining === 1 ? "صورة" : "صور"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        ) : null}

        {/* Error */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              color: "#dc2626",
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        {/* Done button */}
        {photos.length > 0 && !done && (
          <button
            onClick={() => setDone(true)}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, #10b981, #06b6d4)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            تم - ارجع للنظام
          </button>
        )}

        {/* Success */}
        {done && (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            <p style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>
              تم رفع {photos.length} {photos.length === 1 ? "صورة" : "صور"} بنجاح
            </p>
            <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
              يمكنك اغلاق هذه الصفحة والعودة للنظام
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
