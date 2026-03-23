// StatCard Component
export default function StatCard({ title, value, icon, className = '' }) {
  return (
    <div className={`stat-card ${className}`}>
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>{icon}</div>
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </div>
  );
}
