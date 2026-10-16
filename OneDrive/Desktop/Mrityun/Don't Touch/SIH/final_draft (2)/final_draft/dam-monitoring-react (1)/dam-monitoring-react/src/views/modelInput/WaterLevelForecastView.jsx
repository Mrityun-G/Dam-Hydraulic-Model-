import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, getDamById } from "../../services/api";

export function WaterLevelForecastView({ selectedDamId, onSelectDam, onBack }) {
  const [duration, setDuration] = useState(24);
  const [initialWaterLevel, setInitialWaterLevel] = useState("");
  const [simOutput, setSimOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const executeForecast = async (overrideLevel) => {
    setLoading(true);
    setError(null);
    try {
      let levelToUse = overrideLevel !== undefined && overrideLevel !== "" ? overrideLevel : initialWaterLevel;
      if (!levelToUse && levelToUse !== 0) {
        const dam = await getDamById(selectedDamId);
        levelToUse = dam?.maximumWaterLevelMWL ?? dam?.fullReservoirLevelFRL ?? 192.94;
        setInitialWaterLevel(levelToUse);
      }
      const data = await runSimulation({
        selectedDamId,
        simulationDurationHours: Number(duration) || 24,
        reservoirWaterLevel: Number(levelToUse),
      });
      setSimOutput(data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    getDamById(selectedDamId).then(dam => {
      if (!isMounted) return;
      const defLevel = dam?.maximumWaterLevelMWL ?? dam?.fullReservoirLevelFRL ?? "";
      setInitialWaterLevel(defLevel);
      executeForecast(defLevel);
    }).catch((err) => {
      if (!isMounted) return;
      executeForecast();
    });
    return () => { isMounted = false; };
  }, [selectedDamId]);

  const hydrograph = simOutput?.hydrograph || [];
  const startLevel = hydrograph[0]?.waterLevelM ?? initialWaterLevel;
  const endLevel = hydrograph[hydrograph.length - 1]?.waterLevelM ?? startLevel;
  const totalDrop = (startLevel - endLevel).toFixed(2);

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Model Input"
        feature="Water-Level Forecast"
        title="Predictive Reservoir Water-Level Forecast"
        description="Hydrodynamic kinematic stage routing forecasting water-level elevation depletion and downstream surge trajectory."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <div className="control-panel-card">
        <div className="control-panel-title">FORECAST CONFIGURATION PARAMETERS</div>
        <div className="control-inputs-grid">
          <div className="input-field-group">
            <label>INITIAL RESERVOIR STAGE (m MSL):</label>
            <input
              type="number"
              step="0.1"
              value={initialWaterLevel}
              onChange={(e) => setInitialWaterLevel(e.target.value)}
              className="cyber-input"
            />
          </div>

          <div className="input-field-group">
            <label>FORECAST HORIZON (HOURS):</label>
            <input
              type="number"
              min="6"
              max="72"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="cyber-input"
            />
          </div>

          <div className="input-field-group" style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              className="action-button-primary"
              onClick={() => executeForecast()}
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "COMPUTING FORECAST..." : "RUN FORECAST SIMULATION"}
            </button>
          </div>
        </div>
      </div>

      <StateContainer loading={loading} error={error} onRetry={() => executeForecast()}>
        {simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="INITIAL WATER LEVEL"
                value={startLevel?.toFixed(2)}
                unit="m MSL"
                badge="INITIAL POOL"
                badgeType="info"
                subtitle="At forecast initiation"
              />
              <MetricCard
                title="FORECASTED RESIDUAL STAGE"
                value={endLevel?.toFixed(2)}
                unit="m MSL"
                badge="PROJECTED DRAWDOWN"
                badgeType="warning"
                subtitle={`After ${duration} hours`}
              />
              <MetricCard
                title="NET STAGE DRAWDOWN"
                value={totalDrop}
                unit="meters"
                badge="HEAD LOSS"
                badgeType="danger"
                subtitle="Total head decrease"
              />
              <MetricCard
                title="PEAK OUTFLOW ARRIVAL"
                value={`T+${simOutput.timeToPeakHours?.toFixed(2)}`}
                unit="hrs"
                badge="MAX ATTENUATION"
                badgeType="danger"
                subtitle={`Peak Q: ${simOutput.peakBreachOutflowM3s?.toLocaleString()} m³/s`}
              />
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">PREDICTED STAGE EVOLUTION TIME-SERIES</span>
                <span className="panel-badge">{simOutput.damName}</span>
              </div>

              <div className="data-table-wrap" style={{ maxHeight: "380px", overflowY: "auto" }}>
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Forecast Time</th>
                      <th>Reservoir Water Level (m MSL)</th>
                      <th>Stage Drop Rate (m/hr)</th>
                      <th>Discharge Rate (m³/s)</th>
                      <th>Breach Progression</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hydrograph.map((pt, idx) => {
                      const prevLevel = idx > 0 ? hydrograph[idx - 1].waterLevelM : pt.waterLevelM;
                      const dropRate = (Math.abs(prevLevel - pt.waterLevelM) * 4).toFixed(3);
                      return (
                        <tr key={idx}>
                          <td><strong>T + {pt.timeHours.toFixed(2)} hrs</strong></td>
                          <td className="text-cyan font-bold">{pt.waterLevelM.toFixed(2)} m</td>
                          <td>{dropRate} m/hr</td>
                          <td>{pt.outflowDischargeM3s.toLocaleString()} m³/s</td>
                          <td>{pt.breachProgressPercent.toFixed(1)}%</td>
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
