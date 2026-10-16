import React, { useState } from "react";
import { UnifiedSubnav } from "../../components/common/UnifiedSubnav";
import { DecisionSupportView } from "./DecisionSupportView";
import { AIRiskAnalysisView } from "./AIRiskAnalysisView";
import { PredictiveAnalyticsView } from "./PredictiveAnalyticsView";
import { AIRecommendationsView } from "./AIRecommendationsView";

export function RealTimeMonitoringUnifiedView(props) {
  const [activeTab, setActiveTab] = useState("Decision Support");

  const tabs = [
    { id: "Decision Support", label: "Decision Support (GEE)", component: DecisionSupportView },
    { id: "AI Risk Analysis", label: "AI Risk Analysis", component: AIRiskAnalysisView },
    { id: "Predictive Analytics", label: "Predictive Analytics", component: PredictiveAnalyticsView },
    { id: "AI Recommendations", label: "AI Recommendations", component: AIRecommendationsView },
  ];

  const CurrentView = tabs.find((t) => t.id === activeTab)?.component || DecisionSupportView;

  return (
    <div className="unified-view-root">
      <UnifiedSubnav
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />
      <div className="unified-view-content">
        <CurrentView {...props} />
      </div>
    </div>
  );
}
