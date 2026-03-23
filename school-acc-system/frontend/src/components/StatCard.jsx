export default function StatCard({ label, value, trend }) {
  return (
    <div className="stat-card">
      <div>
        <p>{label}</p>
        <h3>{value}</h3>
      </div>
      {trend && <span className={`trend ${trend.type}`}>{trend.label}</span>}
    </div>
  );
}
