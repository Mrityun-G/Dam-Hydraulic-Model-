import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles/views.css";

// Views - Home
import { HomeDashboardUnifiedView } from "./views/home/HomeDashboardUnifiedView";
import { ReservoirLevelView } from "./views/home/ReservoirLevelView";
import { InflowOutflowView } from "./views/home/InflowOutflowView";
import { GateMonitoringView } from "./views/home/GateMonitoringView";
import { StructuralHealthView } from "./views/home/StructuralHealthView";

// Views - Model Input
import { DamBreakScenarioModellingUnifiedView } from "./views/modelInput/DamBreakScenarioModellingUnifiedView";
import { ModelInputsView } from "./views/modelInput/ModelInputsView";
import { WaterLevelForecastView } from "./views/modelInput/WaterLevelForecastView";
import { OverflowProbabilityView } from "./views/modelInput/OverflowProbabilityView";
import { TimeToOverflowView } from "./views/modelInput/TimeToOverflowView";
import { AIRiskScoreView } from "./views/modelInput/AIRiskScoreView";

// Views - 2-D Flood Map
import { FloodInundationImpactUnifiedView } from "./views/floodMap/FloodInundationImpactUnifiedView";
import { FloodPathView } from "./views/floodMap/FloodPathView";
import { InundationMapView } from "./views/floodMap/InundationMapView";
import { InfrastructureRiskView } from "./views/floodMap/InfrastructureRiskView";
import { TimeToImpactView } from "./views/floodMap/TimeToImpactView";

// Views - 3-D Simulation
import { SphDelft3dSimUnifiedView } from "./views/sim3d/SphDelft3dSimUnifiedView";
import { Simulation3DView } from "./views/sim3d/Simulation3DView";
import { CriticalAlertsView } from "./views/sim3d/CriticalAlertsView";
import { EarlyWarningsView } from "./views/sim3d/EarlyWarningsView";
import { LocationAlertsView } from "./views/sim3d/LocationAlertsView";
import { EmergencyNotificationsView } from "./views/sim3d/EmergencyNotificationsView";

// Views - Hazard and Loss Analysis
import { HazardLossUnifiedView } from "./views/hazardLoss/HazardLossUnifiedView";
import { DamReservoirLossView } from "./views/hazardLoss/DamReservoirLossView";
import { SpillwayGatesLossView } from "./views/hazardLoss/SpillwayGatesLossView";
import { TurbineGeneratorLossView } from "./views/hazardLoss/TurbineGeneratorLossView";
import { TransformerGridLossView } from "./views/hazardLoss/TransformerGridLossView";

// Views - Real-Time Monitoring
import { RealTimeMonitoringUnifiedView } from "./views/monitoring/RealTimeMonitoringUnifiedView";
import { AIRiskAnalysisView } from "./views/monitoring/AIRiskAnalysisView";
import { PredictiveAnalyticsView } from "./views/monitoring/PredictiveAnalyticsView";
import { AIRecommendationsView } from "./views/monitoring/AIRecommendationsView";
import { DecisionSupportView } from "./views/monitoring/DecisionSupportView";

// Views - Export Data
import { ExportCenterView } from "./views/export/ExportCenterView";
import { FinalExportView } from "./views/export/FinalExportView";
import { getDamDefaultBreachScenario } from "./data/damData";
import FlowGuardChatbot from "./components/chatbot/FlowGuardChatbot";

/* ============================================================
   NAVIGATION
============================================================ */

const navigation = [
  {
    label: "Home",
    features: [
      "Dam Monitoring Dashboard",
    ],
  },
  {
    label: "Model Input",
    features: [
      "Dam Break & Scenario Modelling",
    ],
  },
  {
    label: "2-D Flood Map",
    features: [
      "Flood Inundation & Impact Mapping",
    ],
  },
  {
    label: "3-D Simulation",
    features: [
      "SPH/Delft3D Flood Simulation",
    ],
  },
  {
    label: "Hazard and Loss Analysis",
    features: [
      "Flood Hazard & Loss Assessment",
    ],
  },
  {
    label: "Real-Time Monitoring",
    features: [
      "GEE Flood Monitoring & Decision Support",
    ],
  },
  {
    label: "Export Data",
    features: [
      "Final Export",
    ],
  },
];

/* ============================================================
   DROPDOWN HEADINGS
============================================================ */

const getHeading = (label) => {
  const headings = {
    "Home": "Overview & Live Telemetry →",
    "Model Input": "Predictive Forecasts & Risk Models →",
    "2-D Flood Map": "Flood Path & Inundation Intelligence →",
    "3-D Simulation": "SPH & Delft3D-FM Hydrodynamics →",
    "Hazard and Loss Analysis": "Infrastructure & Grid Loss Analysis →",
    "Real-Time Monitoring": "AI Decision Support & Analytics →",
    "Export Data": "GIS Packages & Final Export →",
  };

  return headings[label] || `${label} →`;
};

/* ============================================================
   VIEW COMPONENT REGISTRY & ROUTING HELPERS
============================================================ */

const VIEW_COMPONENTS = {
  "Home": {
    "Dam Monitoring Dashboard": HomeDashboardUnifiedView,
    // Preserved for backwards compatibility
    "Reservoir Level": ReservoirLevelView,
    "Inflow & Outflow": InflowOutflowView,
    "Gate Monitoring": GateMonitoringView,
    "Structural Health": StructuralHealthView,
  },
  "Model Input": {
    "Dam Break & Scenario Modelling": DamBreakScenarioModellingUnifiedView,
    // Preserved for backwards compatibility
    "Model Input": ModelInputsView,
    "AI Risk Score": ModelInputsView,
    "Water-Level Forecast": WaterLevelForecastView,
    "Overflow Probability": OverflowProbabilityView,
    "Time-to-Overflow": TimeToOverflowView,
  },
  "2-D Flood Map": {
    "Flood Inundation & Impact Mapping": FloodInundationImpactUnifiedView,
    // Preserved for backwards compatibility
    "Flood Path": FloodPathView,
    "Inundation Map": InundationMapView,
    "Infrastructure Risk": InfrastructureRiskView,
    "Time-to-Impact": TimeToImpactView,
  },
  "3-D Simulation": {
    "SPH/Delft3D Flood Simulation": SphDelft3dSimUnifiedView,
    // Preserved for backwards compatibility
    "3-D Simulation": Simulation3DView,
    "Critical Alerts": Simulation3DView,
    "Early Warnings": EarlyWarningsView,
    "Location-Based Alerts": LocationAlertsView,
    "Emergency Notifications": EmergencyNotificationsView,
  },
  "Hazard and Loss Analysis": {
    "Flood Hazard & Loss Assessment": HazardLossUnifiedView,
    // Preserved for backwards compatibility
    "Dam & Reservoir": DamReservoirLossView,
    "Spillway & Gates": SpillwayGatesLossView,
    "Turbine & Generator": TurbineGeneratorLossView,
    "Transformer & Grid": TransformerGridLossView,
  },
  "Real-Time Monitoring": {
    "GEE Flood Monitoring & Decision Support": RealTimeMonitoringUnifiedView,
    // Preserved for backwards compatibility
    "AI Risk Analysis": AIRiskAnalysisView,
    "Predictive Analytics": PredictiveAnalyticsView,
    "AI Recommendations": AIRecommendationsView,
    "Decision Support": DecisionSupportView,
  },
  "Export Data": {
    "Final Export": (props) => (
      <FinalExportView {...props} />
    ),
    // Preserved for backwards compatibility
    "AI Risk Analysis": (props) => (
      <ExportCenterView {...props} activeSubFeature="AI Risk Analysis" />
    ),
    "Predictive Analytics": (props) => (
      <ExportCenterView {...props} activeSubFeature="Predictive Analytics" />
    ),
    "AI Recommendations": (props) => (
      <ExportCenterView {...props} activeSubFeature="AI Recommendations" />
    ),
    "Decision Support": (props) => (
      <ExportCenterView {...props} activeSubFeature="Decision Support" />
    ),
  },
};

const slugify = (str) =>
  encodeURIComponent(
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  );

const routeToHash = (category, feature) => {
  return `#/${slugify(category)}/${slugify(feature)}`;
};

