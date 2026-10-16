/**
 * DAMBREAK HYDRO-SIM: Centralized API Service for Polished Frontend
 * Connects directly to existing FastAPI backend endpoints via Vite /api proxy.
 * Strict adherence to backend schemas & zero fake data.
 */

import { extractErrorMessage } from "../utils/errorParser.js";

/**
 * Fetch all registered dams
 */
export async function getDams() {
  const res = await fetch("/api/dams");
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }
  return await res.json();
}

/**
 * Fetch details for a specific dam by ID
 */
export async function getDamById(damId) {
  const res = await fetch(`/api/dams/${encodeURIComponent(damId)}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }
  return await res.json();
}

/**
 * Run full 2D SWE / Hydrodynamic simulation
 */
export async function runSimulation(params = {}) {
  const payload = {
    selectedDamId: params.selectedDamId || "hirakud-dam-odisha",
    failureMode: params.failureMode || "overtopping",
    reservoirWaterLevel: Number(params.reservoirWaterLevel ?? 192.94),
    waterDepthAboveInvert: Number(params.waterDepthAboveInvert ?? 35.0),
    reservoirVolumeAtBreachMCM: Number(params.reservoirVolumeAtBreachMCM ?? 5896.0),
    breachBottomWidth: Number(params.breachBottomWidth ?? 160.0),
    breachSideSlope: Number(params.breachSideSlope ?? 1.0),
    breachAverageWidth: Number(params.breachAverageWidth ?? 195.0),
    breachInvertElevation: Number(params.breachInvertElevation ?? 157.94),
    breachFormationTimeHours: Number(params.breachFormationTimeHours ?? 1.85),
    initialFlowM3s: Number(params.initialFlowM3s ?? 350.0),
    simulationDurationHours: Number(params.simulationDurationHours ?? 24.0),
    empiricalEquation: params.empiricalEquation || "Froehlich_2008",
    selectedDemResolution: params.selectedDemResolution || "10m_CartoDEM",
    selectedSolver: params.selectedSolver || "2D_SWE_FiniteVolume",
  };

  const res = await fetch("/api/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }

  return await res.json();
}

/**
 * Run scenario by ID
 */
export async function runScenarioById(scenarioId, params = {}) {
  const res = await fetch(`/api/scenarios/${encodeURIComponent(scenarioId)}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }

  return await res.json();
}

/**
 * Interpret Natural Language Scenario using Featherless AI / Gemini / Rule engine
 */
