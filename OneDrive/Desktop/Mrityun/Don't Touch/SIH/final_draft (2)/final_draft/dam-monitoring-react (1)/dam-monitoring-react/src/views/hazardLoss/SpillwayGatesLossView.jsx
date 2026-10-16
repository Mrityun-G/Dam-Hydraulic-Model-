import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, getDamById } from "../../services/api";

export function SpillwayGatesLossView({ selectedDamId, onSelectDam, onBack }) {
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

  const spillwayCap = damSpecs?.spillwayCapacityM3s ?? null;
  const peakBreachQ = simOutput?.peakBreachOutflowM3s ?? null;
  const sluiceGates = damSpecs?.sluiceGatesCount ?? null;
  const crestGates = damSpecs?.crestGatesCount ?? null;
  const totalGates = (sluiceGates !== null || crestGates !== null) ? ((sluiceGates || 0) + (crestGates || 0)) : null;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Hazard and Loss Analysis"
        feature="Spillway & Gates"
        title="Spillway Discharge Capacity & Gate Operation Hazard"
        description="Hydrodynamic capacity exceedance analysis, gate hoist operational risks, and spillway plunge basin erosion."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadData}>
        {simOutput && damSpecs && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="DESIGN SPILLWAY CAPACITY"
                value={spillwayCap !== null ? spillwayCap.toLocaleString() : "N/A"}
                unit={spillwayCap !== null ? "m³/s" : ""}
                badge="SAFE SPILLWAY"
                badgeType="success"
                subtitle="Maximum controlled discharge"
              />
              <MetricCard
                title="PEAK BREACH DISCHARGE"
                value={peakBreachQ !== null ? peakBreachQ.toLocaleString() : "N/A"}
                unit={peakBreachQ !== null ? "m³/s" : ""}
                badge={peakBreachQ && spillwayCap ? (peakBreachQ > spillwayCap ? "CAPACITY EXCEEDED" : "EXTREME SURCHARGE") : "SIMULATED PEAK"}
                badgeType={peakBreachQ && spillwayCap && peakBreachQ > spillwayCap ? "danger" : "warning"}
                subtitle="Uncontrolled breach release"
              />
              <MetricCard
                title="TOTAL SPILLWAY GATES"
                value={totalGates !== null ? totalGates : "N/A"}
                unit={totalGates !== null ? "gates" : ""}
                badge={totalGates !== null ? `${sluiceGates ?? 0} SLUICE + ${crestGates ?? 0} CREST` : "NOT SPECIFIED"}
                badgeType="info"
                subtitle="Radial tainter & sluices"
              />
              <MetricCard
                title="PLUNGE BASIN ENERGY"
                value={peakBreachQ ? "HIGH" : "N/A"}
                badge="HYDRAULIC JUMP"
                badgeType="danger"
                subtitle="Severe toe turbulence"
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">SPILLWAY HYDRAULIC COMPARISON</span>
                  <span className="panel-badge">{damSpecs.name}</span>
                </div>
                <div className="data-table-wrap">
                  <table className="cyber-table">
                    <tbody>
                      <tr>
                        <td>Spillway Type</td>
                        <td>{damSpecs.spillwayType || "Ogee Crest with Concrete Chute"}</td>
                      </tr>
                      <tr>
                        <td>Design Flood Discharge</td>
                        <td><strong>{spillwayCap !== null ? `${spillwayCap.toLocaleString()} m³/s` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Simulated Uncontrolled Outflow</td>
                        <td><strong className="text-danger">{peakBreachQ !== null ? `${peakBreachQ.toLocaleString()} m³/s` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Spillway Capacity Utilization</td>
                        <td><strong className="text-warning">{peakBreachQ && spillwayCap ? `${((peakBreachQ / spillwayCap) * 100).toFixed(1)}%` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Under-Sluice Gates at Risk</td>
                        <td>{sluiceGates !== null ? `${sluiceGates} Units (Bed-silt jamming risk)` : "N/A"}</td>
                      </tr>
                      <tr>
                        <td>Crest Radial Gates Status</td>
                        <td>{crestGates !== null ? `${crestGates} Units (Surcharge overtopping load)` : "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">GATE SYSTEM VULNERABILITY MATRIX</span>
                  <span className="panel-badge">RISK CLASSIFICATION</span>
                </div>

                <div className="gate-risk-card">
                  <div className="risk-item">
                    <strong>Radial Crest Gates Overtopping Vulnerability:</strong>
                    <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                      Surcharge exceeding {damSpecs.maximumWaterLevelMWL ? `${damSpecs.maximumWaterLevelMWL} m MSL` : "MWL"} introduces hydrodynamic uplift forces on trunnion pins and hoist cables.
                    </p>
                  </div>

                  <div className="risk-item" style={{ marginTop: "12px" }}>
                    <strong>Deep Under-Sluice Choking Risk:</strong>
                    <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                      High hydraulic gradients during rapid drawdown cause reservoir sediment mobilization, risking gate jamming.
                    </p>
                  </div>

                  <div className="risk-item" style={{ marginTop: "12px" }}>
                    <strong>Estimated Gate Replacement &amp; Overhaul:</strong>
                    <div className="sim-stat-row">
                      <span>Radial Gate Hoist Rehabilitation:</span>
                      <strong className="text-warning">₹ 18.5 Crores</strong>
                    </div>
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
