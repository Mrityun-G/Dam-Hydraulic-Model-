import React, { useState } from "react";
import { UnifiedSubnav } from "../../components/common/UnifiedSubnav";
import { ModelInputsView } from "./ModelInputsView";
import { WaterLevelForecastView } from "./WaterLevelForecastView";
import { OverflowProbabilityView } from "./OverflowProbabilityView";
import { TimeToOverflowView } from "./TimeToOverflowView";

export function DamBreakScenarioModellingUnifiedView(props) {
  const [activeTab, setActiveTab] = useState("Model Input & AI Studio");

  const tabs = [
    { id: "Model Input & AI Studio", label: "Model Input & AI Studio", component: ModelInputsView },
    { id: "Water-Level Forecast", label: "Water-Level Forecast", component: WaterLevelForecastView },
    { id: "Overflow Probability", label: "Overflow Probability", component: OverflowProbabilityView },
    { id: "Time-to-Overflow", label: "Time-to-Overflow", component: TimeToOverflowView },
  ];

  const CurrentView = tabs.find((t) => t.id === activeTab)?.component || ModelInputsView;

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
