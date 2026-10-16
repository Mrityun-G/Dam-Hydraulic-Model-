import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { compareSphVsDelft3d } from "../../services/api";

export function PredictiveAnalyticsView({ selectedDamId, onSelectDam, onBack }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await compareSphVsDelft3d({ selectedDamId });
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [selectedDamId]);

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Real-Time Monitoring"
        feature="Predictive Analytics"
        title="SPH 3D vs Delft3D-FM Multi-Solver Predictive Analytics"
        description="Rigorous hydrodynamic cross-validation comparing 3D Navier-Stokes particle mechanics against 2D flexible mesh shallow water equations."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadComparison}>
        {metrics && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="SPATIAL OVERLAP (IoU)"
                value={metrics.spatialIntersectionOverUnionIoU}
                unit="IoU"
                badge="HIGH CONVERGENCE"
                badgeType="success"
                subtitle="Inundation boundary match"
              />
              <MetricCard
                title="PEAK DISCHARGE DELTA"
                value={`${metrics.peakDischargePercentDiff > 0 ? "+" : ""}${metrics.peakDischargePercentDiff}%`}
                unit="percent"
                badge="SPH vs DELFT3D"
                badgeType="warning"
                subtitle="3D jet acceleration effect"
              />
              <MetricCard
                title="DEPTH ERROR (RMSE)"
                value={metrics.crossSectionDepthRmseM?.toFixed(3)}
                unit="meters"
                badge="CROSS-SECTION RMSE"
                badgeType="info"
                subtitle={`Mean Abs Error: ${metrics.meanAbsoluteErrorMaeM} m`}
              />
              <MetricCard
                title="VELOCITY CORRELATION (r)"
                value={metrics.velocityCorrelationPearsonR}
                badge="PEARSON R"
                badgeType="success"
                subtitle="Hydrodynamic wave celerity"
              />
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">CROSS-REACH SOLVER COMPARISON MATRIX</span>
                <span className="panel-badge">{metrics.damName}</span>
              </div>

              <div className="data-table-wrap">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Reach Cross-Section</th>
                      <th>Distance</th>
                      <th>SPH 3D Depth</th>
                      <th>Delft3D Depth</th>
                      <th>Depth Delta (Δ)</th>
                      <th>SPH Velocity</th>
                      <th>Delft3D Velocity</th>
                      <th>Wave Arrival SPH / D3D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.reachComparisons?.map((rc) => (
                      <tr key={rc.reachId}>
                        <td><strong>{rc.reachName}</strong></td>
                        <td>{rc.distanceKm} km</td>
                        <td className="text-cyan">{rc.depthSphM.toFixed(1)} m</td>
                        <td>{rc.depthDelft3dM.toFixed(1)} m</td>
                        <td className={Math.abs(rc.depthDeltaM) > 1.5 ? "text-warning font-bold" : ""}>
                          {rc.depthDeltaM > 0 ? `+${rc.depthDeltaM}` : rc.depthDeltaM} m
                        </td>
                        <td className="text-emerald">{rc.velocitySphMs.toFixed(1)} m/s</td>
                        <td>{rc.velocityDelft3dMs.toFixed(1)} m/s</td>
                        <td>T+{rc.arrivalSphHours}h / T+{rc.arrivalDelft3dHours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {metrics.scientificAnalysis && (
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">SCIENTIFIC COUPLING &amp; HYDRODYNAMIC FINDINGS</span>
                  <span className="panel-badge">RESEARCH VERIFICATION</span>
                </div>

                <div className="scientific-findings-grid">
                  <div className="finding-card">
                    <strong>Near-Field Jet Hydrodynamics (0 - 5 km):</strong>
                    <p>{metrics.scientificAnalysis.nearFieldHydrodynamics}</p>
                  </div>

                  <div className="finding-card">
                    <strong>Far-Field Floodplain Diffusion (&gt; 15 km):</strong>
                    <p>{metrics.scientificAnalysis.farFieldFloodplainDiffusion}</p>
                  </div>

                  <div className="finding-card">
                    <strong>Hydraulic Jump Detection:</strong>
                    <p>{metrics.scientificAnalysis.hydraulicJumpLocation}</p>
                  </div>

                  <div className="finding-card">
                    <strong>Recommended Operational Coupling:</strong>
                    <p className="text-cyan">{metrics.scientificAnalysis.recommendedApplication}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </StateContainer>
    </div>
  );
}
