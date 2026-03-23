import { useEffect, useState } from "react";
import { apiGet } from "../api";
import StatCard from "../components/StatCard";
import BarChart from "../components/BarChart";
import Table from "../components/Table";

const fallback = {
  totalRevenue: 12450,
  totalExpenses: 4230,
  net: 8220,
  unpaidInvoices: 7,
  activeStudents: 180,
  recentPayments: [
    { id: 1, first_name: "Lina", last_name: "Ali", amount: 120, paid_at: "2026-03-12" },
    { id: 2, first_name: "Kareem", last_name: "Saleh", amount: 240, paid_at: "2026-03-11" }
  ]
};

export default function Dashboard() {
  const [data, setData] = useState(fallback);

  useEffect(() => {
    apiGet("/dashboard")
      .then((res) => setData(res))
      .catch(() => setData(fallback));
  }, []);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Revenue Overview</h1>
          <p>Track income, expenses, and outstanding payments.</p>
        </div>
        <button className="primary">Generate Report</button>
      </header>

      <div className="stats">
        <StatCard label="Total Revenue" value={`$${data.totalRevenue}`} trend={{ label: "+12%", type: "up" }} />
        <StatCard label="Total Expenses" value={`$${data.totalExpenses}`} trend={{ label: "-4%", type: "down" }} />
        <StatCard label="Net Balance" value={`$${data.net}`} trend={{ label: "+8%", type: "up" }} />
        <StatCard label="Unpaid Invoices" value={data.unpaidInvoices} />
        <StatCard label="Active Students" value={data.activeStudents} />
      </div>

      <div className="grid">
        <BarChart
          title="Income vs Expenses"
          data={[
            { label: "Jan", value: 820 },
            { label: "Feb", value: 1250 },
            { label: "Mar", value: 1520 },
            { label: "Apr", value: 920 },
            { label: "May", value: 1640 }
          ]}
        />
        <BarChart
          title="Outstanding Fees"
          data={[
            { label: "G1", value: 520 },
            { label: "G2", value: 310 },
            { label: "G3", value: 240 },
            { label: "G4", value: 180 }
          ]}
        />
      </div>

      <div className="card">
        <h3>Recent Payments</h3>
        <Table
          columns={[
            { key: "name", label: "Student" },
            { key: "amount", label: "Amount" },
            { key: "paid_at", label: "Paid At" }
          ]}
          rows={data.recentPayments.map((p) => ({
            id: p.id,
            name: `${p.first_name} ${p.last_name}`,
            amount: `$${p.amount}`,
            paid_at: new Date(p.paid_at).toLocaleDateString()
          }))}
        />
      </div>
    </section>
  );
}
