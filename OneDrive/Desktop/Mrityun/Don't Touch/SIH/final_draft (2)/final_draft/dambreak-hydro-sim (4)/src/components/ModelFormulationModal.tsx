import React from 'react';
import { X, BookOpen } from 'lucide-react';

interface ModelFormulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelFormulationModal: React.FC<ModelFormulationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-mono">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-[var(--text-primary)] text-xs transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                Hydrodynamic Modelling &amp; Scientific Formulations
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Governing equations for 2D SWE, SPH, Froehlich empirical breach, and UK Defra hazard matrices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
          {/* 1. 2D Shallow Water Equations (SWE) */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] text-xs">1. 2D Saint-Venant Shallow Water Equations (SWE)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 font-bold">
                FINITE VOLUME MESH
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] font-mono text-teal-400 font-bold">
              ∂h/∂t + ∂(hu)/∂x + ∂(hv)/∂y = S_source
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-sans">
              Conserves mass and momentum over complex topographic relief. Handles supercritical jet formation at the breach constriction and transition to subcritical floodplain flow.
            </p>
          </div>

          {/* 2. SPH Smooth Particle Hydrodynamics */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] text-xs">2. Smoothed Particle Hydrodynamics (SPH)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-bold">
                LAGRANGIAN MESH-FREE
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] font-mono text-sky-400 font-bold">
              dv_i/dt = - ∑ m_j ( P_i/ρ_i² + P_j/ρ_j² + Π_ij ) ∇_i W_ij + g
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-sans">
              Lagrangian particle formulation solving 3D Navier-Stokes equations with free-surface boundary conditions. Models complex hydraulic bore collapse and plunge basin turbulence.
            </p>
          </div>

          {/* 3. Froehlich Empirical Outflow */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] text-xs">3. Froehlich (2008) Peak Breach Outflow</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                CWC / USBR APPROVED
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] font-mono text-amber-400 font-bold">
              Q_p = 0.607 · V_w^0.295 · h_w^1.24
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-sans">
              Regression model derived from 74 historic dam breach case studies. Computes peak outflow discharge ($m^3/s$) as a function of reservoir volume ($V_w$) and breach head ($h_w$).
            </p>
          </div>

          {/* 4. UK Defra Flood Hazard Matrix */}
          <div className="p-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[var(--text-primary)] text-xs">4. UK Defra / Environment Agency Hazard Rating (HR)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
                HUMAN SAFETY MATRIX
              </span>
            </div>
            <div className="p-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-color)] font-mono text-rose-400 font-bold">
              HR = d · (v + 0.5) + DF
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed font-sans">
              Combines flood depth (d), flow velocity (v), and debris factor (DF) to categorize human instability hazard from Moderate (HR &lt; 0.75) to Extreme (HR &gt; 2.5).
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
          >
            Close Formulations Modal
          </button>
        </div>
      </div>
    </div>
  );
};
