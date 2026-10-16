import React from "react";

export function MetricCard({
  title,
  value,
  unit,
  subtitle,
  badge,
  badgeType = "info", // "info", "success", "warning", "danger"
  icon,
}) {
  return (
    <div className="cyber-metric-card">
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {badge && (
          <span className={`metric-badge badge-${badgeType}`}>{badge}</span>
        )}
      </div>

      <div className="metric-body">
        <div className="metric-value-wrap">
          <span className="metric-value">{value}</span>
          {unit && <span className="metric-unit">{unit}</span>}
        </div>
        {icon && <div className="metric-icon">{icon}</div>}
      </div>

      {subtitle && <div className="metric-subtitle">{subtitle}</div>}
    </div>
  );
}
