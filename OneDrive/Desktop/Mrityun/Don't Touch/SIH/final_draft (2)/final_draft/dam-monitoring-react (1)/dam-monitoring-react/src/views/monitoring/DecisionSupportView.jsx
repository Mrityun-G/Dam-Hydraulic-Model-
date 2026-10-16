import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { getGeeStatus, getGeeObservations, getDamById } from "../../services/api";

export function DecisionSupportView({ selectedDamId, onSelectDam, onBack }) {
  const [geeStatus, setGeeStatus] = useState(null);
  const [observations, setObservations] = useState([]);
  const [damSpecs, setDamSpecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadGeeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [status, obs, dam] = await Promise.all([
        getGeeStatus(),
        getGeeObservations(selectedDamId),
        getDamById(selectedDamId),
      ]);
      setGeeStatus(status);
      setObservations(obs || []);
      setDamSpecs(dam);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeeData();
  }, [selectedDamId]);

  const latestObs = observations[0];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Real-Time Monitoring"
        feature="Decision Support"
        title="Near-Real-Time Satellite Decision Support (GEE Earth Observation)"
        description="Copernicus Sentinel-1 Synthetic Aperture Radar (SAR) and Sentinel-2 optical imagery for cloud-penetrating water surface detection."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadGeeData}>
        {damSpecs && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="LATEST SATELLITE PASS"
                value={latestObs?.date || "N/A"}
                badge={latestObs?.status || "NO PASS DATA"}
                badgeType={latestObs?.status ? "success" : "info"}
                subtitle={latestObs?.satellite || "Sentinel-1A SAR"}
              />
              <MetricCard
                title="OBSERVED WATER SURFACE"
                value={latestObs?.observedFloodAreaKm2 !== undefined ? latestObs.observedFloodAreaKm2.toFixed(1) : "N/A"}
                unit={latestObs?.observedFloodAreaKm2 !== undefined ? "km²" : ""}
                badge="SAR SURFACE"
                badgeType="info"
                subtitle="Radar backscatter water mask"
              />
              <MetricCard
                title="CLOUD COVER PENETRATION"
                value={latestObs?.cloudCoverPercent !== undefined ? `${latestObs.cloudCoverPercent}%` : "N/A"}
                unit={latestObs?.cloudCoverPercent !== undefined ? "cloud cover" : ""}
                badge="C-BAND SAR"
                badgeType="success"
                subtitle="All-weather radar imaging"
              />
              <MetricCard
                title="GEE INTEGRATION HUB"
                value={geeStatus?.authMode || "Awaiting Config"}
                badge={geeStatus?.isConfigured ? "AUTHENTICATED" : "PUBLIC MODE"}
                badgeType={geeStatus?.isConfigured ? "success" : "info"}
                subtitle="Google Earth Engine"
              />
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">SATELLITE OBSERVATION PASS LOGS</span>
                <span className="panel-badge">{damSpecs.name} BASIN</span>
              </div>

              <div className="data-table-wrap">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Acquisition Date</th>
                      <th>Satellite Platform</th>
                      <th>Sensor / Instrument</th>
                      <th>Spatial Resolution</th>
                      <th>Detected Water Area</th>
                      <th>Radar / Optical Index</th>
                      <th>Verification Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map((obs, idx) => (
                      <tr key={idx}>
                        <td><strong>{obs.date}</strong></td>
                        <td className="text-cyan">{obs.satellite}</td>
                        <td>{obs.sensor}</td>
                        <td>{obs.spatialResolutionM} meters</td>
                        <td className="text-warning font-bold">{obs.observedFloodAreaKm2} km²</td>
                        <td className="text-muted">{obs.radarPolarization}</td>
                        <td>
                          <span className={`table-badge badge-${
                            obs.status === "VERIFIED_OBSERVATION" ? "success" : "info"
                          }`}>
                            {obs.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {geeStatus && (
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">GOOGLE EARTH ENGINE SATELLITE CATALOG</span>
                  <span className="panel-badge">COPERNICUS DATA HUB</span>
                </div>

                <div className="catalog-grid">
                  {geeStatus.datasetCatalog?.map((cat, i) => (
                    <div key={i} className="catalog-item-card">
                      <span className="catalog-icon">🛰️</span>
                      <code>{cat}</code>
                    </div>
                  ))}
                </div>

                <p className="panel-desc" style={{ marginTop: "14px" }}>
                  {geeStatus.instructions}
                </p>
              </div>
            )}
          </div>
        )}
      </StateContainer>
    </div>
  );
}
