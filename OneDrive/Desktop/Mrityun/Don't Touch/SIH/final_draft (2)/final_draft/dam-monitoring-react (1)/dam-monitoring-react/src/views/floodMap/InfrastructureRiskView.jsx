import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, getDamById } from "../../services/api";

export function InfrastructureRiskView({ selectedDamId, onSelectDam, onBack }) {
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

  const impact = simOutput?.spatialImpact || {};
  const facilities = damSpecs?.criticalFacilities || [];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="2-D Flood Map"
        feature="Infrastructure Risk"
        title="Downstream Infrastructure Exposure & Vulnerability"
        description="Census population receptors, lifeline critical facilities, highway bridges, and power grid nodes in inundation zones."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadData}>
        {simOutput && damSpecs && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="EXPOSED CENSUS POPULATION"
                value={impact.modelAffectedPopulation?.toLocaleString() ?? "N/A"}
                unit={impact.modelAffectedPopulation ? "residents" : ""}
                badge="REFERENCE DATA (Census 2011)"
                badgeType="danger"
                subtitle="Populations in mapped flood reaches"
              />
              <MetricCard
                title="AFFECTED SETTLEMENTS"
                value={`${impact.affectedSettlementsCount} / ${impact.totalSettlementsInReach}`}
                unit="villages / towns"
                badge="HABITATIONS"
                badgeType="danger"
                subtitle="In flood propagation path"
              />
              <MetricCard
                title="CRITICAL ASSETS IMPACTED"
                value={impact.modelImpactedFacilitiesCount}
                unit="facilities"
                badge="LIFELINE NODES"
                badgeType="warning"
                subtitle="Hospitals, bridges, substations"
              />
              <MetricCard
                title="HIGHWAY / ROAD INTERRUPT"
                value={simOutput?.spatialImpact?.modelInundatedRoadNetworkKm !== undefined ? simOutput.spatialImpact.modelInundatedRoadNetworkKm.toFixed(1) : "N/A"}
                unit={simOutput?.spatialImpact?.modelInundatedRoadNetworkKm !== undefined ? "km submerged" : ""}
                badge="TRANSPORT CUTOFF"
                badgeType="warning"
                subtitle="Corridors requiring bypass"
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">CRITICAL FACILITIES IN HAZARD PATH</span>
                  <span className="panel-badge">{facilities.length} ASSETS</span>
                </div>

                <div className="facilities-list">
                  {facilities.map((fac) => (
                    <div key={fac.id} className="facility-card">
                      <div className="facility-header">
                        <strong>{fac.name}</strong>
                        <span className="table-badge badge-danger">{fac.criticalLevel}</span>
                      </div>
                      <div className="facility-meta">
                        <span>Type: <strong>{fac.facilityType}</strong></span>
                        <span>Distance: {fac.distanceFromDamKm} km</span>
                        <span>Ground Elevation: {fac.elevationMSL} m MSL</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">POPULATION SETTLEMENTS EXPOSURE</span>
                  <span className="panel-badge">CENSUS OF INDIA</span>
                </div>

                <div className="settlements-list">
                  {damSpecs.settlements?.map((s) => (
                    <div key={s.id} className="settlement-card">
                      <div className="settlement-header">
                        <strong>{s.name} ({s.district})</strong>
                        <span className="text-warning font-bold">
                          {s.censusPopulation.toLocaleString()} residents
                        </span>
                      </div>
                      <div className="settlement-meta">
                        <span>Distance: {s.distanceFromDamKm} km</span>
                        <span>Elevation: {s.elevationMSL} m MSL</span>
                        <span>Vulnerability: {(s.vulnerabilityIndex * 100).toFixed(0)}%</span>
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
