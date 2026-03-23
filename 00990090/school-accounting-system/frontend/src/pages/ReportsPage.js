// Reports Page
import React from 'react';

export default function ReportsPage() {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Reports & Analytics</h2>
      </div>
      
      <div className="section-grid">
        <div className="card">
          <h3>Daily Report</h3>
          <p>View daily revenue and expenses summary</p>
          <input type="date" className="full-width mt-10" />
          <button className="btn btn-primary full-width mt-10">
            Generate Report
          </button>
        </div>

        <div className="card">
          <h3>Monthly Report</h3>
          <p>View monthly revenue and expenses summary</p>
          <input type="month" className="full-width mt-10" />
          <button className="btn btn-primary full-width mt-10">
            Generate Report
          </button>
        </div>

        <div className="card">
          <h3>Student Fees Report</h3>
          <p>Outstanding and collected fees summary</p>
          <button className="btn btn-primary full-width mt-10">
            Generate Report
          </button>
        </div>

        <div className="card">
          <h3>Expense Report</h3>
          <p>Category-wise expense breakdown</p>
          <button className="btn btn-primary full-width mt-10">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