export async function interpretScenario(userPrompt, currentDamId = "hirakud-dam-odisha") {
  const res = await fetch("/api/ai/scenario-interpret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userPrompt, currentDamId }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }

  return await res.json();
}

/**
 * Generate AI Disaster Mitigation Hazard Summary
 */
export async function generateHazardSummary(simulationOutput) {
  const res = await fetch("/api/ai/hazard-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(simulationOutput),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }

  const data = await res.json();
  return data.summary || data;
}

/**
 * Execute 3D SPH DualSPHysics Navier-Stokes simulation
 */
export async function runSphSimulation(params = {}) {
  const payload = {
    selectedDamId: params.selectedDamId || "hirakud-dam-odisha",
    failureMode: params.failureMode || "overtopping",
    reservoirWaterLevel: Number(params.reservoirWaterLevel ?? 192.94),
    waterDepthAboveInvert: Number(params.waterDepthAboveInvert ?? 35.0),
    reservoirVolumeAtBreachMCM: Number(params.reservoirVolumeAtBreachMCM ?? 5896.0),
    breachBottomWidth: Number(params.breachBottomWidth ?? 160.0),
    breachSideSlope: Number(params.breachSideSlope ?? 1.0),
    breachAverageWidth: Number(params.breachAverageWidth ?? 195.0),
    breachInvertElevation: Number(params.breachInvertElevation ?? 157.94),
    breachFormationTimeHours: Number(params.breachFormationTimeHours ?? 1.85),
    initialFlowM3s: Number(params.initialFlowM3s ?? 350.0),
    simulationDurationHours: Number(params.simulationDurationHours ?? 24.0),
    empiricalEquation: params.empiricalEquation || "Froehlich_2008",
    selectedDemResolution: params.selectedDemResolution || "10m_CartoDEM",
    selectedSolver: "3D_SPH_DualSPHysics",
  };

  const res = await fetch("/api/sph/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }

  return await res.json();
}

/**
 * Execute Delft3D-FM 2D Flexible Mesh simulation
 */
export async function runDelft3dSimulation(params = {}) {
  const payload = {
    selectedDamId: params.selectedDamId || "hirakud-dam-odisha",
    failureMode: params.failureMode || "overtopping",
    reservoirWaterLevel: Number(params.reservoirWaterLevel ?? 192.94),
    waterDepthAboveInvert: Number(params.waterDepthAboveInvert ?? 35.0),
    reservoirVolumeAtBreachMCM: Number(params.reservoirVolumeAtBreachMCM ?? 5896.0),
    breachBottomWidth: Number(params.breachBottomWidth ?? 160.0),
    breachSideSlope: Number(params.breachSideSlope ?? 1.0),
    breachAverageWidth: Number(params.breachAverageWidth ?? 195.0),
    breachInvertElevation: Number(params.breachInvertElevation ?? 157.94),
    breachFormationTimeHours: Number(params.breachFormationTimeHours ?? 1.85),
    initialFlowM3s: Number(params.initialFlowM3s ?? 350.0),
    simulationDurationHours: Number(params.simulationDurationHours ?? 24.0),
    empiricalEquation: params.empiricalEquation || "Froehlich_2008",
    selectedDemResolution: params.selectedDemResolution || "10m_CartoDEM",
    selectedSolver: "Delft3D_FM_2D",
  };

  const res = await fetch("/api/delft3d/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }

  return await res.json();
}

/**
 * Compare 3D SPH vs Delft3D-FM Flexible Mesh
 */
export async function compareSphVsDelft3d(params = {}) {
  const payload = {
    selectedDamId: params.selectedDamId || "hirakud-dam-odisha",
    failureMode: params.failureMode || "overtopping",
    reservoirWaterLevel: Number(params.reservoirWaterLevel ?? 192.94),
    waterDepthAboveInvert: Number(params.waterDepthAboveInvert ?? 35.0),
    reservoirVolumeAtBreachMCM: Number(params.reservoirVolumeAtBreachMCM ?? 5896.0),
    breachBottomWidth: Number(params.breachBottomWidth ?? 160.0),
    breachSideSlope: Number(params.breachSideSlope ?? 1.0),
    breachAverageWidth: Number(params.breachAverageWidth ?? 195.0),
    breachInvertElevation: Number(params.breachInvertElevation ?? 157.94),
    breachFormationTimeHours: Number(params.breachFormationTimeHours ?? 1.85),
    initialFlowM3s: Number(params.initialFlowM3s ?? 350.0),
    simulationDurationHours: Number(params.simulationDurationHours ?? 24.0),
    empiricalEquation: params.empiricalEquation || "Froehlich_2008",
    selectedDemResolution: params.selectedDemResolution || "10m_CartoDEM",
    selectedSolver: "SPH_vs_Delft3D_Comparison",
  };

  const res = await fetch("/api/compare/sph-delft3d", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }

  return await res.json();
}

/**
 * Fetch Google Earth Engine configuration status
 */
export async function getGeeStatus() {
  const res = await fetch("/api/gee/status");
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }
  return await res.json();
}

/**
 * Fetch Google Earth Engine Sentinel Satellite observations for a dam
 */
export async function getGeeObservations(damId) {
  const res = await fetch(`/api/gee/observations/${encodeURIComponent(damId)}`);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errData, res.status));
  }
  return await res.json();
}

/**
 * Helper to trigger a real file download in the browser from a Blob
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export Inundation GeoJSON via backend endpoint and trigger real download
 */
export async function downloadGeoJson(simulationOutput) {
  const res = await fetch("/api/export/geojson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(simulationOutput),
  });

  if (!res.ok) {
    throw new Error(`GeoJSON export failed with HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const filename = `${simulationOutput.damId || "dam"}_inundation_${simulationOutput.simulationId || Date.now()}.geojson`;
  downloadBlob(blob, filename);
  return true;
}

/**
 * Export Google Earth KML via backend endpoint and trigger real download
 */
export async function downloadKml(simulationOutput) {
  const res = await fetch("/api/export/kml", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(simulationOutput),
  });

  if (!res.ok) {
    throw new Error(`KML export failed with HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const filename = `${simulationOutput.damId || "dam"}_inundation_${simulationOutput.simulationId || Date.now()}.kml`;
  downloadBlob(blob, filename);
  return true;
}

/**
 * Export Hydrograph & Reach CSV via backend endpoint and trigger real download
 */
export async function downloadCsv(simulationOutput) {
  const res = await fetch("/api/export/csv", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(simulationOutput),
  });

  if (!res.ok) {
    throw new Error(`CSV export failed with HTTP ${res.status}`);
  }

  const blob = await res.blob();
  const filename = `${simulationOutput.damId || "dam"}_hydro_data_${simulationOutput.simulationId || Date.now()}.csv`;
  downloadBlob(blob, filename);
  return true;
}

/**
 * Export ESRI Shapefile Package via backend endpoint and trigger real download
 */
export async function downloadShpPackage(simulationOutput) {
  const res = await fetch("/api/export/shp-package", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(simulationOutput),
  });

  if (!res.ok) {
    throw new Error(`Shapefile package export failed with HTTP ${res.status}`);
  }

  const data = await res.json();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const filename = `${simulationOutput.damId || "dam"}_shp_package_${simulationOutput.simulationId || Date.now()}.json`;
  downloadBlob(blob, filename);
  return true;
}

/**
 * Trigger text/markdown document download in browser
 */
export function downloadTextDocument(content, filename, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
  return true;
}
