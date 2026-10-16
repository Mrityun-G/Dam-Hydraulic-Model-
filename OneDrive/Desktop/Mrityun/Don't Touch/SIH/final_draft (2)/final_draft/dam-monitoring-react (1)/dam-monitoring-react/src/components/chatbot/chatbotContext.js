/**
 * Flow Guard AI: Context Extractor
 * Extracts verified live state from active route, selected dam, model parameters, and simulation results.
 * Strictly avoids inventing or hallucinating values.
 */

import { INDIAN_DAMS_REGISTRY } from "../../data/damData.js";

export function getActiveDamDetails(selectedDamId) {
  return INDIAN_DAMS_REGISTRY.find((d) => d.id === selectedDamId) || INDIAN_DAMS_REGISTRY[0];
}

export function buildChatbotContext({
  selectedDamId,
  modelParameters,
  simulationResult,
  activeRoute,
  themeMode,
}) {
  const dam = getActiveDamDetails(selectedDamId || modelParameters?.selectedDamId);
  const hasSim = Boolean(
    simulationResult && (
      simulationResult.peakDischargeM3s !== undefined ||
      simulationResult.peakBreachOutflowM3s !== undefined ||
      simulationResult.maxDischargeM3s !== undefined ||
      simulationResult.status === "completed"
    )
  );

  const currentRouteName = activeRoute
    ? `${activeRoute.category || ""} / ${activeRoute.feature || ""}`
    : "Home Dashboard";

 return {
    dam: {
      id: dam?.id || "N/A",
      name: dam?.name || "N/A",
      state: dam?.location?.state || "N/A",
      district: dam?.location?.district || "N/A",
      river: dam?.location?.river || "N/A",
      basin: dam?.location?.basin || "N/A",
      damType: dam?.damType || "N/A",
      completionYear: dam?.completionYear || "N/A",
      heightM: dam?.heightAboveLowestFoundation !== undefined ? `${dam.heightAboveLowestFoundation} m` : "N/A",
      crestLengthM: dam?.crestLengthM !== undefined ? `${dam.crestLengthM} m` : "N/A",
      frl: dam?.fullReservoirLevelFRL !== undefined ? `${dam.fullReservoirLevelFRL} m MSL` : "N/A",
      mwl: dam?.maximumWaterLevelMWL !== undefined ? `${dam.maximumWaterLevelMWL} m MSL` : "N/A",
      dsl: dam?.deadStorageLevelDSL !== undefined ? `${dam.deadStorageLevelDSL} m MSL` : "N/A",
      grossStorageMCM: dam?.grossStorageCapacityMCM !== undefined ? `${dam.grossStorageCapacityMCM} MCM` : "N/A",
      effectiveStorageMCM: dam?.effectiveStorageCapacityMCM !== undefined ? `${dam.effectiveStorageCapacityMCM} MCM` : "N/A",
      spillwayCapacityM3s: dam?.spillwayCapacityM3s !== undefined ? `${dam.spillwayCapacityM3s} m³/s` : "N/A",
      reachesCount: dam?.reaches?.length || 0,
      settlementsCount: dam?.settlements?.length || 0,
      facilitiesCount: dam?.criticalFacilities?.length || 0,
    },
    inputs: {
      failureMode: modelParameters?.failureMode || "N/A",
      reservoirWaterLevel: modelParameters?.reservoirWaterLevel !== undefined ? `${modelParameters.reservoirWaterLevel} m MSL` : "N/A",
      waterDepthAboveInvert: modelParameters?.waterDepthAboveInvert !== undefined ? `${modelParameters.waterDepthAboveInvert} m` : "N/A",
      reservoirVolumeAtBreachMCM: modelParameters?.reservoirVolumeAtBreachMCM !== undefined ? `${modelParameters.reservoirVolumeAtBreachMCM} MCM` : "N/A",
      breachBottomWidth: modelParameters?.breachBottomWidth !== undefined ? `${modelParameters.breachBottomWidth} m` : "N/A",
      breachAverageWidth: modelParameters?.breachAverageWidth !== undefined ? `${modelParameters.breachAverageWidth} m` : "N/A",
      breachSideSlope: modelParameters?.breachSideSlope !== undefined ? `${modelParameters.breachSideSlope}:1 (H:V)` : "N/A",
      breachInvertElevation: modelParameters?.breachInvertElevation !== undefined ? `${modelParameters.breachInvertElevation} m MSL` : "N/A",
      breachFormationTimeHours: modelParameters?.breachFormationTimeHours !== undefined ? `${modelParameters.breachFormationTimeHours} hrs` : "N/A",
      initialFlowM3s: modelParameters?.initialFlowM3s !== undefined ? `${modelParameters.initialFlowM3s} m³/s` : "N/A",
      simulationDurationHours: modelParameters?.simulationDurationHours !== undefined ? `${modelParameters.simulationDurationHours} hrs` : "N/A",
      empiricalEquation: modelParameters?.empiricalEquation || "N/A",
      selectedDemResolution: modelParameters?.selectedDemResolution || "N/A",
      selectedSolver: modelParameters?.selectedSolver || "N/A",
    },
    simulation: hasSim ? {
      hasRun: true,
      peakDischargeM3s: (simulationResult.peakDischargeM3s ?? simulationResult.peakBreachOutflowM3s ?? simulationResult.maxDischargeM3s) !== undefined 
        ? `${simulationResult.peakDischargeM3s ?? simulationResult.peakBreachOutflowM3s ?? simulationResult.maxDischargeM3s} m³/s` 
        : "N/A",
      timeToPeakHours: (simulationResult.timeToPeakHours ?? (simulationResult.timeToPeakMin ? (simulationResult.timeToPeakMin / 60).toFixed(2) : undefined)) !== undefined 
        ? `${simulationResult.timeToPeakHours ?? (simulationResult.timeToPeakMin / 60).toFixed(2)} hrs` 
        : "N/A",
      totalInundationAreaSqKm: (simulationResult.totalInundationAreaSqKm ?? simulationResult.inundationAreaKm2 ?? simulationResult.inundationAreaSqKm) !== undefined 
        ? `${simulationResult.totalInundationAreaSqKm ?? simulationResult.inundationAreaKm2 ?? simulationResult.inundationAreaSqKm} km²` 
        : "N/A",
      maxDepthM: (simulationResult.maxWaterDepthM ?? simulationResult.maxDepthM) !== undefined 
        ? `${simulationResult.maxWaterDepthM ?? simulationResult.maxDepthM} m` 
        : "N/A",
      maxVelocityMs: (simulationResult.maxVelocityMs ?? simulationResult.peakVelocityMs) !== undefined 
        ? `${simulationResult.maxVelocityMs ?? simulationResult.peakVelocityMs} m/s` 
        : "N/A",
      affectedPopulation: (simulationResult.affectedPopulation ?? simulationResult.estimatedAffectedPop) !== undefined 
        ? `${Number(simulationResult.affectedPopulation ?? simulationResult.estimatedAffectedPop).toLocaleString()} persons` 
        : "N/A",
      criticalInfrastructureCount: (simulationResult.criticalFacilitiesAtRisk ?? simulationResult.criticalInfrastructureCount) !== undefined 
        ? `${simulationResult.criticalFacilitiesAtRisk ?? simulationResult.criticalInfrastructureCount} structures` 
        : "N/A",
      solverUsed: simulationResult.solverUsed ?? simulationResult.solver ?? modelParameters?.selectedSolver ?? "N/A",
      timestamp: simulationResult.timestamp || "N/A",
    } : {
      hasRun: false,
    },
    currentRouteName,
    themeMode: themeMode || "hybrid",
  };
}
