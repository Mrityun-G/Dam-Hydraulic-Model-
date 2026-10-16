import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { runSimulation, generateHazardSummary } from "../../services/api";

export function AIRecommendationsView({ selectedDamId, onSelectDam, onBack }) {
  const [summary, setSummary] = useState(null);
  const [simOutput, setSimOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const sim = await runSimulation({ selectedDamId });
      setSimOutput(sim);
      const data = await generateHazardSummary(sim);
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, [selectedDamId]);

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Real-Time Monitoring"
        feature="AI Recommendations"
        title="AI Disaster Mitigation Recommendations & Exposure Advisory"
        description="Generative disaster response synthesis translating complex 2D hydrodynamic simulation outputs into actionable emergency action protocols."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadSummary}>
        {summary && simOutput && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="EXECUTIVE HAZARD SEVERITY"
                value="TIER 1"
                badge="HIGH RISK"
                badgeType="danger"
                subtitle={`${simOutput.damName} Emergency`}
              />
              <MetricCard
                title="PEAK EXPOSURE FLOW"
                value={simOutput.peakBreachOutflowM3s?.toLocaleString()}
                unit="m³/s"
                badge="PEAK OUTFLOW"
                badgeType="danger"
                subtitle="Uncontrolled discharge"
              />
              <MetricCard
                title="CIVIL ACTIONS IDENTIFIED"
                value={summary.recommendedPhasedActions?.length ?? "N/A"}
                unit={summary.recommendedPhasedActions?.length ? "action phases" : ""}
                badge="RESPONSE PROTOCOL"
                badgeType="success"
                subtitle="Sequential emergency steps"
              />
              <MetricCard
                title="POPULATION ADVISORY REACH"
                value={simOutput.spatialImpact?.modelAffectedPopulation?.toLocaleString() ?? "N/A"}
                unit={simOutput.spatialImpact?.modelAffectedPopulation ? "citizens" : ""}
                badge="REFERENCE DATA (Census 2011)"
                badgeType="warning"
                subtitle="Direct exposure zone"
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">EXECUTIVE SITUATION BRIEFING</span>
                  <span className="panel-badge">INCIDENT ADVISORY</span>
                </div>
                <p className="panel-text" style={{ fontSize: "14px", lineHeight: "1.6", color: "#e2e8f0" }}>
                  {summary.executiveAssessment}
                </p>

                <div className="critical-risks-box" style={{ marginTop: "16px" }}>
                  <span className="box-title text-danger">⚠️ VERIFIED PHYSICAL EXPOSURE POINTS</span>
                  <ul className="bullet-list" style={{ marginTop: "8px" }}>
                    {summary.criticalRisks?.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">RECOMMENDED PHASED EMERGENCY ACTIONS</span>
                  <span className="panel-badge">SOP DIRECTIVES</span>
                </div>

                <div className="phased-actions-list">
                  {summary.recommendedPhasedActions?.map((action, i) => (
                    <div key={i} className="phase-action-item">
                      <div className="phase-badge">STAGE {i + 1}</div>
                      <div className="phase-content">
                        <p>{action}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="dispatch-note" style={{ marginTop: "16px" }}>
                  <span>Coordination Channel:</span>
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                    Forwarded to National Disaster Management Authority (NDMA), State Emergency Operations Centre (SEOC), and District Disaster Management Authority (DDMA).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
