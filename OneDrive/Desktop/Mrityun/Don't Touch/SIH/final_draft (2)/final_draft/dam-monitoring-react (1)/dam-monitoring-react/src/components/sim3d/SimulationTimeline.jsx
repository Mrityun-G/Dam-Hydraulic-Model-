import React from 'react';

/**
 * SimulationTimeline: Simulation Scrubbing, Animation Playback & Layer Visibility Controls
 */
export function SimulationTimeline({
  simulationTimeHours,
  onTimeChange,
  isPlaying,
  onTogglePlay,
  onReset,
  playbackSpeed,
  onSpeedChange,
  showDam,
  onToggleDam,
  showReservoir,
  onToggleReservoir,
  showFloodWater,
  onToggleFloodWater,
  showVelocityVectors,
  onToggleVelocityVectors,
  showSettlements,
  onToggleSettlements,
  showFacilities,
  onToggleFacilities,
  showVegetation,
  onToggleVegetation,
  onRunSimulation,
  isSimulating,
}) {
  const formatTime = (hrs) => {
    const totalMinutes = Math.round(hrs * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `T + ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} hrs`;
  };

  return (
    <div className="sim3d-timeline-bar">
      <div className="sim3d-timeline-controls">
        {/* Playback Buttons */}
        <div className="sim3d-btn-group">
          {onRunSimulation && (
            <button
              type="button"
              className="sim3d-btn primary"
              onClick={onRunSimulation}
              disabled={isSimulating}
              title="Execute Hydrodynamic Dam-Break Simulation"
            >
              {isSimulating ? 'SIMULATING...' : '▶ RUN SIMULATION'}
            </button>
          )}

          <button
            type="button"
            className="sim3d-btn"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Simulation Timeline' : 'Play Simulation Timeline'}
          >
            {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
          </button>

          <button
            type="button"
            className="sim3d-btn"
            onClick={onReset}
            title="Reset Simulation Time to Breach Inception (T+0:00)"
          >
            ↺ RESET
          </button>
        </div>

        {/* Current Timestep Display */}
        <div className="sim3d-time-display">
          {formatTime(simulationTimeHours)}
        </div>

        {/* Speed Selector */}
        <div className="sim3d-btn-group">
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' }}>
            Speed:
          </span>
          {[0.5, 1.0, 2.0, 4.0].map((s) => (
            <button
              key={s}
              type="button"
              className={`sim3d-btn ${playbackSpeed === s ? 'primary' : ''}`}
              style={{ padding: '4px 8px', fontSize: '10px' }}
              onClick={() => onSpeedChange(s)}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Scrubbable Time Slider */}
      <div className="sim3d-slider-wrap">
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
          00:00
        </span>
        <input
          type="range"
          className="sim3d-slider"
          min="0.0"
          max="12.0"
          step="0.05"
          value={simulationTimeHours}
          onChange={(e) => onTimeChange(parseFloat(e.target.value))}
        />
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.4)' }}>
          12:00 hrs
        </span>
      </div>

      {/* Layer Toggles Row */}
      <div className="sim3d-layers-row">
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#00e6c8', fontWeight: 800 }}>
          LAYERS:
        </span>
        <label className="sim3d-layer-toggle">
          <input
            type="checkbox"
            checked={showDam}
            onChange={(e) => onToggleDam(e.target.checked)}
          />
          Dam Structure
        </label>
        <label className="sim3d-layer-toggle">
          <input
            type="checkbox"
            checked={showReservoir}
            onChange={(e) => onToggleReservoir(e.target.checked)}
          />
          Reservoir Water
        </label>
        <label className="sim3d-layer-toggle">
          <input
            type="checkbox"
            checked={showFloodWater}
            onChange={(e) => onToggleFloodWater(e.target.checked)}
          />
          Downstream Flood
        </label>
        <label className="sim3d-layer-toggle">
          <input
            type="checkbox"
            checked={showVelocityVectors}
            onChange={(e) => onToggleVelocityVectors(e.target.checked)}
          />
          Flow Velocity Vectors
        </label>
        <label className="sim3d-layer-toggle">
          <input
            type="checkbox"
            checked={showSettlements}
            onChange={(e) => onToggleSettlements(e.target.checked)}
          />
          Settlements
        </label>
        <label className="sim3d-layer-toggle">
          <input
            type="checkbox"
            checked={showFacilities}
            onChange={(e) => onToggleFacilities(e.target.checked)}
          />
          Critical Facilities
        </label>
        <label className="sim3d-layer-toggle">
          <input
            type="checkbox"
            checked={showVegetation}
            onChange={(e) => onToggleVegetation && onToggleVegetation(e.target.checked)}
          />
          🌲 Vegetation & Trees
        </label>
      </div>
    </div>
  );
}
