import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation } from "../../services/api";
import { INDIAN_DAMS_REGISTRY } from "../../data/damData";
import { RealFloodMap2D } from "../../components/map/RealFloodMap2D";

export function InundationMapView({
  selectedDamId,
  onSelectDam,
  onBack,
  simulationResult: externalSimResult,
  onRunSimulation,
  isSimulating: externalIsSimulating,
  simulationError: externalSimError,
}) {
  const [localSimOutput, setLocalSimOutput] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Active dam metadata
  const activeDam =
    INDIAN_DAMS_REGISTRY.find((d) => d.id === selectedDamId) ||
    INDIAN_DAMS_REGISTRY[0];

  // Check if external simulation result matches selected dam
  const isExternalMatch = Boolean(
    externalSimResult && externalSimResult.damId === selectedDamId
  );

  // Active simulation output
  const simOutput = isExternalMatch
    ? externalSimResult
    : (localSimOutput?.damId === selectedDamId ? localSimOutput : null);

  const isLoading = externalIsSimulating !== undefined ? externalIsSimulating : localLoading;
  const error = externalSimError !== undefined ? externalSimError : localError;

  // Clear stale local simulation if dam changes
  useEffect(() => {
    if (localSimOutput && localSimOutput.damId !== selectedDamId) {
      setLocalSimOutput(null);
    }
  }, [selectedDamId]);

  // Auto-fetch simulation on mount or dam change if not available
  useEffect(() => {
    let isCancelled = false;

    if (!simOutput && !isLoading) {
      setLocalLoading(true);
      setLocalError(null);
      runSimulation({ selectedDamId })
        .then((data) => {
          if (!isCancelled) {
            setLocalSimOutput(data);
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setLocalError(err.message || "Failed to execute simulation");
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setLocalLoading(false);
          }
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedDamId]);

  // Handler to trigger simulation for current dam
  const handleExecuteSimulation = async () => {
    setLocalLoading(true);
    setLocalError(null);
    try {
      if (onRunSimulation) {
        await onRunSimulation({ selectedDamId });
      } else {
        const data = await runSimulation({ selectedDamId });
        setLocalSimOutput(data);
      }
    } catch (err) {
      setLocalError(err.message || "Failed to execute simulation");
    } finally {
      setLocalLoading(false);
    }
  };

  const polygonFeaturesCount = simOutput?.floodExtentGeoJson?.features?.filter(
    (f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
  ).length || 0;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="2-D Flood Map"
        feature="Inundation Map"
        title="2D Inundation Extent & Flood Depth Distribution Map"
        description="Hydrodynamic 2D Saint-Venant shallow water solver inundation boundaries with spatial depth polygons and contour zones."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={false} error={null}>
        <div className="view-content-grid">
          {/* Top Metric Cards */}
          <div className="metrics-summary-row">
            <MetricCard
              title="TOTAL INUNDATED AREA"
              value={simOutput?.totalInundationAreaKm2 !== undefined ? simOutput.totalInundationAreaKm2.toFixed(1) : "—"}
              unit="km²"
              badge="VALLEY FLOOD"
              badgeType="danger"
              subtitle="High-resolution DEM raster footprint"
            />
            <MetricCard
              title="MAX FLOOD DEPTH"
              value={simOutput?.maxFloodDepthM !== undefined ? simOutput.maxFloodDepthM.toFixed(1) : "—"}
              unit="meters"
              badge="PEAK INUNDATION"
              badgeType="danger"
              subtitle="Maximum depth in river reach"
            />
            <MetricCard
              title="GEOJSON POLYGON FEATURES"
              value={polygonFeaturesCount || "—"}
              unit="polygons"
              badge="RFC 7946"
              badgeType="info"
              subtitle="Model-derived vector shapes"
            />
            <MetricCard
              title="DISCHARGE MODEL"
              value={simOutput ? (simOutput.solverModelLabel || "2D SWE") : "2D SWE"}
              badge="FINITE VOLUME"
              badgeType="success"
              subtitle="Godunov numerical scheme"
            />
          </div>

          {/* Real Street-Level Interactive 2D Flood Map */}
          <RealFloodMap2D
            activeDam={activeDam}
            simulationOutput={simOutput}
            isLoading={isLoading}
            errorMessage={error}
            onRetry={handleExecuteSimulation}
            onRequestSimulation={handleExecuteSimulation}
            title="STREET-LEVEL 2-D INUNDATION EXTENT MAP"
            subtitle={`OpenStreetMap Street Network & Backend Flood Extent Overlay for ${activeDam.name}`}
          />

          {/* Spatial Distribution Table */}
          {simOutput && simOutput.reachResults && simOutput.reachResults.length > 0 && (
            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">INUNDATION SPATIAL DISTRIBUTION TABLE</span>
                <span className="panel-badge">{simOutput.damName}</span>
              </div>

              <div className="data-table-wrap">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>Zone ID / Name</th>
                      <th>Chainage Distance</th>
                      <th>Maximum Depth</th>
                      <th>Flow Velocity</th>
                      <th>Defra Hazard Rating</th>
                      <th>Submerged Receptors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simOutput.reachResults.map((r, i) => (
                      <tr key={r.reachId || i}>
                        <td><strong>{r.reachName}</strong></td>
                        <td>{r.distanceFromDamKm} km</td>
                        <td className="text-cyan font-bold">{r.maxFloodDepthM.toFixed(1)} m</td>
                        <td className="text-emerald font-bold">{r.maxVelocityMs.toFixed(1)} m/s</td>
                        <td>
                          <span className={`table-badge badge-${
                            (r.hazardCategory || "").toUpperCase() === "EXTREME" ? "danger" : "warning"
                          }`}>
                            {r.hazardCategory || "Moderate"} ({r.hazardRatingHR || "—"})
                          </span>
                        </td>
                        <td>
                          {r.maxFloodDepthM > 5 ? (
                            <span className="text-danger font-bold">High Submergence Risk</span>
                          ) : (
                            <span className="text-warning">Moderate Inundation</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </StateContainer>
    </div>
  );
}
