import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation } from "../../services/api";

export function TimeToImpactView({ selectedDamId, onSelectDam, onBack }) {
  const [simOutput, setSimOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTiming = async () => {
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
    loadTiming();
  }, [selectedDamId]);

  const reaches = simOutput?.reachResults || [];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="2-D Flood Map"
        feature="Time-to-Impact"
        title="Downstream Flood Arrival Isochrones & Travel Time"
        description="Hydrodynamic wave celerity isochrones mapping downstream travel time, peak inundation timing, and safe evacuation windows."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadTiming}>
        {simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="IMMEDIATE DAM-TOE IMPACT"
                value={reaches[0]?.arrivalTimeHours !== undefined ? `T+${reaches[0].arrivalTimeHours} hrs` : "N/A"}
                unit=""
                badge="ZERO BUFFER"
                badgeType="danger"
                subtitle="First downstream section hit"
              />
              <MetricCard
                title="MID-VALLEY TRAVEL TIME"
                value={reaches.length > 0 && reaches[Math.floor(reaches.length / 2)]?.arrivalTimeHours !== undefined ? `T+${reaches[Math.floor(reaches.length / 2)].arrivalTimeHours} hrs` : "N/A"}
                unit=""
                badge="MODERATE BUFFER"
                badgeType="warning"
                subtitle="Intermediate river plain"
              />
              <MetricCard
                title="DISTAL FRONTIER ARRIVAL"
                value={reaches.length > 0 && reaches[reaches.length - 1]?.arrivalTimeHours !== undefined ? `T+${reaches[reaches.length - 1].arrivalTimeHours} hrs` : "N/A"}
                unit=""
                badge="LONG-RANGE"
                badgeType="info"
                subtitle={reaches.length > 0 && reaches[reaches.length - 1]?.distanceFromDamKm !== undefined ? `Chainage ${reaches[reaches.length - 1].distanceFromDamKm} km` : "Terminal reach"}
              />
              <MetricCard
                title="PEAK WAVE CELERITY"
                value={simOutput.maxFlowVelocityMs ? simOutput.maxFlowVelocityMs.toFixed(1) : "N/A"}
                unit={simOutput.maxFlowVelocityMs ? "m/s" : ""}
                badge="MOMENTUM FLUX"
                badgeType="danger"
                subtitle="Front-runner wave velocity"
              />
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">WAVE PROPAGATION ISOCHRONE SCHEDULE</span>
                <span className="panel-badge">{simOutput.damName}</span>
              </div>

              <div className="data-table-wrap">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Reach Section</th>
                      <th>Distance from Breach</th>
                      <th>Wave Arrival Time</th>
                      <th>Peak Inundation Time</th>
                      <th>Flood Wave Velocity</th>
                      <th>Evacuation Action Window</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reaches.map((r) => {
                      const isImmediate = r.arrivalTimeHours < 1.0;
                      return (
                        <tr key={r.reachId} className={isImmediate ? "highlight-row" : ""}>
                          <td><strong>{r.reachName}</strong></td>
                          <td>{r.distanceFromDamKm} km</td>
                          <td className="text-warning font-bold">T + {r.arrivalTimeHours} hrs</td>
                          <td className="text-danger font-bold">T + {r.peakTimeHours} hrs</td>
                          <td className="text-emerald font-bold">{r.maxVelocityMs.toFixed(1)} m/s</td>
                          <td>
                            {isImmediate ? (
                              <span className="table-badge badge-danger">IMMEDIATE EVACUATION (0 - 45 min)</span>
                            ) : (
                              <span className="table-badge badge-warning">
                                {(r.arrivalTimeHours * 60).toFixed(0)} min lead time
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
