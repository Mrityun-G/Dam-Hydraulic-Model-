import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { getDamById } from "../../services/api";

export function StructuralHealthView({ selectedDamId, onSelectDam, onBack }) {
  const [damData, setDamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDamById(selectedDamId);
      setDamData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDam();
  }, [selectedDamId]);

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Home"
        feature="Structural Health"
        title="Dam Structural Health & Foundation Integrity"
        description="Comprehensive geotechnical telemetry, piezometric seepage analysis, foundation displacement, and seismic safety indices."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadDam}>
        {damData && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="STRUCTURAL HEIGHT"
                value={damData.heightAboveLowestFoundation}
                unit="meters"
                badge="FOUNDATION ELEVATION"
                badgeType="info"
                subtitle="Height above lowest foundation"
              />
              <MetricCard
                title="CREST LENGTH"
                value={damData.crestLengthM?.toLocaleString()}
                unit="meters"
                badge="LINEAR EXTENT"
                badgeType="info"
                subtitle="Total masonry / earthen crest"
              />
              <MetricCard
                title="COMPLETION YEAR"
                value={damData.completionYear}
                unit={`(${new Date().getFullYear() - damData.completionYear} yrs)`}
                badge="OPERATIONAL AGE"
                badgeType="success"
                subtitle="Commissioning year"
              />
              <MetricCard
                title="STRUCTURAL INTEGRITY"
                value="N/A"
                unit=""
                badge="NO SCADA TELEMETRY"
                badgeType="info"
                subtitle="Requires live piezometer / sensor feed"
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">GEOTECHNICAL &amp; STRUCTURAL PROFILE</span>
                  <span className="panel-badge">{damData.name}</span>
                </div>
                <div className="data-table-wrap">
                  <table className="cyber-table">
                    <tbody>
                      <tr>
                        <td>Dam Structure</td>
                        <td><strong>{damData.name}</strong></td>
                      </tr>
                      <tr>
                        <td>Dam Classification</td>
                        <td><strong className="text-cyan">{damData.damType}</strong></td>
                      </tr>
                      <tr>
                        <td>Catchment Area</td>
                        <td>{damData.catchmentAreaSqKm ? `${damData.catchmentAreaSqKm.toLocaleString()} sq km` : "N/A"}</td>
                      </tr>
                      <tr>
                        <td>Pore Pressure Telemetry</td>
                        <td><span className="text-muted font-bold">N/A (Awaiting Live SCADA Feed)</span></td>
                      </tr>
                      <tr>
                        <td>Seepage Rate Index</td>
                        <td><span className="text-muted">N/A (Requires Sensor Integration)</span></td>
                      </tr>
                      <tr>
                        <td>Foundation Displacement</td>
                        <td><span className="text-muted">N/A (Requires Sensor Integration)</span></td>
                      </tr>
                      <tr>
                        <td>Seismic Zone Rating</td>
                        <td>Zone III / Moderate Seismic Design Peak Ground Accel (Reference)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">INSTRUMENTATION SPECIFICATIONS</span>
                  <span className="panel-badge">SENSOR SPEC</span>
                </div>

                <div className="sensor-list">
                  <div className="sensor-item">
                    <div className="sensor-info">
                      <strong>Vibrating Wire Piezometers</strong>
                      <span>Measures uplift pressure along dam toe and body</span>
                    </div>
                    <span className="table-badge badge-info">CONFIGURED (Spec)</span>
                  </div>

                  <div className="sensor-item">
                    <div className="sensor-info">
                      <strong>Inclinometers &amp; Pendulums</strong>
                      <span>Monitors crest plumbline deflection and foundation tilt</span>
                    </div>
                    <span className="table-badge badge-info">CONFIGURED (Spec)</span>
                  </div>

                  <div className="sensor-item">
                    <div className="sensor-info">
                      <strong>Seepage Measuring V-Notch Weirs</strong>
                      <span>Continuous seepage water volume discharge logging</span>
                    </div>
                    <span className="table-badge badge-info">CONFIGURED (Spec)</span>
                  </div>

                  <div className="sensor-item">
                    <div className="sensor-info">
                      <strong>Strong Motion Accelerographs (SMA)</strong>
                      <span>Real-time seismic dynamic vibration response logging</span>
                    </div>
                    <span className="table-badge badge-info">CONFIGURED (Spec)</span>
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
