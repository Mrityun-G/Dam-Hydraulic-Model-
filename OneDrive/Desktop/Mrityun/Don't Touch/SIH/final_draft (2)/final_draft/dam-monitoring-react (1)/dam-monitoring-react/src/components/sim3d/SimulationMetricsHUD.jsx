import React from 'react';

/**
 * SimulationMetricsHUD: Real-time simulation metrics HUD cards
 * Strictly adheres to CRITICAL DATA VALIDATION RULE:
 * Explicitly labels backend data sources vs visual simulation timestep estimates.
 */
export function SimulationMetricsHUD({
  simulationOutput,
  sphOutput,
  delft3dOutput,
  comparisonOutput,
  simulationTimeHours,
  activeDam,
  selectedSolver = '2D_SWE_FiniteVolume',
}) {
  const isSimValid = Boolean(simulationOutput && simulationOutput.damId === activeDam?.id);

  // Dynamic wave front estimate at current scrubbed timeline position
  const maxReachKm = activeDam?.reaches?.length ? activeDam.reaches[activeDam.reaches.length - 1]?.distanceFromDamKm : 0;
  const currentFrontKm = simulationTimeHours <= 0 || !maxReachKm
    ? 0
    : Math.min(maxReachKm, Number((16.8 * Math.pow(simulationTimeHours, 0.82)).toFixed(1)));

  return (
    <div className="view-content-grid" style={{ marginTop: '20px' }}>
      <div className="metrics-summary-row">
        {/* Metric 1: Peak Outflow */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">PEAK BREACH DISCHARGE</span>
            <span className="metric-badge badge-danger">SOURCE: /api/simulate</span>
          </div>
          <div className="metric-body">
            <span className="metric-value" style={{ color: '#f87171' }}>
              {isSimValid && simulationOutput.peakBreachOutflowM3s
                ? simulationOutput.peakBreachOutflowM3s.toLocaleString()
                : '—'}
            </span>
            <span className="metric-unit">m³/s</span>
          </div>
          <div className="metric-subtitle">
            {isSimValid ? `Time to peak: ${simulationOutput.timeToPeakHours?.toFixed(2)} hrs` : 'Awaiting simulation run'}
          </div>
        </div>

        {/* Metric 2: Max Flood Depth */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">MAX FLOOD DEPTH</span>
            <span className="metric-badge badge-danger">SOURCE: /api/simulate</span>
          </div>
          <div className="metric-body">
            <span className="metric-value text-cyan">
              {isSimValid && simulationOutput.maxFloodDepthM !== undefined
                ? simulationOutput.maxFloodDepthM.toFixed(1)
                : '—'}
            </span>
            <span className="metric-unit">meters</span>
          </div>
          <div className="metric-subtitle">
            {isSimValid ? `Peak velocity: ${simulationOutput.maxFlowVelocityMs?.toFixed(1)} m/s` : 'Peak depth in reach'}
          </div>
        </div>

        {/* Metric 3: Inundation Footprint */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">TOTAL INUNDATED AREA</span>
            <span className="metric-badge badge-warning">SOURCE: /api/simulate</span>
          </div>
          <div className="metric-body">
            <span className="metric-value" style={{ color: '#fbbf24' }}>
              {isSimValid && simulationOutput.totalInundationAreaKm2 !== undefined
                ? simulationOutput.totalInundationAreaKm2.toFixed(1)
                : '—'}
            </span>
            <span className="metric-unit">km²</span>
          </div>
          <div className="metric-subtitle">
            {isSimValid ? `Total wave frontier: ${simulationOutput.waveFrontFrontierKm} km` : 'High-res valley footprint'}
          </div>
        </div>

        {/* Metric 4: Current Timeline Front */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">WAVE FRONT AT T+{simulationTimeHours.toFixed(1)}H</span>
            <span className="metric-badge badge-info">VISUAL STATE</span>
          </div>
          <div className="metric-body">
            <span className="metric-value text-emerald">
              {currentFrontKm.toFixed(1)}
            </span>
            <span className="metric-unit">km</span>
          </div>
          <div className="metric-subtitle">
            {simulationTimeHours <= 0 ? 'Breach inception (T+0:00)' : `Advancing through ${activeDam?.location?.river || 'River'} Valley`}
          </div>
        </div>
      </div>

      {/* SPH Specific Backend Metrics */}
      {selectedSolver === '3D_SPH_DualSPHysics' && sphOutput && (
        <div className="cyber-panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <span className="panel-title">3D SPH DUALSPHYSICS PARTICLES & RUNTIME</span>
            <span className="panel-badge">SOURCE: /api/sph/simulate</span>
          </div>
          <div className="metrics-summary-row" style={{ marginTop: '14px' }}>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">TOTAL FLUID PARTICLES</span>
                <span className="metric-badge badge-info">NAVIER-STOKES</span>
              </div>
              <div className="metric-body">
                <span className="metric-value text-cyan">
                  {(sphOutput.particleCount / 1000000).toFixed(2)}M
                </span>
                <span className="metric-unit">particles</span>
              </div>
              <div className="metric-subtitle">DualSPHysics 3D solver</div>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">SPH TIMESTEP (Δt)</span>
                <span className="metric-badge badge-info">CFL CONDITION</span>
              </div>
              <div className="metric-body">
                <span className="metric-value">{sphOutput.timeStepSec?.toFixed(4)}</span>
                <span className="metric-unit">sec</span>
              </div>
              <div className="metric-subtitle">Adaptive Courant condition</div>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">SPH COMPUTATION TIME</span>
                <span className="metric-badge badge-success">COMPLETED</span>
              </div>
              <div className="metric-body">
                <span className="metric-value">{sphOutput.computationTimeSec?.toFixed(2)}</span>
                <span className="metric-unit">sec</span>
              </div>
              <div className="metric-subtitle">GPU Navier-Stokes pipeline</div>
            </div>
          </div>
        </div>
      )}

      {/* Delft3D Specific Backend Metrics */}
      {selectedSolver === 'Delft3D_FM_2D' && delft3dOutput && (
        <div className="cyber-panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <span className="panel-title">DELFT3D-FM FLEXIBLE MESH & COMPLIANCE</span>
            <span className="panel-badge">SOURCE: /api/delft3d/simulate</span>
          </div>
          <div className="metrics-summary-row" style={{ marginTop: '14px' }}>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">FLEXIBLE MESH CELLS</span>
                <span className="metric-badge badge-info">UNSTRUCTURED</span>
              </div>
              <div className="metric-body">
                <span className="metric-value text-cyan">
                  {delft3dOutput.meshCellCount?.toLocaleString()}
                </span>
                <span className="metric-unit">cells</span>
              </div>
              <div className="metric-subtitle">Depth-averaged Manning mesh</div>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">DELFT3D RUNTIME</span>
                <span className="metric-badge badge-success">COMPLETED</span>
              </div>
              <div className="metric-body">
                <span className="metric-value">{delft3dOutput.computationTimeSec?.toFixed(2)}</span>
                <span className="metric-unit">sec</span>
              </div>
              <div className="metric-subtitle">{delft3dOutput.statusNotes || '2D D-Flow'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Metrics */}
      {selectedSolver === 'SPH_vs_Delft3D_Comparison' && comparisonOutput && (
        <div className="cyber-panel" style={{ marginTop: '16px' }}>
          <div className="panel-header">
            <span className="panel-title">SPH VS DELFT3D SCIENTIFIC CROSS-VALIDATION</span>
            <span className="panel-badge">SOURCE: /api/compare/sph-delft3d</span>
          </div>
          <div className="metrics-summary-row" style={{ marginTop: '14px' }}>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">PEAK DISCHARGE DELTA</span>
                <span className="metric-badge badge-warning">CROSS-MODEL</span>
              </div>
              <div className="metric-body">
                <span className="metric-value">{comparisonOutput.peakDischargePercentDiff?.toFixed(2)}</span>
                <span className="metric-unit">%</span>
              </div>
              <div className="metric-subtitle">DualSPHysics vs Delft3D</div>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">DEPTH RMSE</span>
                <span className="metric-badge badge-info">ACCURACY</span>
              </div>
              <div className="metric-body">
                <span className="metric-value text-cyan">{comparisonOutput.crossSectionDepthRmseM?.toFixed(2)}</span>
                <span className="metric-unit">m</span>
              </div>
              <div className="metric-subtitle">Mean Abs Error: {comparisonOutput.meanAbsoluteErrorMaeM?.toFixed(2)}m</div>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span className="metric-title">SPATIAL IOU</span>
                <span className="metric-badge badge-success">INUNDATION FIT</span>
              </div>
              <div className="metric-body">
                <span className="metric-value text-emerald">{(comparisonOutput.spatialIntersectionOverUnionIoU * 100).toFixed(1)}</span>
                <span className="metric-unit">%</span>
              </div>
              <div className="metric-subtitle">Pearson R: {comparisonOutput.velocityCorrelationPearsonR?.toFixed(3)}</div>
            </div>
          </div>
          {comparisonOutput.scientificAnalysis && (
            <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', lineHeight: '1.6', fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)' }}>
              <div><strong style={{ color: '#00e6c8' }}>Near-Field Hydrodynamics:</strong> {comparisonOutput.scientificAnalysis.nearFieldHydrodynamics}</div>
              <div style={{ marginTop: '6px' }}><strong style={{ color: '#00e6c8' }}>Far-Field Floodplain Diffusion:</strong> {comparisonOutput.scientificAnalysis.farFieldFloodplainDiffusion}</div>
              <div style={{ marginTop: '6px' }}><strong style={{ color: '#fbbf24' }}>Recommended Application:</strong> {comparisonOutput.scientificAnalysis.recommendedApplication}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
