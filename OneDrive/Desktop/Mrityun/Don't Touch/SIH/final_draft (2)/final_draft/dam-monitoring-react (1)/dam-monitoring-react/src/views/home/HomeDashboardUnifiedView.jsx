import React, { useState } from "react";
import { UnifiedSubnav } from "../../components/common/UnifiedSubnav";
import { ReservoirLevelView } from "./ReservoirLevelView";
import { InflowOutflowView } from "./InflowOutflowView";
import { GateMonitoringView } from "./GateMonitoringView";
import { StructuralHealthView } from "./StructuralHealthView";

export function HomeDashboardUnifiedView(props) {
  const [activeTab, setActiveTab] = useState("Reservoir Level");

  const tabs = [
    { id: "Reservoir Level", label: "Reservoir Level", component: ReservoirLevelView },
    { id: "Inflow & Outflow", label: "Inflow & Outflow", component: InflowOutflowView },
    { id: "Gate Monitoring", label: "Gate Monitoring", component: GateMonitoringView },
    { id: "Structural Health", label: "Structural Health", component: StructuralHealthView },
  ];

  const CurrentView = tabs.find((t) => t.id === activeTab)?.component || ReservoirLevelView;

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
