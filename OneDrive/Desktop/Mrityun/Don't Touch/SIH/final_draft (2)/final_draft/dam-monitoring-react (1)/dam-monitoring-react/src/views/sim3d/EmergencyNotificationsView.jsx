import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, generateHazardSummary, runSphSimulation } from "../../services/api";

export function EmergencyNotificationsView({ selectedDamId, onSelectDam, onBack }) {
  const [hazardSummary, setHazardSummary] = useState(null);
  const [simOutput, setSimOutput] = useState(null);
  const [sphOutput, setSphOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const sim = await runSimulation({ selectedDamId });
      setSimOutput(sim);

      const [summary, sph] = await Promise.all([
        generateHazardSummary(sim),
        runSphSimulation({ selectedDamId }),
      ]);

      setHazardSummary(summary);
      setSphOutput(sph);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [selectedDamId]);

  return (
    <div className="feature-page-container">
      <PageHeader
        category="3-D Simulation"
        feature="Emergency Notifications"
        title="Emergency Notifications Dispatch & Phased Protocol Directives"
        description="Official NDMA / SDMA phased disaster response orders, automated siren broadcast triggers, and 3D hydrodynamic physics validation."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadNotifications}>
        {hazardSummary && simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="EXECUTIVE HAZARD RATING"
                value="CATASTROPHIC"
                badge="FLASH FLOOD"
                badgeType="danger"
                subtitle={`${simOutput.damName} Basin`}
              />
              <MetricCard
                title="POPULATION UNDER ADVISORY"
                value={simOutput.spatialImpact?.modelAffectedPopulation?.toLocaleString()}
                unit="citizens"
                badge="CENSUS OF INDIA"
                badgeType="danger"
                subtitle="Exposed to flood celerity"
              />
              <MetricCard
                title="DISASTER PHASES DEFINED"
                value={hazardSummary.recommendedPhasedActions?.length ?? "N/A"}
                unit={hazardSummary.recommendedPhasedActions?.length ? "action phases" : ""}
                badge="PROTOCOL"
                badgeType="warning"
                subtitle="Milestone response phases"
              />
              <MetricCard
                title="3D SPH PHYSICS MODEL"
                value={sphOutput?.particleCount ? `${sphOutput.particleCount.toLocaleString()}` : "N/A"}
                unit={sphOutput?.particleCount ? "particles" : ""}
                badge="NAVIER-STOKES"
                badgeType="info"
                subtitle={sphOutput ? "DualSPHysics 3D engine" : "Awaiting SPH simulation run"}
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">PHASED DISASTER MANAGEMENT ACTION ORDERS</span>
                  <span className="panel-badge">STANDARD OPERATING PROCEDURE</span>
                </div>

                <div className="phased-actions-list">
                  {hazardSummary.recommendedPhasedActions?.map((act, i) => (
                    <div key={i} className="phase-action-item">
                      <div className="phase-badge">STAGE {i + 1}</div>
                      <div className="phase-content">
                        <p>{act}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {hazardSummary.executiveAssessment && (
                  <div className="summary-assessment-box" style={{ marginTop: "16px" }}>
                    <span className="box-title text-cyan">EXECUTIVE BRIEFING</span>
                    <p style={{ marginTop: "6px", fontSize: "13px", color: "#e2e8f0" }}>
                      {hazardSummary.executiveAssessment}
                    </p>
                  </div>
                )}
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">CRITICAL EXPOSURE &amp; 3D SIMULATION TELEMETRY</span>
                  <span className="panel-badge">INCIDENT HUD</span>
                </div>

                <div className="critical-risks-box">
                  <span className="box-title text-danger">⚠️ IDENTIFIED EXPOSURE POINTS</span>
                  <ul className="bullet-list" style={{ marginTop: "8px" }}>
                    {hazardSummary.criticalRisks?.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>

                {sphOutput && (
                  <div className="sph-metrics-box" style={{ marginTop: "16px" }}>
                    <span className="box-title text-info">3D SPH PARTICLE SOLVER TELEMETRY</span>
                    <div className="sim-stat-row" style={{ marginTop: "8px" }}>
                      <span>Solver:</span>
                      <strong>{sphOutput.solverName}</strong>
                    </div>
                    <div className="sim-stat-row">
                      <span>Particle Count:</span>
                      <strong>{sphOutput.particleCount?.toLocaleString()} particles</strong>
                    </div>
                    <div className="sim-stat-row">
                      <span>Computation Time:</span>
                      <strong>{sphOutput.computationTimeSec} sec</strong>
                    </div>
                    <div className="sim-stat-row">
                      <span>Peak Wave Velocity:</span>
                      <strong className="text-emerald">{sphOutput.maxWaveFrontVelocityMs} m/s</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
