import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, getDamById } from "../../services/api";
import { INDIAN_DAMS_REGISTRY } from "../../data/damData";
import { RealFloodMap2D } from "../../components/map/RealFloodMap2D";

export function FloodPathView({
  selectedDamId,
  onSelectDam,
  onBack,
  simulationResult: externalSimResult,
  onRunSimulation,
  isSimulating: externalIsSimulating,
  simulationError: externalSimError,
}) {
  const [localSimOutput, setLocalSimOutput] = useState(null);
  const [damSpecs, setDamSpecs] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Active dam metadata
  const activeDam =
    INDIAN_DAMS_REGISTRY.find((d) => d.id === selectedDamId) ||
    INDIAN_DAMS_REGISTRY[0];

  // Check if external simulation matches selected dam
  const isExternalMatch = Boolean(
    externalSimResult && externalSimResult.damId === selectedDamId
  );

  const simOutput = isExternalMatch
    ? externalSimResult
    : (localSimOutput?.damId === selectedDamId ? localSimOutput : null);

  const isLoading = externalIsSimulating !== undefined ? externalIsSimulating : localLoading;
  const error = externalSimError !== undefined ? externalSimError : localError;

  // Clear stale local simulation when dam switches
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

  // Fetch dam specs for baseline info
  useEffect(() => {
    let isMounted = true;
    getDamById(selectedDamId)
      .then((data) => {
        if (isMounted && data) setDamSpecs(data);
      })
      .catch((e) => {
        console.warn("Could not fetch remote dam specs, using registry baseline:", e);
        if (isMounted) setDamSpecs(activeDam);
      });
    return () => {
      isMounted = false;
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

  const dam = damSpecs || activeDam;
  const reaches = simOutput?.reachResults || dam?.reaches || [];

  return (
    <div className="feature-page-container">
      <PageHeader
        category="2-D Flood Map"
        feature="Flood Path"
        title="2D Downstream Flood Routing Path"
        description="Hydrodynamic river channel corridor tracking the downstream flood wave frontier along the river valley."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={false} error={null}>
        <div className="view-content-grid">
          {/* Top Metric Cards */}
          <div className="metrics-summary-row">
            <MetricCard
              title="RIVER BASIN CORRIDOR"
              value={`${dam?.location?.river || "River"} River`}
              badge="RIVERINE VALLEY"
              badgeType="info"
              subtitle={`Basin: ${dam?.location?.basin || "River Basin"}`}
            />
            <MetricCard
              title="WAVE FRONT REACHED"
              value={simOutput?.waveFrontFrontierKm !== undefined ? simOutput.waveFrontFrontierKm : "—"}
              unit="km"
              badge="FRONTIER ADVANCE"
              badgeType="danger"
              subtitle="Downstream wave distance"
            />
            <MetricCard
              title="MONITORED REACHES"
              value={reaches.length || "—"}
              unit="reaches"
              badge="CROSS-SECTIONS"
              badgeType="info"
              subtitle="High-resolution survey sections"
            />
            <MetricCard
              title="MAX WAVE VELOCITY"
              value={simOutput?.maxFlowVelocityMs !== undefined ? simOutput.maxFlowVelocityMs.toFixed(1) : "—"}
              unit="m/s"
              badge="GODUNOV FLUX"
              badgeType="warning"
              subtitle="Peak celerity in valley"
            />
          </div>

          {/* Real Street-Level Interactive 2D Flood Map */}
          <RealFloodMap2D
            activeDam={dam}
            simulationOutput={simOutput}
            isLoading={isLoading}
            errorMessage={error}
            onRetry={handleExecuteSimulation}
            onRequestSimulation={handleExecuteSimulation}
            showReachesTimeline={true}
            title="FLOOD ROUTING & RIVER REACH MAP"
            subtitle={`Downstream Flow Path & Wave Routing on OpenStreetMap for ${dam?.name}`}
          />

          {/* Reach Routing Trajectory Cards */}
          {reaches && reaches.length > 0 && (
            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">FLOOD ROUTING REACH TRAJECTORY</span>
                <span className="panel-badge">{dam?.name}</span>
              </div>

              <div className="reach-path-flow">
                {reaches.map((reach, idx) => (
                  <div key={reach.reachId || reach.id || idx} className="reach-step-card">
                    <div className="reach-step-num">{idx + 1}</div>
                    <div className="reach-step-content">
                      <div className="reach-step-header">
                        <strong>{reach.reachName || reach.name}</strong>
                        <span className="step-dist">{reach.distanceFromDamKm} km from dam toe</span>
                      </div>
                      <div className="reach-step-meta">
                        <span>
                          Arrival:{" "}
                          <strong>
                            {reach.arrivalTimeHours !== undefined ? `T + ${reach.arrivalTimeHours} hrs` : "N/A (Awaiting Simulation)"}
                          </strong>
                        </span>
                        {reach.channelWidthM && <span>Channel Width: {reach.channelWidthM} m</span>}
                        {reach.maxFloodDepthM !== undefined && (
                          <span>
                            Peak Depth: <strong className="text-cyan">{reach.maxFloodDepthM.toFixed(1)} m</strong>
                          </span>
                        )}
                        {reach.hazardCategory && (
                          <span
                            className={`table-badge badge-${
                              reach.hazardCategory.toUpperCase() === "EXTREME" ? "danger" : "warning"
                            }`}
                          >
                            {reach.hazardCategory}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </StateContainer>
    </div>
  );
}
