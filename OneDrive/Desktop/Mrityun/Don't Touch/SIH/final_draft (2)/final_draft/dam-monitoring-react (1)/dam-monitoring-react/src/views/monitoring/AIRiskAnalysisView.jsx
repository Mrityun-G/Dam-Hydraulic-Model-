import React, { useState } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { interpretScenario } from "../../services/api";

export function AIRiskAnalysisView({ selectedDamId, onSelectDam, onBack }) {
  const [prompt, setPrompt] = useState(
    "Intense cloudburst over upper catchment with reservoir water level rising 0.8 meters per hour and spillway sluices partially choked."
  );
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await interpretScenario(prompt, selectedDamId);
      setAiData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rawConfidence = typeof aiData?.confidenceScore === "number"
    ? aiData.confidenceScore
    : (typeof aiData?.confidence === "number" ? aiData.confidence : null);
  const confidencePct = rawConfidence !== null ? Math.round(rawConfidence * 100) : null;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Real-Time Monitoring"
        feature="AI Risk Analysis"
        title="Real-Time AI Multi-Model Hazard Evaluation"
        description="Continuous natural language incident telemetry processing evaluating environmental indicators and structural alarms."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <div className="control-panel-card">
        <div className="control-panel-title">NATURAL LANGUAGE INCIDENT TELEMETRY</div>
        <div className="input-field-group">
          <label>CURRENT FIELD INCIDENT OBSERVATION:</label>
          <textarea
            className="cyber-textarea"
            rows="3"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter incident telemetry report or emergency field observations..."
          />
        </div>

        <button
          type="button"
          className="action-button-primary"
          onClick={runAnalysis}
          disabled={loading}
          style={{ marginTop: "12px" }}
        >
          {loading ? "EVALUATING INCIDENT..." : "EXECUTE AI RISK ANALYSIS"}
        </button>
      </div>

      <StateContainer loading={loading} error={error} onRetry={runAnalysis}>
        {aiData ? (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="AI CONFIDENCE RATING"
                value={confidencePct !== null ? `${confidencePct}%` : "N/A"}
                badge={confidencePct !== null ? (confidencePct >= 80 ? "HIGH CONFIDENCE" : "MODERATE") : "PROCESSED"}
                badgeType={confidencePct !== null && confidencePct >= 80 ? "success" : "warning"}
                subtitle="NLP parser certainty"
              />
              <MetricCard
                title="ESTIMATED BREACH WIDTH"
                value={aiData.breachWidth}
                unit="meters"
                badge="PREDICTED BREACH"
                badgeType="danger"
                subtitle="Calculated opening extent"
              />
              <MetricCard
                title="FORMATION WINDOW"
                value={aiData.breachFormationTimeHours}
                unit="hours"
                badge="EROSION RATE"
                badgeType="warning"
                subtitle="Breach completion time"
              />
              <MetricCard
                title="FAILURE MECHANISM"
                value={aiData.failureMode?.toUpperCase()}
                badge="CLASSIFIED"
                badgeType="danger"
                subtitle="Governing failure pathway"
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">INCIDENT EVALUATION REPORT</span>
                  <span className="panel-badge">
                    {aiData.isFeatherlessModel ? "FEATHERLESS MULTI-MODEL" : "NLP REASONING"}
                  </span>
                </div>
                <p className="panel-text" style={{ fontSize: "14px", lineHeight: "1.6", color: "#e2e8f0" }}>
                  {aiData.explanation}
                </p>

                <div className="sim-stat-row" style={{ marginTop: "16px" }}>
                  <span>Monitored Dam Profile:</span>
                  <strong>{aiData.damId}</strong>
                </div>
                <div className="sim-stat-row">
                  <span>Inflow Governing Law:</span>
                  <strong>{aiData.empiricalEquation} (SI Standards)</strong>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">ACTIVE HAZARD WARNINGS &amp; MITIGATION</span>
                  <span className="panel-badge">INCIDENT ADVISORY</span>
                </div>

                <div className="warnings-box">
                  <span className="box-title text-danger">⚠️ DISPATCH ALARMS</span>
                  <ul className="bullet-list" style={{ marginTop: "8px" }}>
                    {aiData.hazardWarnings?.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>

                <div className="mitigation-box" style={{ marginTop: "16px" }}>
                  <span className="box-title text-success">🛡️ DIRECT MITIGATION DIRECTIVE</span>
                  <p style={{ marginTop: "6px", fontSize: "13px", color: "#cbd5e1" }}>
                    {aiData.suggestedMitigation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="state-card" style={{ marginTop: "16px" }}>
              <div className="empty-icon">⚡</div>
              <div className="state-title">Ready for Field Incident Analysis</div>
              <p className="state-description">
                Click <strong>EXECUTE AI RISK ANALYSIS</strong> to process the current field incident observation.
              </p>
            </div>
          )
        )}
      </StateContainer>
    </div>
  );
}
