import React from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency } from '@/lib/dashboard/currencyUtils';

export const KPIHeroCard: React.FC<{
  value: number;
  label: string;
  trend?: number;
  currency?: string;
  insight?: string;
}> = ({ value, label, trend, currency = 'ARS', insight }) => (
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 dark:from-slate-900 dark:to-slate-800 border border-slate-700/50 p-6 backdrop-blur-sm">
    <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />

    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">{formatCurrency(value, currency)}</h2>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <DollarSign className="h-6 w-6 text-blue-400" />
        </div>
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-2">
          {trend >= 0 ? (
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          )}
          <span className={trend >= 0 ? 'text-emerald-500' : 'text-red-500'}>
            {Math.abs(trend).toFixed(2)}%
          </span>
          <span className="text-xs text-slate-400">vs período anterior</span>
        </div>
      )}

      {insight && <div className="text-xs text-slate-300 pt-2 border-t border-slate-700/50">{insight}</div>}
    </div>
  </div>
);
