"""
Terrain Service: Digital Elevation Model (DEM) sampling & valley cross-section geometry.
Supports CartoDEM 10m/30m, SRTM 30m, and ALOS 12.5m terrain specifications.
"""

import math
from typing import Dict, Any, List
from ..models.schemas import DamSpecifications


class TerrainService:
    @staticmethod
    def get_dem_metadata(dem_id: str) -> Dict[str, Any]:
        catalog = {
            "10m_CartoDEM": {
                "id": "10m_CartoDEM",
                "name": "ISRO CartoDEM Version-3 (10m High-Precision)",
                "resolutionMeters": 10.0,
                "verticalAccuracyMeters": 3.0,
                "provider": "National Remote Sensing Centre (NRSC / ISRO)",
                "suitableFor": "Detailed hydraulic reach cross-sections and urban inundation mapping",
            },
            "30m_SRTM": {
                "id": "30m_SRTM",
                "name": "NASA SRTM 1-ArcSecond Global DEM (30m)",
                "resolutionMeters": 30.0,
                "verticalAccuracyMeters": 6.0,
                "provider": "NASA JPL / USGS",
                "suitableFor": "Regional river basin macro-floodplain propagation",
            },
            "12.5m_ALOS": {
                "id": "12.5m_ALOS",
                "name": "JAXA ALOS PALSAR RTC High-Res DEM (12.5m)",
                "resolutionMeters": 12.5,
                "verticalAccuracyMeters": 4.5,
                "provider": "Japan Aerospace Exploration Agency (JAXA)",
                "suitableFor": "Steep valley side slopes & mountain gorge simulations",
            },
        }
        return catalog.get(dem_id, catalog["10m_CartoDEM"])

    @staticmethod
    def sample_elevation(dam: DamSpecifications, x_offset_m: float, distance_km: float) -> float:
        """
        Samples synthetic/procedural ground elevation along river transect based on dam base elevation and distance.
        """
        base_elev = dam.maximumWaterLevelMWL - dam.heightAboveLowestFoundation
        downstream_drop = distance_km * 0.45
        valley_side_factor = (x_offset_m / 400.0) ** 2 * 12.0
        return round(base_elev - downstream_drop + valley_side_factor, 2)


terrain_service = TerrainService()
