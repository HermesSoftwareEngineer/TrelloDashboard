import './MetricCard.css';

const MetricCard = ({ title, value, subtitle, color = '#007bff' }) => {
  return (
    <div className="metric-card" style={{ borderLeftColor: color }}>
      <div className="metric-title">{title}</div>
      <div className="metric-value">{value}</div>
      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
};

export default MetricCard;
