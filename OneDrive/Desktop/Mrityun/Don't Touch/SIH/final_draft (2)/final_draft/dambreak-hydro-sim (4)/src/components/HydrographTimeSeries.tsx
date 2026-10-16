import React, { useState, useMemo } from 'react';
import { HydroSimulationOutput } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

interface HydrographTimeSeriesProps {
  simulationOutput: HydroSimulationOutput;
}

export const HydrographTimeSeries: React.FC<HydrographTimeSeriesProps> = ({
  simulationOutput,
}) => {
  const damId = simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
  const activeDam = useMemo(() => {
    return INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  }, [damId]);

  const damReaches = activeDam.reaches || [];
  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : damReaches;

  const [selectedLocation, setSelectedLocation] = useState<string>(reaches[0]?.reachId || '');

  // Active reach resolution strictly from active dam and simulation results
  const reachResult = reaches.find((r) => r.reachId === selectedLocation) || reaches[0];
  const damReachInfo = damReaches.find((r) => r.reachId === selectedLocation || r.reachName === reachResult?.reachName) || damReaches[0];

  // Fallback safe values derived from actual reach result or simulation output
  const peakQ = reachResult?.peakDischargeM3s ?? simulationOutput?.peakBreachOutflowM3s ?? 50000;
  const peakTime = reachResult?.peakTimeHours ?? simulationOutput?.timeToPeakHours ?? 2.5;
  const arrivalTime = reachResult?.arrivalTimeHours ?? 0.8;
  const maxDepth = reachResult?.maxFloodDepthM ?? simulationOutput?.maxFloodDepthM ?? 10.0;
  const bedElev = damReachInfo?.bedElevationM ?? (reachResult?.peakStageM ? Number((reachResult.peakStageM - reachResult.maxFloodDepthM).toFixed(1)) : 100);
  const peakStage = Number((bedElev + maxDepth).toFixed(1));

  // 12 hour time steps
  const hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const points = hours.map((t) => {
    let q = 0;
    let stage = bedElev;
    if (t >= arrivalTime) {
      const dt = t - arrivalTime;
      const tRise = Math.max(0.5, peakTime - arrivalTime);
      if (t <= peakTime) {
        // Rising limb
        const frac = dt / tRise;
        q = peakQ * Math.pow(frac, 1.8);
        stage = bedElev + maxDepth * Math.pow(frac, 1.5);
      } else {
        // Falling limb
        const dtDecay = t - peakTime;
        const decayFactor = Math.exp(-dtDecay / 3.5);
        q = peakQ * decayFactor;
        stage = bedElev + maxDepth * decayFactor;
      }
    }
    return {
      t,
      q: Math.round(q),
      stage: Number(stage.toFixed(1)),
    };
  });

  const maxQ = Math.max(...points.map((p) => p.q), peakQ, 1000);
  const maxS = Math.max(...points.map((p) => p.stage), peakStage + 2, bedElev + 5);
  const minS = Math.max(0, bedElev - 2);

  return (
    <div className="w-full h-full bg-[var(--bg-panel)] rounded-xl border border-[var(--border-color)] p-4 flex flex-col justify-between font-mono transition-colors duration-200">
      {/* Top Header & Location Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div>
          <div className="text-xs font-bold text-[var(--text-primary)] uppercase flex items-center gap-2">
            <span>Hydrograph Time Series</span>
            <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
              {activeDam.name} ({activeDam.location.river} River)
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-sans">
            Outflow discharge Q (m³/s) and stage elevation H (m MSL) wave routing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--text-muted)] uppercase">Reach Location:</label>
          <select
            aria-label="Hydrograph Reach Location"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-2.5 py-1 text-xs bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg text-teal-400 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            {reaches.map((r) => (
              <option key={r.reachId} value={r.reachId} className="bg-[var(--bg-panel)] text-[var(--text-primary)] font-bold">
                {r.reachName} ({r.distanceFromDamKm} km)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative flex-1 my-3 min-h-[160px] w-full">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="40" y1="20" x2="480" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
          <line x1="40" y1="60" x2="480" y2="60" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
          <line x1="40" y1="100" x2="480" y2="100" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.6" />
          <line x1="40" y1="140" x2="480" y2="140" stroke="var(--border-color)" opacity="0.8" />

          {/* Discharge Area Fill */}
          <polygon
            points={`40,140 ${points
              .map((p) => {
                const x = 40 + (p.t / 12) * 440;
                const y = 140 - (p.q / maxQ) * 115;
                return `${x},${y}`;
              })
              .join(' ')} 480,140`}
            fill="rgba(13, 148, 136, 0.15)"
          />

          {/* Discharge Line Q (Teal) */}
          <polyline
            points={points
              .map((p) => {
                const x = 40 + (p.t / 12) * 440;
                const y = 140 - (p.q / maxQ) * 115;
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2.5"
          />

          {/* Stage Elevation Line H (Cyan Dashed) */}
          <polyline
            points={points
              .map((p) => {
                const x = 40 + (p.t / 12) * 440;
                const normS = (p.stage - minS) / Math.max(1, maxS - minS);
                const y = 140 - normS * 115;
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="4 3"
          />

          {/* Peak Point Indicator */}
          {(() => {
            const peakPoint = points.reduce((prev, curr) => (curr.q > prev.q ? curr : prev), points[0]);
            const px = 40 + (peakPoint.t / 12) * 440;
            const py = 140 - (peakPoint.q / maxQ) * 115;
            return (
              <g key="peak-indicator">
                <circle cx={px} cy={py} r="4" fill="#0d9488" stroke="#ffffff" strokeWidth="1.5" />
                <text x={px} y={py - 8} fill="var(--text-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">
                  Peak Q: {peakPoint.q.toLocaleString()} m³/s
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend & Key Metrics Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-color)] pt-2.5 text-xs text-[var(--text-muted)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 bg-teal-500 rounded-sm inline-block" />
            <span className="text-[var(--text-primary)] font-bold">Discharge Q (m³/s)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-500 border-t border-dashed border-cyan-400 inline-block" />
            <span className="text-cyan-400 font-bold">Stage H (m MSL)</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <div>Arrival: <strong className="text-teal-400">T+{arrivalTime}h</strong></div>
          <div>Time to Peak: <strong className="text-teal-400">T+{peakTime}h</strong></div>
          <div>Peak Stage: <strong className="text-cyan-400">{peakStage} m</strong></div>
          <div>Max Depth: <strong className="text-[var(--text-primary)]">{maxDepth.toFixed(1)} m</strong></div>
        </div>
      </div>
    </div>
  );
};
