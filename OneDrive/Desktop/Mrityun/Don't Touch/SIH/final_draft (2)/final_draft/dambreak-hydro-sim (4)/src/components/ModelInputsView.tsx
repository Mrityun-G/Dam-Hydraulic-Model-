import React, { useState } from 'react';
import { 
  Sliders, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Waves,
  Layers,
  Database
} from 'lucide-react';
import { 
  BreachParameters, 
  AIScenarioInterpretation,
  FailureMode,
  DamSpecifications
} from '../types';
import { 
  INDIAN_DAMS_REGISTRY, 
  HIRAKUD_DAM_SPECS
} from '../data/damData';
import { interpretNaturalLanguageScenario } from '../services/api';
import { getDamDefaultBreachScenario } from '../utils/hydroEngine';

interface ModelInputsViewProps {
  currentParams: BreachParameters;
  onParamsChange: (params: BreachParameters) => void;
  onRunSimulation: () => void;
  isSimulating: boolean;
  simulationProgressText?: string;
  simulationProgressPercent?: number;
}

export const ModelInputsView: React.FC<ModelInputsViewProps> = ({
  currentParams,
  onParamsChange,
  onRunSimulation,
  isSimulating,
  simulationProgressText,
  simulationProgressPercent = 0,
}) => {
  const selectedDamId = currentParams.selectedDamId || 'hirakud-dam-odisha';
  const currentFailureMode: FailureMode = currentParams.failureMode || 'overtopping';

  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isInterpretingAI, setIsInterpretingAI] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AIScenarioInterpretation | null>(null);

  // Active Dam profile derived directly from props
  const activeDam: DamSpecifications =
    INDIAN_DAMS_REGISTRY.find((d) => d.id === selectedDamId) || HIRAKUD_DAM_SPECS;

  // Handle Dam Change: automatically fetches dam-tailored breach parameters for current failure mode
  const handleDamSelectionChange = (damId: string) => {
    const updatedScenario = getDamDefaultBreachScenario(damId, currentFailureMode);
    onParamsChange(updatedScenario);
  };

  // Handle Scenario Preset Change: computes dam-tailored breach parameters for selected preset
  const handlePresetSelect = (mode: FailureMode) => {
    const updatedScenario = getDamDefaultBreachScenario(selectedDamId, mode);
    onParamsChange(updatedScenario);
  };

  // Handle AI Natural Language Scenario Interpretation
  const handleAiInterpretation = async () => {
    if (!aiPrompt.trim()) return;

    setIsInterpretingAI(true);

    try {
      const interpretation = await interpretNaturalLanguageScenario(
        aiPrompt,
        selectedDamId
      );

      setAiResult(interpretation);

      const matchedDam =
        INDIAN_DAMS_REGISTRY.find((dam) => dam.id === interpretation.damId) ||
        INDIAN_DAMS_REGISTRY.find((dam) => dam.id === selectedDamId) ||
        HIRAKUD_DAM_SPECS;

      const damParams = getDamDefaultBreachScenario(matchedDam.id, interpretation.failureMode);

      onParamsChange({
        ...damParams,
        selectedDamId: matchedDam.id,
        failureMode: interpretation.failureMode,
        breachBottomWidth: interpretation.breachWidth || damParams.breachBottomWidth,
        breachFormationTimeHours: interpretation.breachFormationTimeHours || damParams.breachFormationTimeHours,
        simulationDurationHours: interpretation.simulationDurationHours || currentParams.simulationDurationHours || 12,
      });
    } catch (error) {
      console.error('Failed to interpret scenario prompt:', error);
    } finally {
      setIsInterpretingAI(false);
    }
  };

  const presets: { id: FailureMode; name: string; desc: string; condition: string }[] = [
    { 
      id: 'overtopping', 
      name: '1. Overtopping (PMF)', 
      desc: 'Hydrologic flood wave at MWL stage',
      condition: 'MWL Pool Stage'
    },
    { 
      id: 'piping', 
      name: '2. Piping Failure (FRL)', 
      desc: 'Internal erosion & piping channel at FRL',
      condition: 'FRL Pool Stage'
    },
    { 
      id: 'river_blockage', 
      name: '3. River Surge / Landslide', 
      desc: 'Upstream landslide impulse wave',
      condition: 'Surge Pool Stage'
    },
    { 
      id: 'sunny_day', 
      name: '4. Sunny-Day Failure', 
      desc: 'Structural failure under normal pool',
      condition: 'Normal Pool Stage'
    },
  ];

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-teal-500 uppercase tracking-widest">
                PARAMETRIC SCENARIO STUDIO
              </span>
              <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-bold">
                IS: 13739 COMPLIANT
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] uppercase tracking-tight">
              MODEL INPUTS &amp; SCENARIO CONFIGURATION
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-sans">
              Configure dam breach geometry, reservoir pool levels, empirical outflow equations &amp; DEM mesh parameters for 2D SWE simulation.
            </p>
          </div>

          <button
            onClick={onRunSimulation}
            disabled={isSimulating}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg cursor-pointer shrink-0 ${
              isSimulating
                ? 'bg-teal-600/50 text-white cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/30'
            }`}
          >
            {isSimulating ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>COMPUTING SOLVER...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>EXECUTE SIMULATION PIPELINE</span>
              </>
            )}
          </button>
        </div>

        {/* Progress Bar when running */}
        {isSimulating && (
          <div className="mt-4 pt-3 border-t border-[var(--border-color)] space-y-1.5">
            <div className="flex items-center justify-between text-xs text-teal-400 font-bold">
              <span>{simulationProgressText || 'Solving 2D Shallow Water Equations (SWE)...'}</span>
              <span>{simulationProgressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${simulationProgressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Natural Language Prompt Assistant */}
      <div className="bg-[var(--bg-panel)] border border-teal-500/40 rounded-xl p-5 shadow-2xl space-y-3 transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              NATURAL LANGUAGE SCENARIO GENERATOR
            </h3>
          </div>
          <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/30">
            LLM SCENARIO PARSER
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)] font-sans">
          Type a plain-English scenario description (e.g. <em>&quot;Simulate a severe piping failure at Idukki Dam with 200m breach width under FRL pool condition&quot;</em>).
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAiInterpretation()}
            placeholder="e.g. Simulate overtopping breach at Tehri Dam with 220m width..."
            className="flex-1 px-4 py-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-dim)] focus:outline-none focus:border-teal-500 font-mono"
          />
          <button
            onClick={handleAiInterpretation}
            disabled={isInterpretingAI || !aiPrompt.trim()}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs uppercase rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0"
          >
            {isInterpretingAI ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Parse Prompt</span>
          </button>
        </div>

        {aiResult && (
          <div className="p-3.5 bg-teal-500/10 border border-teal-500/30 rounded-xl text-xs space-y-2 font-mono">
            <div className="flex items-center justify-between text-teal-400 font-bold border-b border-teal-500/20 pb-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                Parsed Scenario: {aiResult.damName || INDIAN_DAMS_REGISTRY.find((d) => d.id === aiResult.damId)?.name || 'Target Dam'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40">
                Confidence: {Math.round((aiResult.confidenceScore ?? aiResult.confidence ?? 0.85) * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-sans">
              <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[9px] uppercase font-bold font-mono">Failure Mode</span>
                <strong className="text-teal-400 uppercase font-mono">{aiResult.failureMode.replace('_', ' ')}</strong>
              </div>
              <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[9px] uppercase font-bold font-mono">Breach Width</span>
                <strong className="text-[var(--text-primary)] font-mono">{aiResult.breachWidth} m</strong>
              </div>
              <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[9px] uppercase font-bold font-mono">Formation Time</span>
                <strong className="text-[var(--text-primary)] font-mono">{aiResult.breachFormationTimeHours} hrs</strong>
              </div>
              <div className="p-2 rounded bg-[var(--bg-card)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[9px] uppercase font-bold font-mono">Simulation Duration</span>
                <strong className="text-cyan-400 font-mono">{aiResult.simulationDurationHours || 12} hrs</strong>
              </div>
            </div>
            {aiResult.explanation && (
              <p className="text-[11px] text-[var(--text-muted)] font-sans pt-1 border-t border-teal-500/20">
                {aiResult.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Target Dam Selection & Standard Breach Presets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dam Selector Box */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4 font-mono transition-colors duration-200">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-teal-500" />
              <span>Target Dam Registry Profile</span>
            </h3>
            <span className="text-[10px] text-teal-400 font-bold">CWC Registered</span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase">Select Target Dam:</label>
            <select
              aria-label="Target Dam"
              value={selectedDamId}
              onChange={(e) => handleDamSelectionChange(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-teal-400 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              {INDIAN_DAMS_REGISTRY.map((dam) => (
                <option key={dam.id} value={dam.id} className="bg-[var(--bg-panel)] text-[var(--text-primary)] font-bold">
                  {dam.name} — {dam.location.river} River ({dam.location.district}, {dam.location.state})
                </option>
              ))}
            </select>
          </div>

          {/* Dam Fast Specs Box */}
          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs text-[var(--text-secondary)]">
            <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-dim)] block uppercase font-bold">Dam Height</span>
              <span className="font-bold text-[var(--text-primary)]">{activeDam.heightAboveLowestFoundation} m</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-dim)] block uppercase font-bold">MWL Pool Stage</span>
              <span className="font-bold text-teal-400">{activeDam.maximumWaterLevelMWL} m MSL</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
              <span className="text-[10px] text-[var(--text-dim)] block uppercase font-bold">Gross Storage</span>
              <span className="font-bold text-[var(--text-primary)]">{activeDam.grossStorageCapacityMCM} MCM</span>
            </div>
          </div>
        </div>

        {/* Breach Scenario Presets */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-3 font-mono transition-colors duration-200">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-teal-500" />
              <span>Standard Breach Presets</span>
            </h3>
            <span className="text-[10px] text-[var(--text-dim)] font-bold">IS: 13739 Standard</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {presets.map((preset) => {
              const isActive = currentFailureMode === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer relative overflow-hidden ${
                    isActive
                      ? 'bg-teal-500/15 border-teal-500 text-[var(--text-primary)] shadow-[0_0_15px_rgba(13,148,136,0.25)] ring-1 ring-teal-500/50'
                      : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)]">{preset.name}</span>
                    {isActive ? (
                      <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 border border-teal-500/40 text-[9px] font-bold uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[9px] text-[var(--text-dim)] uppercase font-mono">{preset.condition}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed font-sans">{preset.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Active Preset Summary Banner */}
          <div className="p-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] text-xs space-y-1.5 font-mono mt-3">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Preset Active Summary</span>
              <span className="text-[9px] font-bold text-amber-400 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded uppercase">
                SIMULATION OUTDATED — EXECUTE REQUIRED
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-0.5">
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Failure Mode</span>
                <strong className="text-teal-400 uppercase">{currentParams.failureMode.replace('_', ' ')}</strong>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Reservoir Pool</span>
                <strong className="text-[var(--text-primary)]">{currentParams.reservoirWaterLevel} m MSL</strong>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Breach Width</span>
                <strong className="text-[var(--text-primary)]">{currentParams.breachBottomWidth} m</strong>
              </div>
              <div>
                <span className="text-[9px] text-[var(--text-muted)] block uppercase font-bold">Formation Time</span>
                <strong className="text-[var(--text-primary)]">{currentParams.breachFormationTimeHours} hrs</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Parameters Configuration Form */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-5 font-mono transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-500" />
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
              Parametric Solver Inputs (Hydraulic &amp; Breach Geometry)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-lg border border-teal-500/30 font-bold">
            Interactive State Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Reservoir Pool Level */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[var(--text-primary)] uppercase">Reservoir Pool Level</label>
              <span className="font-bold text-teal-400">{currentParams.reservoirWaterLevel} m MSL</span>
            </div>
            <input
              type="range"
              min={activeDam.deadStorageLevelDSL}
              max={activeDam.maximumWaterLevelMWL + 5}
              step={0.5}
              value={currentParams.reservoirWaterLevel}
              onChange={(e) =>
                onParamsChange({
                  ...currentParams,
                  reservoirWaterLevel: parseFloat(e.target.value),
                  waterDepthAboveInvert: Number(
                    Math.max(2.5, parseFloat(e.target.value) - (currentParams.breachInvertElevation || 146.0)).toFixed(1)
                  ),
                })
              }
              className="w-full accent-teal-500 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span>DSL: {activeDam.deadStorageLevelDSL}m</span>
              <span>FRL: {activeDam.fullReservoirLevelFRL}m</span>
              <span>MWL: {activeDam.maximumWaterLevelMWL}m</span>
            </div>
          </div>

          {/* Breach Bottom Width */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[var(--text-primary)] uppercase">Breach Bottom Width</label>
              <span className="font-bold text-teal-400">{currentParams.breachBottomWidth} m</span>
            </div>
            <input
              type="range"
              min={20}
              max={400}
              step={5}
              value={currentParams.breachBottomWidth}
              onChange={(e) =>
                onParamsChange({
                  ...currentParams,
                  breachBottomWidth: parseInt(e.target.value, 10),
                  breachAverageWidth: Math.round(
                    parseInt(e.target.value, 10) + (currentParams.waterDepthAboveInvert || 40) * 0.6
                  ),
                })
              }
              className="w-full accent-teal-500 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span>20 m</span>
              <span>Average: {currentParams.breachAverageWidth || 210} m</span>
              <span>400 m</span>
            </div>
          </div>

          {/* Breach Formation Time */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-[var(--text-primary)] uppercase">Formation Time</label>
              <span className="font-bold text-teal-400">{currentParams.breachFormationTimeHours} hrs</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={6.0}
              step={0.1}
              value={currentParams.breachFormationTimeHours}
              onChange={(e) =>
                onParamsChange({
                  ...currentParams,
                  breachFormationTimeHours: parseFloat(e.target.value),
                })
              }
              className="w-full accent-teal-500 cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span>0.5 h (Rapid)</span>
              <span>Froehlich Calc</span>
              <span>6.0 h (Slow)</span>
            </div>
          </div>

          {/* Empirical Peak Outflow Equation */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase">
              Outflow Equation:
            </label>
            <select
              aria-label="Outflow Equation"
              value={currentParams.empiricalEquation || 'Froehlich_2008'}
              onChange={(e) =>
                onParamsChange({
                  ...currentParams,
                  empiricalEquation: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-teal-400 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="Froehlich_2008">Froehlich (2008) — Recommended CWC</option>
              <option value="MacDonald_1984">MacDonald &amp; Langridge-Monopolis (1984)</option>
              <option value="USBR_1982">USBR (1982) Empirical Outflow</option>
            </select>
          </div>

          {/* Solver Selection */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase">
              Hydrodynamic Solver Engine:
            </label>
            <select
              aria-label="Hydrodynamic Solver Engine"
              value={currentParams.selectedSolver || '2D_SWE_FiniteVolume'}
              onChange={(e) =>
                onParamsChange({
                  ...currentParams,
                  selectedSolver: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-teal-400 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="2D_SWE_FiniteVolume">2D SWE Finite Volume (Godunov / Roe)</option>
              <option value="ML_Surrogate_FloodUNet">ML Surrogate (FloodUNet 2D)</option>
              <option value="SPH_SmoothedParticle">SPH 3D Navier-Stokes Mesh-Free</option>
              <option value="Delft3D_FlexibleMesh">Delft3D Flexible Mesh Engine</option>
            </select>
          </div>

          {/* DEM Mesh Resolution */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase">
              Digital Elevation Model (DEM):
            </label>
            <select
              aria-label="Digital Elevation Model"
              value={currentParams.selectedDemResolution || '10m_CartoDEM'}
              onChange={(e) =>
                onParamsChange({
                  ...currentParams,
                  selectedDemResolution: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-teal-400 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="10m_CartoDEM">ISRO CartoDEM 10m (High Resolution)</option>
              <option value="30m_SRTM">NASA SRTM 30m Global DEM</option>
              <option value="30m_Copernicus">ESA Copernicus GLO-30 DEM</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
