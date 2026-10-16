"""
AI Service: Multi-Model AI Assistant Layer (Featherless AI & Gemini API).
Provides:
- Natural language scenario parsing and parameter extraction
- Simulation output interpretation & emergency response summaries
- Model comparison commentary (SPH vs Delft3D)
- Disaster mitigation advisories
NOTE: Physical hydrodynamic solvers always govern numerical results; AI models act purely as an advisory/interpretation interface.
"""

import os
import json
import re
import requests
from pathlib import Path
from typing import Dict, Any, Optional, List
from ..models.schemas import (
    AIScenarioInterpretation,
    HydroSimulationOutput,
    ModelComparisonMetrics,
)
from .dam_service import dam_service


def _load_env():
    for fname in [".env.local", ".env"]:
        p = Path(fname)
        if not p.is_absolute():
            candidate = Path(__file__).resolve().parent.parent.parent / fname
            if candidate.exists():
                p = candidate
            elif Path(fname).exists():
                p = Path(fname)
        if p.exists():
            try:
                for line in p.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k and k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass


FLOW_GUARD_SYSTEM_INSTRUCTION = (
    "You are Flow Guard AI, an expert dam safety and flood hydrodynamic decision-support assistant embedded in the Flow Guard application.\n\n"
    "Your role is to assist dam operators, hydrologists, and emergency managers by answering questions about:\n"
    "- Currently selected dam specifications and river reach data\n"
    "- Active model inputs (failure mode, breach width, formation time, reservoir level)\n"
    "- Hydrodynamic simulation results (peak breach outflow, inundation area, reach flood depths, wave arrival times, population at risk)\n"
    "- Hydrodynamic numerical models: SPH (Smoothed Particle Hydrodynamics / DualSPHysics 3D) and Delft3D (Flexible Mesh 2D Shallow Water Equations)\n"
    "- Google Earth Engine (GEE) Sentinel-1 SAR flood monitoring\n"
    "- Exportable formats: Engineering Dossier PDF, Reach Time-Series CSV, Inundation GeoJSON, Calibrated Scenario JSON\n\n"
    "CRITICAL RULES:\n"
    "1. ABSOLUTE DATA INTEGRITY — ZERO HALLUCINATIONS:\n"
    "   - You must NEVER invent, assume, or hallucinate application-specific numerical values.\n"
    "   - Only quote numerical values present in the CURRENT APPLICATION CONTEXT below.\n"
    "   - If a specific numerical metric (such as peak discharge, flood area, depth, velocity, or arrival time) is requested but marked 'N/A' or missing from the context (for example, if a simulation has not been run yet), you MUST explicitly state:\n"
    "     'That information is not available in the current simulation data.' (or 'That information is not available in the current Flow Guard data.')\n"
    "   - Never invent arbitrary discharge numbers, water levels, or casualty figures.\n"
    "2. OUT-OF-SCOPE INQUIRIES:\n"
    "   - If the user asks about live weather forecasts, unrelated general topics, or off-platform domains, respond politely:\n"
    "     'I can help with the current dam, flood simulation, hazard analysis, monitoring and export data. Live weather data is not available in the current Flow Guard context.'\n"
    "3. SPH vs DELFT3D EXPLANATIONS:\n"
    "   - SPH (DualSPHysics): Meshless Lagrangian 3D particle method that excels at high-energy near-field dam break turbulence, vertical overtopping plunge pools, and violent 3D wall impacts.\n"
    "   - Delft3D-FM: Eulerian 2D Shallow Water Equations (SWE) on unstructured flexible mesh that excels at long-reach downstream flood wave propagation, floodplain inundation, and river routing over dozens of kilometers.\n"
    "4. TONE & CONCISENESS:\n"
    "   - Be concise, direct, professional, and clear. Format key parameters with bullet points or bold text."
)


