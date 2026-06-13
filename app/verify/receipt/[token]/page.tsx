import { Metadata } from "next";

export const metadata: Metadata = {
  title: "التحقق من الإيصال - School Iraq",
  description: "صفحة التحقق من صحة إيصال الدفع",
};

type ReceiptData = {
  student_name: string | null;
  class_name: string | null;
  amount: number;
  payment_date: string;
  receipt_number: string | null;
  school_name: string | null;
};

async function fetchReceipt(token: string): Promise<ReceiptData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://school-iraq.com";
    const res = await fetch(`${baseUrl}/api/verify/receipt/${token}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ReceiptData;
  } catch {
    return null;
  }
}

function fmtDate(d: string) {
  try {
    return new Intl.DateTimeFormat("ar-IQ-u-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(d));
  } catch {
    return d;
  }
}

function fmtAmount(n: number) {
  try {
    return new Intl.NumberFormat("ar-IQ-u-nu-latn").format(n);
  } catch {
    return String(n);
  }
}

export default async function VerifyReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await fetchReceipt(token);

  return (
    <html dir="rtl" lang="ar">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          background: "#f0fdf4",
          fontFamily: "system-ui, -apple-system, Arial, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            margin: "32px 16px",
            background: "white",
            borderRadius: 20,
            boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {receipt ? (
            <>
              {/* Header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                  padding: "32px 24px",
                  textAlign: "center",
                  color: "white",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: 32,
                  }}
                >
                  ✓
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: 0.5,
                  }}
                >
                  إيصال موثّق
                </h1>
                <p style={{ margin: "8px 0 0", opacity: 0.85, fontSize: 14 }}>
                  هذا الإيصال حقيقي وصادر من نظام School Iraq
                </p>
              </div>

              {/* Details */}
              <div style={{ padding: "24px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Row label="المدرسة" value={receipt.school_name ?? "—"} />
                  <Row label="اسم الطالب" value={receipt.student_name ?? "—"} />
                  <Row label="الصف الدراسي" value={receipt.class_name ?? "—"} />
                  <Row
                    label="المبلغ المدفوع"
                    value={`${fmtAmount(receipt.amount)} د.ع`}
                    highlight
                  />
                  <Row label="تاريخ الدفع" value={fmtDate(receipt.payment_date)} />
                  <Row
                    label="رقم الإيصال"
                    value={receipt.receipt_number ?? "—"}
                  />
                </div>

                {/* Note */}
                <div
                  style={{
                    marginTop: 24,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    fontSize: 13,
                    color: "#15803d",
                    textAlign: "center",
                    lineHeight: 1.6,
                  }}
                >
                  هذا الإيصال حقيقي وصادر من نظام School Iraq
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Not found header */}
              <div
                style={{
                  background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
                  padding: "32px 24px",
                  textAlign: "center",
                  color: "white",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: 32,
                  }}
                >
                  ✕
                </div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 24,
                    fontWeight: 900,
                    letterSpacing: 0.5,
                  }}
                >
                  إيصال غير موجود أو غير صالح
                </h1>
                <p style={{ margin: "8px 0 0", opacity: 0.85, fontSize: 14 }}>
                  تعذر العثور على هذا الإيصال في النظام
                </p>
              </div>
              <div style={{ padding: "24px", textAlign: "center" }}>
                <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7 }}>
                  قد يكون هذا الإيصال غير صحيح أو منتهي الصلاحية.
                  يرجى التواصل مع إدارة المدرسة للتحقق.
                </p>
              </div>
            </>
          )}

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid #f3f4f6",
              padding: "16px 24px",
              textAlign: "center",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            School Iraq — نظام إدارة المدارس
          </div>
        </div>
      </body>
    </html>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        borderRadius: 10,
        background: highlight ? "#f0fdf4" : "#f9fafb",
        border: `1px solid ${highlight ? "#bbf7d0" : "#f3f4f6"}`,
      }}
    >
      <span style={{ fontSize: 13, color: "#6b7280" }}>{label}</span>
      <span
        style={{
          fontSize: highlight ? 16 : 14,
          fontWeight: highlight ? 900 : 700,
          color: highlight ? "#15803d" : "#111827",
        }}
      >
        {value}
      </span>
    </div>
  );
}
