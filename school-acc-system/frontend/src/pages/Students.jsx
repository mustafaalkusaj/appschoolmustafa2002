import { useEffect, useState } from "react";
import { apiGet } from "../api";
import Table from "../components/Table";

const fallback = [
  { id: 1, name: "Sara Hassan", class_name: "Grade 1", section_name: "A", payment_status: "UNPAID" },
  { id: 2, name: "Omar Khalil", class_name: "Grade 2", section_name: "B", payment_status: "PAID" }
];

export default function Students() {
  const [rows, setRows] = useState(fallback);
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiGet(`/students?name=${encodeURIComponent(query)}`)
      .then((res) => {
        const mapped = res.map((s) => ({
          id: s.id,
          name: `${s.first_name} ${s.last_name}`,
          class_name: s.class_name,
          section_name: s.section_name || "-",
          payment_status: s.payment_status || "-"
        }));
        setRows(mapped);
      })
      .catch(() => setRows(fallback));
  }, [query]);

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Students</h1>
          <p>Search and manage student records.</p>
        </div>
        <div className="filters">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
          />
          <button className="primary">Add Student</button>
        </div>
      </header>

      <div className="card">
        <Table
          columns={[
            { key: "name", label: "Student" },
            { key: "class_name", label: "Class" },
            { key: "section_name", label: "Section" },
            { key: "payment_status", label: "Payment" }
          ]}
          rows={rows}
        />
      </div>
    </section>
  );
}
