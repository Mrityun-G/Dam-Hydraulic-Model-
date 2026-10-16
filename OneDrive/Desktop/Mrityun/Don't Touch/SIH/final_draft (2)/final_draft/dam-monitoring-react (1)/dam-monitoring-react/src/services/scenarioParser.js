/**
 * DAMBREAK HYDRO-SIM: Natural Language Scenario Parser
 * Extracted and generalized from Simple Frontend naturalLanguageParser.ts
 * Parses emergency advisories and disaster prompt text into hydrodynamic model input parameters.
 */

import { INDIAN_DAMS_REGISTRY } from "../data/damData";

export function parseEmergencyScenario(userPrompt, currentDamId = "hirakud-dam-odisha") {
  const text = (userPrompt || "").toLowerCase();
  const detected = {};
  const extracted = {};

  // 1. Dam Name & River Basin Matching
  let targetDamId = currentDamId;
  let matchedDam = false;

  if (
    text.includes("kallanai") ||
    text.includes("grand anicut") ||
    text.includes("coleroon") ||
    text.includes("kollidam") ||
    text.includes("trichy") ||
    text.includes("thanjavur") ||
    text.includes("cauvery")
  ) {
    targetDamId = "kallanai-grand-anicut-tamil-nadu";
    matchedDam = true;
  } else if (
    text.includes("idukki") ||
    text.includes("cheruthoni") ||
    text.includes("periyar") ||
    text.includes("kerala")
  ) {
    targetDamId = "idukki-dam-kerala";
    matchedDam = true;
  } else if (
    text.includes("tehri") ||
    text.includes("bhagirathi") ||
    text.includes("koteshwar") ||
    text.includes("garhwal") ||
    text.includes("uttarakhand")
  ) {
    targetDamId = "tehri-dam-uttarakhand";
    matchedDam = true;
  } else if (
    text.includes("sardar") ||
    text.includes("sarovar") ||
    text.includes("narmada") ||
    text.includes("kevadia") ||
    text.includes("gujarat")
  ) {
    targetDamId = "sardar-sarovar-gujarat";
    matchedDam = true;
  } else if (
    text.includes("nagarjuna") ||
    text.includes("sagar") ||
    text.includes("krishna") ||
    text.includes("telangana") ||
    text.includes("andhra")
  ) {
    targetDamId = "nagarjuna-sagar-telangana-ap";
    matchedDam = true;
  } else if (
    text.includes("hirakud") ||
    text.includes("mahanadi") ||
    text.includes("sambalpur") ||
    text.includes("burla") ||
    text.includes("odisha")
  ) {
    targetDamId = "hirakud-dam-odisha";
    matchedDam = true;
  }

  if (matchedDam) {
    extracted.selectedDamId = targetDamId;
    detected.selectedDamId = true;
  }

  const activeDam =
    INDIAN_DAMS_REGISTRY.find((d) => d.id === targetDamId) || INDIAN_DAMS_REGISTRY[0];

  // 2. Failure Mode Matching
  let failureMode = null;
  if (
    text.includes("piping") ||
    text.includes("pipe") ||
    text.includes("internal erosion") ||
    text.includes("seepage") ||
    text.includes("tunneling")
  ) {
    failureMode = "piping";
  } else if (
    text.includes("sunny") ||
    text.includes("fair") ||
    text.includes("normal pool") ||
    text.includes("non-hydrologic") ||
    text.includes("structural failure")
  ) {
    failureMode = "sunny_day";
  } else if (
    text.includes("landslide") ||
    text.includes("blockage") ||
    text.includes("river surge") ||
    text.includes("impulse wave") ||
    text.includes("choked")
  ) {
    failureMode = "river_blockage";
  } else if (
    text.includes("overtopping") ||
    text.includes("overtop") ||
    text.includes("pmf") ||
    text.includes("flood wave") ||
    text.includes("spillway capacity")
  ) {
    failureMode = "overtopping";
  }

  if (failureMode) {
    extracted.failureMode = failureMode;
    detected.failureMode = true;
  }

  // 3. Reservoir Water Level Extraction
  const levelMatch =
    text.match(/(?:reservoir\s+level|water\s+level|pool\s+level|reservoir\s+stage|level)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)\s*m\b/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*m\s*(?:reservoir\s+level|water\s+level|pool\s+level|level)/i) ||
    text.match(/at\s+(\d+(?:\.\d+)?)\s*m\s*(?:msl|elevation)?\b/i);

  if (levelMatch) {
    const val = parseFloat(levelMatch[1]);
    if (!isNaN(val) && val > 0) {
      extracted.reservoirWaterLevel = Number(val.toFixed(2));
      detected.reservoirWaterLevel = true;
    }
  }

  // 4. Breach Width Extraction
  const widthMatch =
    text.match(/(?:breach\s+)?width\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:m|meter|meters|metre|metres)?\b/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:m|meter|meters|metre|metres)\s*(?:breach\s+width|breach|width)\b/i);

  if (widthMatch) {
    const val = parseFloat(widthMatch[1]);
    if (!isNaN(val) && val > 0) {
      const clampedWidth = Math.max(15, Math.min(600, Math.round(val)));
      extracted.breachAverageWidth = clampedWidth;
      extracted.breachBottomWidth = Math.round(clampedWidth * 0.75);
      detected.breachBottomWidth = true;
      detected.breachAverageWidth = true;
    }
  }

  // 5. Breach Formation Time Extraction
  const formationMatch =
    text.match(/(?:formation\s+time|forms\s+in|formed\s+in|formation\s+period)\s*(?:of|is|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:formation|breach\s+formation)\b/i);

  if (formationMatch) {
    const val = parseFloat(formationMatch[1]);
    if (!isNaN(val) && val > 0) {
      extracted.breachFormationTimeHours = Number(Math.max(0.2, Math.min(24.0, val)).toFixed(2));
      detected.breachFormationTimeHours = true;
    }
  }

  // 6. Simulation Duration Extraction
  const durationMatch =
    text.match(/(?:simulate\s+for|simulation\s+duration|duration|propagation\s+for)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i) ||
    text.match(/for\s+(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:downstream|simulation|duration)/i);

  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    if (!isNaN(val) && val > 0) {
      extracted.simulationDurationHours = Number(Math.max(2, Math.min(72, val)).toFixed(1));
      detected.simulationDurationHours = true;
    }
  }

  // 7. DEM Dataset Resolution Extraction
  if (text.includes("30m srtm") || text.includes("srtm")) {
    extracted.selectedDemResolution = "30m_SRTM";
    detected.selectedDemResolution = true;
  } else if (text.includes("10m cartodem") || text.includes("cartodem")) {
    extracted.selectedDemResolution = "10m_CartoDEM";
    detected.selectedDemResolution = true;
  } else if (text.includes("copernicus")) {
    extracted.selectedDemResolution = "30m_Copernicus";
    detected.selectedDemResolution = true;
  } else if (text.includes("alos") || text.includes("palsar")) {
    extracted.selectedDemResolution = "12.5m_ALOS_PALSAR";
    detected.selectedDemResolution = true;
  }

  // 8. Solver Model Extraction
  if (text.includes("delft3d") || text.includes("flexible mesh")) {
    extracted.selectedSolver = "Delft3D_FM_2D";
    detected.selectedSolver = true;
  } else if (text.includes("sph") || text.includes("dualsphysics") || text.includes("particle")) {
    extracted.selectedSolver = "SPH_DualSPHysics";
    detected.selectedSolver = true;
  } else if (text.includes("finite volume") || text.includes("2d swe") || text.includes("swe")) {
    extracted.selectedSolver = "2D_SWE_FiniteVolume";
    detected.selectedSolver = true;
  } else if (text.includes("floodunet") || text.includes("surrogate") || text.includes("ml")) {
    extracted.selectedSolver = "ML_Surrogate_FloodUNet";
    detected.selectedSolver = true;
  }

  // 9. Empirical Equation Formulation Extraction
  if (text.includes("froehlich")) {
    extracted.empiricalEquation = "Froehlich_2008";
    detected.empiricalEquation = true;
  } else if (text.includes("macdonald")) {
    extracted.empiricalEquation = "MacDonald_1984";
    detected.empiricalEquation = true;
  } else if (text.includes("usbr")) {
    extracted.empiricalEquation = "USBR_1982";
    detected.empiricalEquation = true;
  } else if (text.includes("von thun") || text.includes("vonthun")) {
    extracted.empiricalEquation = "VonThun_1993";
    detected.empiricalEquation = true;
  }

  // 10. Confidence Score Calculation
  const totalSlotsChecked = Object.keys(detected).length;
  let confidenceScore = 0.75 + Math.min(0.24, totalSlotsChecked * 0.05);
  if (totalSlotsChecked >= 4) confidenceScore = 0.94;
  if (totalSlotsChecked >= 6) confidenceScore = 0.98;

  return {
    activeDam,
    extracted,
    detected,
    confidenceScore: Number(confidenceScore.toFixed(2)),
  };
}
