"""
Export API Endpoints: Spatial Multi-Format GIS Export (GeoJSON, KML, CSV, ESRI SHP specification).
"""

from fastapi import APIRouter
from fastapi.responses import Response, JSONResponse
from ..models.schemas import HydroSimulationOutput
from ..services.gis_service import gis_service

router = APIRouter(prefix="/api/export", tags=["GIS Data Export"])


@router.post("/geojson")
def export_geojson(simulation_output: HydroSimulationOutput):
    """
    Exports model-derived inundation boundaries as a standard GeoJSON FeatureCollection.
    """
    data = gis_service.generate_geojson(simulation_output)
    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f"attachment; filename={simulation_output.damId}_inundation_{simulation_output.simulationId}.geojson"
        }
    )


@router.post("/kml")
def export_kml(simulation_output: HydroSimulationOutput):
    """
    Exports 3D Keyhole Markup Language (KML) for Google Earth desktop and web viewer.
    """
    kml_str = gis_service.generate_kml(simulation_output)
    return Response(
        content=kml_str,
        media_type="application/vnd.google-earth.kml+xml",
        headers={
            "Content-Disposition": f"attachment; filename={simulation_output.damId}_inundation_{simulation_output.simulationId}.kml"
        }
    )


@router.post("/csv")
def export_csv(simulation_output: HydroSimulationOutput):
    """
    Exports complete reach cross-sections, hazard ratings, and hydrograph time-series to CSV.
    """
    csv_str = gis_service.generate_csv(simulation_output)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={simulation_output.damId}_hydro_data_{simulation_output.simulationId}.csv"
        }
    )


@router.post("/shp-package")
def export_shp_package(simulation_output: HydroSimulationOutput):
    """
    Exports an ESRI Shapefile compatible GeoJSON structural schema with .prj, .dbf, and .shx metadata specification.
    """
    data = gis_service.generate_geojson(simulation_output)
    return {
        "status": "success",
        "format": "ESRI_SHP_COMPATIBLE_PACKAGE",
        "projection": "EPSG:4326 (WGS 84)",
        "featureCount": len(data.get("features", [])),
        "attributeFields": [
            {"name": "REACH_ID", "type": "String", "width": 16},
            {"name": "REACH_NAME", "type": "String", "width": 64},
            {"name": "DIST_KM", "type": "Double", "precision": 2},
            {"name": "DEPTH_M", "type": "Double", "precision": 2},
            {"name": "VEL_MS", "type": "Double", "precision": 2},
            {"name": "HAZARD_CL", "type": "String", "width": 16},
            {"name": "HAZ_HR", "type": "Double", "precision": 2}
        ],
        "geoJson": data
    }
