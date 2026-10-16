import React, { useState } from "react";
import { UnifiedSubnav } from "../../components/common/UnifiedSubnav";
import { Simulation3DView } from "./Simulation3DView";
import { EarlyWarningsView } from "./EarlyWarningsView";
import { LocationAlertsView } from "./LocationAlertsView";
import { EmergencyNotificationsView } from "./EmergencyNotificationsView";

export function SphDelft3dSimUnifiedView(props) {
  const [activeTab, setActiveTab] = useState("3-D Simulation");

  const tabs = [
    { id: "3-D Simulation", label: "3-D Dam Simulation", component: Simulation3DView },
    { id: "Early Warnings", label: "Early Warnings", component: EarlyWarningsView },
    { id: "Location-Based Alerts", label: "Location-Based Alerts", component: LocationAlertsView },
    { id: "Emergency Notifications", label: "Emergency Notifications", component: EmergencyNotificationsView },
  ];

  const CurrentView = tabs.find((t) => t.id === activeTab)?.component || Simulation3DView;

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
