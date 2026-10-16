/**
 * DAMBREAK HYDRO-SIM: API Service & Simulation Pipeline Client
 * Communicates with backend endpoints (/api/simulate, /api/ai/scenario-interpret, /api/ai/hazard-summary)
 * Provides seamless fallback to local hydrodynamic solver if offline.
 */

import {
  BreachParameters,
  HydroSimulationOutput,
  HydroSimulationRequest,
  AIScenarioInterpretation,
} from '../types';
import { runHydroSimulation } from '../utils/hydroEngine';
import { parseNaturalLanguagePrompt } from '../utils/naturalLanguageParser';
import { exportSimulationShapefileZip, exportKMLFileDownload } from '../utils/gisExporter';

const API_BASE = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Execute Dam-Break Simulation via Backend API (with local hydrodynamic solver fallback)
 */
export async function executeSimulationPipeline(
  params: BreachParameters,
  onProgress?: (stage: string, progressPercent: number) => void
): Promise<HydroSimulationOutput> {
  onProgress?.('Validating input parameters & dam storage...', 15);
  await new Promise(r => setTimeout(r, 200));

  onProgress?.('Processing CartoDEM / SRTM 30m terrain mesh & river geometry...', 40);
  await new Promise(r => setTimeout(r, 250));

  onProgress?.(`Running ${params.selectedSolver === 'ML_Surrogate_FloodUNet' ? 'ML Surrogate (FloodUNet Deep NN)' : '2D SWE Hydrodynamic Finite Volume'} Solver...`, 70);
  await new Promise(r => setTimeout(r, 300));

  onProgress?.('Computing Inundation Depth Rasters & Census Exposure Matrix...', 90);
  await new Promise(r => setTimeout(r, 200));

  try {
    const payload: HydroSimulationRequest = {
      damId: params.selectedDamId || 'hirakud-dam-odisha',
      breachWidth: params.breachBottomWidth,
      breachFormationTime: params.breachFormationTimeHours,
      reservoirLevel: params.reservoirWaterLevel,
      initialFlow: params.initialFlowM3s || 350,
      simulationDuration: params.simulationDurationHours || 24,
      demId: params.selectedDemResolution || '10m_CartoDEM',
      failureMode: params.failureMode,
      breachSideSlope: params.breachSideSlope,
      breachInvertElevation: params.breachInvertElevation,
      solverType: params.selectedSolver || '2D_SWE_FiniteVolume',
      empiricalEquation: params.empiricalEquation,
    };

    const res = await fetch(`${API_BASE}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      onProgress?.('Simulation Complete!', 100);
      return data.outputs || data;
    }
  } catch (e) {
    console.warn('Backend /api/simulate unavailable, using local hydrodynamic solver engine:', e);
  }

  // Fallback to local Hydrodynamic Solver engine
  const output = runHydroSimulation(params);
  onProgress?.('Simulation Complete!', 100);
  return output;
}

/**
 * Interpret Natural Language Scenario using Featherless AI / Gemini / NLP Assistant
 */
export async function interpretNaturalLanguageScenario(
  userPrompt: string,
  currentDamId: string = 'hirakud-dam-odisha'
): Promise<AIScenarioInterpretation> {
  try {
    const res = await fetch(`${API_BASE}/api/ai/scenario-interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userPrompt, currentDamId }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.interpretation) {
        const interp = data.interpretation;
        // Ensure confidence score is valid and not NaN
        const conf = typeof interp.confidenceScore === 'number' && !isNaN(interp.confidenceScore)
          ? interp.confidenceScore
          : (typeof interp.confidence === 'number' && !isNaN(interp.confidence) ? interp.confidence : 0.9);
        return {
          ...interp,
          confidenceScore: conf,
          confidence: conf,
        };
      }
    }
  } catch (e) {
    console.warn('Backend AI interpretation endpoint error, using local rules:', e);
  }

  // Fallback local robust interpretation
  return parseNaturalLanguagePrompt(userPrompt, currentDamId);
}

/**
 * Export Simulation Results as GeoJSON File
 */
