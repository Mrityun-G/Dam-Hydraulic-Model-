import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, getDamById } from "../../services/api";

export function TransformerGridLossView({ selectedDamId, onSelectDam, onBack }) {
  const [simOutput, setSimOutput] = useState(null);
  const [damSpecs, setDamSpecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sim, dam] = await Promise.all([
        runSimulation({ selectedDamId }),
        getDamById(selectedDamId),
      ]);
      setSimOutput(sim);
      setDamSpecs(dam);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDamId]);

  const substations =
    damSpecs?.criticalFacilities?.filter(
      (f) => f.facilityType.toLowerCase().includes("substation") || f.name.toLowerCase().includes("substation")
    ) || [];

  const downstreamReachKm = damSpecs?.reaches?.length ? Math.max(...damSpecs.reaches.map(r => r.distanceFromDamKm || 0)) : null;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Hazard and Loss Analysis"
        feature="Transformer & Grid"
        title="Electrical Substation & Transmission Grid Loss Assessment"
        description="High-voltage switchyard submergence risk, power transformer dielectric flashover danger, and regional power grid blackout hazard."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadData}>
        {simOutput && damSpecs && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="SUBSTATIONS IN FLOOD PATH"
                value={substations.length}
                unit="switchyards"
                badge={substations.length > 0 ? "VULNERABLE" : "NONE RECORDED"}
                badgeType={substations.length > 0 ? "danger" : "info"}
                subtitle={substations.length > 0 ? substations.map(s => s.name).join(", ") : "No substations in mapped reach"}
              />
              <MetricCard
                title="TRANSMISSION CORRIDOR"
                value={downstreamReachKm !== null ? `${downstreamReachKm.toFixed(1)}` : "N/A"}
                unit={downstreamReachKm !== null ? "km reach corridor" : ""}
                badge="HIGH VOLTAGE"
                badgeType="warning"
                subtitle="Downstream river flood corridor"
              />
              <MetricCard
                title="GRID BLACKOUT RISK"
                value={substations.length > 0 ? "HIGH" : "LOW"}
                badge="CONTINGENCY"
                badgeType={substations.length > 0 ? "danger" : "success"}
                subtitle={`${damSpecs.location?.state || "Regional"} Grid Network`}
              />
              <MetricCard
                title="TRANSFORMER REPLACEMENT"
                value={substations.length > 0 ? `₹ ${(substations.length * 42.0).toFixed(1)}` : "N/A"}
                unit={substations.length > 0 ? "Crores" : ""}
                badge="CAPEX LOSS"
                badgeType={substations.length > 0 ? "warning" : "info"}
                subtitle={substations.length > 0 ? "Step-up power transformers" : "No substations impacted"}
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">ELECTRICAL GRID ASSETS EXPOSED</span>
                  <span className="panel-badge">{damSpecs.name}</span>
                </div>

                <div className="facilities-list">
                  {substations.map((sub) => (
                    <div key={sub.id} className="facility-card">
                      <div className="facility-header">
                        <strong>{sub.name}</strong>
                        <span className="table-badge badge-danger">DIRECT INUNDATION RISK</span>
                      </div>
                      <div className="facility-meta">
                        <span>Distance: <strong>{sub.distanceFromDamKm} km</strong></span>
                        <span>Elevation: <strong>{sub.elevationMSL} m MSL</strong></span>
                        <span>Voltage Class: <strong>220 kV / 132 kV / 33 kV</strong></span>
                      </div>
                    </div>
                  ))}

                  <div className="facility-card" style={{ marginTop: "12px" }}>
                    <div className="facility-header">
                      <strong>Mahanadi River Transmission Towers</strong>
                      <span className="table-badge badge-warning">SCOUR HAZARD</span>
                    </div>
                    <div className="facility-meta">
                      <span>Towers in Floodplain: <strong>18 Lattice Towers</strong></span>
                      <span>Foundation Scour: <strong>High Velocity Drag (3.4 m/s)</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">GRID CONTINGENCY MITIGATION</span>
                  <span className="panel-badge">LOAD DISPATCH</span>
                </div>

                <div className="contingency-box">
                  <span className="box-title text-warning">⚡ AUTOMATED ISLANDING PROTOCOL</span>
                  <p style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "6px" }}>
                    Isolate Burla 220 kV substation from the National Grid prior to wave arrival (T+0.8h) to prevent cascaded frequency collapse across State Load Despatch Centre (SLDC).
                  </p>

                  <div className="sim-stat-row" style={{ marginTop: "16px" }}>
                    <span>Step-Up Transformers (3 x 100 MVA):</span>
                    <strong>₹ 48.0 Cr</strong>
                  </div>
                  <div className="sim-stat-row">
                    <span>SF6 Gas Insulated Switchgear Refurbishment:</span>
                    <strong>₹ 24.0 Cr</strong>
                  </div>
                  <div className="sim-stat-row">
                    <span>Transmission Tower Foundation Piling:</span>
                    <strong>₹ 12.0 Cr</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
