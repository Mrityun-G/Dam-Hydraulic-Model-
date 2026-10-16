import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { INDIAN_DAMS_REGISTRY } from '../../data/damData';
import {
  runSimulation,
  runSphSimulation,
  runDelft3dSimulation,
  compareSphVsDelft3d,
} from '../../services/api';
import { Dam3DScene } from '../../components/sim3d/Dam3DScene';
import { SceneErrorBoundary } from '../../components/sim3d/SceneErrorBoundary';
import { SimulationTimeline } from '../../components/sim3d/SimulationTimeline';
import { SimulationMetricsHUD } from '../../components/sim3d/SimulationMetricsHUD';
import '../../styles/sim3d.css';

/**
 * Simulation3DView: Primary 3D Hydrodynamic Dam-Break Simulation View
 * Features dam-specific 3D architectural models, procedural CartoDEM terrain,
 * dynamic flood wave propagation, multi-solver execution, and verified data provenance.
 */
export function Simulation3DView({
  selectedDamId,
  onSelectDam,
  onBack,
  modelParams,
  onUpdateModelParams,
  onRunSimulation,
  simulationResult: externalSimResult,
  isSimulating: externalIsSimulating,
  simulationError: externalSimError,
}) {
  // Solver selection
  const [selectedSolver, setSelectedSolver] = useState('2D_SWE_FiniteVolume');

  // Timeline & Playback State
  const [simulationTimeHours, setSimulationTimeHours] = useState(2.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activeCameraPreset, setActiveCameraPreset] = useState('valley_overview');

  // Layer Toggles
  const [showDam, setShowDam] = useState(true);
  const [showReservoir, setShowReservoir] = useState(true);
  const [showFloodWater, setShowFloodWater] = useState(true);
  const [showVelocityVectors, setShowVelocityVectors] = useState(true);
  const [showSettlements, setShowSettlements] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showVegetation, setShowVegetation] = useState(true);

  // Local Simulation States
  const [localSimOutput, setLocalSimOutput] = useState(null);
  const [sphOutput, setSphOutput] = useState(null);
  const [delft3dOutput, setDelft3dOutput] = useState(null);
  const [comparisonOutput, setComparisonOutput] = useState(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Active Dam Specs
  const activeDam =
    INDIAN_DAMS_REGISTRY.find((d) => d.id === selectedDamId) ||
    INDIAN_DAMS_REGISTRY[0];

  // Match external simulation result to current dam
  const isExternalMatch = Boolean(
    externalSimResult && externalSimResult.damId === selectedDamId
  );
  const currentSimOutput = isExternalMatch
    ? externalSimResult
    : (localSimOutput?.damId === selectedDamId ? localSimOutput : null);

  const isSimulating = externalIsSimulating !== undefined ? externalIsSimulating : localLoading;
  const simulationError = externalSimError !== undefined ? externalSimError : localError;

  // Stale data protection: clear old simulation when dam changes
  useEffect(() => {
    if (localSimOutput && localSimOutput.damId !== selectedDamId) {
      setLocalSimOutput(null);
      setSphOutput(null);
      setDelft3dOutput(null);
      setComparisonOutput(null);
    }
    setSimulationTimeHours(0.0);
    setIsPlaying(false);
  }, [selectedDamId]);

  // Timeline playback loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setSimulationTimeHours((prev) => {
          if (prev >= 12.0) {
            setIsPlaying(false);
            return 12.0;
          }
          return Number((prev + 0.05 * playbackSpeed).toFixed(2));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Execute Simulation based on Selected Solver
  const handleRunSolver = async () => {
    setLocalLoading(true);
    setLocalError(null);

    const payload = {
      ...modelParams,
      selectedDamId,
      selectedSolver,
    };

    try {
      if (selectedSolver === '3D_SPH_DualSPHysics') {
        const [sim, sph] = await Promise.all([
          runSimulation(payload),
          runSphSimulation(payload),
        ]);
        setLocalSimOutput(sim);
        setSphOutput(sph);
      } else if (selectedSolver === 'Delft3D_FM_2D') {
        const [sim, d3d] = await Promise.all([
          runSimulation(payload),
          runDelft3dSimulation(payload),
        ]);
        setLocalSimOutput(sim);
        setDelft3dOutput(d3d);
      } else if (selectedSolver === 'SPH_vs_Delft3D_Comparison') {
        const [sim, comp, sph, d3d] = await Promise.all([
          runSimulation(payload),
          compareSphVsDelft3d(payload),
          runSphSimulation(payload),
          runDelft3dSimulation(payload),
        ]);
        setLocalSimOutput(sim);
        setComparisonOutput(comp);
        setSphOutput(sph);
        setDelft3dOutput(d3d);
      } else {
        // Standard 2D SWE Finite Volume or ML Surrogate
        if (onRunSimulation) {
          const res = await onRunSimulation(payload);
          if (res) setLocalSimOutput(res);
        } else {
          const res = await runSimulation(payload);
          setLocalSimOutput(res);
        }
      }
      setSimulationTimeHours(2.5);
      setIsPlaying(true);
    } catch (err) {
      console.error('3D Simulation error:', err);
      setLocalError(err.message || 'Simulation run failed');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="feature-page-container">
      {/* Page Header */}
      <PageHeader
        category="3-D Simulation"
        feature="3-D Simulation"
        title="3D Geospatial Dam Breach Hydrodynamic Simulator"
        description="High-resolution Three.js WebGL procedural valley terrain, authentic dam-specific 3D architectural models, and multi-solver wave propagation."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      {/* Solver & Parameter Control Strip */}
      <div
        className="cyber-panel"
        style={{
          padding: '14px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#00e6c8', fontWeight: 800 }}>
              SOLVER ENGINE:
            </span>
            <select
              value={selectedSolver}
              onChange={(e) => setSelectedSolver(e.target.value)}
              className="dam-select-dropdown"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(0,230,200,0.4)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              <option value="2D_SWE_FiniteVolume">2D SWE Finite Volume (Godunov Scheme)</option>
              <option value="3D_SPH_DualSPHysics">3D SPH DualSPHysics (Navier-Stokes Jet)</option>
              <option value="Delft3D_FM_2D">Delft3D-FM 2D Flexible Mesh (D-Flow)</option>
              <option value="SPH_vs_Delft3D_Comparison">SPH vs Delft3D Scientific Cross-Validation</option>
              <option value="ML_Surrogate_FloodUNet">ML Surrogate FloodUNet (Inference Mode)</option>
            </select>
          </div>

          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>
            Mode: <strong style={{ color: '#fff' }}>{modelParams?.failureMode || 'overtopping'}</strong> · 
            Water Level: <strong style={{ color: '#38bdf8' }}>{modelParams?.reservoirWaterLevel ?? activeDam?.fullReservoirLevelFRL ?? 'N/A'} m MSL</strong> · 
            Breach Width: <strong style={{ color: '#fbbf24' }}>{modelParams?.breachAverageWidth ?? activeDam?.defaultScenario?.breachAverageWidth ?? 'N/A'} m</strong>
          </div>
        </div>

        <button
          type="button"
          className="sim3d-btn primary"
          onClick={handleRunSolver}
          disabled={isSimulating}
          style={{ padding: '8px 20px', fontSize: '12px' }}
        >
          {isSimulating ? 'EXECUTING SOLVER...' : '▶ EXECUTE 3D SIMULATION'}
        </button>
      </div>

      {/* Error Alert */}
      {simulationError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            padding: '12px 18px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '12px',
            fontFamily: 'monospace',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠️ {simulationError}</span>
          <button
            type="button"
            className="sim3d-btn"
            onClick={handleRunSolver}
            style={{ borderColor: '#ef4444', color: '#f87171' }}
          >
            RETRY
          </button>
        </div>
      )}

      {/* 3D WebGL Scene Viewport wrapped in Error Boundary to prevent crashes */}
      <SceneErrorBoundary>
        <Dam3DScene
          activeDam={activeDam}
          simulationOutput={currentSimOutput}
          simulationTimeHours={simulationTimeHours}
          showDam={showDam}
          showReservoir={showReservoir}
          showFloodWater={showFloodWater}
          showVelocityVectors={showVelocityVectors}
          showSettlements={showSettlements}
          showFacilities={showFacilities}
          showVegetation={showVegetation}
          activeCameraPreset={activeCameraPreset}
          onCameraPresetApplied={setActiveCameraPreset}
        />
      </SceneErrorBoundary>

      {/* Simulation Timeline & Control Bar */}
      <SimulationTimeline
        simulationTimeHours={simulationTimeHours}
        onTimeChange={setSimulationTimeHours}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onReset={() => {
          setSimulationTimeHours(0.0);
          setIsPlaying(false);
        }}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        showDam={showDam}
        onToggleDam={setShowDam}
        showReservoir={showReservoir}
        onToggleReservoir={setShowReservoir}
        showFloodWater={showFloodWater}
        onToggleFloodWater={setShowFloodWater}
        showVelocityVectors={showVelocityVectors}
        onToggleVelocityVectors={setShowVelocityVectors}
        showSettlements={showSettlements}
        onToggleSettlements={setShowSettlements}
        showFacilities={showFacilities}
        onToggleFacilities={setShowFacilities}
        showVegetation={showVegetation}
        onToggleVegetation={setShowVegetation}
        onRunSimulation={handleRunSolver}
        isSimulating={isSimulating}
      />

      {/* Verified Backend Simulation Metrics HUD */}
      <SimulationMetricsHUD
        simulationOutput={currentSimOutput}
        sphOutput={sphOutput}
        delft3dOutput={delft3dOutput}
        comparisonOutput={comparisonOutput}
        simulationTimeHours={simulationTimeHours}
        activeDam={activeDam}
        selectedSolver={selectedSolver}
      />
    </div>
  );
}
