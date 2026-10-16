import React from "react";
import { INDIAN_DAMS_REGISTRY } from "../../data/damData";

export function PageHeader({
  category,
  feature,
  title,
  description,
  selectedDamId,
  onSelectDam,
  onBack,
}) {
  const activeDam =
    INDIAN_DAMS_REGISTRY.find((d) => d.id === selectedDamId) ||
    INDIAN_DAMS_REGISTRY[0];

  return (
    <div className="page-header-card">
      <div className="page-header-top">
        <div className="page-breadcrumbs">
          <button type="button" className="breadcrumb-link" onClick={onBack}>
            Dashboard
          </button>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-category">{category}</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{feature}</span>
        </div>

        <div className="page-header-actions">
          <div className="dam-selector-wrapper">
            <span className="dam-selector-label">MONITORED DAM:</span>
            <select
              className="dam-select-dropdown"
              value={selectedDamId || activeDam.id}
              onChange={(e) => onSelectDam && onSelectDam(e.target.value)}
              aria-label="Select Dam"
            >
              {INDIAN_DAMS_REGISTRY.map((dam) => (
                <option key={dam.id} value={dam.id}>
                  {dam.name} ({dam.location.river} River, {dam.location.state})
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="back-button" onClick={onBack}>
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="page-header-main">
        <div className="page-badge">{category.toUpperCase()}</div>
        <h1 className="page-title">{title || feature}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
    </div>
  );
}
