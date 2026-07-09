import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support | School Management System",
  description: "Support page for School Management System",
};

export default function SupportPage() {
  return (
    <div dir="rtl" style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif", lineHeight: 1.8, color: "#1a1a1a", backgroundColor: "#fff" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8, color: "#1B6B4A" }}>الدعم الفني — Support</h1>
      <p style={{ color: "#666", marginBottom: 32, fontSize: 14 }}>نحن هنا لمساعدتك | We are here to help</p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, color: "#1B6B4A", marginBottom: 12 }}>طرق التواصل</h2>
        <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}><strong>البريد الإلكتروني:</strong> mmustafaomer89@gmail.com</p>
          <p style={{ fontSize: 16, marginBottom: 8 }}><strong>من داخل التطبيق:</strong> قسم الرسائل — تواصل مع إدارة المدرسة مباشرة</p>
          <p style={{ fontSize: 16 }}><strong>وقت الاستجابة:</strong> خلال 24-48 ساعة في أيام العمل</p>
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, color: "#1B6B4A", marginBottom: 12 }}>الأسئلة الشائعة</h2>
        {[
          { q: "نسيت كلمة المرور", a: "تواصل مع إدارة المدرسة لإعادة تعيين كلمة المرور الخاصة بك." },
          { q: "التطبيق لا يعرض الدرجات", a: "تأكد من اتصالك بالإنترنت. إذا استمرت المشكلة، أعد تسجيل الدخول." },
          { q: "كيف أحذف حسابي؟", a: "من الإعدادات، اختر الخصوصية والأمان، ثم طلب حذف الحساب." },
          { q: "الإشعارات لا تصل", a: "تأكد من تفعيل الإشعارات في إعدادات جهازك للتطبيق." },
        ].map((faq) => (
          <div key={faq.q} style={{ background: "#f8f9fa", padding: 16, borderRadius: 10, marginBottom: 12 }}>
            <p style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>{faq.q}</p>
            <p style={{ fontSize: 15, color: "#555" }}>{faq.a}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ fontSize: 20, color: "#1B6B4A", marginBottom: 12 }}>Support (English)</h2>
        <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 12 }} dir="ltr">
          <p style={{ marginBottom: 8 }}><strong>Email:</strong> mmustafaomer89@gmail.com</p>
          <p style={{ marginBottom: 8 }}><strong>In-app:</strong> Use the Messages section to contact your school directly</p>
          <p><strong>Response time:</strong> Within 24-48 hours on business days</p>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #eee", paddingTop: 20, marginTop: 40, fontSize: 13, color: "#999" }}>
        <p>نظام المدارس — School Management System</p>
      </footer>
    </div>
  );
}
