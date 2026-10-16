"""
Analysis API Endpoints: Featherless AI & Multi-Model Hazard Advisory Interpretation.
"""

from fastapi import APIRouter
from typing import Dict, Any
from ..models.schemas import (
    AIInterpretationRequest,
    AIScenarioInterpretation,
    HydroSimulationOutput,
    AIChatRequest,
    AIChatResponse,
)
from ..services.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI Assistance & Hazard Analysis"])


@router.post("/chat", response_model=AIChatResponse)
def chat_with_flowguard(req: AIChatRequest):
    """
    Context-aware natural language conversation endpoint powered by Google Gemini.
    """
    text_answer = ai_service.chat(
        user_prompt=req.userPrompt,
        context=req.context,
        history=req.history,
    )
    return AIChatResponse(text=text_answer)


@router.post("/scenario-interpret", response_model=AIScenarioInterpretation)
def interpret_scenario(req: AIInterpretationRequest):
    """
    Parses natural language emergency scenarios into physical hydrodynamic parameters.
    """
    return ai_service.interpret_scenario_prompt(req.userPrompt, req.currentDamId)


@router.post("/hazard-summary")
def generate_hazard_summary(output: HydroSimulationOutput):
    """
    Generates actionable disaster mitigation recommendations and exposure summaries from physical model outputs.
    """
    return {
        "status": "success",
        "summary": ai_service.generate_hazard_summary(output)
    }

