"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { TeacherRecord } from "../_types";

interface Props {
  teacher: TeacherRecord & { app_username?: string | null; app_password_plain?: string | null };
  locale: "ar" | "en";
  schoolName?: string;
  schoolLogoUrl?: string;
}

export function TeacherPrintCard({ teacher, locale, schoolName, schoolLogoUrl }: Props) {
  const isEn = locale === "en";
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const mounted = useRef(false);

  const username = teacher.app_username ?? "";
  const password = teacher.app_password_plain ?? "";

  useEffect(() => {
    mounted.current = true;
    if (!username || !password) return;

    const qrPayload = JSON.stringify({ username, password });
    QRCode.toDataURL(qrPayload, {
      width: 130,
      margin: 1,
      color: { dark: "#1e1b4b", light: "#ffffff" },
    })
      .then((url) => {
        if (mounted.current) setQrSrc(url);
      })
      .catch(() => {});

    return () => {
      mounted.current = false;
    };
  }, [username, password]);

  const initials = teacher.full_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const cardFont = isEn
    ? "system-ui, -apple-system, sans-serif"
    : "'Noto Sans Arabic', 'Segoe UI', system-ui, sans-serif";

  return (
    <div
      className="teacher-print-card"
      style={{
        width: "148mm",
        height: "105mm",
        background: "#ffffff",
        border: "1px solid #c7d2fe",
        borderRadius: "14px",
        fontFamily: cardFont,
        direction: isEn ? "ltr" : "rtl",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        pageBreakInside: "avoid",
        breakInside: "avoid",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 4px 24px rgba(99,102,241,0.10)",
      }}
    >
      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <span
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "#6366f1",
            opacity: 0.04,
            transform: "rotate(-25deg)",
            whiteSpace: "nowrap",
            userSelect: "none",
            letterSpacing: 4,
          }}
        >
          {isEn ? "ID Card" : "بطاقة هوية"}
        </span>
      </div>

      {/* Gradient Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #9333ea 100%)",
          padding: "12px 16px 28px 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          position: "relative",
          zIndex: 1,
          flexShrink: 0,
        }}
      >
        {/* School logo / initial */}
        <div style={{ flexShrink: 0 }}>
          {schoolLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={schoolLogoUrl}
              alt={schoolName ?? ""}
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                objectFit: "cover",
                border: "1.5px solid rgba(255,255,255,0.4)",
              }}
            />
          ) : (
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: "rgba(255,255,255,0.18)",
                border: "1.5px solid rgba(255,255,255,0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              {(schoolName ?? "S")[0]}
            </div>
          )}
        </div>

        {/* School name + card label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#ffffff",
              opacity: 0.95,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {schoolName ?? (isEn ? "School" : "المدرسة")}
          </div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "rgba(255,255,255,0.65)",
              marginTop: 1,
            }}
          >
            {isEn ? "Teacher ID Card" : "بطاقة هوية معلم"}
          </div>
        </div>

        {/* Decorative dots */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1.5px solid rgba(255,255,255,0.15)",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Avatar overlapping banner bottom */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: -22,
          display: "flex",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {teacher.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={teacher.photo}
            alt={teacher.full_name}
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid #ffffff",
              boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 16,
              fontWeight: 900,
              border: "3px solid #ffffff",
              boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: "10px",
          padding: "6px 14px 10px 14px",
          position: "relative",
          zIndex: 1,
          minHeight: 0,
        }}
      >
        {/* Center: Name + Info */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
          {/* Name */}
          <div
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: "#1e1b4b",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {teacher.full_name}
          </div>

          {/* Employee ID */}
          {teacher.employee_id && (
            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#6366f1",
                  background: "#ede9fe",
                  borderRadius: 4,
                  padding: "2px 8px",
                  direction: "ltr",
                }}
              >
                # {teacher.employee_id}
              </span>
            </div>
          )}

          {/* Info grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px 8px",
              marginTop: 4,
            }}
          >
            {teacher.subject && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {isEn ? "Subject" : "المادة"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#334155" }}>{teacher.subject}</span>
              </div>
            )}
            {teacher.job_title && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {isEn ? "Title" : "المسمى"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#334155" }}>{teacher.job_title}</span>
              </div>
            )}
            {teacher.phone && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {isEn ? "Phone" : "الهاتف"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#334155", direction: "ltr", textAlign: "start" }}>{teacher.phone}</span>
              </div>
            )}
            {teacher.contract_type && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {isEn ? "Contract" : "العقد"}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#334155" }}>
                  {isEn
                    ? teacher.contract_type.replace("_", " ")
                    : teacher.contract_type === "full_time" ? "دوام كامل"
                    : teacher.contract_type === "part_time" ? "دوام جزئي"
                    : teacher.contract_type === "substitute" ? "بديل"
                    : "متطوع"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: QR Code */}
        {qrSrc && (
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt="QR"
              style={{
                width: 68,
                height: 68,
                border: "2px solid #e0e7ff",
                borderRadius: 8,
                display: "block",
              }}
            />
            <span style={{ fontSize: 7, color: "#94a3b8", fontWeight: 600, letterSpacing: 0.3 }}>
              {isEn ? "Scan to login" : "مسح للدخول"}
            </span>
          </div>
        )}
      </div>

      {/* Credentials Footer */}
      {(username || password) && (
        <div
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            borderTop: "1px solid #e0e7ff",
            padding: "7px 14px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            flexShrink: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              background: "#fff",
              border: "1px solid #e0e7ff",
              borderRadius: 6,
              padding: "4px 8px",
            }}
          >
            <div
              style={{
                fontSize: 8,
                fontWeight: 800,
                color: "#6366f1",
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isEn ? "Username" : "اسم المستخدم"}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#1e1b4b",
                fontFamily: "'Courier New', 'Courier', monospace",
                direction: "ltr",
                textAlign: "start",
                letterSpacing: 0.5,
              }}
            >
              {username || "—"}
            </div>
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e0e7ff",
              borderRadius: 6,
              padding: "4px 8px",
            }}
          >
            <div
              style={{
                fontSize: 8,
                fontWeight: 800,
                color: "#7c3aed",
                marginBottom: 3,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {isEn ? "Password" : "كلمة المرور"}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#1e1b4b",
                fontFamily: "'Courier New', 'Courier', monospace",
                direction: "ltr",
                textAlign: "start",
                letterSpacing: 0.5,
              }}
            >
              {password || "—"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
