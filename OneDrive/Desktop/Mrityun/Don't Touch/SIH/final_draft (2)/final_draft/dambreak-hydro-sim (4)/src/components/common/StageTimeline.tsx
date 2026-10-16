import React from 'react';
import { ShieldAlert, Waves, MapPin, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StageTimelineProps {
  currentStage?: 'breach' | 'propagation' | 'inundation' | 'exposure' | 'risk';
}

export const StageTimeline: React.FC<StageTimelineProps> = ({ currentStage = 'propagation' }) => {
  const stages = [
    { id: 'breach', label: '1. Breach Failure', icon: ShieldAlert, status: 'INITIATED' },
    { id: 'propagation', label: '2. Wave Propagation', icon: Waves, status: 'ACTIVE SOLVER' },
    { id: 'inundation', label: '3. Inundation Mapping', icon: MapPin, status: 'COMPUTING' },
    { id: 'exposure', label: '4. Exposure Analysis', icon: Users, status: 'EVALUATING' },
    { id: 'risk', label: '5. Risk & Loss Matrix', icon: AlertTriangle, status: 'READY' },
  ];

  const currentIdx = stages.findIndex((s) => s.id === currentStage);

  return (
    <div className="bg-[#0a1120] border border-slate-800/80 rounded-xl p-4 shadow-xl font-mono">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>Operational Simulation Workflow Lifecycle</span>
        </h3>
        <span className="text-[10px] text-teal-300 font-bold px-2 py-0.5 rounded bg-teal-500/10 border border-teal-500/30">
          REAL-TIME HYDRODYNAMICS
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isPassed = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div
              key={stage.id}
              className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'bg-teal-950/40 border-teal-500/60 shadow-[0_0_15px_rgba(13,148,136,0.15)]'
                  : isPassed
                  ? 'bg-slate-900/80 border-slate-700/80 text-slate-200'
                  : 'bg-slate-950/60 border-slate-850 text-slate-500 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isCurrent ? 'text-teal-300' : isPassed ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>
                <Icon
                  className={`w-4 h-4 ${
                    isCurrent ? 'text-teal-400' : isPassed ? 'text-slate-400' : 'text-slate-600'
                  }`}
                />
              </div>
              <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                <span>Status:</span>
                <span
                  className={
                    isCurrent
                      ? 'text-teal-300 font-extrabold'
                      : isPassed
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-500'
                  }
                >
                  {stage.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
