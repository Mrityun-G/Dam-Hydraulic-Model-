import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, getDamById } from "../../services/api";

export function DamReservoirLossView({ selectedDamId, onSelectDam, onBack }) {
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

  // Direct physical reconstruction loss: ~ ₹12.5 Cr per meter of breach width
  const breachWidth = simOutput?.breachWidthM ?? null;
  const directReconstructCr = breachWidth !== null ? Math.round(breachWidth * 12.5) : null;
  const volumeLossMCM = simOutput?.totalOutflowVolumeMCM ?? null;
  const toePlungeDepth = simOutput?.reachResults?.[0]?.maxFloodDepthM ?? null;
  const breachBottomWidth = simOutput?.modelParameters?.breachBottomWidth ?? (breachWidth !== null ? Math.round(breachWidth * 0.8) : null);
  const breachInvertElevation = simOutput?.modelParameters?.breachInvertElevation ?? null;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Hazard and Loss Analysis"
        feature="Dam & Reservoir"
        title="Dam Structural Damage & Reservoir Loss Assessment"
        description="Hydrodynamic quantification of breach dimensions, reservoir storage volume loss, and civil reconstruction replacement cost."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadData}>
        {simOutput && damSpecs && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="PROJECTED BREACH OPENING"
                value={breachWidth !== null ? breachWidth.toFixed(1) : "N/A"}
                unit={breachWidth !== null ? "meters" : ""}
                badge="PHYSICAL BREACH"
                badgeType="danger"
                subtitle="Average breach width"
              />
              <MetricCard
                title="RESERVOIR VOLUME RELEASED"
                value={volumeLossMCM !== null ? volumeLossMCM.toLocaleString() : "N/A"}
                unit={volumeLossMCM !== null ? "MCM" : ""}
                badge="STORAGE DRAINED"
                badgeType="danger"
                subtitle={damSpecs.grossStorageCapacityMCM ? `Out of ${damSpecs.grossStorageCapacityMCM} MCM` : "Gross storage capacity"}
              />
              <MetricCard
                title="CIVIL RESTORATION COST"
                value={directReconstructCr !== null ? `₹ ${directReconstructCr.toLocaleString()}` : "N/A"}
                unit={directReconstructCr !== null ? "Crores" : ""}
                badge="RECONSTRUCTION"
                badgeType="warning"
                subtitle="Structural civil works estimate"
              />
              <MetricCard
                title="DAM TOE PLUNGE DEPTH"
                value={toePlungeDepth !== null ? toePlungeDepth.toFixed(1) : "N/A"}
                unit={toePlungeDepth !== null ? "meters" : ""}
                badge="SCOUR DEPTH"
                badgeType="danger"
                subtitle="Foundation scouring risk"
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">BREACH GEOMETRY &amp; HYDRODYNAMICS</span>
                  <span className="panel-badge">{damSpecs.name}</span>
                </div>
                <div className="data-table-wrap">
                  <table className="cyber-table">
                    <tbody>
                      <tr>
                        <td>Dam Identity</td>
                        <td><strong>{damSpecs.name}</strong></td>
                      </tr>
                      <tr>
                        <td>Structure Classification</td>
                        <td>{damSpecs.damType}</td>
                      </tr>
                      <tr>
                        <td>Calculated Breach Bottom Width</td>
                        <td>{breachBottomWidth !== null ? `${breachBottomWidth} m` : "N/A"}</td>
                      </tr>
                      <tr>
                        <td>Average Breach Width (Bavg)</td>
                        <td><strong className="text-danger">{breachWidth !== null ? `${breachWidth} m` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Breach Invert Elevation</td>
                        <td>{breachInvertElevation !== null ? `${breachInvertElevation} m MSL` : "N/A"}</td>
                      </tr>
                      <tr>
                        <td>Side Slope (1V : zH)</td>
                        <td>{simOutput?.modelParameters?.breachSideSlope ?? "1.0 (Trapezoidal)"}</td>
                      </tr>
                      <tr>
                        <td>Total Storage Drained</td>
                        <td><strong className="text-danger">{volumeLossMCM !== null ? `${volumeLossMCM} MCM` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Residual Dead Storage</td>
                        <td>{damSpecs.deadStorageLevelDSL ? `${damSpecs.deadStorageLevelDSL} m MSL` : "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">DAM &amp; RESERVOIR IMPACT VALUATION</span>
                  <span className="panel-badge">ECONOMIC EXPOSURE</span>
                </div>

                <div className="sim-stat-row">
                  <span>Embankment Replacement:</span>
                  <strong>{directReconstructCr !== null ? `₹ ${Math.round(directReconstructCr * 0.55)} Cr` : "N/A"}</strong>
                </div>
                <div className="sim-stat-row">
                  <span>Grouting &amp; Cutoff Wall Repair:</span>
                  <strong>{directReconstructCr !== null ? `₹ ${Math.round(directReconstructCr * 0.25)} Cr` : "N/A"}</strong>
                </div>
                <div className="sim-stat-row">
                  <span>Plunge Basin &amp; Training Walls:</span>
                  <strong>{directReconstructCr !== null ? `₹ ${Math.round(directReconstructCr * 0.20)} Cr` : "N/A"}</strong>
                </div>
                <div className="sim-stat-row" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px" }}>
                  <span>Total Civil Damage Valuation:</span>
                  <strong className="text-danger">{directReconstructCr !== null ? `₹ ${directReconstructCr.toLocaleString()} Crores` : "N/A"}</strong>
                </div>

                <div className="loss-mitigation-note" style={{ marginTop: "16px" }}>
                  <span>Civil Engineering Directive:</span>
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                    Coffer dam placement and temporary rockfill berm construction required at breach invert prior to post-monsoon permanent concrete repair works.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
