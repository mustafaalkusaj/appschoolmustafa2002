"use client";

function ShimmerInject() {
  return null;
}

// ─── خلية واحدة ──────────────────────────────────────────────────────────────
function SkBox({ w = "100%", h = "14px", r = "8px", style = {} }: {
  w?: string; h?: string; r?: string; style?: React.CSSProperties;
}) {
  return (
    <div className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} />
  );
}

// ─── 1. Skeleton بطاقة إحصائية ───────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <>
      <ShimmerInject />
      <div style={{
        background: "white", borderRadius: "12px", padding: ".9rem 1rem",
        display: "flex", alignItems: "center", gap: ".8rem",
        border: "1px solid rgba(108,74,182,0.06)",
        boxShadow: "0 2px 8px rgba(108,74,182,0.07)",
      }}>
        <SkBox w="40px" h="40px" r="11px" />
        <div style={{ flex: 1 }}>
          <SkBox w="60%" h="11px" style={{ marginBottom: ".5rem" }} />
          <SkBox w="80%" h="16px" />
        </div>
      </div>
    </>
  );
}

// ─── 2. Skeleton صف جدول ─────────────────────────────────────────────────────
function TableRowSkeleton({ cols = 8 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: ".65rem .9rem" }}>
          <SkBox w={i === 0 ? "30px" : i === 1 ? "120px" : "70px"} h="13px" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 8 }: { rows?: number; cols?: number }) {
  return (
    <>
      <ShimmerInject />
      <div style={{
        background: "white", borderRadius: "13px",
        border: "1px solid rgba(108,74,182,0.06)",
        overflow: "hidden", boxShadow: "0 2px 8px rgba(108,74,182,0.06)",
      }}>
        {/* Header */}
        <div style={{ background: "#F8F6FF", padding: ".65rem .9rem", display: "flex", gap: "1.5rem" }}>
          {Array.from({ length: cols }).map((_, i) => (
            <SkBox key={i} w={i === 1 ? "100px" : "60px"} h="12px" />
          ))}
        </div>
        {/* Rows */}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── 3. Skeleton لوحة التحليل المالي ─────────────────────────────────────────
export function AnalysisSkeleton() {
  return (
    <>
      <ShimmerInject />
      <div style={{
        background: "white", borderRadius: "14px", padding: "1.2rem 1.4rem",
        marginBottom: "1rem", boxShadow: "0 2px 8px rgba(108,74,182,0.07)",
        border: "1px solid rgba(108,74,182,0.06)",
      }}>
        {/* عنوان */}
        <SkBox w="200px" h="16px" style={{ marginBottom: "1.2rem" }} />
        {/* كاردات مالية */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: ".7rem", marginBottom: "1.2rem" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ borderRadius: "11px", padding: ".8rem", background: "#F8F6FF" }}>
              <SkBox w="80%" h="11px" style={{ marginBottom: ".5rem" }} />
              <SkBox w="60%" h="18px" />
            </div>
          ))}
        </div>
        {/* رسوم بيانية */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1rem" }}>
          <div style={{ background: "#F8F6FF", borderRadius: "12px", padding: "1rem" }}>
            <SkBox w="140px" h="13px" style={{ marginBottom: ".8rem" }} />
            <SkBox w="100%" h="180px" r="10px" />
          </div>
          <div style={{ background: "#F8F6FF", borderRadius: "12px", padding: "1rem" }}>
            <SkBox w="100px" h="13px" style={{ marginBottom: ".8rem" }} />
            <SkBox w="100%" h="180px" r="10px" />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 4. Skeleton بطاقة طالب ──────────────────────────────────────────────────
export function StudentCardSkeleton() {
  return (
    <>
      <ShimmerInject />
      <div style={{
        background: "white", borderRadius: "12px", padding: ".8rem 1rem",
        border: "1px solid rgba(108,74,182,0.06)",
        boxShadow: "0 2px 8px rgba(108,74,182,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: ".7rem", marginBottom: ".6rem" }}>
          <SkBox w="36px" h="36px" r="10px" />
          <div style={{ flex: 1 }}>
            <SkBox w="70%" h="13px" style={{ marginBottom: ".4rem" }} />
            <SkBox w="45%" h="11px" />
          </div>
        </div>
        <SkBox w="100%" h="8px" r="20px" />
      </div>
    </>
  );
}

// ─── 5. Skeleton Dashboard كامل ──────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <>
      <ShimmerInject />
      {/* إحصائيات سريعة */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: ".8rem", marginBottom: ".8rem" }}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: ".8rem", marginBottom: "1rem", maxWidth: "50%" }}>
        {Array.from({ length: 2 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* تحليل مالي */}
      <AnalysisSkeleton />
      {/* شبكة سفلية */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
        {[5, 3].map((rows, i) => (
          <div key={i} style={{
            background: "white", borderRadius: "12px", padding: "1rem 1.2rem",
            boxShadow: "0 2px 8px rgba(108,74,182,0.07)",
            border: "1px solid rgba(108,74,182,0.06)",
          }}>
            <SkBox w="140px" h="14px" style={{ marginBottom: ".8rem" }} />
            {Array.from({ length: rows }).map((_, j) => (
              <div key={j} style={{ display: "flex", gap: ".7rem", padding: ".45rem 0", alignItems: "center", borderBottom: "1px solid rgba(108,74,182,0.05)" }}>
                <SkBox w="30px" h="30px" r="8px" />
                <div style={{ flex: 1 }}>
                  <SkBox w="60%" h="12px" style={{ marginBottom: ".35rem" }} />
                  <SkBox w="40%" h="10px" />
                </div>
                <SkBox w="70px" h="12px" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ─── 6. Skeleton صفحة الطلاب ─────────────────────────────────────────────────
export function StudentsPageSkeleton() {
  return (
    <>
      <ShimmerInject />
      {/* Tabs */}
      <div style={{
        display: "flex", gap: ".4rem", marginBottom: "1rem",
        background: "white", borderRadius: "13px", padding: ".5rem",
        boxShadow: "0 2px 8px rgba(22,137,201,0.07)",
      }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ flex: 1, borderRadius: "9px", padding: ".6rem .8rem", background: i === 0 ? "linear-gradient(135deg,#1689C9,#0F5D91)" : "#EEF8FF" }}>
            <SkBox w="70%" h="13px" style={{ margin: "auto", opacity: i === 0 ? 0.3 : 1 }} />
          </div>
        ))}
      </div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: ".7rem", marginBottom: "1rem" }}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: ".7rem", marginBottom: ".9rem" }}>
        <SkBox w="100%" h="38px" r="9px" style={{ flex: 1 }} />
        <SkBox w="120px" h="38px" r="9px" />
        <SkBox w="120px" h="38px" r="9px" />
        <SkBox w="120px" h="38px" r="9px" />
      </div>
      {/* Table */}
      <TableSkeleton rows={8} cols={10} />
    </>
  );
}

// ─── 7. Skeleton صفحة الحسابات ───────────────────────────────────────────────
export function PaymentsPageSkeleton() {
  return (
    <>
      <ShimmerInject />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: ".7rem", marginBottom: "1rem" }}>
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div style={{
        background: "white", borderRadius: "14px", padding: "1.1rem 1.3rem",
        marginBottom: "1rem", boxShadow: "0 2px 8px rgba(108,74,182,0.06)",
      }}>
        <SkBox w="120px" h="14px" style={{ marginBottom: ".9rem" }} />
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <SkBox key={i} w="100px" h="32px" r="20px" />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: ".7rem", marginBottom: ".9rem" }}>
        <SkBox w="100%" h="38px" r="9px" style={{ flex: 1 }} />
        <SkBox w="80px" h="38px" r="9px" />
      </div>
      <TableSkeleton rows={7} cols={9} />
    </>
  );
}
