// Dashboard Page Component
import React from 'react';
import { useFetch } from '../hooks/useFetch';
import { dashboardAPI } from '../services/api';
import StatCard from '../components/StatCard';
import ChartComponent from '../components/ChartComponent';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { data: stats, loading, error } = useFetch(() => dashboardAPI.getStats());

  if (loading) return <div className="spinner"></div>;
  if (error) {
    toast.error(error);
    return <div className="alert alert-error">Error loading dashboard data</div>;
  }

  const data = stats?.data;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Dashboard</h2>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Students"
          value={data?.totalStudents || 0}
          icon="👨‍🎓"
        />
        
        <StatCard
          title="Monthly Revenue"
          value={`$${(data?.monthlyRevenue || 0).toFixed(2)}`}
          icon="💰"
          className="success"
        />
        
        <StatCard
          title="Monthly Expenses"
          value={`$${(data?.monthlyExpenses || 0).toFixed(2)}`}
          icon="💸"
          className="danger"
        />
        
        <StatCard
          title="Net Income"
          value={`$${(data?.netIncome || 0).toFixed(2)}`}
          icon="📈"
          className={data?.netIncome >= 0 ? 'success' : 'danger'}
        />

        <StatCard
          title="Pending Fees"
          value={`$${(data?.pendingFees || 0).toFixed(2)}`}
          icon="⏳"
          className="warning"
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Revenue by Payment Method</h3>
          <ChartComponent 
            type="pie" 
            data={data?.paymentMethods}
            labels={(d) => d.payment_method}
            value={(d) => d.total}
          />
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Top Students by Fees</h3>
          <ChartComponent 
            type="bar" 
            data={data?.topStudents}
            labels={(d) => d.name}
            value={(d) => d.total_fees}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3>Quick Stats</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          <div>
            <strong>Total Payments Today:</strong>
            <p style={{ color: '#27ae60', fontSize: '18px' }}>
              {data?.paymentMethods?.length || 0} transactions
            </p>
          </div>
          <div>
            <strong>Outstanding Fees:</strong>
            <p style={{ color: '#e74c3c', fontSize: '18px' }}>
              ${(data?.pendingFees || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
