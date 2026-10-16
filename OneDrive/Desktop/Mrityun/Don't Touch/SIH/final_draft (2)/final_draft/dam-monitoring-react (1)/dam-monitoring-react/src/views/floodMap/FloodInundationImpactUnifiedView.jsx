import React, { useState } from "react";
import { UnifiedSubnav } from "../../components/common/UnifiedSubnav";
import { InundationMapView } from "./InundationMapView";
import { FloodPathView } from "./FloodPathView";
import { InfrastructureRiskView } from "./InfrastructureRiskView";
import { TimeToImpactView } from "./TimeToImpactView";

export function FloodInundationImpactUnifiedView(props) {
  const [activeTab, setActiveTab] = useState("Inundation Map");

  const tabs = [
    { id: "Inundation Map", label: "Inundation Map", component: InundationMapView },
    { id: "Flood Path", label: "Flood Path", component: FloodPathView },
    { id: "Infrastructure Risk", label: "Infrastructure Risk", component: InfrastructureRiskView },
    { id: "Time-to-Impact", label: "Time-to-Impact", component: TimeToImpactView },
  ];

  const CurrentView = tabs.find((t) => t.id === activeTab)?.component || InundationMapView;

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
