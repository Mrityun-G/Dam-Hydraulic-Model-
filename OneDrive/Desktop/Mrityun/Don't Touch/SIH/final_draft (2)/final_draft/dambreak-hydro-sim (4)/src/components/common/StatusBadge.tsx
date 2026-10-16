import React from 'react';

export type SeverityType = 'normal' | 'warning' | 'critical' | 'extreme' | 'info' | 'success';

interface StatusBadgeProps {
  label: string;
  severity?: SeverityType;
  icon?: React.ComponentType<{ className?: string }>;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  severity = 'info',
  icon: Icon,
  size = 'md',
}) => {
  const severityStyles: Record<SeverityType, string> = {
    normal: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    info: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    critical: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    extreme: 'bg-rose-950/80 text-rose-300 border-rose-500/60 font-bold',
  };

  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono rounded-md border ${severityStyles[severity]} ${sizeStyles} uppercase tracking-wider font-semibold`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <span>{label}</span>
    </span>
  );
};
