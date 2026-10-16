import React from "react";
import { extractErrorMessage } from "../../utils/errorParser.js";

export function StateContainer({
  loading,
  loadingText = "Running Hydrodynamic Analysis...",
  error,
  onRetry,
  empty,
  emptyText = "No data available for the selected dam.",
  children,
}) {
  if (loading) {
    return (
      <div className="state-card loading-state">
        <div className="cyber-spinner" />
        <div className="state-title">{loadingText}</div>
        <div className="state-sub">Communicating with Hydrodynamic Solver Backend...</div>
      </div>
    );
  }

  if (error) {
    const errorText = extractErrorMessage(error);
    return (
      <div className="state-card error-state">
        <div className="error-icon">⚠️</div>
        <div className="state-title">Backend Operation Error</div>
        <p className="state-description" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {errorText}
        </p>
        {onRetry && (
          <button type="button" className="retry-button" onClick={onRetry}>
            ↻ Retry Request
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="state-card empty-state">
        <div className="empty-icon">📂</div>
        <div className="state-title">No Data Available</div>
        <p className="state-description">{emptyText}</p>
        {onRetry && (
          <button type="button" className="retry-button" onClick={onRetry}>
            ↻ Check Again
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
