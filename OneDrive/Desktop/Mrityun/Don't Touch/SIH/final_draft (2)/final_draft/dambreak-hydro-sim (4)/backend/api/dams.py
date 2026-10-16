"""
Dams API Endpoints: National Large Dams Registry & Hydraulic Specifications.
"""

from fastapi import APIRouter, HTTPException
from typing import List
from ..models.schemas import DamSpecifications
from ..services.dam_service import dam_service

router = APIRouter(prefix="/api/dams", tags=["Dams Registry"])


@router.get("", response_model=List[DamSpecifications])
def list_dams():
    """
    Returns all registered Indian dams with hydraulic parameters, reach networks, settlements, and facilities.
    """
    return dam_service.get_all_dams()


@router.get("/{dam_id}", response_model=DamSpecifications)
def get_dam(dam_id: str):
    """
    Retrieves full specifications and geospatial geometry for a single dam by ID.
    """
    dam = dam_service.get_dam_by_id(dam_id)
    if not dam:
        raise HTTPException(status_code=404, detail=f"Dam with ID '{dam_id}' not found in registry")
    return dam
