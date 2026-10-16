import React from 'react';
import { ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react';
import { NavigationTab } from '../types';

interface PipelineBannerProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export const PipelineBanner: React.FC<PipelineBannerProps> = ({ currentTab, onSelectTab }) => {
  const steps: { id: NavigationTab; label: string; sub: string }[] = [
    { id: 'model-inputs', label: '1. MODEL INPUTS', sub: 'Solver & Breach Params' },
    { id: 'sim-3d', label: '2. 3D MODEL', sub: 'Topographic Hydrodynamics' },
    { id: 'map-2d', label: '3. 2D FLOOD MAP', sub: 'Inundation Extent & Celerity' },
    { id: 'hazard-loss', label: '4. HAZARD & LOSS', sub: 'Defra HR & Demographics' },
    { id: 'sph-vs-delft3d', label: '5. COMPARATIVE MODELS', sub: 'SPH vs Delft3D Validation' },
    { id: 'near-real-time-gee', label: '6. LIVE SATELLITE', sub: 'Sentinel-1 SAR Feeds' },
    { id: 'export', label: '7. GIS / REPORTS', sub: 'GeoJSON / KML / CSV' },
  ];

  return (
    <div className="bg-[var(--bg-subnav)] border-b border-[var(--border-color)] px-4 py-1.5 text-xs relative z-20 shadow-md transition-colors duration-200">
      <div className="max-w-full flex items-center justify-between overflow-x-auto gap-2 py-0.5 scrollbar-none">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold tracking-wider text-[var(--text-dim)] uppercase font-mono">
            Pipeline Workflow:
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {steps.map((step, idx) => {
            const isActive = currentTab === step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => onSelectTab(step.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-left transition font-mono ${
                    isActive
                      ? 'bg-teal-500/15 border-teal-500/50 text-teal-400 font-bold shadow-sm'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {isActive ? (
                    <CheckCircle2 className="w-3 h-3 text-teal-500 shrink-0" />
                  ) : (
                    <CircleDashed className="w-3 h-3 text-[var(--text-dim)] shrink-0" />
                  )}
                  <div>
                    <div className="font-bold text-[10px] leading-none tracking-tight">
                      {step.label}
                    </div>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-[var(--text-dim)] shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
