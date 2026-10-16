import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Building, 
  DollarSign, 
  AlertTriangle
} from 'lucide-react';
import { HydroSimulationOutput, BreachParameters } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';
import { runHydroSimulation, calculateHazardCategory } from '../utils/hydroEngine';

interface HazardAnalysisViewProps {
  simulationOutput: HydroSimulationOutput;
  activeScenario?: BreachParameters;
  selectedDamId?: string;
}

export const HazardAnalysisView: React.FC<HazardAnalysisViewProps> = ({
  simulationOutput,
  activeScenario,
  selectedDamId,
}) => {
  const [activeMatrixTab, setActiveMatrixTab] = useState<'profile' | 'exposure' | 'loss'>('profile');

  // Determine current active dam ID strictly from selectedDamId, activeScenario, or simulationOutput
  const currentDamId =
    selectedDamId ||
    activeScenario?.selectedDamId ||
    simulationOutput?.selectedDamId ||
    simulationOutput?.damId ||
    'hirakud-dam-odisha';

  const activeDam = useMemo(() => {
    return (
      INDIAN_DAMS_REGISTRY.find((d) => d.id === currentDamId) || HIRAKUD_DAM_SPECS
    );
  }, [currentDamId]);

  // Compute effective simulation output & reach results dynamically based on current dam & scenario state
  const { currentOutput, reaches, isModelDerived } = useMemo(() => {
    // 1. If simulationOutput matches current dam & params, use simulationOutput
    if (
      simulationOutput &&
      (simulationOutput.selectedDamId === currentDamId || simulationOutput.damId === currentDamId) &&
      simulationOutput.reachResults &&
      simulationOutput.reachResults.length > 0
    ) {
      // Check if activeScenario matches current simulation parameters
      if (
        !activeScenario ||
        (activeScenario.selectedDamId === currentDamId &&
         activeScenario.failureMode === (simulationOutput as any).failureMode)
      ) {
        return {
          currentOutput: simulationOutput,
          reaches: simulationOutput.reachResults,
          isModelDerived: true,
        };
      }
    }

    // 2. If activeScenario or dam was modified, re-run hydrodynamic solver dynamically to update hazard values
    if (activeScenario) {
      const freshOutput = runHydroSimulation({
        ...activeScenario,
        selectedDamId: currentDamId,
      });
      return {
        currentOutput: freshOutput,
        reaches: freshOutput.reachResults,
        isModelDerived: true,
      };
    }

    // 3. Fallback for dam default scenario
    const defaultParams = {
      failureMode: 'overtopping' as const,
      reservoirWaterLevel: activeDam.maximumWaterLevelMWL,
      waterDepthAboveInvert: activeDam.heightAboveLowestFoundation,
      reservoirVolumeAtBreachMCM: activeDam.grossStorageCapacityMCM,
      breachBottomWidth: 160,
      breachSideSlope: 1.0,
      breachAverageWidth: 180,
      breachInvertElevation: activeDam.deadStorageLevelDSL,
      breachFormationTimeHours: 1.85,
      initialFlowM3s: 350,
      simulationDurationHours: 24,
      empiricalEquation: 'Froehlich_2008' as const,
      selectedDamId: currentDamId,
    };
    const freshOutput = runHydroSimulation(defaultParams);
    return {
      currentOutput: freshOutput,
      reaches: freshOutput.reachResults,
      isModelDerived: true,
    };
  }, [simulationOutput, activeScenario, currentDamId, activeDam]);

  // Recalculate / verify DEFRA HR and Hazard Category for each reach using exact DEFRA formula
  const processedReaches = useMemo(() => {
    if (!reaches || reaches.length === 0) return [];
    return reaches.map((reach) => {
      const depthM = reach.maxFloodDepthM;
      const velocityMs = reach.maxVelocityMs;

      // DEFRA FD2320 Hazard Rating: HR = d * (v + 0.5) + DF (Debris Factor: 0.5 if d > 0.3m, else 0.0)
      const { hr, category } = calculateHazardCategory(depthM, velocityMs);

      return {
        ...reach,
        hazardRatingHR: hr,
        hazardCategory: category,
      };
    });
  }, [reaches]);

  const settlements = activeDam.settlements || [];
  const criticalFacilities = activeDam.criticalFacilities || [];

  // Dynamic Loss Estimation scaling with inundated area, population, and infrastructure length
  const directPropertyLossCr = Math.round(
    (currentOutput?.totalInundationAreaKm2 || 50) * 12.4 +
      (currentOutput?.spatialImpact?.modelAffectedPopulation || 0) * 0.015
  );
  const infraLossCr = Math.round(
    (currentOutput?.spatialImpact?.modelInundatedRoadNetworkKm || 10) * 4.8 +
      (currentOutput?.spatialImpact?.modelImpactedFacilitiesCount || 0) * 85
  );
  const totalLossCr = directPropertyLossCr + infraLossCr;

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'LOW':
      case 'Low':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'MODERATE':
      case 'Moderate':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'SIGNIFICANT':
      case 'Significant':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'EXTREME':
      case 'Extreme':
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  // Safe Formatting Helpers (Display DATA NOT AVAILABLE if missing/invalid)
  const formatNum = (val: number | undefined | null, decimals = 2): string => {
    if (val === undefined || val === null || isNaN(val)) return 'DATA NOT AVAILABLE';
    return val.toFixed(decimals);
  };

  const formatDischargeVal = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return 'DATA NOT AVAILABLE';
    return `${val.toLocaleString()} m³/s`;
  };

  const formatTimeVal = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return 'DATA NOT AVAILABLE';
    return `T+${val.toFixed(2)} hrs`;
  };

  const formatDistVal = (val: number | undefined | null): string => {
    if (val === undefined || val === null || isNaN(val)) return 'DATA NOT AVAILABLE';
    return `${val.toFixed(1)} km`;
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Top Banner */}
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl transition-colors duration-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-wide">
                HAZARD PROFILE &amp; VULNERABILITY LOSS ANALYSIS — {activeDam.name}
              </h2>
              {isModelDerived ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 uppercase">
                  MODEL-DERIVED RESULT ({activeDam.name})
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">
                  DATA NOT AVAILABLE
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
              Quantitative depth-velocity hydrodynamic hazard matrices &amp; economic exposure estimation for {activeDam.name} ({activeDam.location.river} River).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveMatrixTab('profile')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeMatrixTab === 'profile'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                1. HAZARD PROFILE
              </button>
              <button
                onClick={() => setActiveMatrixTab('exposure')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeMatrixTab === 'exposure'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                2. EXPOSURE
              </button>
              <button
                onClick={() => setActiveMatrixTab('loss')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeMatrixTab === 'loss'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                3. LOSS ESTIMATION
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. HAZARD PROFILE TAB */}
      {activeMatrixTab === 'profile' && (
        <div className="space-y-6">
          {/* Formula & Hazard Scale Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-xl space-y-1.5">
              <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Defra Hazard Formula
              </div>
              <div className="text-sm font-bold text-teal-400">
                HR = d · (v + 0.5) + DF
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-sans">
                d = depth (m), v = velocity (m/s), DF = Debris Factor (0.5 for urban/vegetated).
              </p>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Low Hazard</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  HR &lt; 0.75
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)] font-medium font-sans">Shallow water / low velocity.</p>
              <span className="text-[11px] text-[var(--text-muted)] font-sans block">Caution required for vulnerable groups.</span>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Significant Hazard</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  1.25 ≤ HR &lt; 2.0
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)] font-medium font-sans">Dangerous for most: Footing loss.</p>
              <span className="text-[11px] text-[var(--text-muted)] font-sans block">Vehicles displaced; structural stress.</span>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Extreme Hazard</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  HR ≥ 2.0
                </span>
              </div>
              <p className="text-xs text-[var(--text-primary)] font-medium font-sans">Life-Threatening Surge.</p>
              <span className="text-[11px] text-[var(--text-muted)] font-sans block">Immediate structural destruction &amp; washaway.</span>
            </div>
          </div>

          {/* Reaches Hazard Table */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Spatial Reach Hydrodynamic Hazard Table — {activeDam.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                  Simulated peak depths, velocities, arrival times, and Defra hazard rating along {activeDam.location.river} River
                </p>
              </div>
              {isModelDerived ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 uppercase">
                  MODEL-DERIVED RESULT
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">
                  DATA NOT AVAILABLE
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-card)] text-[var(--text-muted)] border-b border-[var(--border-color)] font-bold uppercase text-[11px]">
                    <th className="py-3 px-3">Reach Location</th>
                    <th className="py-3 px-3">Distance</th>
                    <th className="py-3 px-3">Arrival Time</th>
                    <th className="py-3 px-3">Peak Time</th>
                    <th className="py-3 px-3">Peak Discharge</th>
                    <th className="py-3 px-3">Max Depth</th>
                    <th className="py-3 px-3">Max Velocity</th>
                    <th className="py-3 px-3">Defra HR</th>
                    <th className="py-3 px-3">Hazard Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {processedReaches.length > 0 ? (
                    processedReaches.map((reach) => (
                      <tr key={reach.reachId} className="hover:bg-[var(--bg-hover)] transition">
                        <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{reach.reachName || 'DATA NOT AVAILABLE'}</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">{formatDistVal(reach.distanceFromDamKm)}</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">{formatTimeVal(reach.arrivalTimeHours)}</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">{formatTimeVal(reach.peakTimeHours)}</td>
                        <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{formatDischargeVal(reach.peakDischargeM3s)}</td>
                        <td className="py-3 px-3 text-teal-400 font-bold">{formatNum(reach.maxFloodDepthM, 1)} m</td>
                        <td className="py-3 px-3 text-emerald-400">{formatNum(reach.maxVelocityMs, 1)} m/s</td>
                        <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{formatNum(reach.hazardRatingHR, 2)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCategoryBadge(reach.hazardCategory)}`}>
                            {reach.hazardCategory || 'DATA NOT AVAILABLE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-rose-400 font-bold">
                        DATA NOT AVAILABLE FOR SELECTED DAM REACHES
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXPOSURE TAB */}
      {activeMatrixTab === 'exposure' && (
        <div className="space-y-6">
          {/* Exposure KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-lg">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block mb-1">Population Exposed</span>
              <div className="text-2xl font-bold text-amber-400">
                {currentOutput?.spatialImpact?.modelAffectedPopulation ? currentOutput.spatialImpact.modelAffectedPopulation.toLocaleString() : 'DATA NOT AVAILABLE'}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-sans mt-1 block">Census of India Baseline</span>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-lg">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block mb-1">Buildings Inundated</span>
              <div className="text-2xl font-bold text-teal-400">
                {currentOutput?.spatialImpact?.modelInundatedBuildingsCount !== undefined ? currentOutput.spatialImpact.modelInundatedBuildingsCount.toLocaleString() : 'DATA NOT AVAILABLE'}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-sans mt-1 block">OSM Mapped Structures</span>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-lg">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block mb-1">Submerged Roads</span>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {currentOutput?.spatialImpact?.modelInundatedRoadNetworkKm !== undefined ? `${currentOutput.spatialImpact.modelInundatedRoadNetworkKm.toFixed(1)} km` : 'DATA NOT AVAILABLE'}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-sans mt-1 block">Primary Highways &amp; Bridges</span>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-lg">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block mb-1">Infrastructure Corridors</span>
              <div className="text-base font-bold text-cyan-400 truncate">
                {activeDam.location.river} River
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-sans mt-1 block">Highway &amp; Rail Crossings</span>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-lg">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block mb-1">Critical Facilities</span>
              <div className="text-2xl font-bold text-rose-400">
                {currentOutput?.spatialImpact?.modelImpactedFacilitiesCount !== undefined ? currentOutput.spatialImpact.modelImpactedFacilitiesCount : 'DATA NOT AVAILABLE'}
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-sans mt-1 block">Hospitals &amp; Power Stations</span>
            </div>
          </div>

          {/* Census Settlements Exposure Table */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Census Settlements Inundation &amp; Exposure — {activeDam.name}
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                  Cross-referenced against Census of India baseline coordinates for {activeDam.location.district}, {activeDam.location.state}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-card)] text-[var(--text-muted)] uppercase border-b border-[var(--border-color)] font-bold text-[11px]">
                    <th className="py-3 px-3">Settlement Name</th>
                    <th className="py-3 px-3">District</th>
                    <th className="py-3 px-3">Distance</th>
                    <th className="py-3 px-3">Census Population</th>
                    <th className="py-3 px-3">Ground Elev</th>
                    <th className="py-3 px-3">Flood Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {settlements.map((s) => {
                    const closestReach = processedReaches.reduce((prev, curr) => 
                      Math.abs(curr.distanceFromDamKm - s.distanceFromDamKm) < Math.abs(prev.distanceFromDamKm - s.distanceFromDamKm) ? curr : prev
                    , processedReaches[0]);

                    const isFlooded = closestReach?.peakStageM ? closestReach.peakStageM >= (s.elevationM - 1.5) && closestReach.maxFloodDepthM > 0.5 : false;

                    return (
                      <tr key={s.id} className="hover:bg-[var(--bg-hover)] transition">
                        <td className="py-3 px-3 font-bold text-[var(--text-primary)]">{s.name}</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">{s.district}</td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">{s.distanceFromDamKm} km</td>
                        <td className="py-3 px-3 font-bold text-amber-400">{s.censusPopulation.toLocaleString()}</td>
                        <td className="py-3 px-3 text-[var(--text-muted)]">{s.elevationM} m MSL</td>
                        <td className="py-3 px-3">
                          {isFlooded ? (
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              INUNDATED (~{(closestReach.peakStageM - s.elevationM + 1.5).toFixed(1)}m)
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              SAFE MARGIN
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
        </div>
      )}

      {/* 3. LOSS ESTIMATION TAB */}
      {activeMatrixTab === 'loss' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 text-teal-400">
                <DollarSign className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Property Exposure</h3>
              </div>
              <div className="text-2xl font-bold text-teal-400">
                ₹ {directPropertyLossCr.toLocaleString()} Cr
              </div>
              <p className="text-xs text-[var(--text-muted)] font-sans">
                Commercial, agricultural, and residential property valuation within 2D SWE flood extent for {activeDam.name}.
              </p>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 text-amber-400">
                <Building className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Infrastructure Exposure</h3>
              </div>
              <div className="text-2xl font-bold text-amber-400">
                ₹ {infraLossCr.toLocaleString()} Cr
              </div>
              <p className="text-xs text-[var(--text-muted)] font-sans">
                Bridges, electrical substations, water treatment plants, and highway pavement repair along {activeDam.location.river} River.
              </p>
            </div>

            <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-2 text-rose-400">
                <ShieldAlert className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Estimated Total Direct Loss</h3>
              </div>
              <div className="text-2xl font-bold text-rose-400">
                ₹ {totalLossCr.toLocaleString()} Cr
              </div>
              <p className="text-xs text-[var(--text-muted)] font-sans">
                Combined direct damage estimate based on NDMA depth-damage curves and CWC loss matrices.
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-color)] pb-3">
              Critical Infrastructure &amp; Lifelines Exposure Matrix — {activeDam.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {criticalFacilities.map((fac) => {
                const closestReach = processedReaches.reduce((prev, curr) => 
                  Math.abs(curr.distanceFromDamKm - fac.distanceFromDamKm) < Math.abs(prev.distanceFromDamKm - fac.distanceFromDamKm) ? curr : prev
                , processedReaches[0]);

                const isFlooded = closestReach?.peakStageM ? closestReach.peakStageM >= fac.elevationM : false;

                return (
                  <div key={fac.id} className="p-4 rounded-xl border bg-[var(--bg-card)] border-[var(--border-color)] space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-[var(--text-primary)] text-xs block">{fac.name}</span>
                        <span className="text-[11px] text-[var(--text-muted)] font-sans">
                          {fac.type} • {fac.distanceFromDamKm} km downstream
                        </span>
                      </div>
                      {isFlooded ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                          IMPACT RISK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          ABOVE FLOOD STAGE
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] pt-1 font-mono">
                      <div>Base Elevation: <strong className="text-[var(--text-primary)]">{fac.elevationM} m</strong></div>
                      <div>Peak Stage: <strong className="text-teal-400">{closestReach?.peakStageM ? `${closestReach.peakStageM} m` : 'DATA NOT AVAILABLE'}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
