import React from 'react';
import { X, Globe, CheckCircle2, Key, Info } from 'lucide-react';
import { EXTERNAL_SERVICES_CATALOG } from '../data/damData';

interface ApiIntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiIntegrationsModal: React.FC<ApiIntegrationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-mono">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-[var(--text-primary)] text-xs transition-colors duration-200">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                External Telemetry &amp; API Integration Gateway
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Live sensor feeds, satellite catalog status, and external CWC interfaces
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

        {/* Informational Banner */}
        <div className="p-3.5 bg-teal-500/10 rounded-xl border border-teal-500/30 flex items-start gap-3">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-[var(--text-secondary)] space-y-1">
            <span className="font-bold text-teal-400 block uppercase">
              Core Hydrodynamic Modelling Operates Fully Self-Contained
            </span>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              External APIs provide optional live telemetry and satellite feeds. The 2D SWE, Froehlich calculations, and demographics loss analysis operate at full mathematical fidelity using validated baseline datasets.
            </p>
          </div>
        </div>

        {/* Integration Catalog List */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          {EXTERNAL_SERVICES_CATALOG.map((service) => {
            const isConnected = service.status === 'CONNECTED';
            return (
              <div
                key={service.id}
                className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col justify-between gap-1 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-xs">{service.name}</span>
                    <span className="text-[10px] text-[var(--text-dim)] uppercase">({service.type})</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isConnected ? <CheckCircle2 className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                    <span>{service.status}</span>
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] font-sans">{service.notes}</p>

                <div className="text-[10px] text-[var(--text-dim)] flex items-center justify-between border-t border-[var(--border-color)] pt-2 mt-1">
                  <span>Source Authority: <code className="text-teal-400">{service.source}</code></span>
                  <span>Last Updated: <code className="text-[var(--text-primary)] font-bold">{service.lastFetchDate || 'Live Feed'}</code></span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[var(--border-color)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
          >
            Close Gateway Modal
          </button>
        </div>
      </div>
    </div>
  );
};
