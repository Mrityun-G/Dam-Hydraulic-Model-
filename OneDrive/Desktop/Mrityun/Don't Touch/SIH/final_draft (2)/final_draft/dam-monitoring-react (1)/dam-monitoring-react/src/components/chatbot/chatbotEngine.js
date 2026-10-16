/**
 * Flow Guard AI: Knowledge & Response Engine
 * Evaluates queries against live simulation state, Indian Dams registry, and hydrodynamic concepts.
 * Rules:
 * - Strictly NEVER hallucinate values.
 * - Missing values return: That information is not available in the current simulation data.
 * - Accurate technical guidance on SPH vs Delft3D, Froehlich, CartoDEM, 2D SWE.
 */

import { buildChatbotContext } from "./chatbotContext.js";

const UNAVAILABLE_MSG = "That information is not available in the current simulation data.";

export function generateLocalResponse(query, contextState) {
  const q = query.trim().toLowerCase();
  const ctx = buildChatbotContext(contextState);
  const dam = ctx.dam;
  const inp = ctx.inputs;
  const sim = ctx.simulation;

  // 1. Current Dam Identity & Geography
  if (
    q.includes("which dam") ||
    q.includes("current dam") ||
    q.includes("what dam") ||
    q.includes("selected dam") ||
    q.includes("dam name")
  ) {
    return `You are currently analyzing **${dam.name}** located in ${dam.district}, ${dam.state} across the **${dam.river} River** (${dam.basin}).\n\n• **Dam Type:** ${dam.damType}\n• **Year of Completion:** ${dam.completionYear}\n• **Structural Height:** ${dam.heightM}\n• **Crest Length:** ${dam.crestLengthM}`;
  }

  // 2. Dam Reservoir & Storage Specifications
  if (
    q.includes("storage") ||
    q.includes("capacity") ||
    q.includes("frl") ||
    q.includes("mwl") ||
    q.includes("dsl") ||
    q.includes("full reservoir level") ||
    q.includes("maximum water level") ||
    q.includes("dead storage")
  ) {
    return `**Hydraulic Storage Specifications for ${dam.name}:**\n\n• **FRL (Full Reservoir Level):** ${dam.frl}\n• **MWL (Maximum Water Level):** ${dam.mwl}\n• **DSL (Dead Storage Level):** ${dam.dsl}\n• **Gross Storage Capacity:** ${dam.grossStorageMCM}\n• **Effective Storage:** ${dam.effectiveStorageMCM}\n• **Spillway Discharge Capacity:** ${dam.spillwayCapacityM3s}`;
  }

  // 3. Current Breach Scenario / Model Inputs
  if (
    q.includes("input") ||
    q.includes("parameters") ||
    q.includes("failure mode") ||
    q.includes("breach width") ||
    q.includes("water level") ||
    q.includes("formation time") ||
    q.includes("current scenario")
  ) {
    if (inp.failureMode === "N/A" && inp.reservoirWaterLevel === "N/A") {
      return UNAVAILABLE_MSG;
    }
    return `**Current Model Input Configuration (${dam.name}):**\n\n• **Failure Mode:** ${inp.failureMode}\n• **Reservoir Water Level:** ${inp.reservoirWaterLevel}\n• **Head Above Invert:** ${inp.waterDepthAboveInvert}\n• **Reservoir Volume at Breach:** ${inp.reservoirVolumeAtBreachMCM}\n• **Average Breach Width:** ${inp.breachAverageWidth}\n• **Breach Formation Time:** ${inp.breachFormationTimeHours}\n• **Empirical Formula:** ${inp.empiricalEquation}\n• **DEM Grid:** ${inp.selectedDemResolution}\n• **Hydrodynamic Solver:** ${inp.selectedSolver}`;
  }

  // 4. Hydrodynamic Simulation Results (Peak discharge, flood area, depth, velocity)
  if (
    q.includes("result") ||
    q.includes("peak discharge") ||
    q.includes("peak outflow") ||
    q.includes("inundat") ||
    q.includes("flood area") ||
    q.includes("water depth") ||
    q.includes("flow velocity") ||
    q.includes("how severe") ||
    q.includes("affected population") ||
    q.includes("casualties") ||
    q.includes("loss")
  ) {
    if (!sim.hasRun) {
      return `No simulation has been executed yet for ${dam.name} in the active session. Please navigate to **Model Input** or **2-D Flood Map** and click **Run Simulation** to compute discharge hydrographs and flood propagation.`;
    }

    let summary = `**Hydrodynamic Simulation Results (${dam.name}):**\n\n`;
    summary += `• **Peak Outflow Discharge:** ${sim.peakDischargeM3s}\n`;
    summary += `• **Time to Peak Outflow:** ${sim.timeToPeakHours}\n`;
    summary += `• **Total Inundated Area:** ${sim.totalInundationAreaSqKm}\n`;
    summary += `• **Maximum Flood Depth:** ${sim.maxDepthM}\n`;
    summary += `• **Peak Flow Velocity:** ${sim.maxVelocityMs}\n`;
    summary += `• **Estimated Population at Risk:** ${sim.affectedPopulation}\n`;
    summary += `• **Critical Facilities Impacted:** ${sim.criticalInfrastructureCount}\n`;
    summary += `• **Solver Executed:** ${sim.solverUsed}`;
    return summary;
  }

  // 5. Solver comparison: SPH vs Delft3D / 2D SWE
  if (
    q.includes("sph") ||
    q.includes("delft3d") ||
    q.includes("difference between") ||
    q.includes("solver") ||
    q.includes("finite volume")
  ) {
    return `**Hydraulic Solvers in Flow Guard:**\n\n` +
      `1. **2D Shallow Water Equations (SWE - Finite Volume):**\n` +
      `   • Fast, depth-averaged hydrodynamic propagation for downstream flood routing (up to 60+ km).\n` +
      `   • Ideal for inundation mapping, arrival times, and evacuation planning.\n\n` +
      `2. **3D SPH (Smoothed Particle Hydrodynamics - DualSPHysics):**\n` +
      `   • Mesh-free Lagrangian solver capturing full 3D Navier-Stokes turbulent wave slamming, hydraulic jumps, and near-field structure collisions at the dam toe.\n\n` +
      `3. **Delft3D Flow:**\n` +
      `   • Multi-layer curvilinear/unstructured grid model suited for tidal, estuarine, and complex channel morphology interactions.`;
  }

  // 6. Real-time Monitoring & Sensors
  if (
    q.includes("sensor") ||
    q.includes("piezometer") ||
    q.includes("seepage") ||
    q.includes("water level sensor") ||
    q.includes("monitoring") ||
    q.includes("telemetry")
  ) {
    return `**Real-Time Structural & Hydrological Monitoring:**\n\n` +
      `• **Piezometer Array:** Monitored in body and foundation to detect abnormal pore-water pressure shifts.\n` +
      `• **Seepage Flumes:** Continuous discharge rate measurement at the drainage gallery.\n` +
      `• **Upstream Inflow & Level Radars:** Millimeter-accuracy reservoir gauge transmitting via SCADA / IoT telemetry.\n` +
      `• **Seismic Accelerometers:** Continuous ground motion capture for earthquake-triggered stability audits.\n\n` +
      `Access the **Real-Time Monitoring** page to inspect live telemetry curves and warning threshold alerts.`;
  }

  // 7. Data Export formats
  if (
    q.includes("export") ||
    q.includes("download") ||
    q.includes("report") ||
    q.includes("pdf") ||
    q.includes("csv") ||
    q.includes("geojson")
  ) {
    return `**Data Export Capabilities:**\n\n` +
      `From the **Export Data** center, you can generate and download:\n` +
      `• **Engineering Dossier (PDF):** Full breach summary, CWC/NDMA compliance certificates, reach inundation statistics, and evacuation priority matrices.\n` +
      `• **Hydrograph & Reaches (CSV):** Stage-discharge timeseries, peak arrival times, and velocity profiles.\n` +
      `• **GIS Layers (GeoJSON / Shapefile):** Maximum flood boundaries and hazard classification polygons.\n` +
      `• **Scenario Package (JSON):** Complete calibrated parameter sets for reproducibility in HEC-RAS or Delft3D.`;
  }

  // 8. Froehlich empirical equation
  if (
    q.includes("froehlich") ||
    q.includes("empirical") ||
    q.includes("breach equation") ||
    q.includes("macdonald")
  ) {
    return `**Empirical Breach Prediction Formulations:**\n\n` +
      `• **Froehlich (2008):** Based on regression analysis of 74 embankment dam failures. Accurately calculates average breach width \\(B_{ave} = 0.27 K_o V_w^{0.32} h_b^{0.24}\\) and failure duration \\(t_f = 63.2 \\sqrt{V_w / (g h_b^2)}\\).\n` +
      `• **Froehlich (1995) & MacDonald-Langridge-Monopolis (1984):** Used for comparative sensitivity checks against erosion resistance indices.`;
  }

  // 9. Evacuation & Emergency Guidelines
  if (
    q.includes("evacuat") ||
    q.includes("ndma") ||
    q.includes("cwc") ||
    q.includes("emergency") ||
    q.includes("sop")
  ) {
    return `**Emergency Response Protocol (NDMA & CWC Guidelines):**\n\n` +
      `1. **Red Alert Trigger:** Triggered when breach outflow exceeds spillway rating curve or structural piezometer thresholds indicate imminent foundation shear.\n` +
      `2. **Reach 1 Evacuation:** Immediate evacuation for settlements within 10 km (e.g., Burla / Toe zones) within 45 minutes of early warning.\n` +
      `3. **Inter-Agency Broadcast:** Automated alerting to District Disaster Management Authorities (DDMA), State EOC, and NDRF battalions.`;
  }

  // 10. Out-of-Scope Weather Questions
  if (
    q.includes("weather") ||
    q.includes("temperature") ||
    q.includes("forecast for today") ||
    q.includes("rain today")
  ) {
    return "I can help with the current dam, flood simulation, hazard analysis, monitoring and export data. Live weather data is not available in the current Flow Guard context.";
  }

  // 11. Specific Flood Extent Questions
  if (q.includes("extent") || q.includes("inundation map") || q.includes("how far")) {
    if (!sim.hasRun) {
      return "That information is not available in the current Flow Guard data. Please run a simulation to compute the downstream flood extent.";
    }
    return `**Flood Extent for ${dam.name}:**\n\n• **Total Inundation Area:** ${sim.totalInundationAreaSqKm}\n• **Maximum Water Depth:** ${sim.maxDepthM}\n• **Peak Flow Velocity:** ${sim.maxVelocityMs}\n• **Reaches Monitored:** ${dam.reachesCount} downstream reaches along the ${dam.river} River.`;
  }

  // 12. General / Fallback with context guidance
  return `I am **Flow Guard AI**, your assistant for **${dam.name}**.\n\n` +
    `You can ask me about:\n` +
    `• **Current Dam Specifications:** FRL, MWL, crest length, and storage.\n` +
    `• **Active Model Inputs:** Failure mode, breach dimensions, and solver options.\n` +
    `• **Simulation Telemetry:** Peak discharge, flood depth, arrival times, and affected areas.\n` +
    `• **Solvers & Physics:** Differences between 2D SWE, 3D SPH, and Delft3D.\n` +
    `• **Export Options:** Downloading PDF dossiers, GeoJSON flood boundaries, and CSVs.`;
}
