export default function BarChart({ title, data }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <div className="chart-card">
      <h4>{title}</h4>
      <div className="bars">
        {data.map((item) => (
          <div key={item.label} className="bar">
            <span style={{ height: `${(item.value / max) * 100}%` }} />
            <small>{item.label}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
