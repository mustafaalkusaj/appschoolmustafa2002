import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "شروط الاستخدام وسلامة المحتوى | نظام المدارس",
  description: "قواعد استخدام المراسلة والمحتوى في تطبيق نظام المدارس.",
};

export default function TermsPage() {
  return (
    <main
      dir="rtl"
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.9,
        color: "#1c2923",
      }}
    >
      <h1 style={{ color: "#1B6B4A" }}>شروط الاستخدام وسلامة المحتوى</h1>
      <p>آخر تحديث: 13 تموز 2026</p>
      <h2>قواعد المراسلة والمحتوى</h2>
      <ul>
        <li>
          تُستخدم المراسلة للأغراض التعليمية والمدرسية فقط وضمن العلاقات التي
          تسمح بها المدرسة.
        </li>
        <li>
          يُمنع التنمر والتهديد والتحرش وخطاب الكراهية والمحتوى الجنسي أو العنيف
          أو كشف بيانات الآخرين.
        </li>
        <li>
          يُمنع رفع ملفات ضارة أو مخالفة للحقوق أو محاولة تجاوز صلاحيات الحساب.
        </li>
        <li>
          يمكن للمستخدم الإبلاغ عن رسالة بالضغط المطول عليها، أو حظر الطرف الآخر
          من قائمة أمان المحادثة.
        </li>
      </ul>
      <h2>الإشراف والاستجابة</h2>
      <p>
        تصل البلاغات إلى إدارة المدرسة مع الرسالة والمحادثة ذات الصلة. تُراجع
        البلاغات العاجلة بأسرع وقت، ويجوز تقييد الحساب أو إزالة المحتوى أو تصعيد
        الحالة لجهة مختصة وفق سياسة المدرسة والقانون.
      </p>
      <h2>حماية القاصرين</h2>
      <p>
        الحسابات تُنشأ وتُدار من المدرسة. يجب ألا تُستخدم بيانات الطلاب خارج
        الغرض التعليمي، وتُمنع محاولة التواصل خارج القنوات المدرسية المعتمدة.
      </p>
      <h2>التواصل</h2>
      <p>
        للإبلاغ خارج التطبيق:{" "}
        <a href="mailto:mmustafaomer89@gmail.com">mmustafaomer89@gmail.com</a>.
      </p>

      <hr style={{ margin: "40px 0", border: 0, borderTop: "1px solid #ddd" }} />
      <section dir="ltr" lang="en" style={{ textAlign: "left" }}>
        <h1 style={{ color: "#1B6B4A" }}>Terms of Use and Content Safety</h1>
        <p>Last updated: July 19, 2026</p>
        <h2>Messaging and content rules</h2>
        <ul>
          <li>Messaging is for educational and school purposes only.</li>
          <li>
            Bullying, threats, harassment, hate speech, sexual or violent
            content, and disclosure of another person&apos;s data are prohibited.
          </li>
          <li>
            Harmful files, rights-infringing content, and attempts to bypass
            account permissions are prohibited.
          </li>
          <li>Users can report messages and block another participant.</li>
        </ul>
        <h2>Moderation and minors</h2>
        <p>
          Reports are reviewed by authorized school administrators. Accounts
          are school-managed, and student data must only be used for legitimate
          educational purposes.
        </p>
        <h2>Contact</h2>
        <p>
          For support or safety reports, email{" "}
          <a href="mailto:mmustafaomer89@gmail.com">
            mmustafaomer89@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
