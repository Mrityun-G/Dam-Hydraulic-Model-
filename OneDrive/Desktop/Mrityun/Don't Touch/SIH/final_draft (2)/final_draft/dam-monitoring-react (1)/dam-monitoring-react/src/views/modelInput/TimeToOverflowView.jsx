import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation } from "../../services/api";

export function TimeToOverflowView({ selectedDamId, onSelectDam, onBack }) {
  const [simOutput, setSimOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateTiming = async () => {
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
    calculateTiming();
  }, [selectedDamId]);

  const reaches = simOutput?.reachResults || [];
  const nearestReach = reaches[0];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Model Input"
        feature="Time-to-Overflow"
        title="Time-to-Overflow & Inundation Propagation Timing"
        description="Hydrodynamic wave celerity modeling computing breach formation duration, peak arrival, and downstream lead times."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={calculateTiming}>
        {simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="BREACH FORMATION TIME"
                value={simOutput.breachFormationTimeHours?.toFixed(2)}
                unit="hours"
                badge="FORMATION WINDOW"
                badgeType="warning"
                subtitle="Calculated via Froehlich (2008)"
              />
              <MetricCard
                title="TIME TO PEAK DISCHARGE"
                value={simOutput.timeToPeakHours?.toFixed(2)}
                unit="hours"
                badge="HYDROGRAPH PEAK"
                badgeType="danger"
                subtitle={`Peak Flow: ${simOutput.peakBreachOutflowM3s?.toLocaleString()} m³/s`}
              />
              <MetricCard
                title="DAM-TOE ARRIVAL LEAD TIME"
                value={nearestReach ? `T+${nearestReach.arrivalTimeHours}` : "N/A"}
                unit="hours"
                badge="IMMEDIATE IMPACT"
                badgeType="danger"
                subtitle={`Reach: ${nearestReach?.reachName || "Dam Toe"}`}
              />
              <MetricCard
                title="TOTAL SIMULATION HORIZON"
                value={simOutput.simulationDurationHours !== undefined ? Number(simOutput.simulationDurationHours).toFixed(1) : "N/A"}
                unit={simOutput.simulationDurationHours !== undefined ? "hours" : ""}
                badge="DYNAMIC ROUTING"
                badgeType="info"
                subtitle="Downstream wave tracking"
              />
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">DOWNSTREAM WAVE ARRIVAL CHRONOLOGY</span>
                <span className="panel-badge">{simOutput.damName}</span>
              </div>

              <div className="data-table-wrap">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Downstream Reach</th>
                      <th>Distance from Dam</th>
                      <th>Wave Front Arrival</th>
                      <th>Peak Stage Arrival</th>
                      <th>Max Inundation Depth</th>
                      <th>Evacuation Lead Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reaches.map((r, i) => (
                      <tr key={r.reachId}>
                        <td><strong>{r.reachName}</strong></td>
                        <td>{r.distanceFromDamKm} km</td>
                        <td className="text-warning font-bold">T + {r.arrivalTimeHours} hrs</td>
                        <td className="text-danger font-bold">T + {r.peakTimeHours} hrs</td>
                        <td className="text-cyan">{r.maxFloodDepthM.toFixed(1)} m</td>
                        <td>
                          <span className={`table-badge badge-${
                            r.arrivalTimeHours < 1.0 ? "danger" : r.arrivalTimeHours < 3.0 ? "warning" : "info"
                          }`}>
                            {r.arrivalTimeHours < 1.0
                              ? "IMMEDIATE (0 - 1h)"
                              : `${(r.arrivalTimeHours * 60).toFixed(0)} min buffer`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
