/**
 * DAMBREAK HYDRO-SIM: 2D/3D Hydrodynamic Inundation & Hazard Modelling System
 * Generalized Indian Dam Breach Simulation & Decision Support Platform
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { PipelineBanner } from './components/PipelineBanner';
import { DashboardOverview } from './components/DashboardOverview';
import { ModelInputsView } from './components/ModelInputsView';
import { FloodMap2D } from './components/FloodMap2D';
import { Simulator3D } from './components/Simulator3D';
import { HazardAnalysisView } from './components/HazardAnalysisView';
import { NearRealTimeGEEView } from './components/NearRealTimeGEEView';
import { SphVsDelft3dView } from './components/SphVsDelft3dView';
import { ExportView } from './components/ExportView';
import { ApiIntegrationsModal } from './components/ApiIntegrationsModal';
import { ModelFormulationModal } from './components/ModelFormulationModal';
import { ExportModal } from './components/ExportModal';
import { NavigationTab, BreachParameters, HydroSimulationOutput } from './types';
import { DEFAULT_BREACH_SCENARIOS, runHydroSimulation, getDamDefaultBreachScenario } from './utils/hydroEngine';
import { executeSimulationPipeline } from './services/api';
import { INDIAN_DAMS_REGISTRY, HIRAKUD_DAM_SPECS } from './data/damData';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [selectedDamId, setSelectedDamId] = useState<string>('hirakud-dam-odisha');
  const [activeScenario, setActiveScenario] = useState<BreachParameters>(() => {
    return getDamDefaultBreachScenario('hirakud-dam-odisha', 'overtopping');
  });

  // Dynamic simulation output state
  const [simulationOutput, setSimulationOutput] = useState<HydroSimulationOutput>(() => {
    const initialParams = getDamDefaultBreachScenario('hirakud-dam-odisha', 'overtopping');
    const output = runHydroSimulation(initialParams);
    return {
      ...output,
      selectedDamId: 'hirakud-dam-odisha',
      damId: 'hirakud-dam-odisha',
    };
  });

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationProgressText, setSimulationProgressText] = useState<string>('');
  const [simulationProgressPercent, setSimulationProgressPercent] = useState<number>(0);

  // Modals
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);
  const [isFormulationModalOpen, setIsFormulationModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // When dam changes, update scenario & compute dam-specific hydrodynamic simulation output
  const handleSelectDam = (damId: string) => {
    setSelectedDamId(damId);
    const updatedParams = getDamDefaultBreachScenario(damId, activeScenario.failureMode || 'overtopping');
    setActiveScenario(updatedParams);
    const output = runHydroSimulation(updatedParams);

    setSimulationOutput({
      ...output,
      selectedDamId: damId,
      damId: damId,
    });
  };

  // Run full simulation pipeline with asynchronous progress tracking and backend API execution
  const handleRunSimulation = async (customParams?: BreachParameters) => {
    const paramsToRun = customParams || activeScenario;
    setIsSimulating(true);
    setSimulationProgressPercent(5);
    setSimulationProgressText('Initiating hydrodynamic simulation pipeline...');

    try {
      const output = await executeSimulationPipeline(paramsToRun, (stage, pct) => {
        setSimulationProgressText(stage);
        setSimulationProgressPercent(pct);
      });
      const targetDamId = paramsToRun.selectedDamId || selectedDamId;
      setSimulationOutput({
        ...output,
        selectedDamId: targetDamId,
        damId: targetDamId,
      });
    } catch (err) {
      console.error('Simulation execution error:', err);
      const fallbackOutput = runHydroSimulation(paramsToRun);
      const targetDamId = paramsToRun.selectedDamId || selectedDamId;
      setSimulationOutput({
        ...fallbackOutput,
        selectedDamId: targetDamId,
        damId: targetDamId,
      });
    } finally {
      setIsSimulating(false);
      setSimulationProgressPercent(0);
      setSimulationProgressText('');
    }
  };

  // Synchronize top-level selectedDamId when activeScenario changes dam
  useEffect(() => {
    if (activeScenario.selectedDamId && activeScenario.selectedDamId !== selectedDamId) {
      handleSelectDam(activeScenario.selectedDamId);
    }
  }, [activeScenario.selectedDamId]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950 gis-grid-dark transition-colors duration-200">
      {/* 1. Technical Command Center Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        selectedDamId={selectedDamId}
        onSelectDam={handleSelectDam}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        onOpenFormulationModal={() => setIsFormulationModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* 2. Modelling Pipeline Flow Banner */}
      <PipelineBanner currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* 3. Main Content Container */}
      <main className={`flex-1 w-full mx-auto ${currentTab === 'sim-3d' || currentTab === 'map-2d' ? 'max-w-full p-2 sm:p-4' : 'max-w-7xl p-4 sm:p-6'}`}>
        {currentTab === 'dashboard' && (
          <DashboardOverview
            simulationOutput={simulationOutput}
            activeScenario={activeScenario}
            onSelectTab={setCurrentTab}
            onRunSimulation={() => handleRunSimulation()}
            onUpdateScenario={setActiveScenario}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />
        )}

        {currentTab === 'model-inputs' && (
          <ModelInputsView
            currentParams={activeScenario}
            onParamsChange={setActiveScenario}
            onRunSimulation={handleRunSimulation}
            isSimulating={isSimulating}
            simulationProgressText={simulationProgressText}
            simulationProgressPercent={simulationProgressPercent}
          />
        )}

        {currentTab === 'map-2d' && (
          <FloodMap2D simulationOutput={simulationOutput} />
        )}

        {currentTab === 'sim-3d' && (
          <Simulator3D simulationOutput={simulationOutput} />
        )}

        {currentTab === 'sph-vs-delft3d' && (
          <SphVsDelft3dView
            simulationOutput={simulationOutput}
            activeParams={activeScenario}
            onRunSimulation={handleRunSimulation}
            isRunning={isSimulating}
          />
        )}

        {currentTab === 'hazard-loss' && (
          <HazardAnalysisView
            simulationOutput={simulationOutput}
            activeScenario={activeScenario}
            selectedDamId={selectedDamId}
          />
        )}

        {currentTab === 'near-real-time-gee' && (
          <NearRealTimeGEEView simulationOutput={simulationOutput} selectedDamId={selectedDamId} />
        )}

        {currentTab === 'export' && (
          <ExportView simulationOutput={simulationOutput} />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-subnav)] py-3 text-[var(--text-muted)] font-mono text-[11px] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">DAMBREAK HYDRO-SIM</span>
            <span className="text-[var(--text-dim)]">•</span>
            <span>National Flood Emergency Operations &amp; Decision Support System</span>
          </div>
          <div className="text-[var(--text-dim)]">
            Powered by 2D SWE Finite Volume Engine &amp; GEE Geospatial Intelligence
          </div>
        </div>
      </footer>

      {/* Technical Modals */}
      <ApiIntegrationsModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />

      <ModelFormulationModal
        isOpen={isFormulationModalOpen}
        onClose={() => setIsFormulationModalOpen(false)}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        simulationOutput={simulationOutput}
      />
    </div>
  );
}
