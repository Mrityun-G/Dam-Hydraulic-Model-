import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation } from "../../services/api";

export function EarlyWarningsView({ selectedDamId, onSelectDam, onBack }) {
  const [simOutput, setSimOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEarlyWarnings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runSimulation({ selectedDamId });
      setSimOutput(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarlyWarnings();
  }, [selectedDamId]);

  const advisoryReaches =
    simOutput?.reachResults?.filter(
      (r) => r.hazardCategory === "SIGNIFICANT" || r.hazardCategory === "MODERATE"
    ) || [];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="3-D Simulation"
        feature="Early Warnings"
        title="Early Warning Dispatches & Standby Advisories"
        description="Downstream predictive lead-time notifications, river gauge threshold alarms, and emergency standby mobilization directives."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadEarlyWarnings}>
        {simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="EARLY ADVISORY REACHES"
                value={advisoryReaches.length}
                unit="corridors"
                badge="STAGE-2 ADVISORY"
                badgeType="warning"
                subtitle="Downstream early warning sectors"
              />
              <MetricCard
                title="AVERAGE LEAD TIME"
                value={advisoryReaches.length > 0 ? `T+${(
                  advisoryReaches.reduce((acc, r) => acc + (r.arrivalTimeHours || 0), 0) /
                  advisoryReaches.length
                ).toFixed(1)} hrs` : "N/A"}
                unit=""
                badge="PREPARATION BUFFER"
                badgeType="info"
                subtitle={advisoryReaches.length > 0 ? "Time window to mobilize assets" : "No advisory reaches currently"}
              />
              <MetricCard
                title="RIVER BASIN STATUS"
                value="WATCH ACTIVE"
                badge="CWC NETWORK"
                badgeType="warning"
                subtitle={`${simOutput.riverName} River`}
              />
              <MetricCard
                title="STANDBY UNITS ALERTED"
                value="SDRF / NDRF"
                badge="DISPATCH READY"
                badgeType="success"
                subtitle="Battalion staging initialized"
              />
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">DOWNSTREAM ADVISORY MONITORING STATIONS</span>
                <span className="panel-badge">{advisoryReaches.length} REACH SECTORS</span>
              </div>

              <div className="advisory-cards-list">
                {advisoryReaches.map((reach) => (
                  <div key={reach.reachId} className="advisory-card">
                    <div className="advisory-card-header">
                      <div className="advisory-title-wrap">
                        <span className="table-badge badge-warning">{reach.hazardCategory} HAZARD</span>
                        <strong>{reach.reachName}</strong>
                      </div>
                      <span className="advisory-lead-time">Lead Time: T+{reach.arrivalTimeHours}h</span>
                    </div>

                    <div className="advisory-metrics-row">
                      <span>Distance: <strong>{reach.distanceFromDamKm} km</strong></span>
                      <span>Peak Stage Time: <strong>T+{reach.peakTimeHours}h</strong></span>
                      <span>Projected Inundation: <strong className="text-warning">{reach.maxFloodDepthM.toFixed(1)} m</strong></span>
                      <span>Flow Velocity: <strong>{reach.maxVelocityMs.toFixed(1)} m/s</strong></span>
                    </div>

                    <p className="advisory-text">
                      Flood wave crest scheduled to cross sector at T+{reach.arrivalTimeHours}h. 
                      Reinforce riverbank bunds, halt civil river crossings, and establish emergency relief camps on high ground.
                    </p>
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