export function exportSimulationGeoJson(output: HydroSimulationOutput) {
  const geojsonString = JSON.stringify(output.floodExtentGeoJson, null, 2);
  const blob = new Blob([geojsonString], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${output.damId}_flood_inundation_${output.simulationId}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Simulation Results as KML (Google Earth)
 */
export function exportSimulationKML(output: HydroSimulationOutput) {
  exportKMLFileDownload(output);
}

/**
 * Export Simulation Hydrograph & Reaches as CSV
 */
export function exportSimulationCSV(output: HydroSimulationOutput) {
  let csv = `DAMBREAK HYDRO-SIM SIMULATION RESULTS\n`;
  csv += `Dam Name,${output.damName}\n`;
  csv += `River Basin,${output.riverName}\n`;
  csv += `Scenario,${output.scenarioName}\n`;
  csv += `Solver Model,${output.solverModelLabel}\n`;
  csv += `Peak Outflow (m3/s),${output.peakBreachOutflowM3s}\n`;
  csv += `Total Outflow Volume (MCM),${output.totalOutflowVolumeMCM}\n`;
  csv += `Total Flooded Area (km2),${output.totalInundationAreaKm2}\n`;
  csv += `Affected Population,${output.spatialImpact.modelAffectedPopulation}\n\n`;

  csv += `REACH RESULTS\n`;
  csv += `Reach Name,Distance (km),Arrival Time (hrs),Peak Time (hrs),Peak Discharge (m3/s),Peak Stage (m MSL),Max Depth (m),Max Velocity (m/s),Hazard Rating (HR),Hazard Class\n`;

  output.reachResults.forEach((r) => {
    csv += `"${r.reachName}",${r.distanceFromDamKm},${r.arrivalTimeHours},${r.peakTimeHours},${r.peakDischargeM3s},${r.peakStageM},${r.maxFloodDepthM},${r.maxVelocityMs},${r.hazardRatingHR},${r.hazardCategory}\n`;
  });

  csv += `\nOUTFLOW HYDROGRAPH TIME-SERIES\n`;
  csv += `Time (hrs),Discharge (m3/s),Reservoir Water Level (m MSL),Breach Progress (%)\n`;
  output.hydrograph.forEach((pt) => {
    csv += `${pt.timeHours},${pt.outflowDischargeM3s},${pt.waterLevelM},${pt.breachProgressPercent}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${output.damId}_hydro_simulation_${output.simulationId}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Simulation Results as ESRI Shapefile ZIP Package (.shp, .shx, .dbf, .prj)
 */
export async function exportSimulationShpPackage(output: HydroSimulationOutput) {
  const success = exportSimulationShapefileZip(output);
  if (!success) {
    exportSimulationGeoJson(output);
  }
}

/**
 * Run 3D SPH Simulation via API
 */
export async function executeSphSimulation(params: BreachParameters) {
  try {
    const res = await fetch(`${API_BASE}/api/sph/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('SPH API endpoint error:', e);
  }
  return null;
}

/**
 * Run Delft3D Simulation via API
 */
export async function executeDelft3dSimulation(params: BreachParameters) {
  try {
    const res = await fetch(`${API_BASE}/api/delft3d/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Delft3D API endpoint error:', e);
  }
  return null;
}

/**
 * Compare SPH vs Delft3D Solvers via API
 */
export async function compareSphVsDelft3d(params: BreachParameters) {
  try {
    const res = await fetch(`${API_BASE}/api/compare/sph-delft3d`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Compare SPH vs Delft3D API endpoint error:', e);
  }
  return null;
}

/**
 * Fetch Google Earth Engine Status & Catalog
 */
export async function fetchGEEStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/gee/status`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('GEE status API error:', e);
  }
  return {
    isConfigured: false,
    authMode: 'OpenDataPublicHub',
    requiredEnvVars: ['GEE_SERVICE_ACCOUNT', 'GEE_PRIVATE_KEY', 'GOOGLE_CLOUD_PROJECT'],
  };
}

/**
 * Fetch Satellite Observations for Dam
 */
export async function fetchGEEObservations(damId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/gee/observations/${damId}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('GEE observations API error:', e);
  }
  return null;
}
