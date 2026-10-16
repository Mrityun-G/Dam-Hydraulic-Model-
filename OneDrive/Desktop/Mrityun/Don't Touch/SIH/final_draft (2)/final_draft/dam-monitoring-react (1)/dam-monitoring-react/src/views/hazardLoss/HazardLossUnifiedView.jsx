import React, { useState } from "react";
import { UnifiedSubnav } from "../../components/common/UnifiedSubnav";
import { DamReservoirLossView } from "./DamReservoirLossView";
import { SpillwayGatesLossView } from "./SpillwayGatesLossView";
import { TurbineGeneratorLossView } from "./TurbineGeneratorLossView";
import { TransformerGridLossView } from "./TransformerGridLossView";

export function HazardLossUnifiedView(props) {
  const [activeTab, setActiveTab] = useState("Dam & Reservoir");

  const tabs = [
    { id: "Dam & Reservoir", label: "Dam & Reservoir", component: DamReservoirLossView },
    { id: "Spillway & Gates", label: "Spillway & Gates", component: SpillwayGatesLossView },
    { id: "Turbine & Generator", label: "Turbine & Generator", component: TurbineGeneratorLossView },
    { id: "Transformer & Grid", label: "Transformer & Grid", component: TransformerGridLossView },
  ];

  const CurrentView = tabs.find((t) => t.id === activeTab)?.component || DamReservoirLossView;

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
