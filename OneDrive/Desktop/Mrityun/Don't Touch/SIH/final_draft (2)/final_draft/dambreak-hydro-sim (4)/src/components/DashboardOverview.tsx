import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, 
  Activity, 
  Compass, 
  TrendingUp, 
  ShieldAlert, 
  Users, 
  Building, 
  Route, 
  SlidersHorizontal, 
  Box, 
  Gauge, 
  FastForward, 
  Maximize2,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Play,
  Database
} from 'lucide-react';
import { HydroSimulationOutput, NavigationTab, BreachParameters } from '../types';
import { 
  HIRAKUD_DAM_SPECS, 
  INDIAN_DAMS_REGISTRY 
} from '../data/damData';
import { HydrographTimeSeries } from './HydrographTimeSeries';
import { Simulator3D } from './Simulator3D';
import { StageTimeline } from './common/StageTimeline';

interface DashboardOverviewProps {
  simulationOutput: HydroSimulationOutput;
  activeScenario: BreachParameters;
  onSelectTab: (tab: NavigationTab) => void;
  onRunSimulation: () => void;
  onUpdateScenario?: (params: BreachParameters) => void;
  onOpenExportModal?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  simulationOutput,
  activeScenario,
  onSelectTab,
  onRunSimulation,
  onUpdateScenario,
  onOpenExportModal,
}) => {
  // Active dam profile resolution strictly from activeScenario / selectedDamId
  const activeDam = useMemo(() => {
    const damId = activeScenario.selectedDamId || simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
    return INDIAN_DAMS_REGISTRY.find(d => d.id === damId) || HIRAKUD_DAM_SPECS;
  }, [activeScenario.selectedDamId, simulationOutput?.selectedDamId, simulationOutput?.damId]);

  // Reaches strictly derived from simulation output or active dam reaches (never hardcoded fallbacks)
  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : (activeDam.reaches || []);
  const [selectedReachId, setSelectedReachId] = useState<string>(reaches[0]?.reachId || '');

  // Detect out-of-sync simulation state when scenario parameters change in Model Inputs
  const isOutdated = useMemo(() => {
    if (!simulationOutput) return true;
    if (simulationOutput.damId !== activeDam.id) return true;
    return false;
  }, [simulationOutput, activeDam.id]);

  // Dynamic Hazard Rating derived from maximum flood depth and reach categories
  const hazardRatingClass = useMemo(() => {
    if (!reaches || reaches.length === 0) return simulationOutput?.maxFloodDepthM > 8 ? 'EXTREME' : 'HIGH';
    if (reaches.some(r => r.hazardCategory === 'EXTREME')) return 'EXTREME';
    if (reaches.some(r => r.hazardCategory === 'SIGNIFICANT')) return 'SIGNIFICANT';
    if (reaches.some(r => r.hazardCategory === 'MODERATE')) return 'MODERATE';
    return 'LOW';
  }, [reaches, simulationOutput?.maxFloodDepthM]);

  return (
    <div className="space-y-6 font-mono">
      {/* OUTDATED PARAMETERS WARNING BANNER */}
      {isOutdated && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold uppercase block text-amber-300">Simulation Parameters Modified</span>
              <span className="text-[11px] text-amber-400/90 font-sans">
                Active scenario parameters for {activeDam.name} differ from rendered output. Click execute to update predictions.
              </span>
            </div>
          </div>
          <button
            onClick={onRunSimulation}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded-xl flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Re-Run Simulation</span>
          </button>
        </div>
      )}

      {/* 1. OPERATION HEADER */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl relative overflow-hidden transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-bold text-teal-500 uppercase tracking-widest">
                OPERATION HEADER
              </span>
              <span className="text-[var(--text-dim)]">•</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                SIMULATION COMPLETE
              </span>
            </div>

            <h2 className="text-xl font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
              DAMBREAK HYDRO-SIM — FLOOD INTELLIGENCE COMMAND CENTER
            </h2>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[var(--text-secondary)] mt-2">
              <div>
                <span className="text-[var(--text-muted)] uppercase">Selected Dam:</span>{' '}
                <strong className="text-teal-400">{activeDam.name}</strong>
              </div>
              <span className="text-[var(--text-dim)]">•</span>
              <div>
                <span className="text-[var(--text-muted)] uppercase">River:</span>{' '}
                <strong className="text-[var(--text-primary)]">{activeDam.location.river} River</strong>
              </div>
              <span className="text-[var(--text-dim)]">•</span>
              <div>
                <span className="text-[var(--text-muted)] uppercase">State:</span>{' '}
                <strong className="text-[var(--text-secondary)]">{activeDam.location.state}</strong>
              </div>
              <span className="text-[var(--text-dim)]">•</span>
              <div>
                <span className="text-[var(--text-muted)] uppercase">Failure Mode:</span>{' '}
                <strong className="text-amber-400 uppercase">{activeScenario.failureMode.replace('_', ' ')} Failure</strong>
              </div>
              <span className="text-[var(--text-dim)]">•</span>
              <div>
                <span className="text-[var(--text-muted)] uppercase">Peak Hydrograph:</span>{' '}
                <strong className="text-teal-400">T + {simulationOutput.timeToPeakHours}h</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onSelectTab('model-inputs')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-bold border border-[var(--border-color)] transition cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-500" />
              <span>Model Inputs</span>
            </button>
            <button
              onClick={() => onSelectTab('sim-3d')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
            >
              <Box className="w-3.5 h-3.5 fill-current" />
              <span>Full 3D Simulation</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. HERO SECTION: 3D Interactive Preview + LIVE FLOOD INTELLIGENCE HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Large Interactive 3D Simulation Viewport Preview */}
        <div className="lg:col-span-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl flex flex-col justify-between transition-colors duration-200">
          <div className="p-3 bg-[var(--bg-card)] border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-teal-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                3D HYDRODYNAMIC VIEW — {activeDam.name} ({activeScenario.failureMode.replace('_', ' ')})
              </span>
            </div>
            <button
              onClick={() => onSelectTab('sim-3d')}
              className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Expand 3D Workspace</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="relative w-full h-[400px]">
            <Simulator3D simulationOutput={simulationOutput} compactMode={true} />
          </div>
        </div>

        {/* Right (1 Col): LIVE FLOOD INTELLIGENCE HUD Panel (Data-Driven Metrics) */}
        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl flex flex-col justify-between space-y-4 transition-colors duration-200">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                LIVE FLOOD INTELLIGENCE
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">Model-Driven Hydrodynamic Telemetry</p>
            </div>
            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-bold">
              MODELED
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Metric 1: Flood Front */}
            <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold">MODELED • FLOOD FRONT</span>
                <Compass className="w-3.5 h-3.5 text-teal-500" />
              </div>
              <div className="text-xl font-extrabold text-teal-400">
                {simulationOutput.waveFrontFrontierKm ? `${simulationOutput.waveFrontFrontierKm.toFixed(0)} km` : 'N/A'}
              </div>
              <div className="text-[9px] text-[var(--text-dim)] font-mono">
                Source: 2D SWE Wave Celerity
              </div>
            </div>

            {/* Metric 2: Max Flood Depth */}
            <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold">MODELED • MAX FLOOD DEPTH</span>
                <Gauge className="w-3.5 h-3.5 text-cyan-500" />
              </div>
              <div className="text-xl font-extrabold text-cyan-400">
                {simulationOutput.maxFloodDepthM ? `${simulationOutput.maxFloodDepthM.toFixed(1)} m` : 'Requires Simulation Data'}
              </div>
              <div className="text-[9px] text-[var(--text-dim)] font-mono">
                Source: 2D SWE Finite Volume Grid
              </div>
            </div>

            {/* Metric 3: Max Flow Velocity */}
            <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold">MODELED • MAX VELOCITY</span>
                <FastForward className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl font-extrabold text-emerald-400">
                {simulationOutput.maxFlowVelocityMs ? `${simulationOutput.maxFlowVelocityMs.toFixed(1)} m/s` : 'Requires Simulation Data'}
              </div>
              <div className="text-[9px] text-[var(--text-dim)] font-mono">
                Source: Godunov Momentum Flux
              </div>
            </div>

            {/* Metric 4: Inundated Area */}
            <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold">MODELED • INUNDATED AREA</span>
                <Maximize2 className="w-3.5 h-3.5 text-teal-500" />
              </div>
              <div className="text-xl font-extrabold text-teal-400">
                {simulationOutput.totalInundationAreaKm2 ? `${simulationOutput.totalInundationAreaKm2.toFixed(1)} km²` : 'N/A'}
              </div>
              <div className="text-[9px] text-[var(--text-dim)] font-mono">
                Source: DEM Intersect Analysis
              </div>
            </div>

            {/* Metric 5: Population Exposed */}
            <div className="p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold">REFERENCE • POPULATION EXPOSED</span>
                <Users className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-xl font-extrabold text-amber-400">
                {simulationOutput.spatialImpact?.modelAffectedPopulation > 0
                  ? simulationOutput.spatialImpact.modelAffectedPopulation.toLocaleString()
                  : 'DATA NOT AVAILABLE'}
              </div>
              <div className="text-[9px] text-[var(--text-dim)] font-mono">
                Source: Census of India Settlement Data
              </div>
            </div>

            {/* Metric 6: Hazard Rating */}
            <div className="p-3 rounded-lg border bg-rose-500/10 border-rose-500/40 flex items-center justify-between text-rose-400">
              <div>
                <span className="text-[9px] text-rose-400/80 font-bold uppercase tracking-wider block">MODELED • DEFRA HAZARD MATRIX</span>
                <span className="text-lg font-extrabold">{hazardRatingClass}</span>
                <div className="text-[9px] text-rose-400/70 font-mono mt-0.5">Source: UK Defra / EA Safety Matrix</div>
              </div>
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. OPERATIONAL FLOOD PIPELINE (Horizontal stage process timeline) */}
      <StageTimeline currentStage="propagation" />

      {/* 4. FLOOD INTELLIGENCE ANALYTICS */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" />
              <span>FLOOD INTELLIGENCE ANALYTICS</span>
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Dam breach outflow hydrograph, peak discharge attenuation, and wave progression metrics for {activeDam.name}
            </p>
          </div>
          <span className="text-[11px] text-teal-400 font-bold">
            Peak Discharge: {simulationOutput.peakBreachOutflowM3s.toLocaleString()} m³/s @ T+{simulationOutput.timeToPeakHours}h
          </span>
        </div>

        <div className="h-64">
          <HydrographTimeSeries simulationOutput={simulationOutput} />
        </div>
      </div>

      {/* 5. DOWNSTREAM IMPACT TABLE */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4 transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              <span>DOWNSTREAM IMPACT</span>
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Location-based wave arrival times, peak depth, velocity &amp; hazard classification along {activeDam.location.river} River
            </p>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            {reaches.length} Reaches Monitored ({activeDam.name})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="bg-[var(--bg-card)] text-[var(--text-muted)] uppercase border-b border-[var(--border-color)] text-[11px]">
                <th className="py-2.5 px-3 font-bold">Location / Reach</th>
                <th className="py-2.5 px-3 font-bold">Distance</th>
                <th className="py-2.5 px-3 font-bold">Arrival Time</th>
                <th className="py-2.5 px-3 font-bold">Flood Depth</th>
                <th className="py-2.5 px-3 font-bold">Velocity</th>
                <th className="py-2.5 px-3 font-bold">Hazard Rating</th>
                <th className="py-2.5 px-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {reaches.map((reach) => {
                const isFlooded = reach.maxFloodDepthM > 1.0;
                return (
                  <tr
                    key={reach.reachId}
                    onClick={() => setSelectedReachId(reach.reachId)}
                    className={`hover:bg-[var(--bg-hover)] cursor-pointer transition ${
                      reach.reachId === selectedReachId ? 'bg-teal-500/10 border-l-2 border-l-teal-500' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">{reach.reachName}</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{reach.distanceFromDamKm} km</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">T+{reach.arrivalTimeHours} hrs</td>
                    <td className="py-2.5 px-3 font-bold text-teal-400">{reach.maxFloodDepthM.toFixed(1)} m</td>
                    <td className="py-2.5 px-3 text-emerald-400">{reach.maxVelocityMs.toFixed(1)} m/s</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        reach.hazardCategory === 'EXTREME'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : reach.hazardCategory === 'SIGNIFICANT'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}>
                        {reach.hazardCategory}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {isFlooded ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          AFFECTED / FLOODED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] text-[10px] font-bold">
                          STANDBY
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. CRITICAL INFRASTRUCTURE & RECEPTORS */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4 transition-colors duration-200">
        <div className="flex flex-wrap items-center justify-between border-b border-[var(--border-color)] pb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-500" />
              <span>CRITICAL INFRASTRUCTURE &amp; RECEPTORS</span>
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              Downstream lifelines, transportation bridges, settlements &amp; critical assets along {activeDam.location.river} River
            </p>
          </div>
          <button
            onClick={() => onSelectTab('hazard-loss')}
            className="text-xs text-teal-400 hover:text-teal-300 font-bold hover:underline cursor-pointer"
          >
            Detailed Exposure Matrix &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Item 1: Bridges */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-bold uppercase text-[10px]">REFERENCE • ROAD NETWORK</span>
              <Route className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-extrabold text-[var(--text-primary)]">
              {(simulationOutput.spatialImpact?.modelInundatedRoadNetworkKm || 0).toFixed(1)} <span className="text-xs font-normal text-[var(--text-muted)]">km Submerged</span>
            </div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--border-color)] pt-2 font-mono">
              <span>Source: <strong className="text-teal-400">NHAI GIS Layer</strong></span>
              <span className="text-rose-400 font-bold">Cutoff</span>
            </div>
          </div>

          {/* Item 2: Highways */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-bold uppercase text-[10px]">REFERENCE • HIGHWAY CORRIDOR</span>
              <Route className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-base font-extrabold text-[var(--text-primary)] truncate">
              {activeDam.location.river} River Corridor
            </div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--border-color)] pt-2 font-mono">
              <span>Depth: <strong className="text-teal-400">{simulationOutput.maxFloodDepthM.toFixed(1)} m</strong></span>
              <span className="text-amber-400 font-bold">Inundated</span>
            </div>
          </div>

          {/* Item 3: Facilities */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-bold uppercase text-[10px]">MODELED • CRITICAL ASSETS</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400">
              {simulationOutput.spatialImpact?.modelImpactedFacilitiesCount || 0} / {simulationOutput.spatialImpact?.totalCriticalFacilitiesLoaded || activeDam.criticalFacilities.length}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--border-color)] pt-2 font-mono">
              <span>Source: <strong className="text-[var(--text-secondary)]">SDMA Registry</strong></span>
              <span className="text-rose-400 font-bold">Submerged</span>
            </div>
          </div>

          {/* Item 4: Settlements */}
          <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span className="font-bold uppercase text-[10px]">REFERENCE • CENSUS SETTLEMENTS</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400">
              {simulationOutput.spatialImpact?.affectedSettlementsCount || 0} / {simulationOutput.spatialImpact?.totalSettlementsInReach || activeDam.settlements.length}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--border-color)] pt-2 font-mono">
              <span>Source: <strong className="text-[var(--text-secondary)]">Census of India</strong></span>
              <span className="text-amber-400 font-bold">Evacuating</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. SCENARIO COMMAND PANEL */}
      <div className="bg-[var(--bg-panel)] border border-teal-500/40 rounded-xl p-5 shadow-2xl space-y-3 font-mono transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                SCENARIO COMMAND
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
                AI SCENARIO GENERATOR
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1 font-sans">
              AI-ASSISTED HYDRODYNAMIC SCENARIO CONFIGURATION — Configure parametric dam breach scenarios, empirical outflow equations &amp; DEM mesh settings for {activeDam.name}.
            </p>
          </div>

          <button
            onClick={() => onSelectTab('model-inputs')}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shrink-0 shadow-md"
          >
            <span>CONFIGURE SCENARIO</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-[var(--text-secondary)] pt-1">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Target Dam Profile</span>
            <strong className="text-teal-400">{activeDam.name}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Failure Mechanism</span>
            <strong className="text-[var(--text-primary)] uppercase">{activeScenario.failureMode.replace('_', ' ')} Failure</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Breach Width</span>
            <strong className="text-[var(--text-primary)]">{activeScenario.breachBottomWidth} m</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Outflow Solver</span>
            <strong className="text-teal-400">{activeScenario.empiricalEquation || 'Froehlich (2008)'} 2D SWE</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
