import React, { useState, useEffect } from "react";
import { PageHeader } from "../../components/common/PageHeader";
import { MetricCard } from "../../components/common/MetricCard";
import { StateContainer } from "../../components/common/StateContainer";
import { getDamById } from "../../services/api";

export function GateMonitoringView({ selectedDamId, onSelectDam, onBack }) {
  const [damData, setDamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDamById(selectedDamId);
      setDamData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDam();
  }, [selectedDamId]);

  const sluiceCount = damData?.sluiceGatesCount ?? null;
  const crestCount = damData?.crestGatesCount ?? null;
  const totalGates = (sluiceCount !== null || crestCount !== null) ? ((sluiceCount || 0) + (crestCount || 0)) : null;
  const spillwayCap = damData?.spillwayCapacityM3s ?? null;

  return (
    <div className="feature-page-container">
      <PageHeader
        category="Home"
        feature="Gate Monitoring"
        title="Spillway & Sluice Gate Operational Monitoring"
        description="Design gate bank specifications, emergency discharge ratings, and spillway capacity tracking (Reference Specification Data)."
        selectedDamId={selectedDamId}
        onSelectDam={onSelectDam}
        onBack={onBack}
      />

      <StateContainer loading={loading} error={error} onRetry={loadDam}>
        {damData && (
          <div className="view-content-grid">
            <div className="metrics-summary-row">
              <MetricCard
                title="TOTAL GATES INSTALLED"
                value={totalGates !== null ? totalGates : "N/A"}
                unit={totalGates !== null ? "gates" : ""}
                badge={totalGates !== null ? "CONFIGURED" : "NOT SPECIFIED"}
                badgeType={totalGates !== null ? "success" : "info"}
                subtitle={totalGates !== null ? `${sluiceCount ?? 0} Sluice + ${crestCount ?? 0} Crest` : "Data unavailable for this dam"}
              />
              <MetricCard
                title="SPILLWAY DISCHARGE CAPACITY"
                value={spillwayCap !== null ? spillwayCap.toLocaleString() : "N/A"}
                unit={spillwayCap !== null ? "m³/s" : ""}
                badge="MAX SPILLWAY"
                badgeType="info"
                subtitle="Design flood discharge rating"
              />
              <MetricCard
                title="SLUICE UNDER-SLUICE GATES"
                value={sluiceCount}
                unit="deep gates"
                badge="SILT / FLOOD CONTROL"
                badgeType="info"
                subtitle="Deep-level discharge sluices"
              />
              <MetricCard
                title="RADIAL CREST GATES"
                value={crestCount}
                unit="crest gates"
                badge="SURFACE POOL"
                badgeType="warning"
                subtitle="Top reservoir surcharge control"
              />
            </div>

            <div className="content-two-columns">
              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">GATE BANK SPECIFICATIONS</span>
                  <span className="panel-badge">{damData.name}</span>
                </div>
                <div className="data-table-wrap">
                  <table className="cyber-table">
                    <tbody>
                      <tr>
                        <td>Dam Structure</td>
                        <td><strong>{damData.name}</strong></td>
                      </tr>
                      <tr>
                        <td>Spillway Type</td>
                        <td>Ogee Crest with Radial Tainter Gates</td>
                      </tr>
                      <tr>
                        <td>Under-Sluice Deep Gates</td>
                        <td><strong className="text-cyan">{sluiceCount !== null ? `${sluiceCount} Gates` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Radial Crest Spillway Gates</td>
                        <td><strong className="text-cyan">{crestCount !== null ? `${crestCount} Gates` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Maximum Design Spillway Flow</td>
                        <td><strong className="text-success">{spillwayCap !== null ? `${spillwayCap.toLocaleString()} m³/s` : "N/A"}</strong></td>
                      </tr>
                      <tr>
                        <td>Average Discharge per Gate</td>
                        <td>{spillwayCap !== null && totalGates ? `${Math.round(spillwayCap / Math.max(1, totalGates)).toLocaleString()} m³/s / gate` : "N/A"}</td>
                      </tr>
                      <tr>
                        <td>Operating Authority</td>
                        <td>Central Water Commission / State Irrigation Dept</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cyber-panel">
                <div className="panel-header">
                  <span className="panel-title">OPERATIONAL GATE STATUS</span>
                  <span className="panel-badge">STATUS MATRIX</span>
                </div>

                <div className="gate-status-grid">
                  <div className="gate-group-card">
                    <div className="gate-group-title">Deep Under-Sluice Bank ({sluiceCount ?? 0} Units)</div>
                    <p className="panel-desc">Controls bed-load silt purging and low-head flood routing.</p>
                    <div className="gate-visual-strip">
                      {sluiceCount ? Array.from({ length: Math.min(24, sluiceCount) }).map((_, i) => (
                        <div key={i} className="gate-indicator active" title={`Sluice Gate #${i + 1}: READY`} />
                      )) : <span className="text-muted" style={{ fontSize: "12px" }}>No deep under-sluice gates recorded for this structure.</span>}
                    </div>
                    {sluiceCount ? (
                      <span className="text-muted" style={{ fontSize: "11px", display: "block", marginTop: "8px" }}>
                        Showing primary {Math.min(24, sluiceCount)} of {sluiceCount} sluice gates • Status: AUTOMATED_STANDBY
                      </span>
                    ) : null}
                  </div>

                  <div className="gate-group-card" style={{ marginTop: "16px" }}>
                    <div className="gate-group-title">Radial Crest Gates Bank ({crestCount ?? 0} Units)</div>
                    <p className="panel-desc">Operated during high reservoir surcharge above Full Reservoir Level.</p>
                    <div className="gate-visual-strip">
                      {crestCount ? Array.from({ length: Math.min(24, crestCount) }).map((_, i) => (
                        <div key={i} className="gate-indicator standby" title={`Crest Gate #${i + 1}: STANDBY`} />
                      )) : <span className="text-muted" style={{ fontSize: "12px" }}>No radial crest gates recorded for this structure.</span>}
                    </div>
                    {crestCount ? (
                      <span className="text-muted" style={{ fontSize: "11px", display: "block", marginTop: "8px" }}>
                        Showing primary {Math.min(24, crestCount)} of {crestCount} crest gates • Status: READY_FOR_DISPATCH
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </StateContainer>
    </div>
  );
}
