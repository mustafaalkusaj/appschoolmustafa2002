"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function AccountDeletionForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    // Hold the element itself: React clears `event.currentTarget` once the
    // handler returns, so reaching for it after the await below would throw
    // and report a failure for a request that actually succeeded.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch("/api/public/account-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.get("full_name"),
          email: form.get("email"),
          school_name: form.get("school_name"),
          login_identifier: form.get("login_identifier"),
          reason: form.get("reason"),
          website: form.get("website"),
          confirmed: form.get("confirmed") === "on",
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error || "تعذر إرسال الطلب.");

      setStatus("success");
      setMessage(
        payload?.message ||
          "تم استلام طلبك. راجع بريدك وتواصل مع المدرسة إذا احتجنا تحققاً إضافياً.",
      );
      formElement.reset();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "تعذر إرسال الطلب.");
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
      <label style={labelStyle}>
        الاسم الكامل
        <input
          name="full_name"
          required
          minLength={2}
          maxLength={120}
          style={inputStyle}
          autoComplete="name"
        />
      </label>
      <label style={labelStyle}>
        البريد الإلكتروني المرتبط بالحساب
        <input
          name="email"
          required
          type="email"
          maxLength={180}
          style={inputStyle}
          autoComplete="email"
          dir="ltr"
        />
      </label>
      <label style={labelStyle}>
        اسم المدرسة
        <input
          name="school_name"
          required
          minLength={2}
          maxLength={160}
          style={inputStyle}
        />
      </label>
      <label style={labelStyle}>
        اسم المستخدم أو معرّف الدخول
        <input
          name="login_identifier"
          required
          minLength={2}
          maxLength={120}
          style={inputStyle}
          dir="ltr"
        />
      </label>
      <label style={labelStyle}>
        سبب الطلب (اختياري)
        <textarea
          name="reason"
          maxLength={1000}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ display: "none" }}
      />
      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          fontSize: 15,
        }}
      >
        <input
          name="confirmed"
          type="checkbox"
          required
          style={{ width: 20, height: 20, marginTop: 3 }}
        />
        <span>
          أؤكد أنني صاحب الحساب وأطلب حذف الحساب والبيانات المرتبطة به، مع فهمي
          أن بعض السجلات المدرسية أو المالية قد تُحتفظ بها للمدة التي يفرضها
          القانون.
        </span>
      </label>
      <button
        type="submit"
        disabled={status === "submitting"}
        style={{
          minHeight: 48,
          border: 0,
          borderRadius: 12,
          padding: "12px 18px",
          color: "white",
          background: status === "submitting" ? "#6d8f80" : "#1B6B4A",
          fontSize: 16,
          fontWeight: 700,
          cursor: status === "submitting" ? "wait" : "pointer",
        }}
      >
        {status === "submitting" ? "جارٍ إرسال الطلب…" : "إرسال طلب حذف الحساب"}
      </button>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          style={{
            padding: 14,
            borderRadius: 10,
            background: status === "success" ? "#e9f7ef" : "#fff1f0",
            color: status === "success" ? "#17663f" : "#9f1d18",
            margin: 0,
          }}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}

const labelStyle = {
  display: "grid",
  gap: 6,
  fontWeight: 650,
  fontSize: 15,
} as const;
const inputStyle = {
  width: "100%",
  minHeight: 46,
  border: "1px solid #cbd5d1",
  borderRadius: 10,
  padding: "10px 12px",
  font: "inherit",
  color: "#18231e",
  background: "white",
} as const;
