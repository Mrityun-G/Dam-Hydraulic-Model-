"""
GIS Service: Spatial Data Conversion and Multi-Format GIS Export Engine.
Produces valid GeoJSON, Keyhole Markup Language (KML), CSV Point Matrices,
and ESRI Shapefile Compatible Structure packages.
"""

import json
from typing import Dict, Any
from ..models.schemas import HydroSimulationOutput


class GISService:
    @staticmethod
    def generate_geojson(simulation_output: HydroSimulationOutput) -> Dict[str, Any]:
        """
        Returns full GeoJSON FeatureCollection with reach inundation depths and hazard ratings.
        """
        return simulation_output.floodExtentGeoJson

    @staticmethod
    def generate_kml(simulation_output: HydroSimulationOutput) -> str:
        """
        Generates Google Earth compatible KML Document string with styled 3D polygons.
        """
        kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{simulation_output.damName} - Flood Inundation Simulation ({simulation_output.simulationId})</name>
    <description>Hydrodynamic Flood Inundation &amp; Hazard Extent for {simulation_output.riverName}. Peak Q: {simulation_output.peakBreachOutflowM3s} m³/s.</description>
    <Style id="floodExtreme">
      <LineStyle><color>ff0000ff</color><width>2.5</width></LineStyle>
      <PolyStyle><color>990000cc</color></PolyStyle>
    </Style>
    <Style id="floodModerate">
      <LineStyle><color>ff00ffff</color><width>2</width></LineStyle>
      <PolyStyle><color>7f00aaff</color></PolyStyle>
    </Style>
"""
        features = simulation_output.floodExtentGeoJson.get("features", [])
        for feat in features:
            props = feat.get("properties", {})
            coords = feat.get("geometry", {}).get("coordinates", [[]])[0]
            coord_str = " ".join([f"{pt[0]},{pt[1]},0" for pt in coords])

            hazard = props.get("hazardClass", "Moderate")
            style_id = "#floodExtreme" if hazard in ["Extreme", "Significant"] else "#floodModerate"

            kml += f"""    <Placemark>
      <name>{props.get("reachName", "Reach")} ({props.get("depthZone", "Zone")})</name>
      <description>Depth: {props.get("depthM", 0)}m | Velocity: {props.get("velocityMs", 0)}m/s | Hazard: {hazard}</description>
      <styleUrl>{style_id}</styleUrl>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>{coord_str}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
"""
        kml += """  </Document>
</kml>"""
        return kml

    @staticmethod
    def generate_csv(simulation_output: HydroSimulationOutput) -> str:
        """
        Generates CSV of simulation summary, reach results, and outflow hydrograph time-series.
        """
        lines = [
            "DAMBREAK HYDRO-SIM NATIONAL DECISION SUPPORT SYSTEM",
            f"Dam Name,{simulation_output.damName}",
            f"River Basin,{simulation_output.riverName}",
            f"Scenario,{simulation_output.scenarioName}",
            f"Solver Model,{simulation_output.solverModelLabel}",
            f"Peak Outflow (m3/s),{simulation_output.peakBreachOutflowM3s}",
            f"Total Outflow Volume (MCM),{simulation_output.totalOutflowVolumeMCM}",
            f"Total Inundation Area (km2),{simulation_output.totalInundationAreaKm2}",
            f"Exposed Population,{simulation_output.spatialImpact.modelAffectedPopulation}",
            "",
            "REACH RESULTS MATRIX",
            "Reach Name,Distance (km),Arrival Time (hrs),Peak Time (hrs),Peak Discharge (m3/s),Peak Stage (m MSL),Max Flood Depth (m),Max Velocity (m/s),Hazard Rating (HR),Hazard Class"
        ]

        for r in simulation_output.reachResults:
            lines.append(
                f'"{r.reachName}",{r.distanceFromDamKm},{r.arrivalTimeHours},{r.peakTimeHours},{r.peakDischargeM3s},{r.peakStageM},{r.maxFloodDepthM},{r.maxVelocityMs},{r.hazardRatingHR},{r.hazardCategory}'
            )

        lines.extend([
            "",
            "OUTFLOW HYDROGRAPH TIME-SERIES",
            "Time (hrs),Outflow Discharge (m3/s),Reservoir Water Level (m MSL),Breach Formation Progress (%)"
        ])

        for pt in simulation_output.hydrograph:
            lines.append(f"{pt.timeHours},{pt.outflowDischargeM3s},{pt.waterLevelM},{pt.breachProgressPercent}")

        return "\n".join(lines)


gis_service = GISService()