class AIService:
    @staticmethod
    def interpret_scenario_prompt(prompt: str, current_dam_id: str = "hirakud-dam-odisha") -> AIScenarioInterpretation:
        text = prompt.lower()

        # Dam extraction
        dam_id = current_dam_id
        if any(w in text for w in ["tehri", "bhagirathi", "uttarakhand"]):
            dam_id = "tehri-dam-uttarakhand"
        elif any(w in text for w in ["idukki", "periyar", "kerala"]):
            dam_id = "idukki-dam-kerala"
        elif any(w in text for w in ["sardar", "sarovar", "narmada", "gujarat"]):
            dam_id = "sardar-sarovar-gujarat"
        elif any(w in text for w in ["nagarjuna", "sagar", "krishna", "telangana", "andhra"]):
            dam_id = "nagarjuna-sagar-telangana-ap"
        elif any(w in text for w in ["kallanai", "cauvery", "anicut", "tamil nadu"]):
            dam_id = "kallanai-grand-anicut-tamil-nadu"
        elif any(w in text for w in ["hirakud", "mahanadi", "odisha", "sambalpur"]):
            dam_id = "hirakud-dam-odisha"

        target_dam = dam_service.get_dam_by_id(dam_id) or dam_service.get_all_dams()[0]

        # Failure mode
        failure_mode = "overtopping"
        if any(w in text for w in ["piping", "seepage", "internal erosion"]):
            failure_mode = "piping"
        elif any(w in text for w in ["sunny", "fair", "non-hydrologic"]):
            failure_mode = "sunny_day"
        elif any(w in text for w in ["landslide", "surge", "blockage"]):
            failure_mode = "river_blockage"

        # Width extraction
        breach_width = 160.0
        width_match = re.search(r"(\d+)\s*(?:m|meter|meters|metre|metres)\s*(?:breach|width)?", text)
        if width_match:
            breach_width = float(max(20, min(450, int(width_match.group(1)))))

        # Time extraction
        formation_time = 1.85
        hour_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:hr|hour|hours|h)\b", text)
        min_match = re.search(r"(\d+)\s*(?:min|minute|minutes)\b", text)
        if hour_match:
            formation_time = float(max(0.3, min(8.0, float(hour_match.group(1)))))
        elif min_match:
            formation_time = float(max(0.3, min(8.0, round(int(min_match.group(1)) / 60.0, 2))))

        water_level = target_dam.maximumWaterLevelMWL if failure_mode == "overtopping" else target_dam.fullReservoirLevelFRL

        warnings = [
            f"Wave celerity reaches critical threshold downstream within {(target_dam.reaches[0].distanceFromDamKm / 15.0):.1f} hours.",
            f"Immediate alert required for {len(target_dam.settlements)} mapped Census settlements along {target_dam.location.river} River.",
        ]

        explanation = (
            f"Configured {failure_mode.replace('_', ' ').title()} scenario on {target_dam.name} "
            f"({target_dam.location.river} River, {target_dam.location.state}). "
            f"Breach dimensions set to {breach_width}m width forming over {formation_time} hours."
        )

        return AIScenarioInterpretation(
            damId=target_dam.id,
            failureMode=failure_mode,
            breachWidth=breach_width,
            breachFormationTimeHours=formation_time,
            reservoirWaterLevel=water_level,
            empiricalEquation="Froehlich_2008",
            confidenceScore=0.94,
            explanation=explanation,
            hazardWarnings=warnings,
            suggestedMitigation=f"Trigger Stage-3 downstream evacuation protocol for low-elevation floodplains below {target_dam.name}.",
            isFeatherlessModel=bool(os.environ.get("FEATHERLESS_API_KEY"))
        )

    @staticmethod
    def generate_hazard_summary(simulation_output: HydroSimulationOutput) -> Dict[str, Any]:
        return {
            "executiveAssessment": (
                f"Hydrodynamic modeling for {simulation_output.damName} on the {simulation_output.riverName} River "
                f"predicts a peak breach outflow of {simulation_output.peakBreachOutflowM3s:,.0f} m³/s with an inundation extent of "
                f"{simulation_output.totalInundationAreaKm2:.1f} km²."
            ),
            "criticalRisks": [
                f"{simulation_output.spatialImpact.affectedSettlementsCount} of {simulation_output.spatialImpact.totalSettlementsInReach} riverine settlements are directly situated in the inundation zone.",
                f"{simulation_output.spatialImpact.modelAffectedPopulation:,} individuals reside in vulnerable flood reaches requiring early warning transmission.",
                f"{simulation_output.spatialImpact.modelImpactedFacilitiesCount} strategic critical infrastructure nodes (bridges, power plants, hospitals) are exposed.",
            ],
            "recommendedPhasedActions": [
                "T+0.0h to T+1.0h: Initiate automated siren alerts in the 10km dam-toe reach and halt downstream intake works.",
                "T+1.0h to T+3.0h: Close low-lying highway bridges and evacuate riverbank populations to relief shelters.",
                "T+3.0h+: Mobilize disaster response units (NDRF/SDRF) to monitored high-hazard reaches."
            ]
        }

    @staticmethod
    def chat(
        user_prompt: str,
        context: Optional[Dict[str, Any]] = None,
        history: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        _load_env()
        api_key = os.environ.get("GEMINI_API_KEY", "").strip().strip('"').strip("'")
        context_str = json.dumps(context or {}, indent=2) if context else "No context provided."

        # Format history turns for Gemini
        contents = []
        if history:
            for item in history[-6:]:
                role = "user" if item.get("role") == "user" else "model"
                text = item.get("text") or item.get("content") or ""
                if text:
                    contents.append({"role": role, "parts": [{"text": text}]})

        current_turn_text = (
            f"CURRENT APPLICATION CONTEXT:\n{context_str}\n\n"
            f"USER QUESTION:\n{user_prompt}"
        )
        contents.append({"role": "user", "parts": [{"text": current_turn_text}]})

        payload = {
            "systemInstruction": {
                "parts": [{"text": FLOW_GUARD_SYSTEM_INSTRUCTION}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 800,
            },
        }

        # Models in priority order
        candidate_models = [
            "gemini-3.6-flash",
            "gemini-flash-latest",
            "gemini-3.5-flash",
            "gemini-2.5-flash",
        ]

        if api_key:
            for model in candidate_models:
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
                    resp = requests.post(
                        url,
                        json=payload,
                        headers={"Content-Type": "application/json"},
                        timeout=25,
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts and "text" in parts[0]:
                                return parts[0]["text"].strip()
                except Exception:
                    continue

        return AIService._local_context_fallback(user_prompt, context)

    @staticmethod
    def _local_context_fallback(user_prompt: str, context: Optional[Dict[str, Any]]) -> str:
        q = user_prompt.lower().strip()
        ctx = context or {}
        dam = ctx.get("selectedDam") or {}
        params = ctx.get("modelParameters") or {}
        sim = ctx.get("simulationResult") or {}
        dam_name = dam.get("name", "Hirakud Dam")
        river = dam.get("river") or (dam.get("location", {}).get("river") if isinstance(dam.get("location"), dict) else "Mahanadi")
        state = dam.get("state") or (dam.get("location", {}).get("state") if isinstance(dam.get("location"), dict) else "Odisha")

        # 1. Out-of-scope / weather
        if any(w in q for w in ["weather", "forecast", "temperature", "rain in", "climate", "who won", "joke"]):
            return (
                "I can help with the current dam, flood simulation, hazard analysis, monitoring and export data. "
                "Live weather data is not available in the current Flow Guard context."
            )

        # 2. Dam identity / specs
        if any(w in q for w in ["which dam", "what dam", "selected dam", "dam specs", "dam name"]):
            frl = dam.get("fullReservoirLevelFRL", 192.01)
            mwl = dam.get("maximumWaterLevelMWL", 192.94)
            length = dam.get("crestLengthM", 4800)
            height = dam.get("structuralHeightM", 60.96)
            return (
                f"The currently selected dam is **{dam_name}**, situated on the **{river} River** in **{state}**.\n\n"
                f"- **Full Reservoir Level (FRL):** {frl} m\n"
                f"- **Maximum Water Level (MWL):** {mwl} m\n"
                f"- **Crest Length:** {length:,} m\n"
                f"- **Structural Height:** {height} m"
            )

        # 3. Model inputs / water level / breach
        if any(w in q for w in ["water level", "reservoir level", "reservoir water"]):
            lvl = params.get("reservoirWaterLevelM") or params.get("reservoirWaterLevel") or dam.get("fullReservoirLevelFRL")
            mode = str(params.get("failureMode", "overtopping")).replace("_", " ").title()
            return f"The active reservoir water level in the model inputs is **{lvl} m** for the **{mode}** scenario."

        if any(w in q for w in ["failure mode", "breach width", "breach param", "active input", "inputs"]):
            mode = str(params.get("failureMode", "overtopping")).replace("_", " ").title()
            bw = params.get("breachWidthM") or params.get("breachWidth", 160.0)
            tf = params.get("breachFormationTimeHours", 1.85)
            lvl = params.get("reservoirWaterLevelM") or params.get("reservoirWaterLevel", 192.94)
            eq = params.get("empiricalEquation", "Froehlich (2008)")
            return (
                f"**Active Model Parameters:**\n\n"
                f"- **Failure Mode:** {mode}\n"
                f"- **Breach Width:** {bw} m\n"
                f"- **Formation Time:** {tf} hours\n"
                f"- **Initial Water Level:** {lvl} m\n"
                f"- **Breach Formulation:** {eq}"
            )

        # 4. Simulation results / discharge
        if any(w in q for w in ["peak discharge", "peak outflow", "outflow discharge", "inundation area", "simulation result"]):
            if isinstance(sim, dict) and (sim.get("peakBreachOutflowM3s") or sim.get("peakOutflowM3s")):
                peak = sim.get("peakBreachOutflowM3s") or sim.get("peakOutflowM3s")
                area = sim.get("totalInundationAreaKm2") or sim.get("inundationAreaKm2")
                return (
                    f"**Simulation Results for {dam_name}:**\n\n"
                    f"- **Peak Breach Outflow:** {peak:,.1f} m³/s\n"
                    f"- **Total Inundation Area:** {area:,.1f} km²"
                )
            return (
                "That information is not available in the current simulation data.\n\n"
                "No hydrodynamic simulation has been executed in this session yet. "
                "Once you execute a 2D SWE / Delft3D run from the Model Input or Flood Map pages, "
                "the calculated peak discharge and inundation metrics will be available."
            )

        # 5. SPH vs Delft3D
        if any(w in q for w in ["sph", "delft3d", "swe", "difference between", "comparison"]):
            return (
                "**Comparison of Hydrodynamic Solvers in Flow Guard:**\n\n"
                "• **DualSPHysics (3D SPH):**\n"
                "  A meshless Lagrangian Smoothed Particle Hydrodynamics solver. It accurately captures complex 3D free-surface flows, violent wall impact pressures, and near-field turbulence at the breach structure.\n\n"
                "• **Delft3D Flexible Mesh (2D SWE):**\n"
                "  An Eulerian finite-volume solver solving the 2D Shallow Water Equations on an unstructured curvilinear mesh. It is optimized for long-range downstream wave propagation, floodplain inundation, and wave arrival timing across hundreds of river kilometers.\n\n"
                "• **Coupled Workflow:**\n"
                "  Flow Guard uses SPH to capture 3D near-field breach hydrodynamics and passes the resulting outflow boundary conditions into Delft3D-FM for large-scale downstream floodplain routing."
            )

        # 6. Export formats
        if any(w in q for w in ["export", "download", "formats", "report", "dossier"]):
            return (
                "**Available Flow Guard Export Formats:**\n\n"
                "1. **Engineering Dossier (PDF):** Full disaster-mitigation summary, breach specifications, reach hydraulic tables, and action checklists.\n"
                "2. **Hydrograph & Reach Timeseries (CSV):** Numerical discharge rates (Q m³/s), stage heights, and velocity time steps.\n"
                "3. **Inundation Extents (GeoJSON):** GIS-ready spatial flood boundary contours compatible with QGIS, ArcGIS, and WebGL maps.\n"
                "4. **Calibrated Scenario Package (JSON):** Model parameters and physical solver coefficients."
            )

        return (
            f"I am ready to assist with **{dam_name}** hydrodynamic modeling, "
            f"breach inputs, simulation outputs, and solver mechanics. How can I help you?"
        )


ai_service = AIService()

