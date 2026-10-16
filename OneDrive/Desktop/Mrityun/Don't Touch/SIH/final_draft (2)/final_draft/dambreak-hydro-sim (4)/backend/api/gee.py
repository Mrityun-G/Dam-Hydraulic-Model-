"""
Google Earth Engine (GEE) API Endpoints: Sentinel SAR & Optical Near-Real-Time Observations.
"""

from fastapi import APIRouter
from typing import List, Dict, Any
from ..models.schemas import GEEFloodObservation
from ..services.gee_service import gee_service

router = APIRouter(prefix="/api/gee", tags=["Google Earth Engine & Satellites"])


@router.get("/status")
def get_gee_status():
    """
    Returns Google Earth Engine API integration configuration status, catalog info, and setup guide.
    """
    return gee_service.get_gee_auth_status()


@router.get("/observations/{dam_id}", response_model=List[GEEFloodObservation])
def get_observations_for_dam(dam_id: str):
    """
    Retrieves satellite observation passes (Sentinel-1 SAR / Sentinel-2) for the specified dam basin.
    """
    return gee_service.get_satellite_observations_for_dam(dam_id)
