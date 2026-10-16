import React, { useMemo } from 'react';
import { HydroSimulationOutput } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

interface ArrivalIsochroneMiniMapProps {
  simulationOutput: HydroSimulationOutput;
}

export const ArrivalIsochroneMiniMap: React.FC<ArrivalIsochroneMiniMapProps> = ({
  simulationOutput,
}) => {
  const damId = simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
  const activeDam = useMemo(() => {
    return INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  }, [damId]);

  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : (activeDam.reaches || []);

  const r0Name = reaches[0]?.reachName || 'Dam Toe & Spillway Reach';
  const r1Name = reaches[1]?.reachName || 'Upper Basin Reach';
  const r2Name = reaches[2]?.reachName || 'Mid Basin Corridor';
  const r3Name = reaches[3]?.reachName || 'Lower Valley Reach';

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-xl flex flex-col justify-between font-mono text-xs transition-colors duration-200">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">
            FLOOD ARRIVAL TIME (ISOCHRONES) — {activeDam.name}
          </h3>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
          ISOCHRONES
        </span>
      </div>

      {/* Mini Isochrone Graphic */}
      <div className="relative w-full h-44 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="timeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="25%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#eab308" stopOpacity="0.8" />
              <stop offset="75%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Isochrone Wave Front Zones */}
          {/* 0-15 min */}
          <path d="M 120,40 Q 150,55 200,60 Q 250,55 280,40 Z" fill="#0891b2" opacity="0.8" />
          <text x="200" y="52" fill="#cffafe" fontSize="7" textAnchor="middle" fontWeight="bold">0 - 15 min ({r0Name})</text>

          {/* 15-30 min */}
          <path d="M 130,60 Q 160,85 220,90 Q 270,85 270,60 Z" fill="#059669" opacity="0.8" />
          <text x="200" y="78" fill="#d1fae5" fontSize="7" textAnchor="middle" fontWeight="bold">15 - 30 min ({r1Name})</text>

          {/* 30-60 min */}
          <path d="M 140,90 Q 180,125 240,130 Q 280,125 260,90 Z" fill="#ca8a04" opacity="0.8" />
          <text x="210" y="112" fill="#fef08a" fontSize="7" textAnchor="middle" fontWeight="bold">30 - 60 min ({r2Name})</text>

          {/* 60-120 min */}
          <path d="M 150,130 Q 190,165 210,175 Q 260,165 240,130 Z" fill="#ea580c" opacity="0.8" />
          <text x="200" y="152" fill="#ffedd5" fontSize="7" textAnchor="middle" fontWeight="bold">1 - 2 hrs ({r3Name})</text>

          {/* > 120 min */}
          <path d="M 160,175 Q 200,215 220,225 Q 250,215 210,175 Z" fill="#dc2626" opacity="0.8" />
          <text x="210" y="200" fill="#fee2e2" fontSize="7" textAnchor="middle" fontWeight="bold">&gt; 3 hrs (Downstream Confluence)</text>

          {/* Dam Line */}
          <line x1="30" y1="40" x2="370" y2="40" stroke="#94a3b8" strokeWidth="2.5" />
          <text x="200" y="32" fill="var(--text-primary)" fontSize="8" textAnchor="middle" fontWeight="bold">
            {activeDam.name.toUpperCase()} AXIS (KM 0.0)
          </text>

          {/* Key Markers */}
          <circle cx="200" cy="40" r="3" fill="#ffffff" />
          <circle cx="220" cy="90" r="3" fill="#ffffff" />
          <text x="228" y="93" fill="#ffffff" fontSize="7" fontWeight="bold">{r2Name} (T+{reaches[2]?.arrivalTimeHours || 0.8}h)</text>

          <circle cx="210" cy="175" r="3" fill="#ffffff" />
          <text x="218" y="178" fill="#ffffff" fontSize="7" fontWeight="bold">{r3Name} (T+{reaches[3]?.arrivalTimeHours || 1.8}h)</text>
        </svg>

        {/* Mini Isochrone Legend */}
        <div className="absolute bottom-2 left-2 bg-[var(--bg-panel)]/90 backdrop-blur-md border border-[var(--border-color)] rounded-md p-1.5 flex items-center gap-1.5 text-[8px] text-[var(--text-primary)] font-mono">
          <span className="text-cyan-400">0 min</span>
          <div className="w-16 h-1.5 rounded-sm bg-gradient-to-r from-cyan-400 via-emerald-400 via-yellow-400 via-orange-400 to-rose-500" />
          <span className="text-rose-400">&gt; 180 min</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)] mt-2">
        <span>River: {activeDam.location.river}</span>
        <span>State: {activeDam.location.state}</span>
      </div>
    </div>
  );
};
