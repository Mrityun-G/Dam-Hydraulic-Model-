/**
 * DAMBREAK HYDRO-SIM: Type Definitions
 * Generalized Hydrodynamic Inundation Modelling & Decision Support System for India
 * Supporting 2D SWE (Finite Volume), ML Surrogates (FloodUNet), SPH, and Delft3D Concepts
 */

export type DataClassification = 'REAL_DATA_INPUT' | 'MODEL_DERIVED_RESULT' | 'NOT_CONNECTED';

export type NavigationTab = 
  | 'dashboard'
  | 'model-inputs'
  | 'map-2d'
  | 'sim-3d'
  | 'sph-vs-delft3d'
  | 'hazard-loss'
  | 'near-real-time-gee'
  | 'export';

export type FailureMode = 'overtopping' | 'piping' | 'river_blockage' | 'sunny_day';

export type SolverType = 
  | '2D_SWE_FiniteVolume' 
  | 'ML_Surrogate_FloodUNet' 
  | 'SPH_SmoothedParticle' 
  | 'Delft3D_FlexibleMesh';

export type EmpiricalEquation = 'Froehlich_2008' | 'MacDonald_1984' | 'USBR_1982';

export type DemDatasetType = 
  | '10m_CartoDEM' 
  | '30m_SRTM' 
  | '30m_Copernicus' 
  | '12.5m_ALOS_PALSAR';

export interface GeoCoordinate {
  lat: number;
  lng: number;
  elevM?: number;
}

export interface DamSpecifications {
  id: string;
  name: string;
  location: {
    district: string;
    state: string;
    river: string;
    latitude: number;
    longitude: number;
  };
  damType: string;
  yearCompleted: number;
  heightAboveLowestFoundation: number; // meters
  lengthOfDam: number; // meters
  mainSectionLength: number; // meters
  fullReservoirLevelFRL: number; // meters MSL
  maximumWaterLevelMWL: number; // meters MSL
  deadStorageLevelDSL: number; // meters MSL
  grossStorageCapacityMCM: number; // MCM
  liveStorageCapacityMCM: number; // MCM
  spillwayCapacityM3s: number; // m³/s
  sluiceGatesCount: number;
  crestGatesCount: number;
  catchmentAreaKm2: number;
  sourceAuthority: string;
  riverCenterline: GeoCoordinate[];
  reservoirPolygon: [number, number][]; // [lat, lng][]
  reaches: RiverReachProfile[];
  settlements: SettlementData[];
  criticalFacilities: CriticalFacility[];
}

export interface BreachParameters {
  failureMode: FailureMode;
  reservoirWaterLevel: number; // meters MSL at breach initiation
  waterDepthAboveInvert: number; // hw (m)
  reservoirVolumeAtBreachMCM: number; // Vw (MCM)
  breachBottomWidth: number; // B_b (m)
  breachSideSlope: number; // z (H:1V)
  breachAverageWidth: number; // B_avg (m)
  breachInvertElevation: number; // meters MSL
  breachFormationTimeHours: number; // tf (hours)
  initialFlowM3s?: number; // Baseflow in river (m³/s)
  simulationDurationHours?: number; // Total hours (e.g. 24)
  empiricalEquation: 'Froehlich_2008' | 'MacDonald_1984' | 'USBR_1982' | 'VonThun_1993';
  selectedDamId?: string;
  selectedDemResolution?: DemDatasetType;
  selectedSolver?: SolverType;
}

export interface HydroSimulationRequest {
  damId: string;
  riverId?: string;
  breachWidth: number;
  breachFormationTime: number;
  reservoirLevel: number;
  initialFlow?: number;
  simulationDuration?: number;
  demId?: DemDatasetType;
  failureMode?: FailureMode;
  breachSideSlope?: number;
  breachInvertElevation?: number;
  solverType?: SolverType;
  empiricalEquation?: 'Froehlich_2008' | 'MacDonald_1984' | 'USBR_1982' | 'VonThun_1993';
}

export interface HydrographPoint {
  timeHours: number;
  outflowDischargeM3s: number;
  waterLevelM: number;
  breachProgressPercent: number;
}

export interface RiverReachProfile {
  id: string;
  reachName: string;
  distanceFromDamKm: number;
  bedElevationM: number;
  channelWidthM: number;
  manningsN: number;
  crossSectionType: 'trapezoidal' | 'compound_floodplain' | 'canyon_v_shape';
  latitude: number;
  longitude: number;
}

export interface ReachSimulationResult {
  reachId: string;
  reachName: string;
  distanceFromDamKm: number;
  arrivalTimeHours: number;
  peakTimeHours: number;
  peakDischargeM3s: number;
  peakStageM: number;
  maxFloodDepthM: number;
  maxVelocityMs: number;
  hazardRatingHR: number;
  hazardCategory: HazardCategory;
  latitude: number;
  longitude: number;
}

export type HazardCategory = 'LOW' | 'MODERATE' | 'SIGNIFICANT' | 'EXTREME';

export interface SettlementData {
  id: string;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  distanceFromDamKm: number;
  censusPopulation: number;
  elevationM: number;
  dataSource: string;
  modelInundated?: boolean;
  modelArrivalHours?: number;
  modelMaxDepthM?: number;
  modelMaxVelocityMs?: number;
  modelHazardCategory?: HazardCategory;
  modelAffectedPopulation?: number;
}

