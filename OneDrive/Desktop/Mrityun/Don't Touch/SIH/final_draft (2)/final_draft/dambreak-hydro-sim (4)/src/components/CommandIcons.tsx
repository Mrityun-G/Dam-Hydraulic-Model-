import React from 'react';
import {
  Waves,
  ShieldAlert,
  Droplets,
  CloudRain,
  Satellite,
  Layers,
  Building,
  Route,
  Activity,
  Users,
  AlertTriangle,
  Play,
  Download,
  FileSpreadsheet,
  FileCode,
  Box,
  Cpu,
  Radio,
  Eye,
  Crosshair,
  Compass
} from 'lucide-react';

export type CommandIconType =
  | 'dam'
  | 'river'
  | 'flood'
  | 'depth'
  | 'rainfall'
  | 'satellite'
  | 'dem'
  | 'buildings'
  | 'roads'
  | 'hospital'
  | 'population'
  | 'risk'
  | 'simulation'
  | 'export'
  | 'shp'
  | 'kml'
  | 'onnx'
  | 'radar'
  | 'crosshair';

interface CommandIconBadgeProps {
  type: CommandIconType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  className?: string;
}

export const CommandIconBadge: React.FC<CommandIconBadgeProps> = ({
  type,
  label,
  size = 'md',
  active = false,
  className = '',
}) => {
  const getIconData = () => {
    switch (type) {
      case 'dam':
        return {
          icon: Box,
          color: 'text-amber-400',
          bg: 'bg-amber-950/40 border-amber-500/30',
          glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
          defaultLabel: 'Dam Axis',
        };
      case 'river':
        return {
          icon: Waves,
          color: 'text-cyan-400',
          bg: 'bg-cyan-950/40 border-cyan-500/30',
          glow: 'shadow-[0_0_12px_rgba(6,182,212,0.25)]',
          defaultLabel: 'Mahanadi River',
        };
      case 'flood':
        return {
          icon: Waves,
          color: 'text-sky-400',
          bg: 'bg-sky-950/40 border-sky-500/30',
          glow: 'shadow-[0_0_12px_rgba(56,189,248,0.25)]',
          defaultLabel: 'Flood Extent',
        };
      case 'depth':
        return {
          icon: Droplets,
          color: 'text-blue-400',
          bg: 'bg-blue-950/40 border-blue-500/30',
          glow: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]',
          defaultLabel: 'Water Depth',
        };
      case 'rainfall':
        return {
          icon: CloudRain,
          color: 'text-indigo-400',
          bg: 'bg-indigo-950/40 border-indigo-500/30',
          glow: 'shadow-[0_0_12px_rgba(99,102,241,0.25)]',
          defaultLabel: 'PMF Rainfall',
        };
      case 'satellite':
        return {
          icon: Satellite,
          color: 'text-emerald-400',
          bg: 'bg-emerald-950/40 border-emerald-500/30',
          glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
          defaultLabel: 'SAR Satellite',
        };
      case 'dem':
        return {
          icon: Layers,
          color: 'text-teal-400',
          bg: 'bg-teal-950/40 border-teal-500/30',
          glow: 'shadow-[0_0_12px_rgba(20,184,166,0.25)]',
          defaultLabel: 'CartoDEM 10m',
        };
      case 'buildings':
        return {
          icon: Building,
          color: 'text-orange-400',
          bg: 'bg-orange-950/40 border-orange-500/30',
          glow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]',
          defaultLabel: 'Structures',
        };
      case 'roads':
        return {
          icon: Route,
          color: 'text-yellow-400',
          bg: 'bg-yellow-950/40 border-yellow-500/30',
          glow: 'shadow-[0_0_12px_rgba(234,179,8,0.25)]',
          defaultLabel: 'Road Cutoffs',
        };
      case 'hospital':
        return {
          icon: Activity,
          color: 'text-rose-400',
          bg: 'bg-rose-950/40 border-rose-500/30',
          glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
          defaultLabel: 'Critical Medical',
        };
      case 'population':
        return {
          icon: Users,
          color: 'text-purple-400',
          bg: 'bg-purple-950/40 border-purple-500/30',
          glow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]',
          defaultLabel: 'Census 2011',
        };
      case 'risk':
        return {
          icon: AlertTriangle,
          color: 'text-red-400',
          bg: 'bg-red-950/40 border-red-500/30',
          glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
          defaultLabel: 'Defra HR Matrix',
        };
      case 'simulation':
        return {
          icon: Play,
          color: 'text-cyan-300',
          bg: 'bg-cyan-900/50 border-cyan-400/40',
          glow: 'shadow-[0_0_15px_rgba(6,182,212,0.35)]',
          defaultLabel: 'SWE 2D Physics',
        };
      case 'export':
        return {
          icon: Download,
          color: 'text-slate-200',
          bg: 'bg-slate-900/60 border-slate-700/50',
          glow: 'shadow-[0_0_10px_rgba(255,255,255,0.1)]',
          defaultLabel: 'Export GIS',
        };
      case 'shp':
        return {
          icon: FileSpreadsheet,
          color: 'text-emerald-400',
          bg: 'bg-emerald-950/50 border-emerald-500/40',
          glow: 'shadow-[0_0_10px_rgba(16,185,129,0.2)]',
          defaultLabel: 'ESRI SHP',
        };
      case 'kml':
        return {
          icon: FileCode,
          color: 'text-sky-400',
          bg: 'bg-sky-950/50 border-sky-500/40',
          glow: 'shadow-[0_0_10px_rgba(56,189,248,0.2)]',
          defaultLabel: 'Google KML',
        };
      case 'onnx':
        return {
          icon: Cpu,
          color: 'text-fuchsia-400',
          bg: 'bg-fuchsia-950/50 border-fuchsia-500/40',
          glow: 'shadow-[0_0_10px_rgba(217,70,239,0.25)]',
          defaultLabel: 'FloodUNet ONNX',
        };
      case 'radar':
        return {
          icon: Radio,
          color: 'text-cyan-400',
          bg: 'bg-cyan-950/50 border-cyan-500/40',
          glow: 'shadow-[0_0_10px_rgba(6,182,212,0.25)]',
          defaultLabel: 'Telemetry Radar',
        };
      case 'crosshair':
        return {
          icon: Crosshair,
          color: 'text-amber-400',
          bg: 'bg-amber-950/50 border-amber-500/40',
          glow: 'shadow-[0_0_10px_rgba(245,158,11,0.25)]',
          defaultLabel: 'Hydro Probe',
        };
      default:
        return {
          icon: Activity,
          color: 'text-slate-300',
          bg: 'bg-slate-900/40 border-slate-700/30',
          glow: '',
          defaultLabel: '',
        };
    }
  };

  const data = getIconData();
  const Icon = data.icon;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs p-1',
    md: 'w-8 h-8 text-sm p-1.5',
    lg: 'w-10 h-10 text-base p-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border backdrop-blur-md transition-all ${
        data.bg
      } ${active ? data.glow : ''} ${className}`}
    >
      <div
        className={`flex items-center justify-center rounded-md ${data.color} ${sizeClasses[size]}`}
      >
        <Icon className={iconSizes[size]} />
      </div>
      {(label || data.defaultLabel) && (
        <span className="text-[11px] font-mono font-medium text-slate-200 pr-2 whitespace-nowrap">
          {label || data.defaultLabel}
        </span>
      )}
    </div>
  );
};
