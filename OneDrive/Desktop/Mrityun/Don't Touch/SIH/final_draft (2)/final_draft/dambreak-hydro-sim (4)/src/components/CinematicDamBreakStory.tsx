import React, { useState, useEffect, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  ShieldAlert, 
  Waves
} from 'lucide-react';
import { HydroSimulationOutput, BreachParameters } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

interface CinematicDamBreakStoryProps {
  simulationOutput: HydroSimulationOutput;
  activeScenario: BreachParameters;
}

export const CinematicDamBreakStory: React.FC<CinematicDamBreakStoryProps> = ({
  simulationOutput,
  activeScenario,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const damId = simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
  const activeDam = useMemo(() => {
    return INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  }, [damId]);

  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : (activeDam.reaches || []);

  const r0 = reaches[0] || { reachName: 'Dam Toe & Spillway Reach', distanceFromDamKm: 0.5, arrivalTimeHours: 0.03, maxFloodDepthM: 15.0 };
  const r1 = reaches[1] || { reachName: 'Mid-Corridor Reach', distanceFromDamKm: 14.2, arrivalTimeHours: 0.8, maxFloodDepthM: 11.2 };
  const r2 = reaches[2] || { reachName: 'Lower Valley Reach', distanceFromDamKm: 32.5, arrivalTimeHours: 2.5, maxFloodDepthM: 6.4 };
  const r3 = reaches[3] || { reachName: 'Downstream Reach Boundary', distanceFromDamKm: 58.0, arrivalTimeHours: 4.8, maxFloodDepthM: 3.2 };

  const storySteps = useMemo(() => {
    const peakQ = simulationOutput?.peakBreachOutflowM3s || 48500;
    const timeToPeak = simulationOutput?.timeToPeakHours || 1.6;
    const maxDepth = simulationOutput?.maxFloodDepthM || 18.5;
    const totalArea = simulationOutput?.totalInundationAreaKm2 || 112.5;

    return [
      {
        id: 'intact',
        title: `Phase 1: Intact Dam Equilibrium (T = 0.0 h)`,
        subtitle: `Reservoir at MWL Capacity (${activeDam.maximumWaterLevelMWL} m MSL) • ${activeDam.name}`,
        image: '/src/assets/images/hero_dam_landscape_1787761004568.jpg',
        hydroTime: '0.00 h',
        discharge: '350 m³/s',
        waveKm: `0.0 km (At ${activeDam.name})`,
        stage: `${activeDam.maximumWaterLevelMWL} m MSL`,
        status: 'NORMAL MONITORING',
        statusColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40',
        description: `${activeDam.name} impounds ${activeDam.grossStorageCapacityMCM.toLocaleString()} MCM of water along the ${activeDam.location.river} River basin in ${activeDam.location.state}. Structural transducers report baseline equilibrium.`,
        physics: `Hydrostatic pressure at dam invert. Baseflow discharge Q_base governed by spillway gate rating curves.`,
      },
      {
        id: 'breach_inception',
        title: `Phase 2: Breach Inception & Erosion (T = ${(timeToPeak * 0.25).toFixed(2)} h)`,
        subtitle: `${activeScenario.failureMode.toUpperCase().replace('_', ' ')} Failure Mode Initiates Channel Breach`,
        image: '/src/assets/images/dambreak_surge_cinematic_1787761022360.jpg',
        hydroTime: `${(timeToPeak * 0.25).toFixed(2)} h`,
        discharge: `${Math.round(peakQ * 0.3).toLocaleString()} m³/s`,
        waveKm: `${r0.distanceFromDamKm} km (${r0.reachName})`,
        stage: `${(activeDam.maximumWaterLevelMWL - 1.2).toFixed(1)} m MSL`,
        status: 'FLASH FLOOD ALERT ISSUED',
        statusColor: 'text-amber-400 border-amber-500/30 bg-amber-950/40',
        description: `Seepage & hydraulic erosion broaden the breach notch at ${activeDam.name} to a bottom width of B_b = ${activeScenario.breachBottomWidth || 160}m. Peak outflow rapidly accelerates into ${r0.reachName}.`,
        physics: `${activeScenario.empiricalEquation || 'Froehlich (2008)'} breach development time: t_f = ${activeScenario.breachFormationTimeHours || 1.85} hours.`,
      },
      {
        id: 'peak_surge',
        title: `Phase 3: Peak Outflow & Shockwave Surge (T = ${timeToPeak} h)`,
        subtitle: `Maximum Breach Outflow Peak Q_p = ${peakQ.toLocaleString()} m³/s`,
        image: '/src/assets/images/dambreak_surge_cinematic_1787761022360.jpg',
        hydroTime: `${timeToPeak} h`,
        discharge: `${peakQ.toLocaleString()} m³/s`,
        waveKm: `${r1.distanceFromDamKm} km (${r1.reachName})`,
        stage: `${(activeDam.maximumWaterLevelMWL - 5.5).toFixed(1)} m MSL`,
        status: 'CATASTROPHIC SURGE IN PROGRESS',
        statusColor: 'text-rose-400 border-rose-500/30 bg-rose-950/40',
        description: `The breach reaches maximum opening. A steep 2D hydrodynamic shockwave of peak depth h = ${maxDepth.toFixed(1)}m surges downstream into ${r1.reachName} along ${activeDam.location.river} River.`,
        physics: `Peak discharge formula: Q_p = ${peakQ.toLocaleString()} m³/s. Saint-Venant 2D momentum flux: ∂(uh)/∂t + ∂(u²h)/∂x = -gh ∂η/∂x - gh S_f.`,
      },
      {
        id: 'downstream_inundation',
        title: `Phase 4: Downstream Flood Wave Propagation (T = ${(timeToPeak * 2.5).toFixed(1)} h)`,
        subtitle: `Flood Envelope Spreads across ${r2.reachName} & River Corridor`,
        image: '/src/assets/images/satellite_flood_inundation_1787761038320.jpg',
        hydroTime: `${(timeToPeak * 2.5).toFixed(1)} h`,
        discharge: `${Math.round(peakQ * 0.55).toLocaleString()} m³/s`,
        waveKm: `${r2.distanceFromDamKm} km (${r2.reachName})`,
        stage: `${(activeDam.maximumWaterLevelMWL - 12.0).toFixed(1)} m MSL`,
        status: 'MASS EVACUATION & INUNDATION',
        statusColor: 'text-red-400 border-red-500/30 bg-red-950/40',
        description: `The wave front propagates past ${r2.reachName} (${r2.distanceFromDamKm} km downstream). Inundation depths reach ${r2.maxFloodDepthM.toFixed(1)}m, affecting surrounding settlement areas.`,
        physics: `Wave attenuation factor k_att = exp(-0.015 × x). Flow velocity regulated by Manning’s roughness resistance.`,
      },
      {
        id: 'basin_stagnation',
        title: `Phase 5: Maximum Extent & Receding Tail (T = 12.0 h - 24.0 h)`,
        subtitle: `Total Inundation Area Reaches ${totalArea.toFixed(1)} km² • Drainage & Recovery`,
        image: '/src/assets/images/dem_terrain_mesh_3d_1787761054678.jpg',
        hydroTime: '12.00 h to 24.00 h',
        discharge: `${Math.round(peakQ * 0.12).toLocaleString()} m³/s`,
        waveKm: `${r3.distanceFromDamKm} km (${r3.reachName})`,
        stage: `${activeDam.deadStorageLevelDSL} m MSL`,
        status: 'POST-EVENT DAMAGE ASSESSMENT',
        statusColor: 'text-sky-400 border-sky-500/30 bg-sky-950/40',
        description: `Reservoir storage drains down to dead storage level (${activeDam.deadStorageLevelDSL} m MSL). Remote sensing satellite feeds capture final flood extent across ${activeDam.location.district}, ${activeDam.location.state}.`,
        physics: `Total flood volume released from ${activeDam.name}: ${activeDam.grossStorageCapacityMCM} MCM. Hydrodynamic equilibrium reached.`,
      },
    ];
  }, [activeDam, simulationOutput, activeScenario, r0, r1, r2, r3]);

  // Auto-advance loop if playing
  useEffect(() => {
    let timer: any;
    if (isPlayingSequence) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= storySteps.length - 1) {
            setIsPlayingSequence(false);
            return prev;
          }
          return prev + 1;
        });
      }, 5000 / playbackSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlayingSequence, playbackSpeed, storySteps.length]);

  const activeStep = storySteps[currentStepIndex] || storySteps[0];

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4 font-mono transition-colors duration-200">
      {/* Top Controller Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-teal-500" />
            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              CINEMATIC DAM BREAK EVENT TIMELINE — {activeDam.name}
            </h3>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-sans">
            Phase-by-phase hydrodynamic collapse, shockwave surge, and 2D flood propagation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlayingSequence(!isPlayingSequence)}
            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 transition cursor-pointer shadow-md"
          >
            {isPlayingSequence ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlayingSequence ? 'PAUSE' : 'PLAY SEQUENCE'}</span>
          </button>

          <button
            onClick={() => {
              setIsPlayingSequence(false);
              setCurrentStepIndex(0);
            }}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] border border-[var(--border-color)] transition cursor-pointer"
            title="Reset Timeline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--bg-card)] text-[10px]">
            <button
              onClick={() => setPlaybackSpeed(1)}
              className={`px-2 py-1 font-bold ${playbackSpeed === 1 ? 'bg-teal-500/20 text-teal-400' : 'text-[var(--text-muted)]'}`}
            >
              1x
            </button>
            <button
              onClick={() => setPlaybackSpeed(2)}
              className={`px-2 py-1 font-bold ${playbackSpeed === 2 ? 'bg-teal-500/20 text-teal-400' : 'text-[var(--text-muted)]'}`}
            >
              2x
            </button>
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-5 gap-2">
        {storySteps.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => {
              setIsPlayingSequence(false);
              setCurrentStepIndex(idx);
            }}
            className={`p-2 rounded-xl border text-left transition cursor-pointer ${
              currentStepIndex === idx
                ? 'bg-teal-500/15 border-teal-500 text-[var(--text-primary)] shadow-sm'
                : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <div className="text-[10px] font-bold uppercase truncate">{step.title.split(':')[0]}</div>
            <div className="text-[9px] text-[var(--text-dim)] truncate">{step.hydroTime}</div>
          </button>
        ))}
      </div>

      {/* Active Step Content Display */}
      <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-2">
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] uppercase">{activeStep.title}</h4>
            <p className="text-xs text-teal-400 font-semibold mt-0.5 font-sans">{activeStep.subtitle}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase ${activeStep.statusColor}`}>
            {activeStep.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Elapsed Time</span>
            <strong className="text-teal-400">{activeStep.hydroTime}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Discharge Rate</span>
            <strong className="text-[var(--text-primary)]">{activeStep.discharge}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Frontier Extent</span>
            <strong className="text-[var(--text-primary)]">{activeStep.waveKm}</strong>
          </div>
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">Reservoir Stage</span>
            <strong className="text-cyan-400">{activeStep.stage}</strong>
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans pt-1">
          {activeStep.description}
        </p>

        <div className="p-2.5 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] text-[11px] text-[var(--text-dim)] font-mono">
          <strong className="text-teal-400 uppercase">Governing Physics:</strong> {activeStep.physics}
        </div>
      </div>
    </div>
  );
};
