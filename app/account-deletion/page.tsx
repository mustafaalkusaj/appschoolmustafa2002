import type { Metadata } from "next";
import Link from "next/link";

import { AccountDeletionForm } from "./account-deletion-form";

export const metadata: Metadata = {
  title: "طلب حذف الحساب | نظام المدارس",
  description: "صفحة رسمية لطلب حذف حساب نظام المدارس والبيانات المرتبطة به.",
};

export default function AccountDeletionPage() {
  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f4f8f6",
        color: "#18231e",
        padding: "40px 18px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          background: "white",
          borderRadius: 20,
          padding: "clamp(22px, 5vw, 42px)",
          boxShadow: "0 16px 45px rgba(20, 67, 47, 0.08)",
        }}
      >
        <p style={{ color: "#1B6B4A", fontWeight: 750, marginBottom: 8 }}>
          نظام المدارس — School Management System
        </p>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 38px)", margin: "0 0 12px" }}>
          طلب حذف الحساب والبيانات
        </h1>
        <p style={{ lineHeight: 1.9, color: "#526159", marginBottom: 24 }}>
          استخدم هذا النموذج إذا حذفت التطبيق أو لم تعد تستطيع الدخول إليه. بعد
          الإرسال نتحقق من هويتك مع المدرسة، نعطّل الوصول والإشعارات، ثم نحذف أو
          نخفي هوية البيانات التي لا يلزم الاحتفاظ بها.
        </p>

        <section
          style={{
            background: "#eef7f2",
            borderRadius: 14,
            padding: 18,
            marginBottom: 26,
            lineHeight: 1.85,
          }}
        >
          <strong>ما الذي يحدث بعد الطلب؟</strong>
          <ol style={{ paddingInlineStart: 22, marginBottom: 0 }}>
            <li>تأكيد استلام الطلب والتحقق من صاحب الحساب.</li>
            <li>معالجة الطلب عادة خلال 7 أيام عمل.</li>
            <li>
              حذف حساب الدخول والرموز والأجهزة والرسائل والمرفقات القابلة للحذف.
            </li>
            <li>
              الاحتفاظ فقط بالسجلات المطلوبة قانونياً أو مدرسياً، مثل بعض القيود
              المالية والأكاديمية، مع تقييد الوصول إليها.
            </li>
            <li>إرسال تأكيد عند اكتمال المعالجة.</li>
          </ol>
        </section>

        <AccountDeletionForm />

        <p style={{ marginTop: 26, color: "#66736d", lineHeight: 1.8 }}>
          يمكنك أيضاً تقديم الطلب من التطبيق: الإعدادات ← الخصوصية والأمان ← طلب
          حذف الحساب. اقرأ{" "}
          <Link href="/privacy" style={{ color: "#1B6B4A" }}>
            سياسة الخصوصية
          </Link>{" "}
          أو راسلنا على{" "}
          <a
            href="mailto:mmustafaomer89@gmail.com"
            style={{ color: "#1B6B4A" }}
          >
            mmustafaomer89@gmail.com
          </a>
          .
        </p>

        <section
          dir="ltr"
          lang="en"
          style={{
            textAlign: "left",
            borderTop: "1px solid #dce8e1",
            marginTop: 32,
            paddingTop: 28,
            lineHeight: 1.8,
          }}
        >
          <h2>Account and data deletion request</h2>
          <p>
            Use the form above if you cannot access the app. We verify your
            identity with the school, disable account access and notifications,
            then delete or de-identify data that is not legally required.
          </p>
          <p>
            Requests are normally processed within seven business days. Some
            financial or academic records may be retained where required by
            law or school obligations, with restricted access.
          </p>
          <p>
            You can also request deletion in the app under Settings → Privacy
            and Security → Request Account Deletion.
          </p>
        </section>
      </div>
    </main>
  );
}
