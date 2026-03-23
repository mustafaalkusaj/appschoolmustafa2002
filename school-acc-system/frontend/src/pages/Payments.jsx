import { useEffect, useState } from "react";
import { apiGet } from "../api";
import Table from "../components/Table";

const fallback = [
  { id: 1, invoice_id: 101, amount: 120, method: "CASH", paid_at: "2026-03-12" },
  { id: 2, invoice_id: 102, amount: 240, method: "CARD", paid_at: "2026-03-11" }
];

export default function Payments() {
  const [rows, setRows] = useState(fallback);

  useEffect(() => {
    apiGet("/payments")
      .then((res) => setRows(res))
      .catch(() => setRows(fallback));
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Track payments and installment status.</p>
        </div>
        <button className="primary">Record Payment</button>
      </header>

      <div className="card">
        <Table
          columns={[
            { key: "invoice_id", label: "Invoice" },
            { key: "amount", label: "Amount" },
            { key: "method", label: "Method" },
            { key: "paid_at", label: "Paid At" }
          ]}
          rows={rows.map((p) => ({
            ...p,
            amount: `$${p.amount}`,
            paid_at: new Date(p.paid_at).toLocaleDateString()
          }))}
        />
      </div>
    </section>
  );
}
