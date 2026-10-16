import React, { useState, useMemo } from 'react';
import { HydroSimulationOutput } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

interface FlowVelocityMiniMapProps {
  simulationOutput: HydroSimulationOutput;
  simulationTimeHours?: number;
}

export const FlowVelocityMiniMap: React.FC<FlowVelocityMiniMapProps> = ({
  simulationOutput,
  simulationTimeHours = 3.0,
}) => {
  const [selectedReach, setSelectedReach] = useState<string | null>(null);

  const damId = simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
  const activeDam = useMemo(() => {
    return INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  }, [damId]);

  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : (activeDam.reaches || []);
  const maxVel = simulationOutput?.maxFlowVelocityMs || 5.4;

  const r0 = reaches[0] || { reachName: 'Dam Toe Breach Jet', maxVelocityMs: 8.5 };
  const r1 = reaches[1] || { reachName: 'Mid-Corridor Reach', maxVelocityMs: 5.4 };
  const r2 = reaches[2] || { reachName: 'Downstream Valley', maxVelocityMs: 3.2 };

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-xl flex flex-col justify-between font-mono text-xs transition-colors duration-200">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">
            FLOW VELOCITY MAP (m/s) — {activeDam.name}
          </h3>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold uppercase">
          MAX: {maxVel.toFixed(1)} m/s
        </span>
      </div>

      {/* Mini 2D SVG Canvas */}
      <div className="relative w-full h-44 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="velGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.75" />
            </linearGradient>
            
            {/* Streamline marker */}
            <marker id="velArrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
              <path d="M 0 0 L 6 3 L 0 6 z" fill="#38bdf8" opacity="0.8" />
            </marker>
          </defs>

          {/* Topography hill contours */}
          <path d="M 20,40 Q 150,20 280,50 T 380,30" fill="none" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" />
          <path d="M 10,120 Q 160,90 260,130 T 390,110" fill="none" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" />
          <path d="M 20,200 Q 140,180 270,210 T 380,190" fill="none" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="3,3" />

          {/* Upstream Reservoir Boundary */}
          <path d="M 40,20 Q 150,15 360,20 L 360,40 L 40,40 Z" fill="#083344" stroke="#0e7490" strokeWidth="1" />
          <text x="200" y="32" fill="#38bdf8" fontSize="8" textAnchor="middle" fontWeight="bold">
            {activeDam.name.toUpperCase()} RESERVOIR
          </text>

          {/* Dam Line */}
          <line x1="30" y1="40" x2="370" y2="40" stroke="#94a3b8" strokeWidth="2.5" />
          <text x="200" y="47" fill="var(--text-muted)" fontSize="7" textAnchor="middle" fontWeight="bold">
            BREACH AXIS
          </text>

          {/* High Velocity Jet Stream (Breach Mouth) */}
          <path
            d="M 190,40 Q 195,65 210,95 Q 225,125 215,160 Q 200,190 190,220"
            fill="none"
            stroke="url(#velGrad)"
            strokeWidth="28"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Core Velocity Vector Streamlines */}
          <path d="M 200,42 L 205,80" stroke="#f8fafc" strokeWidth="1.5" markerEnd="url(#velArrow)" opacity="0.9" />
          <path d="M 205,80 Q 220,115 215,145" stroke="#f8fafc" strokeWidth="1.5" markerEnd="url(#velArrow)" opacity="0.9" />
          <path d="M 215,145 Q 200,180 190,210" stroke="#f8fafc" strokeWidth="1.5" markerEnd="url(#velArrow)" opacity="0.9" />

          {/* Reach Velocity Labels */}
          <circle cx="205" cy="80" r="3" fill="#ffffff" />
          <text x="218" y="83" fill="var(--text-primary)" fontSize="7" fontWeight="bold">
            {r0.reachName} ({r0.maxVelocityMs.toFixed(1)} m/s)
          </text>

          <circle cx="215" cy="145" r="3" fill="#ffffff" />
          <text x="228" y="148" fill="var(--text-primary)" fontSize="7" fontWeight="bold">
            {r1.reachName} ({r1.maxVelocityMs.toFixed(1)} m/s)
          </text>

          <circle cx="190" cy="210" r="3" fill="#ffffff" />
          <text x="198" y="213" fill="var(--text-primary)" fontSize="7" fontWeight="bold">
            {r2.reachName} ({r2.maxVelocityMs.toFixed(1)} m/s)
          </text>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-2 left-2 bg-[var(--bg-panel)]/90 backdrop-blur-md border border-[var(--border-color)] rounded-md p-1.5 flex items-center gap-1.5 text-[8px] text-[var(--text-primary)] font-mono">
          <span className="text-cyan-400">0.5 m/s</span>
          <div className="w-16 h-1.5 rounded-sm bg-gradient-to-r from-cyan-400 via-emerald-400 via-yellow-400 to-rose-500" />
          <span className="text-rose-400">&gt; 8 m/s (Supercritical)</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)] mt-2">
        <span>Solver: {simulationOutput?.solverModelLabel || '2D SWE Finite Volume'}</span>
        <span>River: {activeDam.location.river}</span>
      </div>
    </div>
  );
};
