import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, runSphSimulation } from "../../services/api";

export function CriticalAlertsView({ selectedDamId, onSelectDam, onBack }) {
  const [simOutput, setSimOutput] = useState(null);
  const [sphOutput, setSphOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sim, sph] = await Promise.all([
        runSimulation({ selectedDamId }),
        runSphSimulation({ selectedDamId }),
      ]);
      setSimOutput(sim);
      setSphOutput(sph);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedDamId]);

  const criticalReaches =
    simOutput?.reachResults?.filter(
      (r) => r.hazardCategory === "EXTREME" || r.maxFloodDepthM > 6.0
    ) || [];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="3-D Simulation"
        feature="Critical Alerts"
        title="Critical High-Priority Breach Alarms & Emergency Directives"
        description="Priority Stage-3 catastrophic breach alert dispatch, dam-toe plunge basin warnings, and immediate life-safety evacuation triggers."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadAlerts}>
        {simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="ACTIVE CRITICAL ALERTS"
                value={criticalReaches.length}
                unit="immediate alarms"
                badge="STAGE-3 RED ALERT"
                badgeType="danger"
                subtitle="Life-safety emergency active"
              />
              <MetricCard
                title="PEAK DISCHARGE ALARM"
                value={simOutput.peakBreachOutflowM3s?.toLocaleString()}
                unit="m³/s"
                badge="CATASTROPHIC"
                badgeType="danger"
                subtitle="Peak release at dam toe"
              />
              <MetricCard
                title="MAX WAVE VELOCITY"
                value={simOutput.maxFlowVelocityMs?.toFixed(1)}
                unit="m/s"
                badge="HIGH VELOCITY FLUX"
                badgeType="danger"
                subtitle="Destructive kinetic energy"
              />
              <MetricCard
                title="SPH 3D RESOLUTION"
                value={sphOutput?.particleCount ? `${(sphOutput.particleCount / 1000000).toFixed(1)}M` : "N/A"}
                unit={sphOutput?.particleCount ? "particles" : ""}
                badge="DUALSPHYSICS 3D"
                badgeType="info"
                subtitle={sphOutput ? "Non-hydrostatic jet celerity" : "Awaiting SPH simulation run"}
              />
            </div>

            <div className="critical-banner-box">
              <div className="critical-banner-header">
                <span className="pulsing-red-dot" />
                <strong>IMMEDIATE DAM BREAK FLASH FLOOD DIRECTIVE — RED ALERT</strong>
              </div>
              <p>
                Severe breach initiation detected at <strong>{simOutput.damName}</strong>. 
                Downstream wave celerity will inundate the immediate 15 km river corridor within 45 minutes. 
                Full automated sirens dispatched for local administrative districts.
              </p>
            </div>

            <div className="cyber-panel" style={{ marginTop: "16px" }}>
              <div className="panel-header">
                <span className="panel-title">EXTREME HAZARD SECTOR ALERTS</span>
                <span className="panel-badge">{criticalReaches.length} SECTORS</span>
              </div>

              <div className="alert-cards-grid">
                {criticalReaches.map((reach) => (
                  <div key={reach.reachId} className="emergency-alert-card">
                    <div className="alert-card-top">
                      <span className="alert-danger-badge">CRITICAL EMERGENCY</span>
                      <span className="alert-time">Arrival: T+{reach.arrivalTimeHours} hrs</span>
                    </div>
                    <div className="alert-reach-title">{reach.reachName}</div>
                    <div className="alert-stats-row">
                      <div>Distance: <strong>{reach.distanceFromDamKm} km</strong></div>
                      <div>Max Depth: <strong className="text-danger">{reach.maxFloodDepthM.toFixed(1)} m</strong></div>
                      <div>Velocity: <strong className="text-danger">{reach.maxVelocityMs.toFixed(1)} m/s</strong></div>
                      <div>Defra HR: <strong className="text-danger">{reach.hazardRatingHR} (EXTREME)</strong></div>
                    </div>
                    <div className="alert-action-text">
                      Immediate mandatory vertical/lateral evacuation of all habitations within 1.5 km of riverbanks required.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
