import React, { useState, useMemo } from 'react';
import { 
  Waves, 
  ShieldAlert, 
  Play, 
  Maximize2, 
  CheckCircle2, 
  Satellite, 
  Compass,
  Cpu,
  Download
} from 'lucide-react';
import { CommandIconBadge } from './CommandIcons';
import { NavigationTab, HydroSimulationOutput } from '../types';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

interface CinematicHeroBannerProps {
  simulationOutput: HydroSimulationOutput;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenExportModal?: () => void;
  onOpenStoryModal?: () => void;
}

export const CinematicHeroBanner: React.FC<CinematicHeroBannerProps> = ({
  simulationOutput,
  onSelectTab,
  onOpenExportModal,
  onOpenStoryModal,
}) => {
  const [activeVisualMode, setActiveVisualMode] = useState<'landscape' | 'surge' | 'satellite' | 'dem'>('landscape');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const damId = simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
  const activeDam = useMemo(() => {
    return INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  }, [damId]);

  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : (activeDam.reaches || []);
  const r1 = reaches[1] || reaches[0] || { reachName: 'Downstream Reach', arrivalTimeHours: 0.8 };

  const visualAssets = {
    landscape: {
      src: '/src/assets/images/hero_dam_landscape_1787761004568.jpg',
      title: `${activeDam.name} Axis & Reservoir Pool`,
      subtitle: `Authoritative CWC Data • ${activeDam.location.river} River Basin Topography`,
      badge: 'BATHYMETRY & DAM AXIS',
      telemetry: `MWL Level: ${activeDam.maximumWaterLevelMWL} m MSL • Gross Storage: ${activeDam.grossStorageCapacityMCM.toLocaleString()} MCM`,
    },
    surge: {
      src: '/src/assets/images/dambreak_surge_cinematic_1787761022360.jpg',
      title: `Breach Hydrodynamic Wave Surge (Qp ${simulationOutput.peakBreachOutflowM3s.toLocaleString()} m³/s)`,
      subtitle: 'Empirical Breach Formulation (Froehlich 2008 + Saint-Venant 2D SWE)',
      badge: 'CATASTROPHIC WAVE PROPAGATION',
      telemetry: `Frontier Speed: ${simulationOutput.maxFlowVelocityMs.toFixed(1)} m/s • Wave Front: ${simulationOutput.waveFrontFrontierKm.toFixed(0)} km`,
    },
    satellite: {
      src: '/src/assets/images/satellite_flood_inundation_1787761038320.jpg',
      title: `Sentinel-1 SAR Satellite Earth Observation — ${activeDam.name}`,
      subtitle: `Georeferenced Radar Backscatter • ${activeDam.location.district}, ${activeDam.location.state}`,
      badge: 'LIVE SENTINEL-1 SAR PASS',
      telemetry: `Inundated Area: ${simulationOutput.totalInundationAreaKm2.toFixed(1)} km² • Exposed Pop: ${simulationOutput.spatialImpact?.modelAffectedPopulation ? simulationOutput.spatialImpact.modelAffectedPopulation.toLocaleString() : 'N/A'}`,
    },
    dem: {
      src: '/src/assets/images/dem_terrain_mesh_3d_1787761054678.jpg',
      title: 'High-Resolution Digital Elevation Model (ISRO CartoDEM 10m)',
      subtitle: `3D Finite Volume Triangular Mesh • ${activeDam.location.river} Valley Elevation Profile`,
      badge: '3D TERRAIN MESH',
      telemetry: `Height: ${activeDam.heightAboveLowestFoundation} m • Hydraulic Head: ${simulationOutput.maxFloodDepthM.toFixed(1)} m`,
    },
  };

  const currentAsset = visualAssets[activeVisualMode];

  return (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl transition-colors duration-200 font-mono">
      {/* Visual Image Viewport Container */}
      <div className="relative w-full h-[280px] sm:h-[320px] overflow-hidden group">
        <img
          src={currentAsset.src}
          alt={currentAsset.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-panel)] via-black/40 to-transparent" />

        {/* Top Badges & Mode Controls */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-teal-950/90 text-teal-400 border border-teal-500/40 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
              {currentAsset.badge}
            </span>
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-700/50 text-[10px] font-bold backdrop-blur-md">
              {activeDam.name} ({activeDam.location.river} River)
            </span>
          </div>

          {/* Mode Selector Buttons */}
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 p-1 rounded-xl text-[10px]">
            <button
              onClick={() => setActiveVisualMode('landscape')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeVisualMode === 'landscape' ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveVisualMode('surge')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeVisualMode === 'surge' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Surge Wave
            </button>
            <button
              onClick={() => setActiveVisualMode('satellite')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeVisualMode === 'satellite' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setActiveVisualMode('dem')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                activeVisualMode === 'dem' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              3D DEM
            </button>
          </div>
        </div>

        {/* Bottom Hero Overlay Information */}
        <div className="absolute bottom-3 left-4 right-4 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight drop-shadow-md uppercase">
              {currentAsset.title}
            </h2>
            <p className="text-xs text-slate-200 font-sans drop-shadow-sm">{currentAsset.subtitle}</p>
            <div className="text-[11px] text-teal-300 font-bold drop-shadow-sm pt-0.5">{currentAsset.telemetry}</div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenStoryModal && (
              <button
                onClick={onOpenStoryModal}
                className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-lg"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Storyline</span>
              </button>
            )}
            <button
              onClick={() => onSelectTab('sim-3d')}
              className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold uppercase flex items-center gap-1.5 transition cursor-pointer backdrop-blur-md shadow-lg"
            >
              <Maximize2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Full 3D View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Footer Toolbar Badges */}
      <div className="p-3 bg-[var(--bg-card)] border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <CommandIconBadge type="dam" label={activeDam.name} size="sm" />
          <CommandIconBadge type="river" label={`${activeDam.location.river} River Valley`} size="sm" />
          <CommandIconBadge type="depth" label={`Max Depth: ${simulationOutput.maxFloodDepthM.toFixed(1)}m`} size="sm" />
          <CommandIconBadge type="simulation" label="2D Saint-Venant SWE" size="sm" active />
          <CommandIconBadge type="onnx" label="Surrogate FloodUNet" size="sm" />
          <CommandIconBadge type="kml" label="KML / SHP Ready" size="sm" />
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span>{r1.reachName} Arrival:</span>
          <span className="text-amber-400 font-bold">T+{r1.arrivalTimeHours}h</span>
          <span className="text-[var(--text-dim)]">•</span>
          <span>Risk Level:</span>
          <span className="text-rose-400 font-bold">EXTREME (HR &gt; 2.5)</span>
        </div>
      </div>
    </div>
  );
};
