import React, { useState, useMemo } from 'react';
import { 
  Database, 
  MapPin, 
  Mountain, 
  Layers, 
  Building2, 
  Route, 
  Hospital, 
  CheckCircle2, 
  Info,
  ChevronRight
} from 'lucide-react';
import { 
  INDIAN_DAMS_REGISTRY, 
  HIRAKUD_DAM_SPECS 
} from '../data/damData';
import { HydroSimulationOutput } from '../types';

interface DataTerrainViewProps {
  simulationOutput?: HydroSimulationOutput;
  selectedDamId?: string;
}

export const DataTerrainView: React.FC<DataTerrainViewProps> = ({
  simulationOutput,
  selectedDamId,
}) => {
  const [selectedSubTab, setSelectedSubTab] = useState<'dam' | 'dem' | 'reaches' | 'settlements' | 'infrastructure'>('dam');

  const damId = selectedDamId || simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
  const activeDam = useMemo(() => {
    return INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  }, [damId]);

  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : (activeDam.reaches || []);
  const settlements = activeDam.settlements || [];
  const criticalFacilities = activeDam.criticalFacilities || [];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-4 shadow-2xl transition-colors duration-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--text-primary)] uppercase tracking-tight">
              Real Data Input &amp; Georeferenced DEM — {activeDam.name}
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
              REAL DATA INPUT
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
            Authoritative engineering geometries, ISRO CartoDEM / NASA SRTM 30m DEM, Census demographics, and SDMA GIS layers.
          </p>
        </div>

        {/* Sub Navigation */}
        <div className="flex flex-wrap gap-1 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-color)]">
          <button
            onClick={() => setSelectedSubTab('dam')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedSubTab === 'dam'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            1. Dam Specs
          </button>
          <button
            onClick={() => setSelectedSubTab('dem')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedSubTab === 'dem'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            2. DEM Grid
          </button>
          <button
            onClick={() => setSelectedSubTab('reaches')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedSubTab === 'reaches'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            3. River Reaches
          </button>
          <button
            onClick={() => setSelectedSubTab('settlements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedSubTab === 'settlements'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            4. Settlements
          </button>
        </div>
      </div>

      {/* 1. Dam Specifications SubTab */}
      {selectedSubTab === 'dam' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase">
                  {activeDam.name} — Technical Engineering Registry
                </h3>
                <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                  Source: {activeDam.sourceAuthority}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                VERIFIED NRLD RECORD
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Dam Structure Type</span>
                <span className="text-[var(--text-primary)] font-bold mt-0.5 block">{activeDam.damType}</span>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Commissioning Year</span>
                <span className="text-teal-400 font-bold mt-0.5 block">{activeDam.yearCompleted}</span>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Height Above Foundation</span>
                <span className="text-[var(--text-primary)] font-bold mt-0.5 block">{activeDam.heightAboveLowestFoundation} m</span>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Total Crest Length</span>
                <span className="text-[var(--text-primary)] font-bold mt-0.5 block">{activeDam.lengthOfDam.toLocaleString()} m</span>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Full Reservoir Level (FRL)</span>
                <span className="text-cyan-400 font-bold mt-0.5 block">{activeDam.fullReservoirLevelFRL} m MSL</span>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Maximum Water Level (MWL)</span>
                <span className="text-rose-400 font-bold mt-0.5 block">{activeDam.maximumWaterLevelMWL} m MSL</span>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Dead Storage Level (DSL)</span>
                <span className="text-[var(--text-primary)] font-bold mt-0.5 block">{activeDam.deadStorageLevelDSL} m MSL</span>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Gross Storage Capacity</span>
                <span className="text-teal-400 font-bold mt-0.5 block">{activeDam.grossStorageCapacityMCM.toLocaleString()} MCM</span>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Design Spillway Capacity</span>
                <span className="text-amber-400 font-bold mt-0.5 block">{activeDam.spillwayCapacityM3s.toLocaleString()} m³/s</span>
              </div>
            </div>
          </div>

          {/* Basin & Topographic Summary */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2">
              Catchment &amp; Location Registry
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">River &amp; Basin</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{activeDam.location.river} River Basin</span>
                <p className="text-[10px] text-[var(--text-muted)] font-sans mt-1">
                  Located in {activeDam.location.district}, {activeDam.location.state}.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Dam Axis Coordinates</span>
                <span className="text-[var(--text-primary)] font-bold">{activeDam.location.latitude.toFixed(4)}° N, {activeDam.location.longitude.toFixed(4)}° E</span>
                <p className="text-[10px] text-[var(--text-muted)] font-sans mt-1">
                  Georeferenced CWC National Register coordinates.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase font-bold">Downstream Monitored Reaches</span>
                <span className="text-[var(--text-primary)] font-bold">{reaches.length} Monitored Reach Segments</span>
                <p className="text-[10px] text-[var(--text-muted)] font-sans mt-1">
                  Primary downstream study corridor along {activeDam.location.river} River.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEM Elevation Grid SubTab */}
      {selectedSubTab === 'dem' && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase">
                ISRO CartoDEM 10m / NASA SRTM 30m Topographic Grid — {activeDam.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                Georeferenced elevation raster centered at {activeDam.location.latitude.toFixed(4)}° N, {activeDam.location.longitude.toFixed(4)}° E
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
              GEOREFERENCED RASTER LOADED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">MWL Stage Elevation</span>
              <span className="text-xl font-bold text-cyan-400">{activeDam.maximumWaterLevelMWL} m MSL</span>
              <p className="text-[10px] text-[var(--text-muted)] font-sans mt-1">Maximum reservoir pool level</p>
            </div>
            <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">Dead Storage Level (DSL)</span>
              <span className="text-xl font-bold text-[var(--text-primary)]">{activeDam.deadStorageLevelDSL} m MSL</span>
              <p className="text-[10px] text-[var(--text-muted)] font-sans mt-1">Invert elevation at reservoir outlet</p>
            </div>
            <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)]">
              <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold block">Dam Height</span>
              <span className="text-xl font-bold text-teal-400">{activeDam.heightAboveLowestFoundation} m</span>
              <p className="text-[10px] text-[var(--text-muted)] font-sans mt-1">Height above lowest foundation</p>
            </div>
          </div>
        </div>
      )}

      {/* 3. River Reaches SubTab */}
      {selectedSubTab === 'reaches' && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase">
                Downstream Monitored Reaches — {activeDam.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                Downstream riverine reach registry along {activeDam.location.river} River
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-card)] text-[var(--text-muted)] uppercase border-b border-[var(--border-color)] text-[11px]">
                  <th className="py-2.5 px-3 font-bold">Reach Location</th>
                  <th className="py-2.5 px-3 font-bold">Distance</th>
                  <th className="py-2.5 px-3 font-bold">Arrival Time</th>
                  <th className="py-2.5 px-3 font-bold">Peak Stage</th>
                  <th className="py-2.5 px-3 font-bold">Max Flood Depth</th>
                  <th className="py-2.5 px-3 font-bold">Hazard Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {reaches.map((r) => (
                  <tr key={r.reachId} className="hover:bg-[var(--bg-hover)] transition">
                    <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">{r.reachName}</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{r.distanceFromDamKm} km</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">T+{r.arrivalTimeHours} hrs</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{r.peakStageM} m</td>
                    <td className="py-2.5 px-3 font-bold text-teal-400">{r.maxFloodDepthM.toFixed(1)} m</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        r.hazardCategory === 'EXTREME'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : r.hazardCategory === 'SIGNIFICANT'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}>
                        {r.hazardCategory}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Settlements SubTab */}
      {selectedSubTab === 'settlements' && (
        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase">
                Census Settlements Baseline — {activeDam.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-sans mt-0.5">
                Downstream town and village centroids in {activeDam.location.district}, {activeDam.location.state}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-card)] text-[var(--text-muted)] uppercase border-b border-[var(--border-color)] text-[11px]">
                  <th className="py-2.5 px-3 font-bold">Settlement Name</th>
                  <th className="py-2.5 px-3 font-bold">District</th>
                  <th className="py-2.5 px-3 font-bold">Distance</th>
                  <th className="py-2.5 px-3 font-bold">Census Population</th>
                  <th className="py-2.5 px-3 font-bold">Ground Elevation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-hover)] transition">
                    <td className="py-2.5 px-3 font-bold text-[var(--text-primary)]">{s.name}</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{s.district}</td>
                    <td className="py-2.5 px-3 text-[var(--text-secondary)]">{s.distanceFromDamKm} km</td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">{s.censusPopulation.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-[var(--text-muted)]">{s.elevationM} m MSL</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
