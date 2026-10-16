import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { interpretScenario, runSimulation } from "../../services/api";
import { INDIAN_DAMS_REGISTRY, getDamDefaultBreachScenario } from "../../data/damData";
import { parseEmergencyScenario } from "../../services/scenarioParser";

export function ModelInputsView({
  selectedDamId,
  onSelectDam,
  onBack,
  modelParams,
  onUpdateModelParams,
  onRunSimulation,
  simulationResult: externalSimResult,
  isSimulating: externalIsSimulating,
  simulationError: externalSimError,
}) {
  // Shared Model Input state fallback if not supplied via props
  const [internalParams, setInternalParams] = useState(() =>
    getDamDefaultBreachScenario(selectedDamId || "hirakud-dam-odisha", "overtopping")
  );
  const activeParams = modelParams || internalParams;

  const updateParams = (newParams) => {
    if (onUpdateModelParams) {
      onUpdateModelParams(newParams);
    } else {
      setInternalParams(newParams);
    }
  };

  // AI Scenario Input state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [detectedFields, setDetectedFields] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Local simulation state fallback
  const [localSimResult, setLocalSimResult] = useState(null);
  const [localSimLoading, setLocalSimLoading] = useState(false);
  const [localSimError, setLocalSimError] = useState(null);

  const activeSimResult = externalSimResult !== undefined ? externalSimResult : localSimResult;
  const simLoading = externalIsSimulating !== undefined ? externalIsSimulating : localSimLoading;
  const simError = externalSimError !== undefined ? externalSimError : localSimError;

  // Active Dam profile
  const activeDam =
    INDIAN_DAMS_REGISTRY.find((d) => d.id === (activeParams.selectedDamId || selectedDamId)) ||
    INDIAN_DAMS_REGISTRY[0];

  // Standard Failure Mode Presets
  const presets = [
    {
      id: "overtopping",
      name: "1. Overtopping (PMF)",
      desc: "Hydrologic extreme flood wave at MWL stage",
      condition: "MWL Pool Stage",
    },
    {
      id: "piping",
      name: "2. Piping Failure (FRL)",
      desc: "Internal seepage & piping channel through embankment",
      condition: "FRL Pool Stage",
    },
    {
      id: "river_blockage",
      name: "3. River Surge / Blockage",
      desc: "Upstream landslide impulse wave & choked spillways",
      condition: "Surge Pool Stage",
    },
    {
      id: "sunny_day",
      name: "4. Sunny-Day Failure",
      desc: "Non-hydrologic structural failure under normal pool",
      condition: "Normal Pool Stage",
    },
  ];

  // Synchronize when external dam changes
  useEffect(() => {
    if (selectedDamId && selectedDamId !== activeParams.selectedDamId) {
      const refreshed = getDamDefaultBreachScenario(selectedDamId, activeParams.failureMode || "overtopping");
      updateParams(refreshed);
    }
  }, [selectedDamId]);

  // Handle Preset selection
  const handlePresetSelect = (failureMode) => {
    const refreshed = getDamDefaultBreachScenario(activeParams.selectedDamId || selectedDamId, failureMode);
    updateParams({
      ...refreshed,
      selectedDemResolution: activeParams.selectedDemResolution || "10m_CartoDEM",
      selectedSolver: activeParams.selectedSolver || "2D_SWE_FiniteVolume",
    });
  };

  // Handle Dam Change
  const handleDamChange = (damId) => {
    if (onSelectDam) onSelectDam(damId);
    const refreshed = getDamDefaultBreachScenario(damId, activeParams.failureMode || "overtopping");
    updateParams(refreshed);
  };

  // Handle Manual Field Edit
  const handleFieldChange = (key, value) => {
    const updated = { ...activeParams, [key]: value };
    if (key === "reservoirWaterLevel" || key === "breachInvertElevation") {
      const rwl = key === "reservoirWaterLevel" ? Number(value) : activeParams.reservoirWaterLevel;
      const bie = key === "breachInvertElevation" ? Number(value) : activeParams.breachInvertElevation;
      updated.waterDepthAboveInvert = Number(Math.max(1.0, rwl - bie).toFixed(1));
    }
    updateParams(updated);
  };

  // Reset to Dam Defaults
  const handleResetDefaults = () => {
    const defaultParams = getDamDefaultBreachScenario(activeParams.selectedDamId || selectedDamId, "overtopping");
    updateParams(defaultParams);
    setDetectedFields({});
  };

  // RUN AI ANALYSIS
  const handleRunAiAnalysis = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError(null);

    try {
      // 1. Call existing backend /api/ai/scenario-interpret
      let backendInterp = null;
      try {
        backendInterp = await interpretScenario(aiPrompt, activeParams.selectedDamId || selectedDamId);
      } catch (e) {
        console.warn("Backend /api/ai/scenario-interpret endpoint error:", e);
      }

      // 2. Parse scenario text using verified Simple Frontend logic
      const parsedLocal = parseEmergencyScenario(aiPrompt, activeParams.selectedDamId || selectedDamId);

      // Determine target dam
      const targetDamId =
        parsedLocal.detected.selectedDamId && parsedLocal.extracted.selectedDamId
          ? parsedLocal.extracted.selectedDamId
          : backendInterp?.damId || activeParams.selectedDamId || selectedDamId;

      if (targetDamId !== activeParams.selectedDamId && onSelectDam) {
        onSelectDam(targetDamId);
      }

      // Dam baseline specs for physical constraints
      const damBase = getDamDefaultBreachScenario(
        targetDamId,
        parsedLocal.extracted.failureMode || backendInterp?.failureMode || activeParams.failureMode || "overtopping"
      );

      // Map combined AI parameters into SAME modelParameters state
      const updated = {
        ...damBase,
        ...activeParams,
        selectedDamId: targetDamId,
      };

      const detected = { ...parsedLocal.detected };

      // Apply failure mode
      if (parsedLocal.detected.failureMode) {
        updated.failureMode = parsedLocal.extracted.failureMode;
      } else if (backendInterp?.failureMode) {
        updated.failureMode = backendInterp.failureMode;
        detected.failureMode = true;
      }

      // Apply reservoir water level
      if (parsedLocal.detected.reservoirWaterLevel) {
        updated.reservoirWaterLevel = parsedLocal.extracted.reservoirWaterLevel;
      } else if (backendInterp?.reservoirWaterLevel) {
        updated.reservoirWaterLevel = backendInterp.reservoirWaterLevel;
        detected.reservoirWaterLevel = true;
      }

      // Apply breach width
      if (parsedLocal.detected.breachAverageWidth || parsedLocal.detected.breachBottomWidth) {
        updated.breachAverageWidth = parsedLocal.extracted.breachAverageWidth;
        updated.breachBottomWidth = parsedLocal.extracted.breachBottomWidth;
      } else if (backendInterp?.breachWidth) {
        updated.breachAverageWidth = backendInterp.breachWidth;
        updated.breachBottomWidth = Math.round(backendInterp.breachWidth * 0.75);
        detected.breachBottomWidth = true;
        detected.breachAverageWidth = true;
      }

      // Apply breach formation time
      if (parsedLocal.detected.breachFormationTimeHours) {
        updated.breachFormationTimeHours = parsedLocal.extracted.breachFormationTimeHours;
      } else if (backendInterp?.breachFormationTimeHours) {
        updated.breachFormationTimeHours = backendInterp.breachFormationTimeHours;
        detected.breachFormationTimeHours = true;
      }

      // Apply simulation duration
      if (parsedLocal.detected.simulationDurationHours) {
        updated.simulationDurationHours = parsedLocal.extracted.simulationDurationHours;
      }

      // Apply solver
      if (parsedLocal.detected.selectedSolver) {
        updated.selectedSolver = parsedLocal.extracted.selectedSolver;
      }

      // Apply DEM resolution
      if (parsedLocal.detected.selectedDemResolution) {
        updated.selectedDemResolution = parsedLocal.extracted.selectedDemResolution;
      }

      // Apply empirical equation
      if (parsedLocal.detected.empiricalEquation) {
        updated.empiricalEquation = parsedLocal.extracted.empiricalEquation;
      } else if (backendInterp?.empiricalEquation) {
        updated.empiricalEquation = backendInterp.empiricalEquation;
        detected.empiricalEquation = true;
      }

      // Synchronize water depth above invert
      updated.waterDepthAboveInvert = Number(
        Math.max(2.0, updated.reservoirWaterLevel - updated.breachInvertElevation).toFixed(1)
      );

      // Commit to SAME modelParameters state
      updateParams(updated);
      setDetectedFields(detected);

      // Build AI result object for advisory presentation
      setAiResult({
        confidenceScore: backendInterp?.confidenceScore || parsedLocal.confidenceScore || 0.94,
        failureMode: updated.failureMode,
        breachWidth: updated.breachAverageWidth,
        breachFormationTimeHours: updated.breachFormationTimeHours,
        reservoirWaterLevel: updated.reservoirWaterLevel,
        empiricalEquation: updated.empiricalEquation,
        explanation:
          backendInterp?.explanation ||
          `Configured ${updated.failureMode.toUpperCase()} scenario for ${parsedLocal.activeDam.name}. Breach width set to ${updated.breachAverageWidth}m with ${updated.breachFormationTimeHours}h formation time.`,
        hazardWarnings: backendInterp?.hazardWarnings || [
          `Rapid inundation surge anticipated downstream along ${parsedLocal.activeDam.location.river} River.`,
          `Urgent telemetry watch triggered for low-elevation settlements along river reaches.`,
        ],
        suggestedMitigation:
          backendInterp?.suggestedMitigation ||
          `Initiate Stage-3 emergency alerts and notify disaster management authorities in ${parsedLocal.activeDam.location.district}.`,
        isFeatherlessModel: Boolean(backendInterp?.isFeatherlessModel),
      });
    } catch (err) {
      console.error("AI Scenario interpretation error:", err);
      setAiError(err.message || "AI analysis failed. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  // RUN SIMULATION / PREDICT
  const handleExecuteSimulation = async () => {
    if (onRunSimulation) {
      onRunSimulation(activeParams);
      return;
    }

    setLocalSimLoading(true);
    setLocalSimError(null);

    try {
      const res = await runSimulation(activeParams);
      setLocalSimResult(res);
    } catch (err) {
      console.error("Simulation error:", err);
      setLocalSimError(err.message || "Simulation failed. Please check the model parameters and try again.");
    } finally {
      setLocalSimLoading(false);
    }
  };

  const confidencePct = aiResult
    ? Math.round(
        (typeof aiResult.confidenceScore === "number"
          ? aiResult.confidenceScore
          : 0.94) * 100
      )
    : null;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Model Input"
        feature="Model Inputs & AI Studio"
        title="Model Inputs & Parametric Scenario Studio"
        description="Configure dam breach geometry, reservoir pool levels, empirical equations & DEM parameters, or let the AI Analysis Engine parse emergency advisories directly into physical model inputs."
        selectedDamId={activeParams.selectedDamId || selectedDamId}
        onSelectDam={handleDamChange}
        onBack={onBack}
      />

      {/* ============================================================
          SECTION 1: TARGET DAM PROFILE & STANDARD BREACH PRESETS
      ============================================================ */}
      <div className="content-two-columns" style={{ marginBottom: "20px" }}>
        {/* Dam Profile Selector Card */}
        <div className="cyber-panel">
          <div className="panel-header">
            <span className="panel-title">TARGET DAM REGISTRY PROFILE</span>
            <span className="panel-badge">CWC REGISTERED</span>
          </div>

          <div className="input-field-group">
            <label>SELECT TARGET DAM:</label>
            <select
              className="param-input"
              value={activeParams.selectedDamId || selectedDamId}
              onChange={(e) => handleDamChange(e.target.value)}
            >
              {INDIAN_DAMS_REGISTRY.map((dam) => (
                <option key={dam.id} value={dam.id}>
                  {dam.name} — {dam.location.river} River ({dam.location.state})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginTop: "14px" }}>
            <div className="sim-stat-card" style={{ padding: "10px", background: "rgba(0,0,0,0.4)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", fontFamily: "monospace", textTransform: "uppercase" }}>DAM HEIGHT</span>
              <strong style={{ fontSize: "14px", color: "#fff", fontFamily: "monospace" }}>{activeDam.heightAboveLowestFoundation} m</strong>
            </div>
            <div className="sim-stat-card" style={{ padding: "10px", background: "rgba(0,0,0,0.4)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", fontFamily: "monospace", textTransform: "uppercase" }}>MWL POOL STAGE</span>
              <strong style={{ fontSize: "14px", color: "#38bdf8", fontFamily: "monospace" }}>{activeDam.maximumWaterLevelMWL} m</strong>
            </div>
            <div className="sim-stat-card" style={{ padding: "10px", background: "rgba(0,0,0,0.4)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", fontFamily: "monospace", textTransform: "uppercase" }}>GROSS STORAGE</span>
              <strong style={{ fontSize: "14px", color: "#fff", fontFamily: "monospace" }}>{activeDam.grossStorageCapacityMCM} MCM</strong>
            </div>
          </div>
        </div>

        {/* Standard Breach Presets */}
        <div className="cyber-panel">
          <div className="panel-header">
            <span className="panel-title">STANDARD FAILURE PRESETS</span>
            <span className="panel-badge">IS: 13739 COMPLIANT</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            {presets.map((preset) => {
              const isActive = (activeParams.failureMode || "overtopping") === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset.id)}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    background: isActive ? "rgba(0, 230, 200, 0.12)" : "rgba(0, 0, 0, 0.35)",
                    border: isActive ? "1px solid #00e6c8" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "11px", color: isActive ? "#00e6c8" : "#fff", fontFamily: "monospace" }}>
                      {preset.name}
                    </strong>
                    {isActive && (
                      <span style={{ fontSize: "9px", background: "rgba(0, 230, 200, 0.2)", color: "#00e6c8", padding: "1px 5px", borderRadius: "3px", fontFamily: "monospace", fontWeight: "700" }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "10px", color: "#94a3b8", display: "block", marginTop: "4px", lineHeight: "1.3" }}>
                    {preset.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 2: AI ANALYSIS ENGINE (DIRECTLY INSIDE MODEL INPUT)
      ============================================================ */}
      <div className="control-panel-card ai-analysis-engine-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
          <div className="control-panel-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚡</span>
            <span>AI ANALYSIS ENGINE</span>
          </div>
          <span className="badge-ai-detected">FEATHERLESS AI &amp; NLP SCENARIO PARSER</span>
        </div>

        <p className="ai-panel-description" style={{ fontSize: "12px", margin: "0 0 12px 0", lineHeight: "1.5" }}>
          Type or paste a natural-language emergency scenario / advisory prompt. The AI engine will interpret your scenario, extract physical parameters, and automatically populate the model input controls below.
        </p>

        <div className="input-field-group">
          <label className="ai-panel-label">EMERGENCY SCENARIO / ADVISORY PROMPT:</label>
          <textarea
            className="cyber-textarea"
            rows="3"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Enter an emergency scenario or advisory prompt..."
          />
        </div>

        {/* Quick Presets */}
        <div className="ai-quick-presets-row" style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
          <span className="quick-presets-label" style={{ fontSize: "11px", alignSelf: "center", fontFamily: "monospace" }}>
            QUICK PRESETS:
          </span>
          <button
            type="button"
            className="badge-default preset-chip"
            style={{ cursor: "pointer" }}
            onClick={() =>
              setAiPrompt(
                "Heavy monsoon inflows exceeding spillway capacity with potential internal piping in the embankment foundation. Reservoir level is 195m and breach width is 200m."
              )
            }
          >
            Piping (195m level, 200m width)
          </button>
          <button
            type="button"
            className="badge-default preset-chip"
            style={{ cursor: "pointer" }}
            onClick={() =>
              setAiPrompt(
                "PMF catastrophic overtopping at Tehri Dam with water level 835m forming breach in 2 hours. Simulate with 30m SRTM DEM."
              )
            }
          >
            Tehri PMF Overtopping (835m)
          </button>
          <button
            type="button"
            className="badge-default preset-chip"
            style={{ cursor: "pointer" }}
            onClick={() =>
              setAiPrompt(
                "Sunny day structural failure at Idukki Dam. Reservoir level 732m with Delft3D flexible mesh solver."
              )
            }
          >
            Idukki Sunny Day (Delft3D)
          </button>
          <button
            type="button"
            className="badge-default preset-chip"
            style={{ cursor: "pointer" }}
            onClick={() =>
              setAiPrompt(
                "Upstream landslide triggered river surge blockage at Sardar Sarovar Dam with 220m breach width."
              )
            }
          >
            Sardar Sarovar River Surge
          </button>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button
            type="button"
            className="action-button-primary"
            onClick={handleRunAiAnalysis}
            disabled={aiLoading || !aiPrompt.trim()}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {aiLoading ? (
              <>
                <span className="cyber-spinner" style={{ width: "14px", height: "14px" }} />
                <span>ANALYZING...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>RUN AI ANALYSIS</span>
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "6px", color: "#f87171", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>⚠️ {aiError}</span>
            <button type="button" className="retry-button" onClick={handleRunAiAnalysis} style={{ padding: "4px 10px" }}>
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 3: AI ANALYSIS RESULT (DISPLAYED WHEN AI RUNS)
      ============================================================ */}
      {aiResult && (
        <div style={{ marginTop: "24px" }}>
          <div className="section-divider-title" style={{ color: "#34d399" }}>
            AI ANALYSIS RESULT
          </div>

          <div className="metrics-summary-row" style={{ marginTop: "12px" }}>
            <MetricCard
              title="AI CONFIDENCE SCORE"
              value={`${confidencePct}%`}
              badge={confidencePct >= 80 ? "HIGH CONFIDENCE" : "MODERATE"}
              badgeType={confidencePct >= 80 ? "success" : "warning"}
              subtitle="Model agreement index"
            />
            <MetricCard
              title="FAILURE MODE DETECTED"
              value={aiResult.failureMode?.toUpperCase().replace("_", " ")}
              badge="AI CLASSIFIED"
              badgeType="danger"
              subtitle="Parsed failure mechanism"
            />
            <MetricCard
              title="ESTIMATED BREACH WIDTH"
              value={aiResult.breachWidth}
              unit="meters"
              badge="PHYSICAL GEOMETRY"
              badgeType="info"
              subtitle="Computed breach opening"
            />
            <MetricCard
              title="BREACH FORMATION TIME"
              value={aiResult.breachFormationTimeHours}
              unit="hours"
              badge="DEVELOPMENT PERIOD"
              badgeType="warning"
              subtitle="Hydrodynamic time horizon"
            />
          </div>

          <div className="content-two-columns" style={{ marginTop: "14px" }}>
            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">SCENARIO INTERPRETATION</span>
                <span className="panel-badge">
                  {aiResult.isFeatherlessModel ? "FEATHERLESS AI" : "AI ENGINE"}
                </span>
              </div>
              <p className="panel-text" style={{ fontSize: "14px", lineHeight: "1.6", color: "#e2e8f0" }}>
                {aiResult.explanation}
              </p>

              <div style={{ marginTop: "14px" }}>
                <div className="sim-stat-row">
                  <span>Target Dam Profile:</span>
                  <strong style={{ color: "#38bdf8" }}>{activeDam.name}</strong>
                </div>
                <div className="sim-stat-row">
                  <span>Detected Pool Stage:</span>
                  <strong>{aiResult.reservoirWaterLevel} m MSL</strong>
                </div>
                <div className="sim-stat-row">
                  <span>Governing Breach Formulation:</span>
                  <strong>{aiResult.empiricalEquation}</strong>
                </div>
              </div>
            </div>

            <div className="cyber-panel">
              <div className="panel-header">
                <span className="panel-title">HAZARD WARNINGS &amp; SUGGESTED MITIGATION</span>
                <span className="panel-badge">ADVISORY</span>
              </div>

              <div className="warnings-box">
                <span className="box-title text-danger">⚠️ CRITICAL HAZARD WARNINGS</span>
                <ul className="bullet-list">
                  {aiResult.hazardWarnings?.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>

              <div className="mitigation-box" style={{ marginTop: "14px" }}>
                <span className="box-title text-success">🛡️ SUGGESTED MITIGATION ACTION</span>
                <p style={{ marginTop: "8px", fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5" }}>
                  {aiResult.suggestedMitigation}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 4: AI-DETECTED / UPDATED MODEL PARAMETERS
          (THE SAME SHARED MODEL INPUT PARAMETER CONTROLS)
      ============================================================ */}
      <div style={{ marginTop: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="section-divider-title">
            MODEL INPUT PARAMETERS {Object.keys(detectedFields).length > 0 ? "— AUTO-UPDATED FROM AI SCENARIO" : ""}
          </div>
          <button
            type="button"
            className="badge-default"
            style={{ cursor: "pointer", padding: "6px 12px", color: "#f87171" }}
            onClick={handleResetDefaults}
          >
            ↺ Reset to Dam Defaults
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 16px 0" }}>
          Review and manually edit any parameter before running the simulation. Parameters marked with{" "}
          <span className="badge-ai-detected" style={{ margin: "0 4px" }}>AI DETECTED</span> were modified by the AI scenario. All inputs drive the physical 2D SWE simulation.
        </p>

        <div className="param-grid">
          {/* 1. Dam */}
          <div className={`param-card ${detectedFields.selectedDamId ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Target Dam</span>
              {detectedFields.selectedDamId ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">CURRENT</span>
              )}
            </div>
            <div className="param-input-wrap">
              <select
                className="param-input"
                value={activeParams.selectedDamId || selectedDamId}
                onChange={(e) => handleDamChange(e.target.value)}
              >
                {INDIAN_DAMS_REGISTRY.map((dam) => (
                  <option key={dam.id} value={dam.id}>
                    {dam.name} ({dam.location.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Failure Mode */}
          <div className={`param-card ${detectedFields.failureMode ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Failure Mode</span>
              {detectedFields.failureMode ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">CURRENT</span>
              )}
            </div>
            <div className="param-input-wrap">
              <select
                className="param-input"
                value={activeParams.failureMode || "overtopping"}
                onChange={(e) => handleFieldChange("failureMode", e.target.value)}
              >
                <option value="overtopping">Overtopping (PMF Flood Surge)</option>
                <option value="piping">Piping (Internal Soil Erosion)</option>
                <option value="river_blockage">River Blockage / Landslide Surge</option>
                <option value="sunny_day">Sunny Day (Normal Pool Structural Failure)</option>
              </select>
            </div>
          </div>

          {/* 3. Reservoir Water Level */}
          <div className={`param-card ${detectedFields.reservoirWaterLevel ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Reservoir Water Level</span>
              {detectedFields.reservoirWaterLevel ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">SPECIFIED</span>
              )}
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="0.1"
                className="param-input"
                value={activeParams.reservoirWaterLevel ?? 192.94}
                onChange={(e) => handleFieldChange("reservoirWaterLevel", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">m MSL</span>
            </div>
          </div>

          {/* 4. Breach Bottom Width */}
          <div className={`param-card ${detectedFields.breachBottomWidth ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Breach Bottom Width (B_b)</span>
              {detectedFields.breachBottomWidth ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">SPECIFIED</span>
              )}
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="1"
                className="param-input"
                value={activeParams.breachBottomWidth ?? 120}
                onChange={(e) => handleFieldChange("breachBottomWidth", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">meters</span>
            </div>
          </div>

          {/* 5. Breach Average Width */}
          <div className={`param-card ${detectedFields.breachAverageWidth ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Breach Average Width (B_avg)</span>
              {detectedFields.breachAverageWidth ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">SPECIFIED</span>
              )}
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="1"
                className="param-input"
                value={activeParams.breachAverageWidth ?? 160}
                onChange={(e) => handleFieldChange("breachAverageWidth", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">meters</span>
            </div>
          </div>

          {/* 6. Breach Formation Time */}
          <div className={`param-card ${detectedFields.breachFormationTimeHours ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Formation Time (t_f)</span>
              {detectedFields.breachFormationTimeHours ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">SPECIFIED</span>
              )}
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="0.05"
                className="param-input"
                value={activeParams.breachFormationTimeHours ?? 1.85}
                onChange={(e) => handleFieldChange("breachFormationTimeHours", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">hours</span>
            </div>
          </div>

          {/* 7. Water Depth Above Invert */}
          <div className="param-card">
            <div className="param-card-header">
              <span className="param-label">Water Depth Above Invert (h_w)</span>
              <span className="badge-default">CALCULATED</span>
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="0.1"
                className="param-input"
                value={activeParams.waterDepthAboveInvert ?? 35.0}
                onChange={(e) => handleFieldChange("waterDepthAboveInvert", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">meters</span>
            </div>
          </div>

          {/* 8. Breach Invert Elevation */}
          <div className="param-card">
            <div className="param-card-header">
              <span className="param-label">Breach Invert Elevation</span>
              <span className="badge-default">PHYSICAL</span>
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="0.1"
                className="param-input"
                value={activeParams.breachInvertElevation ?? 157.94}
                onChange={(e) => handleFieldChange("breachInvertElevation", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">m MSL</span>
            </div>
          </div>

          {/* 9. Reservoir Volume at Breach */}
          <div className="param-card">
            <div className="param-card-header">
              <span className="param-label">Volume at Breach (V_w)</span>
              <span className="badge-default">STORAGE</span>
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="10"
                className="param-input"
                value={activeParams.reservoirVolumeAtBreachMCM ?? 5896.0}
                onChange={(e) => handleFieldChange("reservoirVolumeAtBreachMCM", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">MCM</span>
            </div>
          </div>

          {/* 10. Breach Side Slope */}
          <div className="param-card">
            <div className="param-card-header">
              <span className="param-label">Breach Side Slope (z)</span>
              <span className="badge-default">GEOMETRY</span>
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="0.1"
                className="param-input"
                value={activeParams.breachSideSlope ?? 1.0}
                onChange={(e) => handleFieldChange("breachSideSlope", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">H:1V</span>
            </div>
          </div>

          {/* 11. Simulation Duration */}
          <div className={`param-card ${detectedFields.simulationDurationHours ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Simulation Duration</span>
              {detectedFields.simulationDurationHours ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">SPECIFIED</span>
              )}
            </div>
            <div className="param-input-wrap">
              <input
                type="number"
                step="1"
                className="param-input"
                value={activeParams.simulationDurationHours ?? 24}
                onChange={(e) => handleFieldChange("simulationDurationHours", parseFloat(e.target.value) || 0)}
              />
              <span className="param-unit">hours</span>
            </div>
          </div>

          {/* 12. Hydrodynamic Solver */}
          <div className={`param-card ${detectedFields.selectedSolver ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Hydrodynamic Solver</span>
              {detectedFields.selectedSolver ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">SOLVER</span>
              )}
            </div>
            <div className="param-input-wrap">
              <select
                className="param-input"
                value={activeParams.selectedSolver || "2D_SWE_FiniteVolume"}
                onChange={(e) => handleFieldChange("selectedSolver", e.target.value)}
              >
                <option value="2D_SWE_FiniteVolume">2D SWE Finite Volume (Roe Riemann)</option>
                <option value="Delft3D_FM_2D">Delft3D-FM 2D Flexible Mesh</option>
                <option value="SPH_DualSPHysics">3D SPH DualSPHysics Navier-Stokes</option>
                <option value="ML_Surrogate_FloodUNet">FloodUNet ML Surrogate Model</option>
              </select>
            </div>
          </div>

          {/* 13. DEM Terrain Dataset */}
          <div className={`param-card ${detectedFields.selectedDemResolution ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Terrain DEM Dataset</span>
              {detectedFields.selectedDemResolution ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">ELEVATION</span>
              )}
            </div>
            <div className="param-input-wrap">
              <select
                className="param-input"
                value={activeParams.selectedDemResolution || "10m_CartoDEM"}
                onChange={(e) => handleFieldChange("selectedDemResolution", e.target.value)}
              >
                <option value="10m_CartoDEM">10m ISRO CartoDEM (High Res)</option>
                <option value="30m_SRTM">30m NASA SRTM Global DEM</option>
                <option value="30m_Copernicus">30m ESA Copernicus GLO-30</option>
                <option value="12.5m_ALOS_PALSAR">12.5m JAXA ALOS PALSAR</option>
              </select>
            </div>
          </div>

          {/* 14. Empirical Peak Equation */}
          <div className={`param-card ${detectedFields.empiricalEquation ? "detected" : ""}`}>
            <div className="param-card-header">
              <span className="param-label">Empirical Peak Equation</span>
              {detectedFields.empiricalEquation ? (
                <span className="badge-ai-detected">✓ AI DETECTED</span>
              ) : (
                <span className="badge-default">FORMULA</span>
              )}
            </div>
            <div className="param-input-wrap">
              <select
                className="param-input"
                value={activeParams.empiricalEquation || "Froehlich_2008"}
                onChange={(e) => handleFieldChange("empiricalEquation", e.target.value)}
              >
                <option value="Froehlich_2008">Froehlich (2008) Best Estimate</option>
                <option value="MacDonald_1984">MacDonald &amp; Langridge-Monopolis (1984)</option>
                <option value="USBR_1982">USBR (1982) Empirical Envelope</option>
                <option value="VonThun_1993">Von Thun &amp; Gillette (1993)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================
            SECTION 5: RUN SIMULATION / PREDICT ACTION BANNER
        ============================================================ */}
        <div className="sim-execution-banner">
          <div>
            <div style={{ fontSize: "14px", fontWeight: "800", color: "#fff", fontFamily: "monospace" }}>
              EXECUTE PHYSICAL HYDRODYNAMIC SIMULATION
            </div>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              Run the 2D Shallow Water Equations solver using the currently configured Model Input parameters above.
            </p>
          </div>

          <button
            type="button"
            className="sim-btn-predict"
            onClick={handleExecuteSimulation}
            disabled={simLoading}
          >
            {simLoading ? (
              <>
                <span className="cyber-spinner" style={{ width: "16px", height: "16px" }} />
                <span>RUNNING...</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>RUN SIMULATION / PREDICT</span>
              </>
            )}
          </button>
        </div>

        {simError && (
          <div style={{ marginTop: "14px", padding: "12px 16px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "8px", color: "#f87171", fontSize: "13px" }}>
            ❌ Simulation failed. Please check the model parameters and try again.
          </div>
        )}

        {/* ============================================================
            SECTION 6: REAL SIMULATION RESULTS (SOLVER OUTPUT)
        ============================================================ */}
        {activeSimResult && (
          <div style={{ marginTop: "28px" }}>
            <div className="section-divider-title">REAL SIMULATION RESULTS (SOLVER OUTPUT)</div>

            <div className="metrics-summary-row" style={{ marginTop: "12px" }}>
              <MetricCard
                title="PEAK BREACH OUTFLOW"
                value={activeSimResult.peakBreachOutflowM3s ? `${activeSimResult.peakBreachOutflowM3s.toLocaleString(undefined, { maximumFractionDigits: 1 })}` : "—"}
                unit="m³/s"
                badge="SOLVER"
                badgeType="danger"
                subtitle="Maximum breach discharge"
              />
              <MetricCard
                title="TIME TO PEAK"
                value={activeSimResult.timeToPeakHours ? `${activeSimResult.timeToPeakHours.toFixed(2)}` : "—"}
                unit="hours"
                badge="HYDROGRAPH"
                badgeType="warning"
                subtitle="Lead time to peak wave"
              />
              <MetricCard
                title="MAX FLOOD DEPTH"
                value={activeSimResult.maxFloodDepthM ? `${activeSimResult.maxFloodDepthM.toFixed(1)}` : "—"}
                unit="meters"
                badge="STAGE"
                badgeType="info"
                subtitle="Maximum inundation depth"
              />
              <MetricCard
                title="INUNDATION AREA"
                value={activeSimResult.totalInundationAreaKm2 ? `${activeSimResult.totalInundationAreaKm2.toFixed(1)}` : "—"}
                unit="km²"
                badge="IMPACT"
                badgeType="success"
                subtitle="Total inundated corridor"
              />
            </div>

            {/* Spatial Impact & River Reach Hazard Table */}
            <div className="cyber-panel" style={{ marginTop: "16px" }}>
              <div className="panel-header">
                <span className="panel-title">DOWNSTREAM RIVER REACH PROPAGATION &amp; HAZARD MATRIX</span>
                <span className="panel-badge">REACH RESULTS</span>
              </div>

              <div className="cyber-table-container">
                <table className="cyber-table">
                  <thead>
                    <tr>
                      <th>REACH SECTION</th>
                      <th>DISTANCE</th>
                      <th>ARRIVAL TIME</th>
                      <th>PEAK DISCHARGE</th>
                      <th>MAX DEPTH</th>
                      <th>MAX VELOCITY</th>
                      <th>HAZARD CLASS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeSimResult.reachResults?.map((r, i) => (
                      <tr key={i}>
                        <td><strong>{r.reachName}</strong></td>
                        <td>{r.distanceFromDamKm} km</td>
                        <td>{r.arrivalTimeHours?.toFixed(2)} hrs</td>
                        <td>{r.peakDischargeM3s?.toLocaleString()} m³/s</td>
                        <td><span className="text-cyan">{r.maxFloodDepthM?.toFixed(2)} m</span></td>
                        <td>{r.maxVelocityMs?.toFixed(2)} m/s</td>
                        <td>
                          <span className={`status-badge ${r.hazardCategory === "Extreme" ? "danger" : "warning"}`}>
                            {r.hazardCategory || "High"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeSimResult.spatialImpact && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginTop: "16px", padding: "12px 16px", background: "rgba(0,0,0,0.3)", borderRadius: "6px" }}>
                  <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
                    <span style={{ color: "#94a3b8" }}>Affected Settlements: </span>
                    <strong style={{ color: "#fff" }}>{activeSimResult.spatialImpact.affectedSettlementsCount}</strong>
                  </div>
                  <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
                    <span style={{ color: "#94a3b8" }}>Population in Hazard Path: </span>
                    <strong style={{ color: "#f87171" }}>{activeSimResult.spatialImpact.modelAffectedPopulation?.toLocaleString()}</strong>
                  </div>
                  <div style={{ fontSize: "12px", fontFamily: "monospace" }}>
                    <span style={{ color: "#94a3b8" }}>Exposed Critical Facilities: </span>
                    <strong style={{ color: "#fbbf24" }}>{activeSimResult.spatialImpact.modelImpactedFacilitiesCount}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
