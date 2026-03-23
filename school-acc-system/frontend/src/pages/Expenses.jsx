import { useEffect, useState } from "react";
import { apiGet } from "../api";
import Table from "../components/Table";

const fallback = [
  { id: 1, title: "Utilities", category: "Bills", amount: 320, expense_date: "2026-03-10" },
  { id: 2, title: "Supplies", category: "Stationery", amount: 180, expense_date: "2026-03-09" }
];

export default function Expenses() {
  const [rows, setRows] = useState(fallback);

  useEffect(() => {
    apiGet("/expenses")
      .then((res) => setRows(res))
      .catch(() => setRows(fallback));
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Expenses</h1>
          <p>Monitor school spending.</p>
        </div>
        <button className="primary">Add Expense</button>
      </header>

      <div className="card">
        <Table
          columns={[
            { key: "title", label: "Title" },
            { key: "category", label: "Category" },
            { key: "amount", label: "Amount" },
            { key: "expense_date", label: "Date" }
          ]}
          rows={rows.map((e) => ({
            ...e,
            amount: `$${e.amount}`,
            expense_date: new Date(e.expense_date).toLocaleDateString()
          }))}
        />
      </div>
    </section>
  );
}
