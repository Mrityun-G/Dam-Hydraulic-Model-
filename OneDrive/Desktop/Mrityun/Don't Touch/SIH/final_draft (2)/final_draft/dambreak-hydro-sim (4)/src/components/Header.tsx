import React from 'react';
import { NavigationTab } from '../types';
import { 
  Waves, 
  LayoutDashboard, 
  SlidersHorizontal, 
  Map as MapIcon, 
  Box, 
  AlertTriangle, 
  Satellite, 
  Download,
  BookOpen,
  Globe,
  ChevronDown,
  Activity,
  Sun,
  Moon
} from 'lucide-react';
import { INDIAN_DAMS_REGISTRY } from '../data/damData';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  selectedDamId?: string;
  onSelectDam?: (damId: string) => void;
  onOpenApiModal?: () => void;
  onOpenFormulationModal?: () => void;
  onOpenExportModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  selectedDamId = 'hirakud-dam-odisha',
  onSelectDam,
  onOpenApiModal,
  onOpenFormulationModal,
  onOpenExportModal,
}) => {
  const { theme, toggleTheme } = useTheme();
  const activeDam = INDIAN_DAMS_REGISTRY.find(d => d.id === selectedDamId) || INDIAN_DAMS_REGISTRY[0];

  const navItems: { id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'model-inputs', label: 'Model Inputs', icon: SlidersHorizontal },
    { id: 'sim-3d', label: '3D Model', icon: Box },
    { id: 'map-2d', label: '2D Flood Map', icon: MapIcon },
    { id: 'hazard-loss', label: 'Hazard & Loss', icon: AlertTriangle },
    { id: 'sph-vs-delft3d', label: 'Comparative Models', icon: Waves },
    { id: 'near-real-time-gee', label: 'Live Satellite', icon: Satellite },
    { id: 'export', label: 'Reports', icon: Download },
  ];

  return (
    <header className="bg-[var(--bg-header)] border-b border-[var(--border-color)] text-[var(--text-primary)] sticky top-0 z-50 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-full px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 font-mono">
        {/* Left: Product Identity & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-950/90 dark:bg-teal-950/90 light:bg-teal-100 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0 shadow-sm">
            <Waves className="w-5 h-5 text-teal-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-wider uppercase text-[var(--text-primary)]">
                DAMBREAK HYDRO-SIM
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 uppercase tracking-wider">
                INDIA FLOOD DSS
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-sans mt-0.5">
              3D Hydrodynamic Flood Intelligence Platform
            </div>
          </div>
        </div>

        {/* Center: Selected Dam Specs Bar (Dam / River / State) */}
        <div className="flex flex-wrap items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3.5 py-1.5 text-xs shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">Selected Dam:</span>
            {onSelectDam ? (
              <div className="relative flex items-center">
                <select
                  aria-label="Active Dam Selection"
                  value={selectedDamId}
                  onChange={(e) => onSelectDam(e.target.value)}
                  className="bg-transparent font-bold text-teal-400 focus:outline-none cursor-pointer pr-6 text-xs appearance-none"
                >
                  {INDIAN_DAMS_REGISTRY.map((d) => (
                    <option key={d.id} value={d.id} className="bg-[var(--bg-panel)] text-[var(--text-primary)]">
                      {d.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-teal-500 pointer-events-none absolute right-0" />
              </div>
            ) : (
              <span className="font-bold text-teal-400">
                {activeDam.name}
              </span>
            )}
          </div>

          <span className="text-[var(--text-dim)]">•</span>

          <div className="flex items-center gap-1">
            <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">River:</span>
            <span className="font-bold text-[var(--text-secondary)]">{activeDam.location.river}</span>
          </div>

          <span className="text-[var(--text-dim)]">•</span>

          <div className="flex items-center gap-1">
            <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">State:</span>
            <span className="text-[var(--text-muted)]">{activeDam.location.state}</span>
          </div>
        </div>

        {/* Right: Operational Status, Theme Toggle & System Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Accessible Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] text-[var(--text-primary)] transition cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">☀ Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-600" />
                <span className="text-[11px]">◐ Dark</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg px-2.5 py-1 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>SYSTEM ONLINE</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] text-teal-400 rounded-lg px-2.5 py-1 text-xs font-bold">
            <Activity className="w-3.5 h-3.5 text-teal-500" />
            <span>2D SWE</span>
          </div>

          {onOpenFormulationModal && (
            <button
              onClick={onOpenFormulationModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-teal-400 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] transition cursor-pointer"
              title="View Hydrodynamic Formulations"
            >
              <BookOpen className="w-3.5 h-3.5 text-teal-500" />
              <span className="hidden sm:inline">Formulations</span>
            </button>
          )}

          {onOpenApiModal && (
            <button
              onClick={onOpenApiModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-teal-400 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] transition cursor-pointer"
              title="Data Sources Status"
            >
              <Globe className="w-3.5 h-3.5 text-[var(--text-dim)]" />
              <span className="hidden sm:inline">Data Sources</span>
            </button>
          )}
          <a
            href="/monitoring"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:text-teal-400 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-color)] transition"
            title="Open Dam Monitoring UI"
          >
            <Activity className="w-3.5 h-3.5 text-teal-500" />
            <span className="hidden sm:inline">Monitoring UI</span>
          </a>
        </div>
      </div>

      {/* Primary Application Navigation Bar */}
      <div className="bg-[var(--bg-subnav)] border-t border-[var(--border-color)]">
        <div className="max-w-full px-4 flex items-center space-x-1.5 overflow-x-auto py-1.5 font-mono">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'export' && onOpenExportModal) {
                    onOpenExportModal();
                  } else {
                    onSelectTab(tab.id);
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-400 border border-teal-500/40 shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-500' : 'text-[var(--text-dim)]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
