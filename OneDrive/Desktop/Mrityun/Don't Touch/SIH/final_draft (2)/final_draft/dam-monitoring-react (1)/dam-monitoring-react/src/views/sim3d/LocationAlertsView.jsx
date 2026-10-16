import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, getDamById } from "../../services/api";

export function LocationAlertsView({ selectedDamId, onSelectDam, onBack }) {
  const [simOutput, setSimOutput] = useState(null);
  const [damSpecs, setDamSpecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sim, dam] = await Promise.all([
        runSimulation({ selectedDamId }),
        getDamById(selectedDamId),
      ]);
      setSimOutput(sim);
      setDamSpecs(dam);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDamId]);

  const settlements = damSpecs?.settlements || [];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="3-D Simulation"
        feature="Location-Based Alerts"
        title="Settlement-Specific Geospatial Warning Cards"
        description="Location-tailored flood warnings mapped to Census of India habitations along the downstream river corridor."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadData}>
        {simOutput && damSpecs && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="MONITORED SETTLEMENTS"
                value={settlements.length}
                unit="locations"
                badge="HABITATION NODES"
                badgeType="info"
                subtitle="Mapped Census centers"
              />
              <MetricCard
                title="HIGH-PRIORITY ZONES"
                value={settlements.filter((s) => s.distanceFromDamKm <= 15).length}
                unit="towns"
                badge="RED ZONE (&lt;15 km)"
                badgeType="danger"
                subtitle="Immediate flash flood hazard"
              />
              <MetricCard
                title="TOTAL RESIDENTS MONITORED"
                value={settlements.reduce((acc, s) => acc + (s.censusPopulation || 0), 0).toLocaleString()}
                unit="citizens"
                badge="CENSUS 2011"
                badgeType="warning"
                subtitle="Total population along valley"
              />
              <MetricCard
                title="VALLEY REACH LENGTH"
                value={damSpecs.reaches?.length ? damSpecs.reaches[damSpecs.reaches.length - 1]?.distanceFromDamKm : "N/A"}
                unit={damSpecs.reaches?.length ? "km" : ""}
                badge="MONITORED BASIN"
                badgeType="info"
                subtitle={`${damSpecs.location?.river || "River"} Basin`}
              />
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">SETTLEMENT WARNING TILES</span>
                <span className="panel-badge">{damSpecs.name} RIVER REACH</span>
              </div>

              <div className="settlement-alert-grid">
                {settlements.map((settle) => {
                  const isRedZone = settle.distanceFromDamKm <= 15;
                  // Interpolate arrival time from reaches if available
                  const matchingReach = damSpecs.reaches?.find(r => Math.abs(r.distanceFromDamKm - settle.distanceFromDamKm) <= 5);
                  const estArrival = matchingReach?.arrivalTimeHours !== undefined ? matchingReach.arrivalTimeHours : null;
                  return (
                    <div
                      key={settle.id}
                      className={`settlement-alert-card ${isRedZone ? "border-danger" : "border-warning"}`}
                    >
                      <div className="settlement-card-header">
                        <div>
                          <strong className="settlement-name">{settle.name}</strong>
                          <span className="settlement-dist">{settle.district} District</span>
                        </div>
                        <span className={`table-badge badge-${isRedZone ? "danger" : "warning"}`}>
                          {isRedZone ? "RED ALERT (<15 km)" : "YELLOW ADVISORY"}
                        </span>
                      </div>

                      <div className="settlement-stats-grid">
                        <div>
                          <span>Chainage:</span>
                          <strong>{settle.distanceFromDamKm} km</strong>
                        </div>
                        <div>
                          <span>Population:</span>
                          <strong className="text-warning">{settle.censusPopulation.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span>Ground Elevation:</span>
                          <strong>{settle.elevationMSL} m MSL</strong>
                        </div>
                        <div>
                          <span>Estimated Arrival:</span>
                          <strong className="text-danger">{estArrival !== null ? `T + ${estArrival} hrs` : "N/A"}</strong>
                        </div>
                      </div>

                      <div className="settlement-action-footer">
                        {isRedZone ? (
                          <span className="text-danger font-bold">
                            🚨 Stage-3 Mandatory Evacuation to Relief Center
                          </span>
                        ) : (
                          <span className="text-warning">
                            ⚠️ Monitor local gauge station and standby for evacuation
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
