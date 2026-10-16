import React, { useMemo } from 'react';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { HydroSimulationOutput } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

interface AlertsFeedProps {
  simulationOutput: HydroSimulationOutput;
}

export const AlertsFeed: React.FC<AlertsFeedProps> = ({ simulationOutput }) => {
  const damId = simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
  const activeDam = useMemo(() => {
    return INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  }, [damId]);

  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : (activeDam.reaches || []);

  const alerts = useMemo(() => {
    if (!reaches || reaches.length === 0) return [];
    
    return reaches.slice(0, 3).map((reach, idx) => {
      const isHigh = reach.hazardCategory === 'EXTREME' || reach.maxFloodDepthM > 8;
      const isMedium = reach.hazardCategory === 'SIGNIFICANT' || (reach.maxFloodDepthM > 3 && reach.maxFloodDepthM <= 8);

      return {
        id: `alert-${reach.reachId || idx}`,
        level: isHigh ? 'HIGH_RISK' : isMedium ? 'MEDIUM_RISK' : 'LOW_RISK',
        title: `${isHigh ? 'High Risk' : isMedium ? 'Medium Risk' : 'Low Risk'}: ${reach.reachName}`,
        time: `T + ${reach.arrivalTimeHours} hrs`,
        depth: `${reach.maxFloodDepthM.toFixed(1)} m`,
        desc: `Flood wave arrival at ${reach.distanceFromDamKm} km downstream in T+${reach.arrivalTimeHours}h. Peak discharge ${reach.peakDischargeM3s.toLocaleString()} m³/s. ${
          isHigh ? 'Immediate evacuation of low-lying river bank corridors required.' : 'Monitor river gauge stations and prepare standby response.'
        }`,
        icon: isHigh ? ShieldAlert : isMedium ? AlertTriangle : Info,
        color: isHigh ? 'rose' : isMedium ? 'amber' : 'cyan',
      };
    });
  }, [reaches]);

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-xl flex flex-col justify-between font-mono text-xs transition-colors duration-200">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-tight">
            ALERTS &amp; NOTIFICATIONS — {activeDam.name}
          </h3>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold uppercase">
          {alerts.length} ACTIVE REACH ALERTS
        </span>
      </div>

      <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
        {alerts.map((a) => {
          const Icon = a.icon;
          const isHigh = a.level === 'HIGH_RISK';
          const isMedium = a.level === 'MEDIUM_RISK';
          return (
            <div
              key={a.id}
              className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition ${
                isHigh
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : isMedium
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span>{a.title}</span>
                  <span className="text-[10px] opacity-80">{a.time}</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] leading-tight font-sans">{a.desc}</p>
                <div className="text-[9px] opacity-70 font-mono pt-1">Peak Depth: {a.depth}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
