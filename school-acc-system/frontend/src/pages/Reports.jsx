import { useState } from "react";
import { apiGet } from "../api";

export default function Reports() {
  const [range, setRange] = useState("monthly");
  const [summary, setSummary] = useState(null);

  const loadReport = async () => {
    try {
      const data = await apiGet(`/reports/summary?range=${range}`);
      setSummary(data);
    } catch (err) {
      setSummary(null);
    }
  };

  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Generate daily, monthly, and yearly summaries.</p>
        </div>
        <div className="filters">
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button className="primary" onClick={loadReport}>
            Generate
          </button>
        </div>
      </header>

      <div className="card report-card">
        {summary ? (
          <div>
            <h3>Summary</h3>
            <p>Range: {summary.range}</p>
            <div className="report-metrics">
              <div>
                <span>Revenue</span>
                <strong>${summary.revenue}</strong>
              </div>
              <div>
                <span>Expenses</span>
                <strong>${summary.expenses}</strong>
              </div>
              <div>
                <span>Net</span>
                <strong>${summary.net}</strong>
              </div>
            </div>
          </div>
        ) : (
          <p>No report generated yet.</p>
        )}
      </div>
    </section>
  );
}
