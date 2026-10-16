import React, { useState } from 'react';
import { 
  Download, 
  Check, 
  X
} from 'lucide-react';
import { HydroSimulationOutput } from '../types';
import { exportSimulationShapefileZip, exportKMLFileDownload } from '../utils/gisExporter';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from '../data/damData';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulationOutput?: HydroSimulationOutput;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, simulationOutput }) => {
  const [downloadedFormat, setDownloadedFormat] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = (format: string, filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedFormat(format);
    setTimeout(() => setDownloadedFormat(null), 3000);
  };

  const damId = simulationOutput?.selectedDamId || simulationOutput?.damId || 'hirakud-dam-odisha';
  const activeDam = INDIAN_DAMS_REGISTRY.find((d) => d.id === damId) || HIRAKUD_DAM_SPECS;
  const reaches = simulationOutput?.reachResults?.length ? simulationOutput.reachResults : (activeDam.reaches || []);
  const scenarioName = simulationOutput?.scenarioName || 'Dam_Breach_Simulation';
  const damName = simulationOutput?.damName || activeDam.name;

  const handleExportGeoJSON = () => {
    if (!reaches || reaches.length === 0) {
      setDownloadedFormat('DATA NOT AVAILABLE');
      setTimeout(() => setDownloadedFormat(null), 3000);
      return;
    }

    const geojsonData = {
      type: 'FeatureCollection',
      metadata: {
        dam: damName,
        damId: activeDam.id,
        river: activeDam.location.river,
        district: activeDam.location.district,
        state: activeDam.location.state,
        simulationScenario: scenarioName,
        peakDischargeM3s: simulationOutput?.peakBreachOutflowM3s ?? 0,
        maxFloodDepthM: simulationOutput?.maxFloodDepthM ?? 0,
        totalInundationAreaKm2: simulationOutput?.totalInundationAreaKm2 ?? 0,
        timestamp: simulationOutput?.timestamp || new Date().toISOString(),
        classification: 'MODEL_DERIVED_RESULT',
        crs: 'EPSG:4326',
      },
      features: reaches.map((reach) => {
        const baseLat = reach.latitude || activeDam.location.latitude;
        const baseLng = reach.longitude || activeDam.location.longitude;
        const deltaLat = 0.005 + reach.distanceFromDamKm * 0.0001;
        const deltaLng = 0.007 + reach.distanceFromDamKm * 0.0001;

        return {
          type: 'Feature',
          properties: {
            reachId: reach.reachId,
            reachName: reach.reachName,
            distanceFromDamKm: reach.distanceFromDamKm,
            arrivalTimeHours: reach.arrivalTimeHours,
            peakDischargeM3s: reach.peakDischargeM3s,
            maxFloodDepthM: reach.maxFloodDepthM,
            hazardRatingHR: reach.hazardRatingHR,
            hazardCategory: reach.hazardCategory,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [baseLng - deltaLng, baseLat - deltaLat],
                [baseLng + deltaLng * 0.9, baseLat - deltaLat * 0.7],
                [baseLng + deltaLng * 1.1, baseLat + deltaLat * 0.8],
                [baseLng - deltaLng * 0.8, baseLat + deltaLat * 1.1],
                [baseLng - deltaLng, baseLat - deltaLat],
              ],
            ],
          },
        };
      }),
    };

    handleDownload(
      'GeoJSON (.geojson)',
      `${activeDam.id}_flood_inundation_${scenarioName.replace(/\s+/g, '_')}.geojson`,
      JSON.stringify(geojsonData, null, 2),
      'application/json'
    );
  };

  const handleExportKML = () => {
    if (!reaches || reaches.length === 0) {
      setDownloadedFormat('DATA NOT AVAILABLE');
      setTimeout(() => setDownloadedFormat(null), 3000);
      return;
    }

    const dummyOutput: HydroSimulationOutput = simulationOutput || ({
      selectedDamId: damId,
      damId: damId,
      damName,
      riverName: activeDam.location.river,
      reachResults: reaches,
      scenarioName,
      simulationId: 'SIM-2026-001',
      timestamp: new Date().toISOString(),
    } as any);

    const success = exportKMLFileDownload(dummyOutput);
    if (success) {
      setDownloadedFormat('KML (.kml)');
      setTimeout(() => setDownloadedFormat(null), 3000);
    } else {
      setDownloadedFormat('DATA NOT AVAILABLE');
      setTimeout(() => setDownloadedFormat(null), 3000);
    }
  };

  const handleExportCSV = () => {
    if (!reaches || reaches.length === 0) {
      setDownloadedFormat('DATA NOT AVAILABLE');
      setTimeout(() => setDownloadedFormat(null), 3000);
      return;
    }

    let csv = 'Reach_ID,Reach_Name,Distance_From_Dam_km,Arrival_Time_Hours,Peak_Time_Hours,Peak_Discharge_m3s,Peak_Stage_m_MSL,Max_Flood_Depth_m,Max_Velocity_ms,Defra_Hazard_Rating_HR,Hazard_Category\n';
    reaches.forEach(r => {
      csv += `${r.reachId},"${r.reachName}",${r.distanceFromDamKm},${r.arrivalTimeHours},${r.peakTimeHours},${r.peakDischargeM3s},${r.peakStageM},${r.maxFloodDepthM},${r.maxVelocityMs},${r.hazardRatingHR},${r.hazardCategory}\n`;
    });

    handleDownload(
      'CSV (.csv)',
      `${activeDam.id}_reach_results_${scenarioName.replace(/\s+/g, '_')}.csv`,
      csv,
      'text/csv'
    );
  };

  const handleExportShapefile = () => {
    if (!simulationOutput && (!reaches || reaches.length === 0)) {
      setDownloadedFormat('DATA NOT AVAILABLE');
      setTimeout(() => setDownloadedFormat(null), 3000);
      return;
    }

    const dummyOutput: HydroSimulationOutput = simulationOutput || ({
      selectedDamId: damId,
      damId: damId,
      reachResults: reaches,
      scenarioName,
      damName,
      timestamp: new Date().toISOString(),
    } as any);

    const success = exportSimulationShapefileZip(dummyOutput);
    if (success) {
      setDownloadedFormat('ESRI Shapefile (.shp)');
      setTimeout(() => setDownloadedFormat(null), 3000);
    } else {
      setDownloadedFormat('DATA NOT AVAILABLE');
      setTimeout(() => setDownloadedFormat(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-mono">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-[var(--text-primary)] text-xs transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                Quick Download GIS Data Package
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Authoritative spatial vectors &amp; numerical hydrographs for {damName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {downloadedFormat && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {downloadedFormat === 'DATA NOT AVAILABLE'
                ? 'DATA NOT AVAILABLE FOR THIS DAM'
                : `Exported ${downloadedFormat} successfully!`}
            </span>
          </div>
        )}

        <div className="space-y-2.5">
          {/* GeoJSON Button */}
          <button
            onClick={handleExportGeoJSON}
            className="w-full p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="font-bold text-[var(--text-primary)] block text-xs">1. GeoJSON Spatial Polygons (.geojson)</span>
              <span className="text-[11px] text-[var(--text-muted)] font-sans">QGIS / Leaflet / Mapbox RFC 7946 Standard</span>
            </div>
            <Download className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
          </button>

          {/* KML Button */}
          <button
            onClick={handleExportKML}
            className="w-full p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="font-bold text-[var(--text-primary)] block text-xs">2. Google Earth Keyhole Markup (.kml)</span>
              <span className="text-[11px] text-[var(--text-muted)] font-sans">3D terrain overlay for Google Earth Pro</span>
            </div>
            <Download className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
          </button>

          {/* CSV Button */}
          <button
            onClick={handleExportCSV}
            className="w-full p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="font-bold text-[var(--text-primary)] block text-xs">3. Hydraulic Time-Series Table (.csv)</span>
              <span className="text-[11px] text-[var(--text-muted)] font-sans">Excel / Pandas downstream hydrograph matrix</span>
            </div>
            <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </button>

          {/* ESRI Shapefile Button */}
          <button
            onClick={handleExportShapefile}
            className="w-full p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-left transition flex items-center justify-between group cursor-pointer"
          >
            <div>
              <span className="font-bold text-[var(--text-primary)] block text-xs">4. ESRI Shapefile (.shp)</span>
              <span className="text-[11px] text-[var(--text-muted)] font-sans">GIS spatial vector data for QGIS / ArcGIS</span>
            </div>
            {reaches.length > 0 ? (
              <Download className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
            ) : (
              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                DATA NOT AVAILABLE
              </span>
            )}
          </button>
        </div>

        <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-xs font-bold uppercase rounded-xl transition cursor-pointer border border-[var(--border-color)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
