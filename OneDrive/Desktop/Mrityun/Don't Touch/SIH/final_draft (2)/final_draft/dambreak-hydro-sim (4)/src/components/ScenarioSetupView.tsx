import React, { useState } from 'react';
import { 
  Sliders, 
  Play, 
  RotateCcw, 
  Info, 
  HelpCircle, 
  Check, 
  Waves, 
  TrendingUp, 
  Clock, 
  ShieldAlert
} from 'lucide-react';
import { BreachParameters, FailureMode, NavigationTab } from '../types';
import { 
  DEFAULT_BREACH_SCENARIOS, 
  calculateFroehlichPeakDischarge, 
  calculateMacDonaldPeakDischarge, 
  calculateUSBRPeakDischarge,
  calculateBreachFormationTimeHours 
} from '../utils/hydroEngine';
import { HIRAKUD_DAM_SPECS } from '../data/damData';

interface ScenarioSetupViewProps {
  currentParams: BreachParameters;
  onUpdateParams: (params: BreachParameters) => void;
  onRunSimulation: () => void;
  onSelectTab: (tab: NavigationTab) => void;
}

export const ScenarioSetupView: React.FC<ScenarioSetupViewProps> = ({
  currentParams,
  onUpdateParams,
  onRunSimulation,
  onSelectTab,
}) => {
  const [params, setParams] = useState<BreachParameters>(currentParams);

  const handlePresetSelect = (presetKey: string) => {
    const preset = DEFAULT_BREACH_SCENARIOS[presetKey];
    if (preset) {
      setParams({ ...preset });
    }
  };

  const handleApplyAndRun = () => {
    onUpdateParams(params);
    onRunSimulation();
  };

  // Real-time preview calculation of empirical equations
  const froehlichQ = calculateFroehlichPeakDischarge(params.reservoirVolumeAtBreachMCM, params.waterDepthAboveInvert);
  const macDonaldQ = calculateMacDonaldPeakDischarge(params.reservoirVolumeAtBreachMCM, params.waterDepthAboveInvert);
  const usbrQ = calculateUSBRPeakDischarge(params.waterDepthAboveInvert);
  const computedTf = calculateBreachFormationTimeHours(params.reservoirVolumeAtBreachMCM, params.waterDepthAboveInvert);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold font-mono text-slate-100 uppercase tracking-tight">
              Dam-Break Scenario Configuration & Breach Physics
            </h2>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-cyan-950/70 backdrop-blur-md text-cyan-300 border border-cyan-700/50 shadow-sm">
              HYDRODYNAMIC SETUP
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Configure failure modes, reservoir stage, breach geometry, and empirical peak discharge formulations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePresetSelect('overtopping_pmf')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md text-slate-300 text-xs font-mono border border-white/[0.08] transition shadow-sm"
          >
            Reset to Overtopping PMF
          </button>
          <button
            onClick={handleApplyAndRun}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.35)] transition"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Apply & Run Simulation</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Preset Scenarios & Failure Mode */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 border-b border-white/[0.06] pb-2">
              Standard Failure Presets
            </h3>
            
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handlePresetSelect('overtopping_pmf')}
                className={`w-full p-3 rounded-xl border text-left backdrop-blur-md transition-all ${
                  params.failureMode === 'overtopping' && params.reservoirWaterLevel === 192.94
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-950/50 border-white/[0.06] text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs">1. Overtopping Failure (PMF Inflow)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-950/70 backdrop-blur-sm text-rose-300 border border-rose-800/50 font-semibold">
                    MWL 192.94 m
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Probable Maximum Flood hydrograph surcharge exceeding 42,450 m³/s spillway capacity.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('piping_frl')}
                className={`w-full p-3 rounded-xl border text-left backdrop-blur-md transition-all ${
                  params.failureMode === 'piping'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-950/50 border-white/[0.06] text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs">2. Piping / Internal Erosion</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/70 backdrop-blur-sm text-amber-300 border border-amber-800/50 font-semibold">
                    FRL 192.02 m
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Foundation seepage through composite earthfill dyke at Full Reservoir Level.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handlePresetSelect('sunny_day_normal')}
                className={`w-full p-3 rounded-xl border text-left backdrop-blur-md transition-all ${
                  params.failureMode === 'sunny_day'
                    ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-950/50 border-white/[0.06] text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs">3. Sunny Day Structural Instability</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-950/70 backdrop-blur-sm text-blue-300 border border-blue-800/50 font-semibold">
                    Normal 188.0 m
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-1">
                  Sudden masonry structural collapse under normal base operational reservoir pool.
                </p>
              </button>
            </div>
          </div>

          {/* Equation Selector */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 border-b border-white/[0.06] pb-2">
              Empirical Outflow Equation
            </h3>
            
            <div className="space-y-2">
              {[
                { id: 'Froehlich_2008', name: 'Froehlich (2008)', desc: 'Validated on 74 dam-break cases' },
                { id: 'MacDonald_1984', name: 'MacDonald & Langridge-Monopolis (1984)', desc: 'Erosion volume based formulation' },
                { id: 'USBR_1982', name: 'USBR (1982)', desc: 'Depth-power empirical envelope' },
              ].map((eq) => (
                <label
                  key={eq.id}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer backdrop-blur-md transition-all ${
                    params.empiricalEquation === eq.id
                      ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200 ring-1 ring-cyan-500/30'
                      : 'bg-slate-950/50 border-white/[0.06] text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    type="radio"
                    name="equation"
                    value={eq.id}
                    checked={params.empiricalEquation === eq.id}
                    onChange={() => setParams({ ...params, empiricalEquation: eq.id as any })}
                    className="mt-0.5 accent-cyan-400"
                  />
                  <div>
                    <span className="font-mono font-bold text-xs block">{eq.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{eq.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Center & Right: Parameter Sliders & Comparative Equations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-4">
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200 border-b border-white/[0.06] pb-2">
              Breach Geometry & Reservoir Stage Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reservoir Water Level at Failure */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Reservoir Water Level at Failure:</span>
                  <span className="text-cyan-300 font-bold">{params.reservoirWaterLevel} m MSL</span>
                </div>
                <input
                  type="range"
                  min="180.0"
                  max="193.5"
                  step="0.1"
                  value={params.reservoirWaterLevel}
                  onChange={(e) => {
                    const wl = parseFloat(e.target.value);
                    const hw = Number((wl - params.breachInvertElevation).toFixed(2));
                    setParams({ ...params, reservoirWaterLevel: wl, waterDepthAboveInvert: Math.max(1.0, hw) });
                  }}
                  className="w-full h-2 bg-[#060b13] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/[0.06]"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>DSL: 179.8m</span>
                  <span>FRL: 192.02m</span>
                  <span>MWL: 192.94m</span>
                </div>
              </div>

              {/* Reservoir Volume at Breach */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Active Storage Volume at Breach (V_w):</span>
                  <span className="text-cyan-300 font-bold">{params.reservoirVolumeAtBreachMCM.toLocaleString()} MCM</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="8500"
                  step="50"
                  value={params.reservoirVolumeAtBreachMCM}
                  onChange={(e) => setParams({ ...params, reservoirVolumeAtBreachMCM: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[#060b13] rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-white/[0.06]"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>2,000 MCM</span>
                  <span>Live: 5,818 MCM</span>
                  <span>Gross: 8,136 MCM</span>
                </div>
              </div>

              {/* Breach Average Width */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Final Breach Average Width (B_avg):</span>
                  <span className="text-blue-300 font-bold">{params.breachAverageWidth} meters</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="400"
                  step="5"
                  value={params.breachAverageWidth}
                  onChange={(e) => setParams({ ...params, breachAverageWidth: parseInt(e.target.value) })}
                  className="w-full h-2 bg-[#060b13] rounded-lg appearance-none cursor-pointer accent-blue-400 border border-white/[0.06]"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>50 m</span>
                  <span>Default: 210 m</span>
                  <span>400 m</span>
                </div>
              </div>

              {/* Breach Invert Elevation */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Breach Invert Level (Z_b):</span>
                  <span className="text-blue-300 font-bold">{params.breachInvertElevation} m MSL</span>
                </div>
                <input
                  type="range"
                  min="140.0"
                  max="165.0"
                  step="0.5"
                  value={params.breachInvertElevation}
                  onChange={(e) => {
                    const zb = parseFloat(e.target.value);
                    const hw = Number((params.reservoirWaterLevel - zb).toFixed(2));
                    setParams({ ...params, breachInvertElevation: zb, waterDepthAboveInvert: Math.max(1.0, hw) });
                  }}
                  className="w-full h-2 bg-[#060b13] rounded-lg appearance-none cursor-pointer accent-blue-400 border border-white/[0.06]"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Plunge Basin: 146.0m</span>
                  <span>165.0m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Model-Derived Peak Outflow Comparative Calculations */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Model-Derived Peak Breach Outflows (Q_p) Preview
              </h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-md bg-cyan-950/70 backdrop-blur-md text-cyan-300 border border-cyan-700/50 shadow-sm">
                MODEL-DERIVED RESULT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className={`p-3.5 rounded-xl border backdrop-blur-md ${params.empiricalEquation === 'Froehlich_2008' ? 'bg-cyan-950/60 border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-slate-950/50 border-white/[0.06]'}`}>
                <span className="text-[11px] font-mono text-slate-400 block">Froehlich (2008)</span>
                <span className="text-lg font-bold font-mono text-cyan-300 block mt-0.5">
                  {froehlichQ.toLocaleString()} <span className="text-xs font-normal text-slate-400">m³/s</span>
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-1">
                  Q_p = 0.607 · (V_w)^0.295 · (h_w)^1.24
                </span>
              </div>

              <div className={`p-3.5 rounded-xl border backdrop-blur-md ${params.empiricalEquation === 'MacDonald_1984' ? 'bg-cyan-950/60 border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-slate-950/50 border-white/[0.06]'}`}>
                <span className="text-[11px] font-mono text-slate-400 block">MacDonald (1984)</span>
                <span className="text-lg font-bold font-mono text-blue-300 block mt-0.5">
                  {macDonaldQ.toLocaleString()} <span className="text-xs font-normal text-slate-400">m³/s</span>
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-1">
                  Q_p = 1.154 · (V_w · h_w)^0.412
                </span>
              </div>

              <div className={`p-3.5 rounded-xl border backdrop-blur-md ${params.empiricalEquation === 'USBR_1982' ? 'bg-cyan-950/60 border-cyan-500/70 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-slate-950/50 border-white/[0.06]'}`}>
                <span className="text-[11px] font-mono text-slate-400 block">USBR (1982)</span>
                <span className="text-lg font-bold font-mono text-amber-300 block mt-0.5">
                  {usbrQ.toLocaleString()} <span className="text-xs font-normal text-slate-400">m³/s</span>
                </span>
                <span className="text-[9px] text-slate-500 font-mono block mt-1">
                  Q_p = 19.1 · (h_w)^1.85
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs font-mono">
              <span className="text-slate-400">
                Calculated Formation Time (t_f): <strong className="text-slate-200">{computedTf} hours</strong>
              </span>
              <button
                onClick={handleApplyAndRun}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.35)] transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Hydrodynamic Solver</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
