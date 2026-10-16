"""
DAMBREAK HYDRO-SIM: Pydantic Data Models & Schemas
Defines request/response contracts for FastAPI backend endpoints.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


class Coordinates(BaseModel):
    lat: float
    lng: float


class LocationInfo(BaseModel):
    river: str
    basin: str
    district: str
    state: str
    latitude: float
    longitude: float


class RiverReach(BaseModel):
    id: str
    name: str
    distanceFromDamKm: float
    channelWidthM: float
    manningN: float
    bedSlope: float
    bankElevationMSL: float
    coordinates: List[List[float]]


class Settlement(BaseModel):
    id: str
    name: str
    distanceFromDamKm: float
    censusPopulation: int
    elevationMSL: float
    lat: float
    lng: float
    vulnerabilityIndex: float


class CriticalFacility(BaseModel):
    id: str
    name: str
    facilityType: str
    distanceFromDamKm: float
    elevationMSL: float
    lat: float
    lng: float
    criticalLevel: str


class DamSpecifications(BaseModel):
    id: str
    name: str
    damType: str
    completionYear: int
    location: LocationInfo
    heightAboveLowestFoundation: float
    crestLengthM: float
    fullReservoirLevelFRL: float
    maximumWaterLevelMWL: float
    grossStorageCapacityMCM: float
    effectiveStorageCapacityMCM: float
    spillwayCapacityM3s: float
    catchmentAreaSqKm: float
    reaches: List[RiverReach]
    settlements: List[Settlement]
    criticalFacilities: List[CriticalFacility]


class BreachParameters(BaseModel):
    selectedDamId: str = Field(default="hirakud-dam-odisha", description="Unique dam identifier")
    failureMode: Literal["overtopping", "piping", "river_blockage", "sunny_day"] = "overtopping"
    reservoirWaterLevel: float = Field(default=192.94, description="Water level in meters MSL")
    waterDepthAboveInvert: float = Field(default=35.0, description="Depth above breach invert (m)")
    reservoirVolumeAtBreachMCM: float = Field(default=5896.0, description="Volume at breach in MCM")
    breachBottomWidth: float = Field(default=160.0, description="Bottom breach width (m)")
    breachSideSlope: float = Field(default=1.0, description="Side slope z (1V:zH)")
    breachAverageWidth: float = Field(default=195.0, description="Average breach width (m)")
    breachInvertElevation: float = Field(default=157.94, description="Invert elevation (m MSL)")
    breachFormationTimeHours: float = Field(default=1.85, description="Breach formation time (hours)")
    initialFlowM3s: float = Field(default=350.0, description="Base river discharge (m3/s)")
    simulationDurationHours: float = Field(default=24.0, description="Total simulation time (hours)")
    empiricalEquation: Literal["Froehlich_2008", "MacDonald_1984", "USBR_1982"] = "Froehlich_2008"
    selectedDemResolution: Literal["10m_CartoDEM", "30m_SRTM", "12.5m_ALOS"] = "10m_CartoDEM"
    selectedSolver: Literal["2D_SWE_FiniteVolume", "3D_SPH_DualSPHysics", "Delft3D_FM_2D", "SPH_vs_Delft3D_Comparison", "ML_Surrogate_FloodUNet"] = "2D_SWE_FiniteVolume"


class HydrographPoint(BaseModel):
    timeHours: float
    outflowDischargeM3s: float
    waterLevelM: float
    breachProgressPercent: float


class ReachResult(BaseModel):
    reachId: str
    reachName: str
    distanceFromDamKm: float
    arrivalTimeHours: float
    peakTimeHours: float
    peakDischargeM3s: float
    peakStageM: float
    maxFloodDepthM: float
    maxVelocityMs: float
    hazardRatingHR: float
    hazardCategory: Literal["Low", "Moderate", "Significant", "Extreme"]


class SpatialImpactMetrics(BaseModel):
    totalSettlementsInReach: int
    affectedSettlementsCount: int
    modelAffectedPopulation: int
    modelImpactedFacilitiesCount: int
    estimatedAgriculturalLossKm2: float
    hazardLevelBreakdown: Dict[str, int]


class HydroSimulationOutput(BaseModel):
    simulationId: str
    timestamp: str
    damId: str
    damName: str
    riverName: str
    scenarioName: str
    solverType: str
    solverModelLabel: str
    isMLSurrogate: bool
    peakBreachOutflowM3s: float
    timeToPeakHours: float
    breachWidthM: float
    breachFormationTimeHours: float
    totalOutflowVolumeMCM: float
    maxFloodDepthM: float
    maxFlowVelocityMs: float
    totalInundationAreaKm2: float
    waveFrontFrontierKm: float
    hydrograph: List[HydrographPoint]
    reachResults: List[ReachResult]
    spatialImpact: SpatialImpactMetrics
    floodExtentGeoJson: Dict[str, Any]


class SphReachMetric(BaseModel):
    reachId: str
    reachName: str
    distanceKm: float
    depthM: float
    velocityMs: float
    arrivalHours: float
    vorticityPerSec: float
    froudeNumber: float


class SphSimulationOutput(BaseModel):
    solverName: str = "3D SPH (DualSPHysics Navier-Stokes)"
    particleCount: int
    timeStepSec: float
    computationTimeSec: float
    peakDischargeM3s: float
    maxWaveFrontVelocityMs: float
    totalInundationAreaKm2: float
    reachMetrics: List[SphReachMetric]
    solverStatus: str = "COMPLETED"


class Delft3DReachMetric(BaseModel):
    reachId: str
    reachName: str
    distanceKm: float
    depthM: float
    velocityMs: float
    arrivalHours: float
    froudeNumber: float
    manningFrictionCoeff: float


class Delft3DOutput(BaseModel):
    solverName: str = "Delft3D-FM (Flexible Mesh 2D D-Flow)"
    meshCellCount: int
    timeStepSec: float
    computationTimeSec: float
    peakDischargeM3s: float
    maxWaveFrontVelocityMs: float
    totalInundationAreaKm2: float
    reachMetrics: List[Delft3DReachMetric]
    solverStatus: str = "COMPLETED"
    isLiveBinaryConnected: bool = False
    statusNotes: str = "Executed via High-Fidelity 2D Shallow Water Equations Solver Interface"


class CrossReachComparison(BaseModel):
    reachId: str
    reachName: str
    distanceKm: float
    depthSphM: float
    depthDelft3dM: float
    depthDeltaM: float
    velocitySphMs: float
    velocityDelft3dMs: float
    velocityDeltaMs: float
    arrivalSphHours: float
    arrivalDelft3dHours: float


class ScientificAnalysis(BaseModel):
    nearFieldHydrodynamics: str
    farFieldFloodplainDiffusion: str
    hydraulicJumpLocation: str
    recommendedApplication: str


class ModelComparisonMetrics(BaseModel):
    damName: str
    peakDischargePercentDiff: float
    meanAbsoluteErrorMaeM: float
    crossSectionDepthRmseM: float
    spatialIntersectionOverUnionIoU: float
    velocityCorrelationPearsonR: float
    reachComparisons: List[CrossReachComparison]
    scientificAnalysis: ScientificAnalysis


class GEEFloodObservation(BaseModel):
    date: str
    satellite: str
    sensor: str
    spatialResolutionM: float
    observedFloodAreaKm2: float
    cloudCoverPercent: float
    radarPolarization: str
    status: str
    geoJsonExtentUrl: Optional[str] = None
    geeTileUrl: Optional[str] = None


class AIInterpretationRequest(BaseModel):
    userPrompt: str
    currentDamId: str = "hirakud-dam-odisha"


class AIScenarioInterpretation(BaseModel):
    damId: str
    failureMode: str
    breachWidth: float
    breachFormationTimeHours: float
    reservoirWaterLevel: float
    empiricalEquation: str
    confidenceScore: float
    explanation: str
    hazardWarnings: List[str]
    suggestedMitigation: str
    isFeatherlessModel: bool = False


class AIChatRequest(BaseModel):
    userPrompt: str
    context: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None


class AIChatResponse(BaseModel):
    text: str
    status: str = "success"
    model: str = "gemini-3.6-flash"