const findRouteFromHash = (hash) => {
  if (!hash || hash === "#" || hash === "#/" || hash === "#home") return null;
  const clean = hash.replace(/^#\/?/, "");
  const parts = clean.split("/").map((p) => decodeURIComponent(p).trim().toLowerCase());
  if (parts.length === 0 || !parts[0]) return null;

  const catSlug = parts[0];
  const featSlug = parts[1] || "";

  for (const [cat, features] of Object.entries(VIEW_COMPONENTS)) {
    if (slugify(cat) === catSlug) {
      if (featSlug) {
        for (const feat of Object.keys(features)) {
          if (slugify(feat) === featSlug) {
            return { category: cat, feature: feat };
          }
        }
      }
      return { category: cat, feature: Object.keys(features)[0] };
    }
  }
  return null;
};

/* ============================================================
   CONTINUOUS IMAGE MARQUEE
   incident-map.png REMOVED
============================================================ */

const marqueeImages = [
  {
    src: "/assets/images/dam-aerial.png",
    title: "Dam Aerial Monitoring",
  },
  {
    src: "/assets/images/dam-flow-diagram.png",
    title: "Dam Flow Analysis",
  },
  {
    src: "/assets/images/dam-overflow.png",
    title: "Overflow Detection",
  },
  {
    src: "/assets/images/hydropower-cutaway.png",
    title: "Hydropower Infrastructure",
  },
  {
    src: "/assets/images/ice-slide.png",
    title: "Environmental Risk",
  },
  {
    src: "/assets/images/images.webp",
    title: "Dam Intelligence",
  },
  {
    src: "/assets/images/smart-dashboard.png",
    title: "Smart Monitoring",
  },
];

/* ============================================================
   WORKFLOW VIDEOS
============================================================ */

const diagramVideos = [
  {
    file: "V5.mp4",
    title: "Hydrological Analysis",
  },
  {
    file: "V6.mp4",
    title: "Flood Simulation",
  },
  {
    file: "V7.mp4",
    title: "Infrastructure Risk",
  },
  {
    file: "V8.mp4",
    title: "AI Decision Support",
  },
];

/* ============================================================
   APP
============================================================ */

function App() {
  const intelligenceSectionRef = useRef(null);
  const intelligenceVideoRef = useRef(null);

  const atmosphereSectionRef = useRef(null);
  const atmosphereVideoRef = useRef(null);

  const spaceSectionRef = useRef(null);
  const spaceVideoRef = useRef(null);

  const workflowSectionRef = useRef(null);
  const workflowVideoRefs = useRef([]);

  const [intelligenceVisible, setIntelligenceVisible] = useState(false);
  const [atmosphereVisible, setAtmosphereVisible] = useState(false);
  const [spaceVisible, setSpaceVisible] = useState(false);
  const [workflowVisible, setWorkflowVisible] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState("");

  const [activeRoute, setActiveRoute] = useState(() => {
    return findRouteFromHash(window.location.hash);
  });
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem("flowguard_theme_mode");
      if (saved === "light" || saved === "dark" || saved === "hybrid") {
        return saved;
      }
    } catch {}
    return "hybrid";
  });

  const handleThemeChange = (mode) => {
    setThemeMode(mode);
    try {
      localStorage.setItem("flowguard_theme_mode", mode);
    } catch {}
  };

  const [selectedDamId, setSelectedDamId] = useState("hirakud-dam-odisha");
  const [modelParameters, setModelParameters] = useState(() =>
    getDamDefaultBreachScenario("hirakud-dam-odisha", "overtopping")
  );

  const handleSelectDam = (damId) => {
    setSelectedDamId(damId);
    const refreshed = getDamDefaultBreachScenario(damId, modelParameters.failureMode || "overtopping");
    setModelParameters(refreshed);
  };

  useEffect(() => {
    const handleHashChange = () => {
      const route = findRouteFromHash(window.location.hash);
      setActiveRoute(route);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateToFeature = (category, feature) => {
    setActiveRoute({ category, feature });
    window.location.hash = routeToHash(category, feature);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateToHome = () => {
    setActiveRoute(null);
    window.location.hash = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  /* ==========================================================
     SECTION VIDEO OBSERVERS
  ========================================================== */

  useEffect(() => {
    const intelligenceSection = intelligenceSectionRef.current;
    const intelligenceVideo = intelligenceVideoRef.current;

    const atmosphereSection = atmosphereSectionRef.current;
    const atmosphereVideo = atmosphereVideoRef.current;

    const spaceSection = spaceSectionRef.current;
    const spaceVideo = spaceVideoRef.current;

    if (
      !intelligenceSection ||
      !intelligenceVideo ||
      !atmosphereSection ||
      !atmosphereVideo ||
      !spaceSection ||
      !spaceVideo
    ) {
      return;
    }
    
    const intelligenceObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          setIntelligenceVisible(true);
          intelligenceVideo.play().catch(() => {});
        } else {
          setIntelligenceVisible(false);
          intelligenceVideo.pause();
        }
      },
      {
        threshold: 0.3,
      }
    );

    const atmosphereObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          setAtmosphereVisible(true);
          atmosphereVideo.play().catch(() => {});
        } else {
          setAtmosphereVisible(false);
          atmosphereVideo.pause();
        }
      },
      {
        threshold: 0.25,
      }
    );

    const spaceObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          setSpaceVisible(true);
          spaceVideo.play().catch(() => {});
        } else {
          setSpaceVisible(false);
          spaceVideo.pause();
        }
      },
      {
        threshold: 0.25,
      }
    );

    intelligenceObserver.observe(intelligenceSection);
    atmosphereObserver.observe(atmosphereSection);
    spaceObserver.observe(spaceSection);

    return () => {
      intelligenceObserver.disconnect();
      atmosphereObserver.disconnect();
      spaceObserver.disconnect();
    };
  }, []);

  /* ==========================================================
     WORKFLOW VIDEO OBSERVER
  ========================================================== */

  useEffect(() => {
    const workflowSection = workflowSectionRef.current;

    if (!workflowSection) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting) {
          setWorkflowVisible(true);

          workflowVideoRefs.current.forEach((video) => {
            if (video) {
              video.play().catch(() => {});
            }
          });
        } else {
          setWorkflowVisible(false);

          workflowVideoRefs.current.forEach((video) => {
            if (video) {
              video.pause();
            }
          });
        }
      },
      {
        threshold: 0.15,
      }
    );

    observer.observe(workflowSection);

    return () => {
      observer.disconnect();
    };
  }, []);

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const goToIntelligence = (event) => {
    event.preventDefault();

    intelligenceSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setTimeout(() => {
      intelligenceVideoRef.current?.play().catch(() => {});
    }, 700);
  };

  const goToAtmosphere = (event) => {
    event.preventDefault();

    atmosphereSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setTimeout(() => {
      atmosphereVideoRef.current?.play().catch(() => {});
    }, 700);
  };

  const goToSpace = (event) => {
    event.preventDefault();

    spaceSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setTimeout(() => {
      spaceVideoRef.current?.play().catch(() => {});
    }, 700);
  };
  
  const runPrediction = async (customParams = null) => {
    console.log("🔥 SIMULATION RUN INITIATED");
    setSimulationLoading(true);
    setSimulationError("");

    const paramsToRun = customParams || modelParameters;

    try {
      console.log("🚀 STARTING SIMULATION API CALL WITH PAYLOAD:", paramsToRun);
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedDamId: paramsToRun.selectedDamId || selectedDamId || "hirakud-dam-odisha",
          failureMode: paramsToRun.failureMode || "overtopping",
          reservoirWaterLevel: paramsToRun.reservoirWaterLevel,
          waterDepthAboveInvert: paramsToRun.waterDepthAboveInvert,
          reservoirVolumeAtBreachMCM: paramsToRun.reservoirVolumeAtBreachMCM,
          breachBottomWidth: paramsToRun.breachBottomWidth,
          breachAverageWidth: paramsToRun.breachAverageWidth,
          breachSideSlope: paramsToRun.breachSideSlope,
          breachInvertElevation: paramsToRun.breachInvertElevation,
          breachFormationTimeHours: paramsToRun.breachFormationTimeHours,
          initialFlowM3s: paramsToRun.initialFlowM3s,
          simulationDurationHours: paramsToRun.simulationDurationHours,
          empiricalEquation: paramsToRun.empiricalEquation || "Froehlich_2008",
          selectedSolver: paramsToRun.selectedSolver || "2D_SWE_FiniteVolume",
          selectedDemResolution: paramsToRun.selectedDemResolution || "10m_CartoDEM",
        }),
      });

      console.log("📡 API RESPONSE STATUS:", response.status);

      if (!response.ok) {
        throw new Error("Simulation failed");
      }

      const data = await response.json();
      console.log("✅ SIMULATION RESULT:", data);
      setSimulationResult(data);
      return data;
    } catch (error) {
      console.error("❌ SIMULATION ERROR:", error);
      setSimulationError(error.message);
      throw error;
    } finally {
      setSimulationLoading(false);
    }
  };

  /* ==========================================================
     HEADER & FOOTER RENDERERS
  ========================================================== */

  const renderHeader = (isSticky = false) => (
    <header className={`site-header ${isSticky ? "site-header-sticky" : ""}`}>
      <a
        className="brand"
        href="#home"
        onClick={(e) => {
          e.preventDefault();
          navigateToHome();
        }}
      >
        <span className="brand-mark">F</span>
        <span>Flow Guard</span>
      </a>

      <nav className="site-nav" aria-label="Primary navigation">
        {navigation.map((item) => (
          <div className="nav-item" key={item.label}>
            <a
              className="nav-link"
              href={`#${item.label.toLowerCase().replaceAll(" ", "-")}`}
              onClick={(e) => {
                e.preventDefault();
                navigateToFeature(item.label, item.features[0]);
              }}
            >
              {item.label}
            </a>

            <div className="feature-menu">
              <a
                className="feature-heading"
                href={`#${item.label.toLowerCase().replaceAll(" ", "-")}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToFeature(item.label, item.features[0]);
                }}
              >
                {getHeading(item.label)}
              </a>

              <div className="feature-list">
                {item.features.map((feature) => (
                  <a
                    className="feature-link"
                    href="#feature"
                    key={feature}
                    onClick={(event) => {
                      event.preventDefault();
                      navigateToFeature(item.label, feature);
                    }}
                  >
                    {feature}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}

        {isSticky && (
          <div className="header-theme-toggle" role="group" aria-label="Theme selection">
            <button
              type="button"
              className={`theme-toggle-btn ${themeMode === "light" ? "active" : ""}`}
              onClick={() => handleThemeChange("light")}
              title="Switch to Light mode"
            >
              Light
            </button>
            <button
              type="button"
              className={`theme-toggle-btn ${themeMode === "dark" ? "active" : ""}`}
              onClick={() => handleThemeChange("dark")}
              title="Switch to Dark mode"
            >
              Dark
            </button>
            <button
              type="button"
              className={`theme-toggle-btn ${themeMode === "hybrid" ? "active" : ""}`}
              onClick={() => handleThemeChange("hybrid")}
              title="Switch to Hybrid mode"
            >
              Hybrid
            </button>
          </div>
        )}
      </nav>
    </header>
  );

  const renderFooter = () => (
    <footer className="site-footer">
      <div className="footer-main">
        {/* BRAND */}
        <div className="footer-brand">
          <h3>Flow Guard AI</h3>
          <p>
            AI-powered dam intelligence for early flood-risk prediction,
            infrastructure monitoring, and emergency decision support.
          </p>
        </div>

        {/* PLATFORM */}
        <div className="footer-column">
          <h4>PLATFORM</h4>
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigateToHome();
            }}
          >
            Dashboard
          </a>
          <a
            href="#dam-intelligence"
            onClick={(e) => {
              e.preventDefault();
              if (activeRoute) {
                navigateToHome();
                setTimeout(() => goToIntelligence(e), 150);
              } else {
                goToIntelligence(e);
              }
            }}
          >
            Dam Intelligence
          </a>
          <a
            href="#space-monitoring"
            onClick={(e) => {
              e.preventDefault();
              if (activeRoute) {
                navigateToHome();
                setTimeout(() => goToSpace(e), 150);
              } else {
                goToSpace(e);
              }
            }}
          >
            Satellite Monitoring
          </a>
          <a
            href="#system-workflow"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("Model Input", "Water-Level Forecast");
            }}
          >
            Flood Prediction
          </a>
        </div>

        {/* RESOURCES */}
        <div className="footer-column">
          <h4>RESOURCES</h4>
          <a
            href="#resources"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("Home", "Reservoir Level");
            }}
          >
            Methodology
          </a>
          <a
            href="#resources"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("Real-Time Monitoring", "AI Risk Analysis");
            }}
          >
            Data Sources
          </a>
          <a
            href="#resources"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("2-D Flood Map", "Inundation Map");
            }}
          >
            System Workflow
          </a>
          <a
            href="#resources"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("Export Data", "Decision Support");
            }}
          >
            Documentation
          </a>
        </div>

        {/* TECHNOLOGY */}
        <div className="footer-column">
          <h4>TECHNOLOGY</h4>
          <a
            href="#technology"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("Home", "Reservoir Level");
            }}
          >
            Satellite
          </a>
          <a
            href="#technology"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("Model Input", "AI Risk Score");
            }}
          >
            AI Forecasting
          </a>
          <a
            href="#technology"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("Hazard and Loss Analysis", "Dam & Reservoir");
            }}
          >
            Weather Data
          </a>
          <a
            href="#technology"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("2-D Flood Map", "Flood Path");
            }}
          >
            GeoAI
          </a>
        </div>

        {/* PROJECT */}
        <div className="footer-column">
          <h4>PROJECT</h4>
          <a
            href="#project"
            onClick={(e) => {
              e.preventDefault();
              navigateToHome();
            }}
          >
            About
          </a>
          <a
            href="#project"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("Real-Time Monitoring", "Decision Support");
            }}
          >
            Features
          </a>
          <a
            href="#project"
            onClick={(e) => {
              e.preventDefault();
              navigateToFeature("3-D Simulation", "Critical Alerts");
            }}
          >
            Architecture
          </a>
          <a
            href="#project"
            onClick={(e) => {
              e.preventDefault();
              navigateToHome();
            }}
          >
            Team
          </a>
        </div>
      </div>

      {/* FOOTER BOTTOM */}
      <div className="footer-bottom">
        <div className="footer-copyright">
          © 2026 Flow Guard AI. All rights reserved.
        </div>

        <div className="footer-status">
          <span className="status-dot"></span>
          System Operational
        </div>

        <div className="footer-legal">
          <a href="#privacy">Privacy</a>
          <span>·</span>
          <a href="#terms">Terms</a>
          <span>·</span>
          <a href="#disclaimer">Disclaimer</a>
        </div>
      </div>
    </footer>
  );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        html,
        body,
        #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
        }

        body {
          background: #000;
          color: #fff;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          overflow-x: hidden;
        }

        a {
          color: inherit;
        }

        .site-header-sticky {
          position: sticky !important;
          top: 0 !important;
          background: rgba(3, 8, 12, 0.96) !important;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.8) !important;
        }

        .feature-view-layout {
          min-height: 100vh;
          background: #000;
          display: flex;
          flex-direction: column;
        }

        .feature-view-content {
          flex: 1;
          width: 100%;
          min-height: calc(100vh - 86px);
        }

        /* ======================================================
           MAIN
        ====================================================== */

        .home {
          position: relative;
          width: 100%;
          background: #000;
          overflow-x: hidden;
        }

        /* ======================================================
           HERO
           V1 RUNS ONLY ON FIRST LOOK
        ====================================================== */

        .hero {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 650px;
          overflow: hidden;
          background: #000;
        }

        .home-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        .home-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.52);
          z-index: 1;
          pointer-events: none;
        }

        /* ======================================================
           HEADER
        ====================================================== */

        .site-header {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 86px;

          display: flex;
          align-items: center;

          padding: 0 32px;

          background: rgba(3, 8, 12, 0.82);

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.12);

          backdrop-filter: blur(10px);

          z-index: 5000;
        }

        /* ======================================================
           LOGO
        ====================================================== */

        .brand {
          position: relative;
          z-index: 6000;

          display: flex;
          align-items: center;

          gap: 10px;

          color: #fff;

          font-size: 1.6rem;
          font-weight: 700;

          text-decoration: none;

          white-space: nowrap;
        }

        .brand-mark {
          width: 46px;
          height: 46px;

          display: grid;
          place-items: center;

          border: 2px solid #fff;

          border-radius: 50%;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size: 1.8rem;
          font-weight: 700;
          font-style: italic;
        }

        /* ======================================================
           NAVIGATION
        ====================================================== */

        .site-nav {
          position: absolute;

          top: 0;
          left: 0;

          width: 100%;
          height: 86px;

          display: flex;
          align-items: center;
          justify-content: flex-end;

          gap: 28px;
          padding-right: 36px;
          box-sizing: border-box;

          z-index: 5500;
        }

        .nav-item {
          position: relative;

          height: 86px;

          display: flex;
          align-items: center;
        }

        .nav-link {
          position: relative;

          height: 86px;

          display: flex;
          align-items: center;

          color:
            rgba(255, 255, 255, 0.9);

          font-size: 1.05rem;
          font-weight: 600;

          text-decoration: none;

          white-space: nowrap;
        }

        .nav-item:hover > .nav-link {
          color: #4ee878;
        }

        .nav-link::after {
          content: "";

          position: absolute;

          left: 0;
          right: 0;

          bottom: 10px;

          height: 3px;

          background: #4ee878;

          transform: scaleX(0);

          transition:
            transform 0.2s ease;
        }

        .nav-item:hover > .nav-link::after {
          transform: scaleX(1);
        }

        /* ======================================================
           DROPDOWN (COMPACT & CONTENT-SIZED)
        ====================================================== */

        .feature-menu {
          position: absolute;

          top: calc(100% - 8px);
          left: 50%;
          transform: translateX(-50%);

          width: max-content;
          min-width: 220px;
          max-width: 380px;

          min-height: auto;
          height: auto;

          display: none;

          padding: 10px 14px;

          background: rgba(8, 14, 20, 0.98);

          border: 1px solid rgba(0, 230, 200, 0.35);
          border-radius: 8px;

          box-shadow:
            0 12px 30px rgba(0, 0, 0, 0.85),
            0 0 15px rgba(0, 230, 200, 0.12);

          backdrop-filter: blur(16px);

          z-index: 9999;
        }

        /* Right-align dropdown for the rightmost navigation items so they never overflow the viewport */
        .nav-item:last-child .feature-menu,
        .nav-item:nth-last-child(2) .feature-menu {
          left: auto;
          right: 0;
          transform: none;
        }

        .nav-item:hover .feature-menu {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .feature-heading {
          display: block;

          width: max-content;

          margin: 0;

          padding: 3px 6px 6px;

          color: rgba(0, 230, 200, 0.95);

          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;

          text-decoration: none;

          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        }

        .feature-heading:hover {
          color: #4ee878;
          border-bottom-color: rgba(78, 232, 120, 0.4);
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .feature-link {
          display: block;

          width: auto;
          min-width: unset;

          padding: 7px 10px;

          border-radius: 5px;

          color: rgba(255, 255, 255, 0.92);

          font-size: 0.92rem;
          font-weight: 600;

          text-decoration: none;
          white-space: nowrap;

          transition:
            background 0.15s ease,
            color 0.15s ease,
            transform 0.15s ease;
        }

        .feature-link:hover {
          background: rgba(0, 230, 200, 0.12);
          color: #4ee878;

          transform:
            translateX(4px);
        }

        /* ======================================================
           HERO CONTENT
        ====================================================== */

        .home-content {
          position: relative;

          z-index: 5;

          width: 100%;
          height: 100%;

          display: flex;

          flex-direction: column;

          align-items: center;
          justify-content: center;

          text-align: center;

          padding:
            130px 40px 50px;
        }

        .eyebrow {
          margin-bottom: 28px;

          color: #31b9ff;

          font-size:
            clamp(
              1rem,
              1.7vw,
              1.4rem
            );

          font-weight: 800;

          letter-spacing:
            0.25em;
        }

        .home-content h1 {
          width: 100%;

          max-width: 1350px;

          margin:
            0 auto 30px;

          font-size:
            clamp(
              52px,
              5.8vw,
              92px
            );

          font-weight: 800;

          line-height: 0.98;

          letter-spacing:
            -0.055em;
        }

        .home-content h1 span {
          color: #4ee878;
        }

        .subtitle {
          width: 100%;

          max-width: 1000px;

          margin:
            0 auto 32px;

          color:
            rgba(255, 255, 255, 0.84);

          font-size:
            clamp(
              1rem,
              1.6vw,
              1.35rem
            );

          line-height: 1.55;
        }

        /* ======================================================
           BUTTON
        ====================================================== */

        .primary-button {
          display: inline-flex;

          align-items: center;
          justify-content: center;

          padding:
            15px 28px;

          border:
            1px solid
            rgba(255, 255, 255, 0.75);

          border-radius: 999px;

          background:
            rgba(0, 0, 0, 0.2);

          color: #fff;

          font-size: 1rem;
          font-weight: 600;

          text-decoration: none;

          cursor: pointer;

          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .primary-button:hover {
          background: #4ee878;

          color: #000;

          transform:
            translateY(-2px);
        }

        .scroll-text {
          margin-top: 10px;

          color:
            rgba(255, 255, 255, 0.8);

          font-size: 0.9rem;
        }

        /* ======================================================
           V2 — DAM INTELLIGENCE
        ====================================================== */

        .intelligence-section {
          position: relative;

          width: 100%;
          min-height: 100vh;

          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);

          gap:
            clamp(
              40px,
              6vw,
              90px
            );

          align-items: center;

          padding:
            110px 6vw;

          background: #000;
        }

        .intelligence-copy {
          max-width: 700px;

          opacity: 0;

          transform:
            translateX(-50px);

          transition:
            opacity 0.9s ease,
            transform 0.9s ease;
        }

        .intelligence-section.visible
        .intelligence-copy {
          opacity: 1;

          transform:
            translateX(0);
        }

        .section-label {
          margin-bottom: 18px;

          color: #31b9ff;

          font-size: 0.9rem;

          font-weight: 800;

          letter-spacing:
            0.2em;
        }

        .intelligence-copy h2 {
          margin:
            0 0 25px;

          font-size:
            clamp(
              2.5rem,
              4.5vw,
              4.6rem
            );

          line-height: 1;

          letter-spacing:
            -0.045em;
        }

        .intelligence-copy p {
          margin:
            0 0 18px;

          color:
            rgba(255, 255, 255, 0.76);

          font-size: 1.05rem;

          line-height: 1.7;
        }

        .intelligence-copy strong {
          color: #4ee878;
        }

        .intelligence-copy h3 {
          margin:
            40px 0 12px;

          font-size: 1.8rem;
        }

        .alternative-subtitle {
          color:
            rgba(255, 255, 255, 0.62) !important;
        }

        .intelligence-video-wrap {
          width: 100%;

          overflow: hidden;

          border:
            1px solid
            rgba(255, 255, 255, 0.2);

          border-radius: 24px;

          background: #080808;

          opacity: 0;

          transform:
            translateX(50px);

          transition:
            opacity 1s ease,
            transform 1s ease;
        }

        .intelligence-section.visible
        .intelligence-video-wrap {
          opacity: 1;

          transform:
            translateX(0);
        }

        .intelligence-video {
          display: block;

          width: 100%;

          aspect-ratio:
            16 / 10;

          object-fit: cover;
        }

        /* ======================================================
           V3
        ====================================================== */

        .atmosphere-section {
          position: relative;

          width: 100%;
          min-height: 100vh;

          padding:
            115px 34px 120px;

          background: #000;

          text-align: center;

          overflow: hidden;
        }

        .atmosphere-label {
          margin-bottom: 38px;

          color: #31b9ff;

          font-size:
            clamp(
              0.85rem,
              1.1vw,
              1rem
            );

          font-weight: 800;

          letter-spacing:
            0.24em;
        }

        .atmosphere-title {
          max-width: 1450px;

          margin:
            0 auto 40px;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(
              52px,
              7vw,
              108px
            );

          font-weight: 700;

          line-height:
            0.98;

          letter-spacing:
            -0.045em;
        }

        .atmosphere-title em {
          font-style: italic;
        }

        .atmosphere-description {
          max-width: 1200px;

          margin:
            0 auto 76px;

          color:
            rgba(255, 255, 255, 0.68);

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            clamp(
              1.05rem,
              1.5vw,
              1.4rem
            );

          line-height: 1.65;
        }

        .atmosphere-video-wrap {
          width: 100%;

          max-width: 1500px;

          margin: 0 auto;

          overflow: hidden;

          opacity: 0;

          transform:
            translateY(60px)
            scale(0.97);

          transition:
            opacity 1.1s ease,
            transform 1.1s ease;
        }

        .atmosphere-section.visible
        .atmosphere-video-wrap {
          opacity: 1;

          transform:
            translateY(0)
            scale(1);
        }

        .atmosphere-video {
          display: block;

          width: 100%;

          min-height: 500px;

          object-fit: cover;

          background: #050505;
        }

        .atmosphere-next-button {
          display: inline-flex;

          align-items: center;

          margin-top: 42px;

          padding:
            14px 26px;

          border:
            1px solid
            rgba(255, 255, 255, 0.65);

          border-radius: 999px;

          background: transparent;

          color: #fff;

          font-size: 0.95rem;
          font-weight: 600;

          text-decoration: none;

          transition:
            background 0.2s ease,
            color 0.2s ease;
        }

        .atmosphere-next-button:hover {
          background: #4ee878;

          color: #000;
        }

        /* ======================================================
           V4
        ====================================================== */

        .space-section {
          position: relative;

          width: 100%;
          min-height: 100vh;

          display: grid;

          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 0.72fr);

          gap:
            clamp(
              50px,
              8vw,
              120px
            );

          align-items: center;

          padding:
            90px 5vw;

          background: #000;

          overflow: hidden;
        }

        .space-copy {
          max-width: 720px;

          opacity: 0;

          transform:
            translateX(-60px);

          transition:
            opacity 1s ease,
            transform 1s ease;
        }

        .space-section.visible
        .space-copy {
          opacity: 1;

          transform:
            translateX(0);
        }

        .space-label {
          margin-bottom: 30px;

          color: #31b9ff;

          font-size:
            clamp(
              0.95rem,
              1.3vw,
              1.15rem
            );

          font-weight: 700;

          letter-spacing:
            0.05em;
        }

        .space-title {
          max-width: 680px;

          margin:
            0 0 38px;

          font-size:
            clamp(
              3rem,
              5vw,
              5.3rem
            );

          font-weight: 800;

          line-height:
            0.99;

          letter-spacing:
            -0.055em;
        }

        .space-copy p {
          max-width: 690px;

          margin:
            0 0 30px;

          color:
            rgba(255, 255, 255, 0.72);

          font-size:
            clamp(
              1rem,
              1.35vw,
              1.25rem
            );

          line-height:
            1.75;
        }

        .space-copy strong {
          color: #4ee878;
        }

        .space-video-wrap {
          width: 100%;

          height: 78vh;

          min-height: 560px;

          overflow: hidden;

          background: #080808;

          opacity: 0;

          transform:
            translateX(70px);

          transition:
            opacity 1.1s ease,
            transform 1.1s ease;
        }

        .space-section.visible
        .space-video-wrap {
          opacity: 1;

          transform:
            translateX(0);
        }

        .space-video {
          display: block;

          width: 100%;
          height: 100%;

          object-fit: cover;
        }

        /* ======================================================
           CONTINUOUS IMAGE STRIP
           NO INCIDENT MAP
           NO BOTTOM MONITOR TEXT
        ====================================================== */

        .visual-strip-section {
          position: relative;

          width: 100%;

          min-height: 650px;

          padding:
            125px 0
            95px;

          background: #000;

          overflow: hidden;
        }

        .visual-strip-header {
          position: relative;

          z-index: 10;

          width: 100%;

          padding:
            0 30px;

          text-align: center;
        }

        .visual-strip-title {
          margin:
            0 auto 38px;

          max-width: 1100px;

          color: #fff;

          font-size:
            clamp(
              2.5rem,
              4.5vw,
              4.6rem
            );

          font-weight: 800;

          line-height: 1.05;

          letter-spacing:
            -0.045em;
        }

        .visual-strip-title span {
          color: #4ee878;
        }

        .visual-strip-text {
          max-width: 900px;

          margin:
            0 auto 72px;

          color:
            rgba(255, 255, 255, 0.72);

          font-size:
            clamp(
              1rem,
              1.35vw,
              1.25rem
            );

          line-height: 1.7;
        }

        /* ======================================================
           MARQUEE WINDOW
        ====================================================== */

        .marquee-window {
          position: relative;

          width: 100%;

          overflow: hidden;

          padding:
            10px 0
            35px;
        }

        .marquee-window::before {
          content: "";

          position: absolute;

          left: 0;
          top: 0;

          width: 16%;

          height: 100%;

          z-index: 10;

          pointer-events: none;

          background:
            linear-gradient(
              to right,
              #000 0%,
              rgba(0, 0, 0, 0.85) 35%,
              rgba(0, 0, 0, 0) 100%
            );
        }

        .marquee-window::after {
          content: "";

          position: absolute;

          right: 0;
          top: 0;

          width: 16%;

          height: 100%;

          z-index: 10;

          pointer-events: none;

          background:
            linear-gradient(
              to left,
              #000 0%,
              rgba(0, 0, 0, 0.85) 35%,
              rgba(0, 0, 0, 0) 100%
            );
        }

        /* ======================================================
           CONTINUOUS MOVEMENT
           NEVER STOPS ON HOVER
        ====================================================== */

        .marquee-track {
          display: flex;

          width: max-content;

          gap: 30px;

          animation:
            marqueeMove
            30s
            linear
            infinite;

          will-change: transform;
        }

        @keyframes marqueeMove {
          from {
            transform:
              translateX(0);
          }

          to {
            transform:
              translateX(
                calc(
                  -50% - 15px
                )
              );
          }
        }

        /* ======================================================
           IMAGE CARDS
        ====================================================== */

        .marquee-card {
          position: relative;

          flex:
            0 0
            clamp(
              170px,
              14vw,
              235px
            );

          height:
            clamp(
              250px,
              25vw,
              335px
            );

          overflow: hidden;

          border-radius: 22px;

          background: #111;

          border:
            1px solid
            rgba(255, 255, 255, 0.08);

          transition:
            transform 0.35s ease,
            border-color 0.35s ease;
        }

        .marquee-card:hover {
          transform:
            translateY(-10px)
            scale(1.025);

          border-color:
            rgba(78, 232, 120, 0.7);
        }

        .marquee-card img {
          display: block;

          width: 100%;
          height: 100%;

          object-fit: cover;

          transition:
            transform 0.7s ease,
            filter 0.4s ease;
        }

        .marquee-card:hover img {
          transform:
            scale(1.07);

          filter:
            brightness(1.08);
        }

        .marquee-card::after {
          content: "";

          position: absolute;

          inset: 0;

          background:
            linear-gradient(
              to bottom,
              transparent 45%,
              rgba(0, 0, 0, 0.8)
            );

          pointer-events: none;
        }

        .marquee-card-label {
          position: absolute;

          left: 16px;
          right: 16px;

          bottom: 16px;

          z-index: 2;

          color: #fff;

          font-size:
            0.82rem;

          font-weight: 700;

          line-height: 1.3;

          opacity: 0;

          transform:
            translateY(8px);

          transition:
            opacity 0.3s ease,
            transform 0.3s ease;
        }

        .marquee-card:hover
        .marquee-card-label {
          opacity: 1;

          transform:
            translateY(0);
        }

        /* ======================================================
           WORKFLOW
        ====================================================== */

        .workflow-section {
          position: relative;

          width: 100%;

          min-height: 100vh;

          padding:
            110px 4vw
            130px;

          background: #000;

          overflow: hidden;
        }

        .workflow-header {
          position: relative;

          z-index: 10;

          max-width: 1000px;

          margin:
            0 auto 75px;

          text-align: center;

          opacity: 0;

          transform:
            translateY(35px);

          transition:
            opacity 0.8s ease,
            transform 0.8s ease;
        }

        .workflow-section.visible
        .workflow-header {
          opacity: 1;

          transform:
            translateY(0);
        }

        .workflow-eyebrow {
          margin-bottom: 18px;

          color: #31b9ff;

          font-size:
            0.9rem;

          font-weight: 800;

          letter-spacing:
            0.22em;
        }

        .workflow-title {
          margin:
            0 0 20px;

          color: #fff;

          font-size:
            clamp(
              2.8rem,
              5vw,
              5.8rem
            );

          line-height:
            0.98;

          letter-spacing:
            -0.055em;
        }

        .workflow-description {
          max-width: 800px;

          margin: 0 auto;

          color:
            rgba(255, 255, 255, 0.64);

          font-size:
            clamp(
              1rem,
              1.25vw,
              1.15rem
            );

          line-height: 1.7;
        }

        /* ======================================================
           DIAGRAM
        ====================================================== */

        .workflow-diagram {
          position: relative;

          width: 100%;

          max-width: 1550px;

          min-height: 720px;

          margin: 0 auto;

          opacity: 0;

          transform:
            translateY(50px);

          transition:
            opacity 1s ease,
            transform 1s ease;
        }

        .workflow-section.visible
        .workflow-diagram {
          opacity: 1;

          transform:
            translateY(0);
        }

        /* ======================================================
           SVG LINES
        ====================================================== */

        .workflow-lines {
          position: absolute;

          inset: 0;

          width: 100%;
          height: 100%;

          pointer-events: none;

          z-index: 1;
        }

        .workflow-line {
          fill: none;

          stroke:
            rgba(255, 255, 255, 0.35);

          stroke-width: 2;
        }

        .workflow-line-blue {
          fill: none;

          stroke: #22bfff;

          stroke-width: 3;

          stroke-linecap: round;

          stroke-dasharray:
            8 8;

          animation:
            flowLine
            2s
            linear
            infinite;

          filter:
            drop-shadow(
              0 0 6px
              rgba(34, 191, 255, 0.8)
            );
        }

        @keyframes flowLine {
          to {
            stroke-dashoffset:
              -32;
          }
        }

        /* ======================================================
           INPUT
        ====================================================== */

        .workflow-input {
          position: absolute;

          left: 0;
          top: 190px;

          width: 310px;

          min-height: 270px;

          padding: 28px;

          border:
            2px solid
            #34404c;

          border-radius: 12px;

          background:
            rgba(5, 8, 11, 0.96);

          z-index: 5;

          transition:
            border-color 0.3s ease,
            transform 0.3s ease;
        }

        .workflow-input:hover {
          border-color:
            #4ee878;

          transform:
            translateY(-4px);
        }

        .workflow-small-label {
          margin-bottom: 22px;

          color:
            rgba(255, 255, 255, 0.6);

          font-size: 0.9rem;
        }

        .workflow-input h3 {
          margin:
            0 0 18px;

          font-size: 1.05rem;

          line-height: 1.6;
        }

        .workflow-input p {
          margin: 0;

          color:
            rgba(255, 255, 255, 0.7);

          font-size: 0.88rem;

          line-height: 1.65;
        }

        /* ======================================================
           PROCESS
        ====================================================== */

        .workflow-process {
          position: absolute;

          left: 28%;
          top: 225px;

          width: 315px;

          min-height: 330px;

          padding: 28px;

          border:
            2px solid
            #34404c;

          border-radius: 12px;

          background:
            rgba(5, 8, 11, 0.96);

          z-index: 5;

          transition:
            border-color 0.3s ease,
            transform 0.3s ease;
        }

        .workflow-process:hover {
          border-color:
            #31b9ff;

          transform:
            translateY(-4px);
        }

        .workflow-process h3 {
          margin:
            0 0 20px;

          font-size: 1.05rem;
        }

        .process-row {
          display: flex;

          justify-content:
            space-between;

          align-items: center;

          padding:
            13px 0;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.1);

          color:
            rgba(255, 255, 255, 0.65);

          font-size: 0.9rem;
        }

        .process-row strong {
          color: #4ee878;
        }

        .process-button {
          margin-top: 18px;

          padding:
            11px 20px;

          border: 0;

          border-radius: 8px;

          background: #b7ff4a;

          color: #000;

          font-weight: 800;

          cursor: pointer;
        }

        /* ======================================================
           VIDEO STACK
        ====================================================== */

        .workflow-media-stack {
          position: absolute;

          left: 51%;
          top: 45px;

          width: 320px;

          display: flex;

          flex-direction: column;

          gap: 18px;

          z-index: 5;
        }

        .workflow-video-card {
          position: relative;

          width: 100%;
          height: 125px;

          overflow: hidden;

          border:
            2px solid
            #34404c;

          border-radius: 12px;

          background: #080808;

          transition:
            transform 0.3s ease,
            border-color 0.3s ease;
        }

        .workflow-video-card:hover {
          transform:
            translateX(6px)
            scale(1.02);

          border-color:
            #31b9ff;
        }

        .workflow-video {
          width: 100%;
          height: 100%;

          display: block;

          object-fit: cover;
        }

        .workflow-video-overlay {
          position: absolute;

          inset: 0;

          display: flex;

          align-items: flex-end;

          padding: 12px;

          background:
            linear-gradient(
              transparent 30%,
              rgba(0, 0, 0, 0.88)
            );

          pointer-events: none;
        }

        .workflow-video-title {
          color: #fff;

          font-size:
            0.82rem;

          font-weight: 800;
        }

        /* ======================================================
           START / END
        ====================================================== */

        .workflow-pill {
          position: absolute;

          left: 72.3%;

          width: 72px;
          height: 42px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 999px;

          background: #fff;

          color: #000;

          font-size: 0.8rem;

          font-weight: 800;

          z-index: 20;
        }

        .workflow-start {
          top: 310px;
        }

        .workflow-end {
          top: 415px;
        }

        /* ======================================================
           OUTPUT
        ====================================================== */

        .workflow-output {
          position: absolute;

          right: 0;
          top: 250px;

          width: 320px;

          min-height: 330px;

          padding: 28px;

          border:
            2px solid
            #34404c;

          border-radius: 12px;

          background:
            rgba(5, 8, 11, 0.96);

          z-index: 5;

          transition:
            border-color 0.3s ease,
            transform 0.3s ease;
        }

        .workflow-output:hover {
          border-color:
            #4ee878;

          transform:
            translateY(-4px);
        }

        .output-image {
          width: 100%;

          height: 150px;

          margin-bottom: 18px;

          overflow: hidden;

          border-radius: 8px;
        }

        .output-image video {
          width: 100%;
          height: 100%;

          object-fit: cover;
        }

        .output-row {
          display: flex;

          justify-content:
            space-between;

          padding:
            11px 0;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.1);

          color:
            rgba(255, 255, 255, 0.65);

          font-size: 0.85rem;
        }

        .output-row strong {
          color: #b7ff4a;
        }

        .predict-button {
          margin-top: 18px;

          padding:
            12px 22px;

          border: 0;

          border-radius: 8px;

          background: #b7ff4a;

          color: #000;

          font-weight: 800;

          cursor: pointer;
        }

        /* ======================================================
           FOOTER
        ====================================================== */

        .site-footer {
          position: relative;

          width: 100%;

          background: #111216;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.08);

          color: #fff;

          padding:
            100px 56px
            38px;
        }

        .footer-main {
          width: 100%;

          display: grid;

          grid-template-columns:
            1.6fr
            1fr
            1fr
            1fr
            1fr;

          gap: 60px;

          padding-bottom:
            90px;
        }

        .footer-brand h3 {
          margin:
            0 0 25px;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size:
            1.6rem;

          font-weight:
            700;
        }

        .footer-brand p {
          max-width:
            330px;

          margin: 0;

          color:
            rgba(255, 255, 255, 0.55);

          font-size:
            1rem;

          line-height:
            1.8;
        }

        .footer-column {
          display:
            flex;

          flex-direction:
            column;

          align-items:
            flex-start;

          gap:
            20px;
        }

        .footer-column h4 {
          margin:
            0 0 14px;

          color:
            rgba(255, 255, 255, 0.55);

          font-size:
            0.85rem;

          font-weight:
            800;

          letter-spacing:
            0.12em;
        }

        .footer-column a {
          color:
            rgba(255, 255, 255, 0.82);

          font-size:
            0.98rem;

          text-decoration:
            none;

          transition:
            color 0.2s ease,
            transform 0.2s ease;
        }

        .footer-column a:hover {
          color:
            #4ee878;

          transform:
            translateX(4px);
        }

        .footer-bottom {
          width: 100%;

          display:
            grid;

          grid-template-columns:
            1fr
            auto
            1fr;

          align-items:
            center;

          gap:
            30px;

          padding-top:
            42px;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.08);
        }

        .footer-copyright {
          color:
            rgba(255, 255, 255, 0.45);

          font-size:
            0.9rem;
        }

        .footer-status {
          display:
            flex;

          align-items:
            center;

          justify-content:
            center;

          gap:
            10px;

          color:
            rgba(255, 255, 255, 0.55);

          font-size:
            0.9rem;
        }

        .status-dot {
          width:
            10px;

          height:
            10px;

          display:
            inline-block;

          border-radius:
            50%;

          background:
            #4ee878;

          box-shadow:
            0 0 12px
            rgba(78, 232, 120, 0.8);
        }

        .footer-legal {
          display:
            flex;

          align-items:
            center;

          justify-content:
            flex-end;

          gap:
            10px;

          color:
            rgba(255, 255, 255, 0.45);

          font-size:
            0.9rem;
        }

        .footer-legal a {
          color:
            inherit;

          text-decoration:
            none;

          transition:
            color 0.2s ease;
        }

        .footer-legal a:hover {
          color:
            #fff;
        }

        /* ======================================================
           RESPONSIVE
        ====================================================== */

        @media (max-width: 1200px) {
          .site-nav {
            gap: 18px;
            padding-right: 20px;
          }
          .nav-link {
            font-size: 0.95rem;
          }
        }

        @media (max-width: 1250px) {
          .workflow-diagram {
            min-height: 1100px;
          }

          .workflow-input {
            left: 2%;
            top: 280px;
          }

          .workflow-process {
            left: 36%;
            top: 280px;
          }

          .workflow-media-stack {
            left: 39%;
            top: 650px;
          }

          .workflow-output {
            right: 2%;
            top: 280px;
          }

          .workflow-pill {
            display: none;
          }

          .workflow-lines {
            display: none;
          }
        }

        @media (max-width: 900px) {
          .site-footer {
            padding:
              75px 30px
              30px;
          }

          .footer-main {
            grid-template-columns:
              repeat(2, 1fr);

            gap:
              55px 35px;

            padding-bottom:
              60px;
          }

          .footer-brand {
            grid-column:
              1 / -1;
          }

          .footer-bottom {
            grid-template-columns:
              1fr;

            text-align:
              center;

            gap:
              20px;
          }

          .footer-status {
            order:
              2;
          }

          .footer-legal {
            order:
              3;

            justify-content:
              center;
          }
        }

        @media (max-width: 800px) {
          .site-header {
            height: 76px;

            padding:
              0 15px;
          }

          .site-nav {
            position: static;

            width: auto;
            height: 76px;

            margin-left: auto;

            justify-content:
              flex-end;

            gap: 12px;

            overflow-x: auto;
          }

          .nav-item,
          .nav-link {
            height: 76px;
          }

          .nav-link {
            font-size:
              0.72rem;
          }

          .intelligence-section {
            grid-template-columns: 1fr;

            padding:
              80px 22px;

            gap: 45px;
          }

          .atmosphere-section {
            padding:
              85px 20px;
          }

          .atmosphere-title {
            font-size:
              3.2rem;
          }

          .atmosphere-description {
            font-size:
              1rem;

            margin-bottom:
              45px;
          }

          .atmosphere-video {
            min-height:
              280px;
          }

          .space-section {
            grid-template-columns: 1fr;

            min-height: auto;

            padding:
              80px 22px;

            gap: 50px;
          }

          .space-title {
            font-size:
              3.1rem;
          }

          .space-video-wrap {
            height:
              65vh;

            min-height:
              420px;
          }

          .visual-strip-section {
            min-height: 560px;

            padding:
              90px 0;
          }

          .visual-strip-title {
            font-size:
              2.7rem;

            padding:
              0 20px;
          }

          .visual-strip-text {
            padding:
              0 20px;

            margin-bottom:
              50px;
          }

          .marquee-track {
            gap: 18px;

            animation-duration:
              25s;
          }

          .marquee-card {
            flex-basis:
              155px;

            height:
              245px;

            border-radius:
              18px;
          }

          .marquee-window::before,
          .marquee-window::after {
            width: 22%;
          }

          .workflow-section {
            padding:
              85px 18px
              100px;
          }

          .workflow-title {
            font-size:
              3rem;
          }

          .workflow-diagram {
            min-height: auto;

            display: flex;

            flex-direction: column;

            gap: 28px;
          }

          .workflow-lines {
            display: none;
          }

          .workflow-input,
          .workflow-process,
          .workflow-output {
            position: relative;

            top: auto;
            left: auto;
            right: auto;

            width: 100%;

            min-height: auto;
          }

          .workflow-media-stack {
            position: relative;

            left: auto;
            top: auto;

            width: 100%;
          }

          .workflow-video-card {
            height: 180px;
          }

          .workflow-pill {
            display: none;
          }
        }

        @media (max-width: 500px) {
          .brand {
            font-size:
              1.2rem;
          }

          .brand-mark {
            width: 39px;
            height: 39px;

            font-size:
              1.5rem;
          }

          .site-nav {
            gap: 8px;
          }

          .nav-link {
            font-size:
              0.65rem;
          }

          .home-content {
            padding:
              120px 18px 50px;
          }

          .home-content h1 {
            font-size:
              43px;
          }

          .visual-strip-title {
            font-size:
              2.35rem;
          }

          .marquee-card {
            flex-basis:
              145px;

            height:
              225px;
          }

          .footer-main {
            grid-template-columns:
              1fr;

            gap:
              42px;
          }

          .footer-brand {
            grid-column:
              auto;
          }

          .footer-brand p {
            max-width:
              100%;
          }

          .footer-bottom {
            padding-top:
              30px;
          }

          .footer-legal {
            flex-wrap:
              wrap;
          }
        }
      `}</style>

      <main
        className="home"
        id="home"
      >
        {activeRoute ? (
          <div className="feature-view-layout" data-theme={themeMode}>
            {renderHeader(true)}
            <div className="feature-view-content">
              {(() => {
                const ActiveComponent =
                  VIEW_COMPONENTS[activeRoute.category]?.[activeRoute.feature];
                return ActiveComponent ? (
                  <ActiveComponent
                    selectedDamId={selectedDamId}
                    onSelectDam={handleSelectDam}
                    onBack={navigateToHome}
                    modelParams={modelParameters}
                    onUpdateModelParams={setModelParameters}
                    onRunSimulation={runPrediction}
                    simulationResult={simulationResult}
                    isSimulating={simulationLoading}
                    simulationError={simulationError}
                  />
                ) : (
                  <div style={{ padding: "100px 40px", textAlign: "center" }}>
                    <h2 style={{ fontSize: "1.8rem", color: "#4ee878" }}>
                      Feature View
                    </h2>
                    <p style={{ color: "rgba(255,255,255,0.7)", margin: "16px 0" }}>
                      Active category: {activeRoute.category} &bull; Feature: {activeRoute.feature}
                    </p>
                    <button
                      className="primary-button"
                      onClick={navigateToHome}
                      style={{ marginTop: "20px" }}
                    >
                      Return to Dashboard
                    </button>
                  </div>
                );
              })()}
            </div>
            {renderFooter()}
            <FlowGuardChatbot
              selectedDamId={selectedDamId}
              modelParameters={modelParameters}
              simulationResult={simulationResult}
              activeRoute={activeRoute}
              themeMode={themeMode}
            />
          </div>
        ) : (
          <>
            {/* ======================================================
                HERO
                V1 ONLY
            ====================================================== */}

            <section
              className="hero"
              id="hero"
            >
              <video
                className="home-video"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                src="/assets/videos/V1.mp4"
              />

              <div className="home-overlay" />

              {/* HEADER */}
              {renderHeader(false)}

              {/* HERO CONTENT */}

          <div
            className="home-content"
          >
            <div className="eyebrow">
              DAM SENTINEL AI
            </div>

            <h1>
              Predict the{" "}
              <span>
                Overflow
              </span>
              <br />
              Before It Becomes
              a Disaster
            </h1>

            <p className="subtitle">
              AI-powered early warning for
              dam overflow, hydroelectric
              infrastructure, and downstream
              flood-risk management.
            </p>

            <a
              className="primary-button"
              href="#dam-intelligence"
              onClick={goToIntelligence}
            >
              Explore Dam Intelligence →
            </a>

            <div className="scroll-text">
              Scroll to explore
            </div>
          </div>
        </section>

        {/* ======================================================
            V2 — DAM INTELLIGENCE
        ====================================================== */}

        <section
          ref={intelligenceSectionRef}
          id="dam-intelligence"
          className={
            `intelligence-section ${
              intelligenceVisible
                ? "visible"
                : ""
            }`
          }
        >
          <div
            className="intelligence-copy"
          >
            <div className="section-label">
              DAM INTELLIGENCE
            </div>

            <h2>
              Visualizing the Risk We Predict
            </h2>

            <p>
              AI-powered dam intelligence
              combines reservoir data,
              weather conditions, satellite
              observations, river-flow
              measurements, and structural
              sensors to understand how water
              levels and dam conditions are
              changing.
            </p>

            <p>
              Our system analyzes these
              signals to predict{" "}
              <strong>
                overflow, flood risk, and
                hydroelectric infrastructure
                threats
              </strong>{" "}
              before they become critical.
            </p>

            <h3>
              Understanding the Water Before
              It Becomes a Threat
            </h3>

            <p className="alternative-subtitle">
              We combine real-time reservoir
              levels, inflow and outflow data,
              rainfall, satellite imagery,
              and structural health information
              to predict dangerous conditions
              and support faster emergency
              decisions.
            </p>
          </div>

          <div
            className="intelligence-video-wrap"
          >
            <video
              ref={intelligenceVideoRef}
              className="intelligence-video"
              muted
              loop
              playsInline
              preload="metadata"
              src="/assets/videos/V2.mp4"
            />
          </div>
        </section>

        {/* ======================================================
            V3 — SPACE BASED MONITORING
        ====================================================== */}

        <section
          ref={atmosphereSectionRef}
          id="atmospheric-intelligence"
          className={
            `atmosphere-section ${
              atmosphereVisible
                ? "visible"
                : ""
            }`
          }
        >
          <div className="atmosphere-label">
            SPACE-BASED DAM MONITORING
          </div>

          <h2
            className="atmosphere-title"
          >
            Observe Dam Conditions{" "}
            <em>
              From Space
            </em>
          </h2>

          <p
            className="atmosphere-description"
          >
            Satellite intelligence transforms
            Earth-observation data into a
            clearer picture of changing
            reservoir conditions. By combining
            satellite observations with weather,
            terrain, and hydrological information,
            Flow Guard AI helps reveal emerging
            flood risks before they intensify.
          </p>

          <div
            className="atmosphere-video-wrap"
          >
            <video
              ref={atmosphereVideoRef}
              className="atmosphere-video"
              muted
              loop
              playsInline
              preload="metadata"
              src="/assets/videos/V3.mp4"
            />
          </div>

          <a
            className="atmosphere-next-button"
            href="#space-monitoring"
            onClick={goToSpace}
          >
            Explore Space-Based Monitoring →
          </a>
        </section>

        {/* ======================================================
            V4 — ATMOSPHERIC VISUALIZATION
        ====================================================== */}

        <section
          ref={spaceSectionRef}
          id="space-monitoring"
          className={
            `space-section ${
              spaceVisible
                ? "visible"
                : ""
            }`
          }
        >
          <div className="space-copy">
            <div className="space-label">
              ATMOSPHERIC VISUALIZATION
            </div>

            <h2 className="space-title">
              Seeing the atmosphere before
              pollution changes.
            </h2>

            <p>
              Flow Guard AI uses satellite
              observations, weather conditions
              and environmental signals to
              understand changing reservoir
              and flood-risk conditions.
            </p>

            <p>
              The visualization represents
              the changing environmental
              conditions behind the prediction
              system — transforming complex
              signals into an intuitive visual
              experience.
            </p>
          </div>

          <div
            className="space-video-wrap"
          >
            <video
              ref={spaceVideoRef}
              className="space-video"
              muted
              loop
              playsInline
              preload="metadata"
              src="/assets/videos/V4.mp4"
            />
          </div>
        </section>

        {/* ======================================================
            CONTINUOUS IMAGE SECTION
        ====================================================== */}

        <section
          className="visual-strip-section"
          id="visual-intelligence"
        >
          <div
            className="visual-strip-header"
          >
            <h2
              className="visual-strip-title"
            >
              Intelligent Dam,
              <span>
                Smarter Decisions
              </span>
            </h2>

            <p
              className="visual-strip-text"
            >
              Flow Guard combines satellite
              observations, hydrological data,
              weather conditions, infrastructure
              signals, and AI to understand
              changing dam conditions and
              downstream flood risk.
            </p>
          </div>

          <div
            className="marquee-window"
          >
            <div
              className="marquee-track"
            >

              {/* FIRST IMAGE SET */}

              {marqueeImages.map(
                (item, index) => (
                  <div
                    className="marquee-card"
                    key={`first-${index}`}
                  >
                    <img
                      src={item.src}
                      alt={item.title}
                      loading="lazy"
                    />

                    <div
                      className="marquee-card-label"
                    >
                      {item.title}
                    </div>
                  </div>
                )
              )}

              {/* DUPLICATE SET FOR
                  SEAMLESS INFINITE LOOP */}

              {marqueeImages.map(
                (item, index) => (
                  <div
                    className="marquee-card"
                    key={`second-${index}`}
                  >
                    <img
                      src={item.src}
                      alt={item.title}
                      loading="lazy"
                    />

                    <div
                      className="marquee-card-label"
                    >
                      {item.title}
                    </div>
                  </div>
                )
              )}

            </div>
          </div>
        </section>

        {/* ======================================================
            BLOCK DIAGRAM / WORKFLOW
        ====================================================== */}

        <section
          ref={workflowSectionRef}
          id="system-workflow"
          className={
            `workflow-section ${
              workflowVisible
                ? "visible"
                : ""
            }`
          }
        >
          <div
            className="workflow-header"
          >
            <div className="workflow-eyebrow">
              FLOW GUARD AI WORKFLOW
            </div>

            <h2 className="workflow-title">
              From Data to Flood Intelligence
            </h2>

            <p
              className="workflow-description"
            >
              Multiple environmental,
              hydrological and infrastructure
              signals are processed through
              the Flow Guard intelligence
              pipeline to generate predictive
              flood-risk insights.
            </p>
          </div>

          <div
            className="workflow-diagram"
          >
            {/* SVG CONNECTING LINES */}

            <svg
              className="workflow-lines"
              viewBox="0 0 1550 720"
              preserveAspectRatio="none"
            >
              <path
                className="workflow-line"
                d="
                  M310 325
                  C350 325
                  390 325
                  435 355
                "
              />

              <path
                className="workflow-line"
                d="
                  M750 355
                  C790 355
                  785 120
                  795 120
                "
              />

              <path
                className="workflow-line"
                d="
                  M750 355
                  C790 355
                  785 250
                  795 250
                "
              />

              <path
                className="workflow-line"
                d="
                  M750 355
                  C790 355
                  785 390
                  795 390
                "
              />

              <path
                className="workflow-line"
                d="
                  M750 355
                  C790 355
                  785 525
                  795 525
                "
              />

              <path
                className="workflow-line-blue"
                d="
                  M1115 120
                  C1160 120
                  1160 360
                  1225 360
                "
              />

              <path
                className="workflow-line"
                d="
                  M1115 250
                  C1160 250
                  1160 370
                  1225 370
                "
              />

              <path
                className="workflow-line"
                d="
                  M1115 390
                  C1160 390
                  1160 380
                  1225 380
                "
              />

              <path
                className="workflow-line"
                d="
                  M1115 525
                  C1160 525
                  1160 395
                  1225 395
                "
              />
            </svg>

            {/* INPUT */}

            <div
              className="workflow-input"
            >
              <div
                className="workflow-small-label"
              >
                Dam & Environmental Input
              </div>

              <h3>
                Analyze reservoir conditions,
                rainfall, river flow, terrain
                and infrastructure signals.
              </h3>

              <p>
                Real-time and historical
                observations provide the
                foundation for downstream
                flood prediction.
              </p>
            </div>

            {/* PROCESS */}

            <div
              className="workflow-process"
            >
              <h3>
                Flow Guard Intelligence Model
              </h3>

              <div className="process-row">
                <span>
                  Reservoir
                </span>

                <strong>
                  Integrated
                </strong>
              </div>

              <div className="process-row">
                <span>
                  Weather
                </span>

                <strong>
                  Combined
                </strong>
              </div>

              <div className="process-row">
                <span>
                  Terrain
                </span>

                <strong>
                  Processed
                </strong>
              </div>

              <div className="process-row">
                <span>
                  Sensors
                </span>

                <strong>
                  Analyzed
                </strong>
              </div>

              <div className="process-row">
                <span>
                  History
                </span>

                <strong>
                  Learned
                </strong>
              </div>

              <button
                className="process-button"
                onClick={() => {
                  workflowVideoRefs.current.forEach(
                    (video) => {
                      video
                        ?.play()
                        .catch(() => {});
                    }
                  );
                }}
              >
                PROCESS
              </button>
            </div>

            {/* V5 V6 V7 V8 */}

            <div
              className="workflow-media-stack"
            >
              {diagramVideos.map(
                (item, index) => (
                  <div
                    className="workflow-video-card"
                    key={item.file}
                  >
                    <video
                      ref={(element) => {
                        workflowVideoRefs.current[
                          index
                        ] = element;
                      }}
                      className="workflow-video"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      src={
                        `/assets/videos/${item.file}`
                      }
                    />

                    <div
                      className="workflow-video-overlay"
                    >
                      <span
                        className="workflow-video-title"
                      >
                        {item.title}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* START */}

            <div
              className={
                "workflow-pill workflow-start"
              }
            >
              Start
            </div>

            {/* END */}

            <div
              className={
                "workflow-pill workflow-end"
              }
            >
              End
            </div>

            {/* OUTPUT */}

            <div className="workflow-output">

                <div className="output-image">
                  <video
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    src="/assets/videos/V8.mp4"
                  />
                </div>

                {/* Simulation Result */}
                <div className="output-row">
                  <span>Risk</span>

                  <strong>
                    {simulationResult ? "HIGH" : "—"}
                  </strong>
                </div>

                <div className="output-row">
                  <span>Peak Outflow</span>

                  <strong>
                    {simulationResult
                      ? `${simulationResult.peakBreachOutflowM3s?.toFixed(1)} m³/s`
                      : "—"}
                  </strong>
                </div>

                <div className="output-row">
                  <span>Time to Peak</span>

                  <strong>
                    {simulationResult
                      ? `${simulationResult.timeToPeakHours?.toFixed(2)} hrs`
                      : "—"}
                  </strong>
                </div>

                <div className="output-row">
                  <span>Max Flood Depth</span>

                  <strong>
                    {simulationResult
                      ? `${simulationResult.maxFloodDepthM?.toFixed(1)} m`
                      : "—"}
                  </strong>
                </div>

                <div className="output-row">
                  <span>Inundation Area</span>

                  <strong>
                    {simulationResult
                      ? `${simulationResult.totalInundationAreaKm2?.toFixed(2)} km²`
                      : "—"}
                  </strong>
                </div>

                <button
                  type="button"
                  className="predict-button"
                  onClick={runPrediction}
                  disabled={simulationLoading}
                >
                  {simulationLoading ? "RUNNING..." : "PREDICT"}
                </button>

                {/* Error */}
                {simulationError && (
                  <div
                    style={{
                      marginTop: "12px",
                      color: "#ff6b6b",
                      fontSize: "0.8rem",
                    }}
                  >
                    {simulationError}
                  </div>
                )}

              </div>        {/* workflow-output */}

              </div>        {/* workflow-diagram */}

             </section>   {/* workflow-section */}

        {/* ======================================================
            FOOTER
        ====================================================== */}

        {renderFooter()}
          </>
        )}
      </main>
    </>
  );
}


/* ============================================================
   RENDER
============================================================ */

createRoot(
  document.getElementById("root")
).render(
  <App />
);