export interface CriticalFacility {
  id: string;
  name: string;
  type: 'HOSPITAL' | 'POWER_STATION' | 'SUBSTATION' | 'WATER_TREATMENT' | 'BRIDGE' | 'ADMIN_HQ' | 'AIRPORT' | 'DAM_CREST';
  latitude: number;
  longitude: number;
  distanceFromDamKm: number;
  elevationM: number;
  importance: 'CRITICAL_LIFELINE' | 'HIGH_VULNERABILITY' | 'STRATEGIC_ASSET';
  dataSource: string;
  modelInundated?: boolean;
  modelMaxDepthM?: number;
  modelHazardCategory?: HazardCategory;
  modelOperationalStatus?: 'OPERATIONAL' | 'ISOLATED' | 'INUNDATED_UNSAFE';
}

export interface SpatialImpactSummary {
  classification: DataClassification;
  totalSettlementsInReach: number;
  affectedSettlementsCount: number;
  totalCensusPopulationInCorridor: number;
  modelAffectedPopulation: number;
  loadedBuildingFootprintsCount: number;
  modelInundatedBuildingsCount: number;
  totalLoadedRoadNetworkKm: number;
  modelInundatedRoadNetworkKm: number;
  totalCriticalFacilitiesLoaded: number;
  modelImpactedFacilitiesCount: number;
  economicLossStatus: 'DATA_NOT_CONFIGURED';
  economicLossNote: string;
}

export interface FloodPolygonFeature {
  type: 'Feature';
  properties: {
    id: string;
    reachId: string;
    reachName: string;
    distanceKm: number;
    depthM: number;
    velocityMs: number;
    hazardRating: number;
    hazardClass: HazardCategory;
    arrivalTimeHours: number;
    peakTimeHours: number;
    depthZone: '<1.5m' | '1.5-3.0m' | '3.0-5.0m' | '>5.0m';
  };
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][]; // [lng, lat][] in GeoJSON standard
  };
}

export interface FloodGeoJsonCollection {
  type: 'FeatureCollection';
  features: FloodPolygonFeature[];
}

export interface HydroSimulationOutput {
  simulationId: string;
  classification: DataClassification;
  timestamp: string;
  scenarioName: string;
  damId: string;
  selectedDamId?: string;
  damName: string;
  riverName: string;
  locationName: string;
  solverType: SolverType;
  solverModelLabel: string;
  isMLSurrogate: boolean;
  demId: DemDatasetType;
  peakBreachOutflowM3s: number;
  timeToPeakHours: number;
  totalOutflowVolumeMCM: number;
  maxFloodDepthM: number;
  maxFlowVelocityMs: number;
  totalInundationAreaKm2: number;
  waveFrontFrontierKm: number;
  hydrograph: HydrographPoint[];
  reachResults: ReachSimulationResult[];
  spatialImpact: SpatialImpactSummary;
  floodExtentGeoJson: FloodGeoJsonCollection;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface ExternalServiceStatus {
  id: string;
  name: string;
  type: string;
  status: 'CONNECTED' | 'NOT_CONNECTED';
  source: string;
  lastFetchDate?: string;
  notes: string;
  classification: DataClassification;
}

export interface AIScenarioInterpretation {
  damId: string;
  damName?: string;
  failureMode: FailureMode;
  breachWidth: number;
  breachFormationTimeHours: number;
  simulationDurationHours?: number;
  reservoirWaterLevel: number;
  empiricalEquation: 'Froehlich_2008' | 'MacDonald_1984' | 'USBR_1982' | 'VonThun_1993';
  confidenceScore: number;
  confidence?: number;
  explanation: string;
  hazardWarnings: string[];
  suggestedMitigation: string;
  isFeatherlessModel: boolean;
}

export interface SphParticleData {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  pressure: number;
  density: number;
  depthM: number;
}

export interface SphSimulationOutput {
  solver: 'SPH_SmoothedParticle';
  particleCount: number;
  kernelRadiusM: number;
  timeStepSec: number;
  peakDischargeM3s: number;
  maxWaveFrontVelocityMs: number;
  threeDVerticalVorticityMax: number;
  reachDepthsM: { reachId: string; depthM: number; velocityMs: number; arrivalTimeHours: number }[];
  totalInundationAreaKm2: number;
  computationTimeSec: number;
}

export interface Delft3DOutput {
  solver: 'Delft3D_FlexibleMesh';
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'SIMULATED' | 'IMPORTED';
  meshCellCount: number;
  gridType: 'Flexible_Unstructured_Mesh';
  peakDischargeM3s: number;
  maxWaveFrontVelocityMs: number;
  farFieldFloodplainAreaKm2: number;
  reachDepthsM: { reachId: string; depthM: number; velocityMs: number; arrivalTimeHours: number }[];
  totalInundationAreaKm2: number;
  computationTimeSec: number;
}

export interface ModelComparisonMetrics {
  damId: string;
  damName: string;
  scenarioName: string;
  peakDischargeDeltaM3s: number;
  peakDischargePercentDiff: number;
  inundationAreaDeltaKm2: number;
  spatialIntersectionOverUnionIoU: number;
  crossSectionDepthRmseM: number;
  meanAbsoluteErrorMaeM: number;
  reachComparisons: {
    reachId: string;
    reachName: string;
    distanceKm: number;
    depthSphM: number;
    depthDelft3dM: number;
    depthDeltaM: number;
    velocitySphMs: number;
    velocityDelft3dMs: number;
    velocityDeltaMs: number;
    arrivalSphHours: number;
    arrivalDelft3dHours: number;
  }[];
  scientificAnalysis: {
    nearFieldHydrodynamics: string;
    farFieldFloodplainDiffusion: string;
    hydraulicJumpLocation: string;
    recommendedApplication: string;
  };
}

export interface CustomDemUpload {
  fileName: string;
  fileSizeBytes: number;
  format: 'GeoTIFF' | 'ASCII_Grid' | 'XYZ';
  crs: string;
  resolutionM: number;
  bounds: { north: number; south: number; east: number; west: number };
  minElevationM: number;
  maxElevationM: number;
  uploadedAt: string;
}
