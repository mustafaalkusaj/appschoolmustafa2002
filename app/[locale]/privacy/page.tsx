import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | School Management System",
  description: "Privacy Policy for School Management System mobile application",
};

const SECTIONS = [
  {
    title: "Data We Collect",
    titleAr: "البيانات التي نجمعها",
    body: "Name, class/section, attendance records, grades, assignments, in-app messages, payment status, and device push notification token.",
    bodyAr: "الاسم، الصف والشعبة، سجل الحضور، الدرجات، الواجبات، الرسائل داخل التطبيق، حالة الدفعات المالية، ورمز الإشعارات لجهازك.",
  },
  {
    title: "How Your Data Is Used",
    titleAr: "كيف تُستخدم بياناتك",
    body: "Data is used to display grades, attendance, and assignments to you, parents, and authorized teachers, and to send school-related notifications. Your data is never used for commercial advertising.",
    bodyAr: "تُستخدم البيانات لعرض الدرجات والحضور والواجبات لك ولأولياء الأمور والمعلمين المخوّلين، ولإرسال إشعارات مرتبطة بالمدرسة. لا تُستخدم بياناتك لأي غرض إعلاني.",
  },
  {
    title: "Where Your Data Is Stored",
    titleAr: "أين تُخزَّن بياناتك",
    body: "Data is stored on Supabase servers (Frankfurt, EU) behind Row Level Security (RLS) that prevents cross-school data access.",
    bodyAr: "تُخزَّن البيانات على خوادم Supabase (فرانكفورت، الاتحاد الأوروبي) خلف طبقة أمان تمنع أي مدرسة من الوصول إلى بيانات مدرسة أخرى.",
  },
  {
    title: "Children's Data",
    titleAr: "بيانات الأطفال",
    body: "This app serves students who may be under 13. Accounts are created by the school, not self-registered. No tracking ads are shown to children.",
    bodyAr: "يستخدم هذا التطبيق طلاب قد يكون بعضهم دون سن 13 عاماً. حسابات الطلاب تُنشأ وتُدار من قبل المدرسة. لا نعرض إعلانات تتبّع لهم.",
  },
  {
    title: "Account Deletion",
    titleAr: "حذف الحساب",
    body: "Request deletion via: Settings, Privacy and Security, Request Account Deletion. Processed within a few days by school administration.",
    bodyAr: "يمكنك طلب حذف حسابك عبر: الإعدادات، الخصوصية والأمان، طلب حذف الحساب. تتم المعالجة خلال أيام قليلة.",
  },
  {
    title: "Third-Party Sharing",
    titleAr: "مشاركة البيانات مع أطراف ثالثة",
    body: "Your data is never sold. Only database hosting and push notification services are used to operate the app.",
    bodyAr: "لا تُباع بياناتك. تُستخدم خدمات استضافة وإشعارات فقط لتشغيل التطبيق.",
  },
  {
    title: "Contact Us",
    titleAr: "تواصل معنا",
    body: "For privacy inquiries or data deletion: contact your school via the app, or email mmustafaomer89@gmail.com.",
    bodyAr: "لأي استفسار: تواصل مع مدرستك عبر التطبيق أو عبر mmustafaomer89@gmail.com.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div dir="rtl" style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif", lineHeight: 1.8, color: "#1a1a1a", backgroundColor: "#fff" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8, color: "#1B6B4A" }}>سياسة الخصوصية — Privacy Policy</h1>
      <p style={{ color: "#666", marginBottom: 32, fontSize: 14 }}>آخر تحديث: يوليو 2026 | Last updated: July 2026</p>
      {SECTIONS.map((s) => (
        <section key={s.title} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, color: "#1B6B4A", marginBottom: 8 }}>{s.titleAr}</h2>
          <p style={{ marginBottom: 12, fontSize: 16, color: "#333" }}>{s.bodyAr}</p>
          <h3 style={{ fontSize: 16, color: "#888", marginBottom: 4 }}>{s.title}</h3>
          <p style={{ fontSize: 14, color: "#666" }}>{s.body}</p>
        </section>
      ))}
      <footer style={{ borderTop: "1px solid #eee", paddingTop: 20, marginTop: 40, fontSize: 13, color: "#999" }}>
        <p>نظام المدارس — School Management System</p>
        <p>mmustafaomer89@gmail.com</p>
      </footer>
    </div>
  );
}
