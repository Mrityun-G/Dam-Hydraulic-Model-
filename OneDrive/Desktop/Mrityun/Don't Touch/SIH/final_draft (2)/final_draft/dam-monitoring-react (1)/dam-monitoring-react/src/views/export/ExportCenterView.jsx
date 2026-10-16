import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { UnifiedSubnav } from "../../components/common/UnifiedSubnav";
import {
  runSimulation,
  downloadGeoJson,
  downloadKml,
  downloadCsv,
  downloadShpPackage,
  downloadTextDocument,
  getDamById,
} from "../../services/api";
import { exportSimulationShapefileZip } from "../../services/gisExporter";

export function ExportCenterView({
  selectedDamId,
  onSelectDam,
  onBack,
  activeSubFeature = "Decision Support",
}) {
  const [activeTab, setActiveTab] = useState(activeSubFeature);
  const [simOutput, setSimOutput] = useState(null);
  const [damSpecs, setDamSpecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setActiveTab(activeSubFeature);
  }, [activeSubFeature]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sim, dam] = await Promise.all([
        runSimulation({ selectedDamId }),
        getDamById(selectedDamId),
      ]);
      setSimOutput(sim);
      setDamSpecs(dam);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDamId]);

  const notifySuccess = (msg) => {
    setFeedback({ type: "success", message: msg });
    setTimeout(() => setFeedback(null), 5000);
  };

  const notifyError = (msg) => {
    setFeedback({ type: "error", message: msg });
  };

  // 1. GeoJSON Download
  const handleExportGeoJson = async () => {
    if (!simOutput) return;
    setExporting(true);
    try {
      await downloadGeoJson(simOutput);
      notifySuccess(`Downloaded GeoJSON Inundation Boundaries for ${simOutput.damName}`);
    } catch (err) {
      notifyError(`GeoJSON Export Error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // 2. KML Download
  const handleExportKml = async () => {
    if (!simOutput) return;
    setExporting(true);
    try {
      await downloadKml(simOutput);
      notifySuccess(`Downloaded Google Earth KML for ${simOutput.damName}`);
    } catch (err) {
      notifyError(`KML Export Error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // 3. CSV Download
  const handleExportCsv = async () => {
    if (!simOutput) return;
    setExporting(true);
    try {
      await downloadCsv(simOutput);
      notifySuccess(`Downloaded Hydrograph & Reach CSV for ${simOutput.damName}`);
    } catch (err) {
      notifyError(`CSV Export Error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // 4. Shapefile Schema Package Download
  const handleExportShpPackage = async () => {
    if (!simOutput) return;
    setExporting(true);
    try {
      const ok = exportSimulationShapefileZip(simOutput);
      if (ok) {
        notifySuccess(`Downloaded ESRI Shapefile Bundle (.zip) for ${simOutput.damName}`);
      } else {
        await downloadShpPackage(simOutput);
        notifySuccess(`Downloaded ESRI Shapefile Schema Package (.json) for ${simOutput.damName}`);
      }
    } catch (err) {
      notifyError(`Shapefile Export Error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // 5. AI Risk Analysis Report Export
  const handleExportAiReport = () => {
    if (!simOutput || !damSpecs) return;
    const content = `# DAMBREAK HYDRO-SIM: AI RISK ANALYSIS & HAZARD EVALUATION REPORT
======================================================================
Dam Name:            ${damSpecs.name}
River Basin:         ${damSpecs.location.river} River (${damSpecs.location.basin})
State / District:    ${damSpecs.location.district}, ${damSpecs.location.state}
Simulation ID:       ${simOutput.simulationId}
Timestamp:           ${simOutput.timestamp}
Governing Solver:    ${simOutput.solverModelLabel || simOutput.solverType}

1. EXECUTIVE PEAK HYDROLOGY
----------------------------------------------------------------------
- Peak Breach Outflow (Qp):     ${simOutput.peakBreachOutflowM3s?.toLocaleString()} m³/s
- Time to Peak Discharge:       ${simOutput.timeToPeakHours} hours
- Maximum Flood Inundation:     ${simOutput.maxFloodDepthM} meters
- Maximum Wave Velocity:        ${simOutput.maxFlowVelocityMs} m/s
- Total Inundation Area:        ${simOutput.totalInundationAreaKm2} km²
- Total Reservoir Drain Volume: ${simOutput.totalOutflowVolumeMCM} MCM

2. SPATIAL IMPACT & POPULATION AT RISK
----------------------------------------------------------------------
- Exposed Census Population:   ${simOutput.spatialImpact?.modelAffectedPopulation?.toLocaleString()} residents
- Habitations in Floodplain:   ${simOutput.spatialImpact?.affectedSettlementsCount} of ${simOutput.spatialImpact?.totalSettlementsInReach} mapped settlements
- Critical Lifelines Exposed:  ${simOutput.spatialImpact?.modelImpactedFacilitiesCount} facilities (hospitals, bridges, substations)
- Submerged Road Network:      ${simOutput.spatialImpact?.modelInundatedRoadNetworkKm} km

3. DOWNSTREAM REACH SCHEDULE
----------------------------------------------------------------------
${simOutput.reachResults?.map((r) => `${r.reachName.padEnd(30)} | ${(r.distanceFromDamKm + "km").padEnd(8)} | Arrival: T+${r.arrivalTimeHours}h | Depth: ${r.maxFloodDepthM.toFixed(1)}m | ${r.hazardCategory}`).join("\n")}

Report Generated by Flow Guard DamSentinel AI Engine.
`;
    downloadTextDocument(content, `${simOutput.damId}_AI_Risk_Report_${simOutput.simulationId}.txt`);
    notifySuccess(`Downloaded AI Risk Analysis Report for ${simOutput.damName}`);
  };

  // 6. Emergency Action Plan (EAP) Export
  const handleExportEapReport = () => {
    if (!simOutput || !damSpecs) return;
    const content = `# NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA)
======================================================================
EMERGENCY ACTION PLAN (EAP) — DAM BREAK INCIDENT DIRECTIVE
======================================================================
FACILITY:            ${damSpecs.name} (${damSpecs.location.river} River, ${damSpecs.location.state})
MWL / FRL:           ${damSpecs.maximumWaterLevelMWL} m MSL / ${damSpecs.fullReservoirLevelFRL} m MSL
INCIDENT RUN ID:     ${simOutput.simulationId}
CLASSIFICATION:      CATASTROPHIC BREACH PROTOCOL (STAGE-3)

PHASE 1: T+0.0h to T+1.0h (DAM-TOE FLASH ZONE)
- Sound automated multi-frequency sirens along the 10km river corridor below ${damSpecs.name}.
- Halt all urban and irrigation water intake pumps along the Mahanadi main channel.
- Alert Sambalpur District Emergency Operations Centre (DEOC).

PHASE 2: T+1.0h to T+3.0h (HIGHWAY & BRIDGE CLOSURE)
- Close NH-53 / AH46 Major Bridge across the river corridor.
- Initiate police barricades at all arterial river crossings.
- Evacuate low-elevation wards to pre-designated cyclone and flood shelters.

PHASE 3: T+3.0h+ (REGIONAL RELIEF MOBILIZATION)
- Deploy NDRF 3rd Battalion rescue boats to high-hazard inundation sectors.
- Coordinate with Odisha State Disaster Management Authority (OSDMA) for emergency food/medical drops.
`;
    downloadTextDocument(content, `${simOutput.damId}_Emergency_Action_Plan_${simOutput.simulationId}.txt`);
    notifySuccess(`Downloaded Emergency Action Plan for ${simOutput.damName}`);
  };

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Export Data"
        feature={activeTab}
        title="Scientific GIS & Hydrodynamic Data Export Center"
        description="Download model-derived spatial boundary GeoJSON polygons, Google Earth KML files, reach hydrographs in CSV, and ESRI Shapefile packages."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      {feedback && (
        <div className={`export-feedback-banner feedback-${feedback.type}`}>
          <span>{feedback.type === "success" ? "✓" : "⚠️"}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Sub-Feature Tab Selection Bar */}
      <UnifiedSubnav
        tabs={[
          { id: "AI Risk Analysis", label: "AI Risk Analysis" },
          { id: "Predictive Analytics", label: "Predictive Analytics" },
          { id: "AI Recommendations", label: "AI Recommendations" },
          { id: "Decision Support", label: "Decision Support" },
        ]}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />

      <StateContainer loading={loading} error={error} onRetry={loadData}>
        {simOutput && damSpecs && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="EXPORT DATASET TARGET"
                value={damSpecs.name}
                badge="ACTIVE PROFILE"
                badgeType="info"
                subtitle={`${damSpecs.location.river} Basin`}
              />
              <MetricCard
                title="SPATIAL EXTENT DATA"
                value={`${simOutput.totalInundationAreaKm2?.toFixed(1)} km²`}
                badge="VECTOR POLYGONS"
                badgeType="danger"
                subtitle="Inundation footprint"
              />
              <MetricCard
                title="HYDROGRAPH POINTS"
                value={simOutput.hydrograph?.length || 97}
                unit="time steps"
                badge="CSV READY"
                badgeType="success"
                subtitle="15-min interval resolution"
              />
              <MetricCard
                title="GIS COORDINATE SYSTEM"
                value="EPSG:4326"
                badge="WGS 84"
                badgeType="info"
                subtitle="Standard Global Lat/Long"
              />
            </div>

            {/* TAB 1: AI Risk Analysis Export */}
            {activeTab === "AI Risk Analysis" && (
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">EXPORT AI RISK ANALYSIS REPORT</span>
                  <span className="panel-badge">DOCUMENTATION</span>
                </div>
                <p className="panel-desc">
                  Generates an exhaustive technical analysis report combining physical hydrodynamic metrics with AI scenario interpretation warnings, mitigation guidelines, and reach propagation timelines.
                </p>

                <div className="export-action-box">
                  <div className="export-info">
                    <strong>Technical Advisory Document (.txt / Markdown)</strong>
                    <span>Includes Executive Summary, Population Exposure Matrix, and Hydraulic Peak Telemetry</span>
                  </div>
                  <button
                    type="button"
                    className="action-button-primary"
                    onClick={handleExportAiReport}
                    disabled={exporting}
                  >
                    DOWNLOAD AI RISK REPORT
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Predictive Analytics Export */}
            {activeTab === "Predictive Analytics" && (
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">EXPORT PREDICTIVE HYDROGRAPH &amp; REACH CSV</span>
                  <span className="panel-badge">TABULAR DATA</span>
                </div>
                <p className="panel-desc">
                  Direct download of numerical hydrodynamic time-series, flood arrival times, peak stage elevations, maximum velocities, and UK Defra FD2320 hazard ratings.
                </p>

                <div className="export-action-box">
                  <div className="export-info">
                    <strong>Complete Simulation Hydrograph (.csv)</strong>
                    <span>Contains 97 time-series records and downstream reach cross-sections</span>
                  </div>
                  <button
                    type="button"
                    className="action-button-primary"
                    onClick={handleExportCsv}
                    disabled={exporting}
                  >
                    {exporting ? "DOWNLOADING..." : "DOWNLOAD CSV DATASET"}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: AI Recommendations Export */}
            {activeTab === "AI Recommendations" && (
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">EXPORT EMERGENCY ACTION PLAN (EAP)</span>
                  <span className="panel-badge">SOP DIRECTIVE</span>
                </div>
                <p className="panel-desc">
                  Official Emergency Action Plan protocol briefing designed for National / State Disaster Management Authorities (NDMA / SDMA) detailing phased evacuation windows and critical infrastructure protection.
                </p>

                <div className="export-action-box">
                  <div className="export-info">
                    <strong>Emergency Action Plan Directive (.txt)</strong>
                    <span>Multi-stage incident protocol with timing buffers and rescue routing</span>
                  </div>
                  <button
                    type="button"
                    className="action-button-primary"
                    onClick={handleExportEapReport}
                    disabled={exporting}
                  >
                    DOWNLOAD EMERGENCY ACTION PLAN
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Decision Support GIS Packages Export */}
            {activeTab === "Decision Support" && (
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">DECISION SUPPORT SPATIAL GIS PACKAGES</span>
                  <span className="panel-badge">GIS REPOSITORIES</span>
                </div>
                <p className="panel-desc">
                  Export model-derived flood inundation layers into industry-standard GIS formats compatible with QGIS, ArcGIS, Google Earth, and Web Map Services.
                </p>

                <div className="export-grid-four">
                  <div className="export-tile">
                    <div className="export-tile-icon">🗺️</div>
                    <div className="export-tile-title">GeoJSON Features</div>
                    <p>RFC 7946 Polygon FeatureCollection of downstream flood boundaries.</p>
                    <button
                      type="button"
                      className="tile-download-btn"
                      onClick={handleExportGeoJson}
                      disabled={exporting}
                    >
                      Download .geojson
                    </button>
                  </div>

                  <div className="export-tile">
                    <div className="export-tile-icon">📦</div>
                    <div className="export-tile-title">ESRI Shapefile Bundle</div>
                    <p>Zipped shapefile package containing .shp, .shx, .dbf, and .prj metadata.</p>
                    <button
                      type="button"
                      className="tile-download-btn"
                      onClick={handleExportShpPackage}
                      disabled={exporting}
                    >
                      Download .zip Bundle
                    </button>
                  </div>

                  <div className="export-tile">
                    <div className="export-tile-icon">🌐</div>
                    <div className="export-tile-title">Google Earth KML</div>
                    <p>3D Keyhole Markup Language file for Google Earth desktop and browser.</p>
                    <button
                      type="button"
                      className="tile-download-btn"
                      onClick={handleExportKml}
                      disabled={exporting}
                    >
                      Download .kml
                    </button>
                  </div>

                  <div className="export-tile">
                    <div className="export-tile-icon">📊</div>
                    <div className="export-tile-title">Reach Results CSV</div>
                    <p>Tabular dataset of cross-section depth, velocity, and arrival timestamps.</p>
                    <button
                      type="button"
                      className="tile-download-btn"
                      onClick={handleExportCsv}
                      disabled={exporting}
                    >
                      Download .csv
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </StateContainer>
    </div>
  );
}
