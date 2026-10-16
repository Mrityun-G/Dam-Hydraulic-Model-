import React, { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import {
  downloadGeoJson,
  downloadKml,
  downloadCsv,
  downloadShpPackage,
} from "../../services/api";
import { exportSimulationShapefileZip } from "../../services/gisExporter";
import { INDIAN_DAMS_REGISTRY } from "../../data/damData";

export function FinalExportView({
  selectedDamId,
  onSelectDam,
  onBack,
  simulationResult,
}) {
  const [cardStatus, setCardStatus] = useState({
    geojson: { state: "idle", message: "" },
    shp: { state: "idle", message: "" },
    kml: { state: "idle", message: "" },
    csv: { state: "idle", message: "" },
  });
  const [globalFeedback, setGlobalFeedback] = useState(null);

  const activeDam =
    INDIAN_DAMS_REGISTRY.find((d) => d.id === selectedDamId) ||
    INDIAN_DAMS_REGISTRY[0];

  // Validate simulation data: must be present and match selected dam if damId is specified
  const hasValidSimulation = Boolean(
    simulationResult &&
      (!simulationResult.damId || simulationResult.damId === selectedDamId)
  );

  const setCardState = (cardKey, state, message = "") => {
    setCardStatus((prev) => ({
      ...prev,
      [cardKey]: { state, message },
    }));

    if (state === "completed") {
      setTimeout(() => {
        setCardStatus((prev) => {
          if (prev[cardKey]?.state === "completed") {
            return { ...prev, [cardKey]: { state: "idle", message: "" } };
          }
          return prev;
        });
      }, 4500);
    }
  };

  const showFeedback = (type, message) => {
    setGlobalFeedback({ type, message });
    if (type === "success") {
      setTimeout(() => setGlobalFeedback(null), 6000);
    }
  };

  // 1. Export GeoJSON
  const handleExportGeoJson = async () => {
    if (!hasValidSimulation) return;
    setCardState("geojson", "exporting");
    setGlobalFeedback(null);
    try {
      await downloadGeoJson(simulationResult);
      setCardState("geojson", "completed");
      showFeedback("success", `GeoJSON export completed for ${simulationResult.damName || activeDam.name}. File downloaded.`);
    } catch (err) {
      const errMsg = err.message || "GeoJSON export failed";
      setCardState("geojson", "failed", errMsg);
      showFeedback("error", `GeoJSON Export Error: ${errMsg}`);
    }
  };

  // 2. Export Shapefile
  const handleExportShapefile = async () => {
    if (!hasValidSimulation) return;
    setCardState("shp", "exporting");
    setGlobalFeedback(null);
    try {
      const zipSuccess = exportSimulationShapefileZip(simulationResult);
      if (zipSuccess) {
        setCardState("shp", "completed");
        showFeedback("success", `ESRI Shapefile Bundle (.zip) downloaded for ${simulationResult.damName || activeDam.name}.`);
      } else {
        await downloadShpPackage(simulationResult);
        setCardState("shp", "completed");
        showFeedback("success", `Shapefile Schema Package (.json) downloaded for ${simulationResult.damName || activeDam.name}.`);
      }
    } catch (err) {
      const errMsg = err.message || "Shapefile export failed";
      setCardState("shp", "failed", errMsg);
      showFeedback("error", `Shapefile Export Error: ${errMsg}`);
    }
  };

  // 3. Export KML
  const handleExportKml = async () => {
    if (!hasValidSimulation) return;
    setCardState("kml", "exporting");
    setGlobalFeedback(null);
    try {
      await downloadKml(simulationResult);
      setCardState("kml", "completed");
      showFeedback("success", `Google Earth KML export completed for ${simulationResult.damName || activeDam.name}. File downloaded.`);
    } catch (err) {
      const errMsg = err.message || "KML export failed";
      setCardState("kml", "failed", errMsg);
      showFeedback("error", `KML Export Error: ${errMsg}`);
    }
  };

  // 4. Export CSV
  const handleExportCsv = async () => {
    if (!hasValidSimulation) return;
    setCardState("csv", "exporting");
    setGlobalFeedback(null);
    try {
      await downloadCsv(simulationResult);
      setCardState("csv", "completed");
      showFeedback("success", `Simulation hydrograph CSV export completed for ${simulationResult.damName || activeDam.name}. File downloaded.`);
    } catch (err) {
      const errMsg = err.message || "CSV export failed";
      setCardState("csv", "failed", errMsg);
      showFeedback("error", `CSV Export Error: ${errMsg}`);
    }
  };

  const renderButtonContent = (key) => {
    const status = cardStatus[key]?.state;
    if (status === "exporting") {
      return (
        <>
          <span className="spinner-dot" />
          <span>EXPORTING...</span>
        </>
      );
    }
    if (status === "completed") {
      return (
        <>
          <span>✓</span>
          <span>EXPORT COMPLETED</span>
        </>
      );
    }
    if (status === "failed") {
      return (
        <>
          <span>⚠</span>
          <span>EXPORT FAILED</span>
        </>
      );
    }
    return "EXPORT";
  };

  const getButtonClass = (key) => {
    const status = cardStatus[key]?.state;
    if (status === "completed") return "final-export-btn btn-completed";
    if (status === "failed") return "final-export-btn btn-failed";
    if (status === "exporting") return "final-export-btn btn-exporting";
    return "final-export-btn";
  };

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Export Data"
        feature="Final Export"
        title="FINAL EXPORT"
        description="Export simulation and flood analysis data in GIS and tabular formats."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      {globalFeedback && (
        <div
          className={`final-export-feedback feedback-${globalFeedback.type}`}
          role="alert"
        >
          <span className="feedback-icon">
            {globalFeedback.type === "success" ? "✓" : "⚠"}
          </span>
          <span className="feedback-text">{globalFeedback.message}</span>
          <button
            type="button"
            className="feedback-dismiss"
            onClick={() => setGlobalFeedback(null)}
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Warning when no simulation result is available */}
      {!hasValidSimulation ? (
        <div className="final-export-warning-banner">
          <div className="warning-icon-wrapper">
            <span className="warning-symbol">⚠️</span>
          </div>
          <div className="warning-content">
            <h3 className="warning-title">
              No simulation result available. Run a simulation before exporting.
            </h3>
            <p className="warning-desc">
              GIS and tabular exports require active hydrodynamic model output for{" "}
              <strong>{activeDam.name}</strong>. Please run a simulation from{" "}
              <strong>Model Input</strong> or <strong>3D Simulation</strong> to generate peak outflows, inundation boundaries, and reach hydrograph data.
            </p>
          </div>
        </div>
      ) : (
        <div className="final-export-active-sim-banner">
          <div className="active-sim-badge">ACTIVE DATASET</div>
          <div className="active-sim-details">
            <div className="sim-meta-item">
              <span className="sim-meta-label">DAM TARGET:</span>
              <strong className="sim-meta-value">{simulationResult.damName || activeDam.name}</strong>
            </div>
            <div className="sim-meta-item">
              <span className="sim-meta-label">SIMULATION ID:</span>
              <span className="sim-meta-code">{simulationResult.simulationId || "SIM-RUN-ACTIVE"}</span>
            </div>
            <div className="sim-meta-item">
              <span className="sim-meta-label">PEAK OUTFLOW:</span>
              <strong className="sim-meta-value">
                {simulationResult.peakBreachOutflowM3s
                  ? `${simulationResult.peakBreachOutflowM3s.toLocaleString()} m³/s`
                  : "Available"}
              </strong>
            </div>
            <div className="sim-meta-item">
              <span className="sim-meta-label">INUNDATED AREA:</span>
              <strong className="sim-meta-value">
                {simulationResult.totalInundationAreaKm2
                  ? `${simulationResult.totalInundationAreaKm2.toFixed(2)} km²`
                  : "Calculated"}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 4 Clean Export Cards / Tiles */}
      <div className="final-export-grid">
        {/* Card 1: Export GeoJSON */}
        <div className={`final-export-card ${!hasValidSimulation ? "disabled-card" : ""}`}>
          <div className="card-top-row">
            <div className="card-icon-bubble">🗺️</div>
            <span className="card-format-tag">RFC 7946</span>
          </div>
          <div className="card-body">
            <h3 className="card-title">Export GeoJSON</h3>
            <p className="card-desc">Flood extent / GIS data</p>
          </div>
          <div className="card-footer">
            <button
              type="button"
              className={getButtonClass("geojson")}
              onClick={handleExportGeoJson}
              disabled={!hasValidSimulation || cardStatus.geojson.state === "exporting"}
              title={
                !hasValidSimulation
                  ? "No simulation result available. Run a simulation before exporting."
                  : "Export GeoJSON flood extent boundaries"
              }
            >
              {renderButtonContent("geojson")}
            </button>
            {cardStatus.geojson.state === "failed" && cardStatus.geojson.message && (
              <span className="card-inline-error">{cardStatus.geojson.message}</span>
            )}
          </div>
        </div>

        {/* Card 2: Export Shapefile */}
        <div className={`final-export-card ${!hasValidSimulation ? "disabled-card" : ""}`}>
          <div className="card-top-row">
            <div className="card-icon-bubble">📦</div>
            <span className="card-format-tag">ESRI ZIP / SHP</span>
          </div>
          <div className="card-body">
            <h3 className="card-title">Export Shapefile</h3>
            <p className="card-desc">GIS shapefile package</p>
          </div>
          <div className="card-footer">
            <button
              type="button"
              className={getButtonClass("shp")}
              onClick={handleExportShapefile}
              disabled={!hasValidSimulation || cardStatus.shp.state === "exporting"}
              title={
                !hasValidSimulation
                  ? "No simulation result available. Run a simulation before exporting."
                  : "Export ESRI Shapefile bundle"
              }
            >
              {renderButtonContent("shp")}
            </button>
            {cardStatus.shp.state === "failed" && cardStatus.shp.message && (
              <span className="card-inline-error">{cardStatus.shp.message}</span>
            )}
          </div>
        </div>

        {/* Card 3: Export KML */}
        <div className={`final-export-card ${!hasValidSimulation ? "disabled-card" : ""}`}>
          <div className="card-top-row">
            <div className="card-icon-bubble">🌐</div>
            <span className="card-format-tag">OGC KML 2.2</span>
          </div>
          <div className="card-body">
            <h3 className="card-title">Export KML</h3>
            <p className="card-desc">Google Earth compatible</p>
          </div>
          <div className="card-footer">
            <button
              type="button"
              className={getButtonClass("kml")}
              onClick={handleExportKml}
              disabled={!hasValidSimulation || cardStatus.kml.state === "exporting"}
              title={
                !hasValidSimulation
                  ? "No simulation result available. Run a simulation before exporting."
                  : "Export Google Earth KML"
              }
            >
              {renderButtonContent("kml")}
            </button>
            {cardStatus.kml.state === "failed" && cardStatus.kml.message && (
              <span className="card-inline-error">{cardStatus.kml.message}</span>
            )}
          </div>
        </div>

        {/* Card 4: Export CSV */}
        <div className={`final-export-card ${!hasValidSimulation ? "disabled-card" : ""}`}>
          <div className="card-top-row">
            <div className="card-icon-bubble">📊</div>
            <span className="card-format-tag">RFC 4180 CSV</span>
          </div>
          <div className="card-body">
            <h3 className="card-title">Export CSV</h3>
            <p className="card-desc">Simulation/tabular data</p>
          </div>
          <div className="card-footer">
            <button
              type="button"
              className={getButtonClass("csv")}
              onClick={handleExportCsv}
              disabled={!hasValidSimulation || cardStatus.csv.state === "exporting"}
              title={
                !hasValidSimulation
                  ? "No simulation result available. Run a simulation before exporting."
                  : "Export reach cross-sections and hydrograph time-series to CSV"
              }
            >
              {renderButtonContent("csv")}
            </button>
            {cardStatus.csv.state === "failed" && cardStatus.csv.message && (
              <span className="card-inline-error">{cardStatus.csv.message}</span>
            )}
          </div>
        </div>
      </div>

      {/* Scoped Flow Guard Styling */}
      <style>{`
        .final-export-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
          margin-top: 24px;
        }

        .final-export-card {
          background: linear-gradient(180deg, rgba(8, 20, 30, 0.92) 0%, rgba(3, 10, 16, 0.96) 100%);
          border: 1px solid rgba(0, 230, 200, 0.22);
          border-radius: 12px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 220px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
          transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
        }

        .final-export-card:hover:not(.disabled-card) {
          transform: translateY(-3px);
          border-color: rgba(0, 230, 200, 0.6);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6), 0 0 18px rgba(0, 230, 200, 0.12);
        }

        .final-export-card.disabled-card {
          opacity: 0.68;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .card-icon-bubble {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(0, 230, 200, 0.08);
          border: 1px solid rgba(0, 230, 200, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }

        .card-format-tag {
          font-family: monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.8px;
          color: #00e6c8;
          background: rgba(0, 230, 200, 0.1);
          border: 1px solid rgba(0, 230, 200, 0.28);
          padding: 3px 8px;
          border-radius: 4px;
        }

        .card-body {
          flex: 1;
          margin-bottom: 20px;
        }

        .card-title {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 6px 0;
          letter-spacing: -0.2px;
        }

        .card-desc {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
          line-height: 1.45;
        }

        .card-footer {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .final-export-btn {
          width: 100%;
          background: rgba(0, 230, 200, 0.14);
          border: 1px solid rgba(0, 230, 200, 0.45);
          color: #00e6c8;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-family: monospace;
          font-weight: 800;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
        }

        .final-export-btn:hover:not(:disabled) {
          background: #00e6c8;
          color: #001018;
          box-shadow: 0 0 16px rgba(0, 230, 200, 0.5);
        }

        .final-export-btn:disabled {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.35);
          cursor: not-allowed;
          box-shadow: none;
        }

        .final-export-btn.btn-exporting {
          background: rgba(0, 230, 200, 0.25);
          color: #00e6c8;
          border-color: #00e6c8;
        }

        .final-export-btn.btn-completed {
          background: rgba(16, 185, 129, 0.22);
          border-color: #10b981;
          color: #34d399;
          box-shadow: 0 0 14px rgba(16, 185, 129, 0.35);
        }

        .final-export-btn.btn-failed {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: #f87171;
        }

        .spinner-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00e6c8;
          animation: pulse-dot 0.8s infinite alternate ease-in-out;
        }

        @keyframes pulse-dot {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.3); }
        }

        .card-inline-error {
          font-size: 11px;
          color: #f87171;
          font-family: monospace;
          margin-top: 4px;
          display: block;
          word-break: break-word;
        }

        /* Warning Banner */
        .final-export-warning-banner {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(180, 83, 9, 0.08) 100%);
          border: 1px solid rgba(245, 158, 11, 0.4);
          border-radius: 10px;
          padding: 18px 22px;
          margin-bottom: 24px;
        }

        .warning-icon-wrapper {
          font-size: 26px;
          line-height: 1;
        }

        .warning-content h3 {
          margin: 0 0 6px 0;
          font-size: 15px;
          font-weight: 700;
          color: #fbbf24;
          letter-spacing: -0.2px;
        }

        .warning-content p {
          margin: 0;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.5;
        }

        /* Active Sim Summary Banner */
        .final-export-active-sim-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          background: linear-gradient(90deg, rgba(0, 230, 200, 0.08) 0%, rgba(8, 20, 30, 0.9) 100%);
          border: 1px solid rgba(0, 230, 200, 0.35);
          border-radius: 10px;
          padding: 16px 22px;
          margin-bottom: 24px;
        }

        .active-sim-badge {
          font-family: monospace;
          font-size: 11px;
          font-weight: 800;
          color: #00e6c8;
          background: rgba(0, 230, 200, 0.15);
          border: 1px solid rgba(0, 230, 200, 0.4);
          padding: 4px 10px;
          border-radius: 4px;
          letter-spacing: 1px;
        }

        .active-sim-details {
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .sim-meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sim-meta-label {
          font-size: 10px;
          font-family: monospace;
          color: #94a3b8;
          letter-spacing: 0.8px;
        }

        .sim-meta-value {
          font-size: 13px;
          color: #ffffff;
        }

        .sim-meta-code {
          font-size: 12px;
          font-family: monospace;
          color: #00e6c8;
        }

        /* Global Feedback Banner */
        .final-export-feedback {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .feedback-success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #34d399;
        }

        .feedback-error {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .feedback-dismiss {
          margin-left: auto;
          background: transparent;
          border: none;
          color: inherit;
          font-size: 14px;
          cursor: pointer;
          opacity: 0.7;
        }

        .feedback-dismiss:hover {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}
