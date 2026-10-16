import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation } from "../../services/api";

export function InflowOutflowView({ selectedDamId, onSelectDam, onBack }) {
  const [simOutput, setSimOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHydrographData = async () => {
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
    fetchHydrographData();
  }, [selectedDamId]);

  const hydrograph = simOutput?.hydrograph || [];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Home"
        feature="Inflow & Outflow"
        title="Inflow & Outflow Hydrograph Telemetry"
        description="Comprehensive discharge attenuation hydrograph, peak outflow rating curves, and volumetric stage routing."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={fetchHydrographData}>
        {simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="PEAK BREACH OUTFLOW (Qp)"
                value={simOutput.peakBreachOutflowM3s?.toLocaleString()}
                unit="m³/s"
                badge="PEAK DISCHARGE"
                badgeType="danger"
                subtitle={`Calculated via ${simOutput.solverType}`}
              />
              <MetricCard
                title="TIME TO PEAK OUTFLOW"
                value={simOutput.timeToPeakHours?.toFixed(2)}
                unit="hours"
                badge="CRITICAL TIMING"
                badgeType="warning"
                subtitle="From breach initiation"
              />
              <MetricCard
                title="TOTAL OUTFLOW VOLUME"
                value={simOutput.totalOutflowVolumeMCM?.toLocaleString()}
                unit="MCM"
                badge="TOTAL SURCHARGE"
                badgeType="info"
                subtitle="Total released downstream"
              />
              <MetricCard
                title="BASE INITIAL FLOW"
                value={simOutput?.initialFlowM3s ?? simOutput?.modelParameters?.initialFlowM3s ?? "N/A"}
                unit={simOutput?.initialFlowM3s || simOutput?.modelParameters?.initialFlowM3s ? "m³/s" : ""}
                badge="ANTECEDENT"
                badgeType="success"
                subtitle="Baseline antecedent river flow"
              />
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">OUTFLOW HYDROGRAPH TIME-SERIES (15-MIN INTERVALS)</span>
                <span className="panel-badge">{simOutput.damName}</span>
              </div>

              <div className="data-table-wrap" style={{ maxHeight: "420px", overflowY: "auto" }}>
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Time (Elapsed)</th>
                      <th>Outflow Discharge (m³/s)</th>
                      <th>Reservoir Water Level (m MSL)</th>
                      <th>Breach Progression (%)</th>
                      <th>Hydraulic Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hydrograph.map((pt, idx) => {
                      const isPeak = Math.abs(pt.outflowDischargeM3s - simOutput.peakBreachOutflowM3s) < 50;
                      return (
                        <tr key={idx} className={isPeak ? "highlight-row" : ""}>
                          <td><strong>T + {pt.timeHours.toFixed(2)} hrs</strong></td>
                          <td className={isPeak ? "text-danger font-bold" : "text-cyan"}>
                            {pt.outflowDischargeM3s.toLocaleString()} m³/s
                          </td>
                          <td>{pt.waterLevelM.toFixed(2)} m</td>
                          <td>
                            <div className="progress-bar-wrap">
                              <div
                                className="progress-bar-fill"
                                style={{ width: `${Math.min(100, pt.breachProgressPercent)}%` }}
                              />
                              <span>{pt.breachProgressPercent.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td>
                            {isPeak ? (
                              <span className="table-badge badge-danger">PEAK OUTFLOW</span>
                            ) : pt.timeHours < simOutput.timeToPeakHours ? (
                              <span className="table-badge badge-warning">RISING LIMB</span>
                            ) : (
                              <span className="table-badge badge-info">RECEDING LIMB</span>
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
