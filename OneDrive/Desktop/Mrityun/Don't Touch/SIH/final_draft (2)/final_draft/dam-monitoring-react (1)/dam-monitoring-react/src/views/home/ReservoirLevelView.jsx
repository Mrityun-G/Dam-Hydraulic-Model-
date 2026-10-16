import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { getDamById, runSimulation } from "../../services/api";

export function ReservoirLevelView({ selectedDamId, onSelectDam, onBack }) {
  const [damData, setDamData] = useState(null);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadDamData = async () => {
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
    loadDamData();
  }, [selectedDamId]);

  const handleSimulateDrawdown = async () => {
    setSimLoading(true);
    try {
      const res = await runSimulation({ selectedDamId });
      setSimData(res);
    } catch (err) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const frl = damData?.fullReservoirLevelFRL ?? null;
  const mwl = damData?.maximumWaterLevelMWL ?? null;
  const dsl = damData?.deadStorageLevelDSL ?? null;
  const grossStorage = damData?.grossStorageCapacityMCM ?? null;
  const effectiveStorage = damData?.effectiveStorageCapacityMCM ?? null;
  const currentLevel = simData?.hydrograph?.length ? simData.hydrograph[simData.hydrograph.length - 1]?.waterLevelM : null;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Home"
        feature="Reservoir Level"
        title="Reservoir Level & Stage Specifications"
        description="Elevation stage thresholds, verified storage capacities (CWC Registry), and simulation water level telemetry."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadDamData}>
        {damData && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="SIMULATION WATER LEVEL"
                value={currentLevel !== null ? currentLevel.toFixed(2) : "Awaiting Run"}
                unit={currentLevel !== null ? "m MSL" : ""}
                badge={currentLevel !== null ? (mwl && currentLevel >= mwl ? "SURCHARGE / OVERTOPPING" : "COMPUTED STAGE") : "STANDBY"}
                badgeType={currentLevel !== null ? (mwl && currentLevel >= mwl ? "danger" : "info") : "neutral"}
                subtitle={mwl !== null ? `Maximum Water Level: ${mwl} m MSL` : "Run simulation to calculate stage"}
              />
              <MetricCard
                title="FULL RESERVOIR LEVEL (FRL)"
                value={frl !== null ? frl.toFixed(2) : "N/A"}
                unit={frl !== null ? "m MSL" : ""}
                badge="REFERENCE SPEC"
                badgeType="info"
                subtitle={dsl !== null ? `Dead Storage Level: ${dsl} m MSL` : "Dead storage level not specified"}
              />
              <MetricCard
                title="GROSS STORAGE CAPACITY"
                value={grossStorage !== null ? grossStorage.toLocaleString() : "N/A"}
                unit={grossStorage !== null ? "MCM" : ""}
                badge="DESIGN STORAGE"
                badgeType="info"
                subtitle={effectiveStorage !== null ? `Live Capacity: ${effectiveStorage.toLocaleString()} MCM` : "Live capacity not specified"}
              />
              <MetricCard
                title="FREEBOARD MARGIN"
                value={(mwl !== null && currentLevel !== null) ? Math.max(0, mwl - currentLevel).toFixed(2) : (mwl !== null && frl !== null ? (mwl - frl).toFixed(2) : "N/A")}
                unit={(mwl !== null && (currentLevel !== null || frl !== null)) ? "m" : ""}
                badge={currentLevel !== null && mwl !== null ? (mwl - currentLevel <= 0.5 ? "CRITICAL" : "SAFE") : "DESIGN MARGIN"}
                badgeType={currentLevel !== null && mwl !== null && mwl - currentLevel <= 0.5 ? "danger" : "success"}
                subtitle={currentLevel !== null ? "Crest safety margin (Simulated)" : "Design crest margin (MWL - FRL)"}
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">RESERVOIR STAGE-STORAGE SPECS</span>
                  <span className="panel-badge">{damData.name}</span>
                </div>
                <div className="data-table-wrap">
                  <table className="cyber-table">
                    <tbody>
                      <tr>
                        <td>Dam Identity</td>
                        <td><strong>{damData.name}</strong></td>
                      </tr>
                      <tr>
                        <td>River &amp; Basin</td>
                        <td>{damData.location.river} River ({damData.location.basin})</td>
                      </tr>
                      <tr>
                        <td>Geographic Coordinates</td>
                        <td>{damData.location.latitude.toFixed(4)}°N, {damData.location.longitude.toFixed(4)}°E</td>
                      </tr>
                      <tr>
                        <td>Maximum Water Level (MWL)</td>
                        <td><strong className="text-danger">{mwl !== null ? `${mwl} m MSL` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Full Reservoir Level (FRL)</td>
                        <td><strong>{frl !== null ? `${frl} m MSL` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Dead Storage Level (DSL)</td>
                        <td>{dsl !== null ? `${dsl} m MSL` : "N/A"}</td>
                      </tr>
                      <tr>
                        <td>Gross Storage Capacity</td>
                        <td>{grossStorage !== null ? `${grossStorage.toLocaleString()} MCM` : "N/A"}</td>
                      </tr>
                      <tr>
                        <td>Spillway Discharge Capacity</td>
                        <td>{damData.spillwayCapacityM3s !== undefined && damData.spillwayCapacityM3s !== null ? `${damData.spillwayCapacityM3s.toLocaleString()} m³/s` : "N/A"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">BREACH DRAWDOWN SIMULATION</span>
                  <span className="panel-badge">HYDRO-SIM</span>
                </div>
                <p className="panel-desc">
                  Run the 2D hydrodynamic solver to observe water-level depletion during breach propagation.
                </p>

                <button
                  type="button"
                  className="action-button-primary"
                  onClick={handleSimulateDrawdown}
                  disabled={simLoading}
                >
                  {simLoading ? "CALCULATING DRAWDOWN..." : "SIMULATE BREACH DRAWDOWN"}
                </button>

                {simData && (
                  <div className="sim-result-box" style={{ marginTop: "16px" }}>
                    <div className="sim-result-title">Simulated Reservoir Depletion</div>
                    <div className="sim-stat-row">
                      <span>Peak Outflow:</span>
                      <strong>{simData.peakBreachOutflowM3s?.toLocaleString()} m³/s</strong>
                    </div>
                    <div className="sim-stat-row">
                      <span>Time to Peak:</span>
                      <strong>{simData.timeToPeakHours} hours</strong>
                    </div>
                    <div className="sim-stat-row">
                      <span>Total Volume Drained:</span>
                      <strong>{simData.totalOutflowVolumeMCM} MCM</strong>
                    </div>
                    <div className="sim-stat-row">
                      <span>Residual Water Level:</span>
                      <strong>{simData.hydrograph[simData.hydrograph.length - 1]?.waterLevelM} m MSL</strong>
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
