import React from 'react';

export const KPICard: React.FC<{
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  status?: 'good' | 'warning' | 'critical';
}> = ({ label, value, unit, icon: Icon, status }) => {
  const statusColor = {
    good: 'bg-emerald-500/10 border-emerald-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    critical: 'bg-red-500/10 border-red-500/30',
  };

  return (
    <div className={`rounded-lg border ${statusColor[status || 'good']} p-4 space-y-3 bg-slate-800/50`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase">{label}</p>
        {Icon && <div className="text-slate-400">{Icon}</div>}
      </div>
      <p className="text-3xl font-bold text-white">
        {value}
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </p>
    </div>
  );
};
