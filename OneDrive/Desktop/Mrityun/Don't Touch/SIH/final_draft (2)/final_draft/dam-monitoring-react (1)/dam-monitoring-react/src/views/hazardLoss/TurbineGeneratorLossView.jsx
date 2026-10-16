import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, getDamById } from "../../services/api";

export function TurbineGeneratorLossView({ selectedDamId, onSelectDam, onBack }) {
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

  const powerFacilities =
    damSpecs?.criticalFacilities?.filter(
      (f) => f.facilityType.toLowerCase().includes("power") || f.name.toLowerCase().includes("power")
    ) || [];

  // Capacity in MW if mapped in damSpecs or facility data, else null
  const totalMwOffline = damSpecs?.hydroCapacityMW ?? (powerFacilities.length > 0 ? powerFacilities.reduce((sum, f) => sum + (f.capacityMW || 0), 0) || null : null);
  const dailyRevLossCr = totalMwOffline ? (totalMwOffline * 24 * 4.5 * 1000) / 10000000 : null;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Hazard and Loss Analysis"
        feature="Turbine & Generator"
        title="Hydroelectric Powerhouse Submergence & Generation Loss"
        description="Hydroelectric generating unit flood inundation assessment, turbine tailrace flooding, and grid downtime economic exposure."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadData}>
        {simOutput && damSpecs && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="GENERATING CAPACITY OFFLINE"
                value={totalMwOffline !== null ? `${totalMwOffline}` : "N/A"}
                unit={totalMwOffline !== null ? "MW" : ""}
                badge={totalMwOffline !== null ? "KNOCKED OUT" : "NO HYDRO STATION"}
                badgeType={totalMwOffline !== null ? "danger" : "info"}
                subtitle={totalMwOffline !== null ? "Turbines submerged downstream" : "No power units mapped"}
              />
              <MetricCard
                title="POWERHOUSES EXPOSED"
                value={powerFacilities.length}
                unit="power stations"
                badge={powerFacilities.length > 0 ? "CRITICAL ASSETS" : "NONE RECORDED"}
                badgeType={powerFacilities.length > 0 ? "danger" : "info"}
                subtitle={powerFacilities.length > 0 ? powerFacilities.map(f => f.name).join(", ") : "No powerhouses in reach"}
              />
              <MetricCard
                title="DAILY POWER REVENUE LOSS"
                value={dailyRevLossCr !== null ? `₹ ${dailyRevLossCr.toFixed(2)}` : "N/A"}
                unit={dailyRevLossCr !== null ? "Cr / day" : ""}
                badge="COMMERCIAL LOSS"
                badgeType={dailyRevLossCr !== null ? "warning" : "info"}
                subtitle={dailyRevLossCr !== null ? "Grid electricity deficit" : "Not applicable"}
              />
              <MetricCard
                title="ESTIMATED OVERHAUL DURATION"
                value={powerFacilities.length > 0 ? "90 - 180" : "N/A"}
                unit={powerFacilities.length > 0 ? "days" : ""}
                badge="STATOR REWIND"
                badgeType="warning"
                subtitle="Turbine desilting & refurbishment"
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">DOWNSTREAM POWERHOUSES IN INUNDATION PATH</span>
                  <span className="panel-badge">{powerFacilities.length} SITES</span>
                </div>

                <div className="facilities-list">
                  {powerFacilities.length > 0 ? powerFacilities.map((fac) => (
                    <div key={fac.id} className="facility-card">
                      <div className="facility-header">
                        <strong>{fac.name}</strong>
                        <span className="table-badge badge-danger">SUBMERGED</span>
                      </div>
                      <div className="facility-meta">
                        <span>Distance: <strong>{fac.distanceFromDamKm} km</strong></span>
                        <span>Elevation: <strong>{fac.elevationMSL} m MSL</strong></span>
                        <span>Status: <strong className="text-danger">Tailrace Backwater Inundation</strong></span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ padding: "20px", color: "#94a3b8", fontSize: "13px" }}>
                      No hydroelectric powerhouses cataloged downstream of {damSpecs.name}.
                    </div>
                  )}
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">TURBINE DAMAGE &amp; REPAIR BREAKDOWN</span>
                  <span className="panel-badge">VALUATION</span>
                </div>

                <div className="sim-stat-row">
                  <span>Francis Turbine Runner Refurbishment:</span>
                  <strong>₹ 45.0 Crores</strong>
                </div>
                <div className="sim-stat-row">
                  <span>Generator Stator / Rotor Drying &amp; Rewind:</span>
                  <strong>₹ 62.5 Crores</strong>
                </div>
                <div className="sim-stat-row">
                  <span>Governor &amp; SCADA Control Console Replacement:</span>
                  <strong>₹ 18.0 Crores</strong>
                </div>
                <div className="sim-stat-row" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px" }}>
                  <span>Total Powerhouse Rehabilitation Loss:</span>
                  <strong className="text-danger">₹ 125.5 Crores</strong>
                </div>

                <p className="panel-desc" style={{ marginTop: "16px" }}>
                  Turbines must be tripped immediately prior to wave arrival (T+0.3h) to prevent catastrophic hydrodynamic shaft deformation.
                </p>
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
