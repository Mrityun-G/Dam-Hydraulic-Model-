import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation } from "../../services/api";

export function OverflowProbabilityView({ selectedDamId, onSelectDam, onBack }) {
  const [simOutput, setSimOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateOvertopping = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await runSimulation({
        selectedDamId,
        failureMode: "overtopping",
      });
      setSimOutput(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateOvertopping();
  }, [selectedDamId]);

  const hazardBreakdown = simOutput?.spatialImpact?.hazardLevelBreakdown || {};
  const extremeCount = hazardBreakdown["EXTREME"] || hazardBreakdown["Extreme"] || 0;
  const sigCount = hazardBreakdown["SIGNIFICANT"] || hazardBreakdown["Significant"] || 0;
  const modCount = hazardBreakdown["MODERATE"] || hazardBreakdown["Moderate"] || 0;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Model Input"
        feature="Overflow Probability"
        title="Reservoir Overtopping Probability & Hydraulic Risk"
        description="Physical simulation of hydraulic surcharge overtopping breach mechanism and resultant downstream hazard ratings."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={calculateOvertopping}>
        {simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="FAILURE MECHANISM"
                value="OVERTOPPING"
                badge="HYDRAULIC BREACH"
                badgeType="danger"
                subtitle="Crest overtopping surge"
              />
              <MetricCard
                title="MAX FLOOD DEPTH"
                value={simOutput.maxFloodDepthM?.toFixed(1)}
                unit="meters"
                badge="MAX IMMERSION"
                badgeType="danger"
                subtitle="Peak depth in downstream valley"
              />
              <MetricCard
                title="TOTAL INUNDATION AREA"
                value={simOutput.totalInundationAreaKm2?.toFixed(1)}
                unit="km²"
                badge="VALLEY FLOOD"
                badgeType="danger"
                subtitle="Submerged terrain surface"
              />
              <MetricCard
                title="EXTREME HAZARD REACHES"
                value={extremeCount}
                unit="reaches"
                badge="CRITICAL DANGER"
                badgeType="danger"
                subtitle={`${sigCount} Significant, ${modCount} Moderate`}
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">OVERTOPPING HYDRODYNAMIC OUTPUT</span>
                  <span className="panel-badge">{simOutput.damName}</span>
                </div>
                <div className="data-table-wrap">
                  <table className="cyber-table">
                    <tbody>
                      <tr>
                        <td>Simulation Run ID</td>
                        <td><code>{simOutput.simulationId}</code></td>
                      </tr>
                      <tr>
                        <td>Solver Architecture</td>
                        <td>{simOutput.solverModelLabel || simOutput.solverType}</td>
                      </tr>
                      <tr>
                        <td>Peak Breach Outflow (Qp)</td>
                        <td><strong className="text-danger">{simOutput.peakBreachOutflowM3s?.toLocaleString()} m³/s</strong></td>
                      </tr>
                      <tr>
                        <td>Wave Front Reached</td>
                        <td>{simOutput.waveFrontFrontierKm} km downstream</td>
                      </tr>
                      <tr>
                        <td>Exposed Population (Census)</td>
                        <td><strong className="text-warning">{simOutput.spatialImpact?.modelAffectedPopulation?.toLocaleString()}</strong></td>
                      </tr>
                      <tr>
                        <td>Settlements Affected</td>
                        <td>{simOutput.spatialImpact?.affectedSettlementsCount} of {simOutput.spatialImpact?.totalSettlementsInReach}</td>
                      </tr>
                      <tr>
                        <td>Impacted Critical Facilities</td>
                        <td>{simOutput.spatialImpact?.modelImpactedFacilitiesCount} nodes</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">DOWNSTREAM REACH HAZARD RATINGS</span>
                  <span className="panel-badge">UK DEFRA FD2320</span>
                </div>

                <div className="reach-hazard-list">
                  {simOutput.reachResults?.map((r) => (
                    <div key={r.reachId} className="reach-hazard-card">
                      <div className="reach-hazard-header">
                        <strong>{r.reachName}</strong>
                        <span className={`table-badge badge-${
                          r.hazardCategory === "EXTREME" || r.hazardCategory === "Extreme" ? "danger" : "warning"
                        }`}>
                          {r.hazardCategory} (HR: {r.hazardRatingHR})
                        </span>
                      </div>
                      <div className="reach-hazard-details">
                        <span>Distance: {r.distanceFromDamKm} km</span>
                        <span>Arrival: T+{r.arrivalTimeHours} hrs</span>
                        <span>Max Depth: {r.maxFloodDepthM.toFixed(1)} m</span>
                        <span>Velocity: {r.maxVelocityMs.toFixed(1)} m/s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
