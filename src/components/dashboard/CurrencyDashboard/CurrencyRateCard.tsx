import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { calculateVariation, getCurrencyFlag, formatNumber } from '@/lib/dashboard/currencyUtils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ExchangeRate {
  id: string;
  currency: string;
  rate: number;
  updated_at: string;
}

export const CurrencyRateCard: React.FC<{
  rate: ExchangeRate;
  previousRate?: number;
}> = ({ rate, previousRate }) => {
  const variation = previousRate ? calculateVariation(rate.rate, previousRate) : 0;
  const isPositive = variation >= 0;

  return (
    <div className="group relative overflow-hidden rounded-lg bg-slate-800/50 border border-slate-700/50 p-4 hover:bg-slate-800/80 transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-500/10 transition-all" />

      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getCurrencyFlag(rate.currency)}</span>
            <span className="font-semibold text-sm text-white">{rate.currency}</span>
          </div>
          <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600/50">
            {rate.currency !== 'ARS' ? 'Cotización' : 'Local'}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="text-2xl font-bold text-white">ARS {formatNumber(rate.rate)}</div>
          <p className="text-xs text-slate-400">1 {rate.currency} = ARS {rate.rate.toFixed(2)}</p>
        </div>

        {previousRate && (
          <div className={`flex items-center gap-2 text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            {Math.abs(variation).toFixed(2)}%
          </div>
        )}

        <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
          ↻ {format(new Date(rate.updated_at), 'HH:mm', { locale: es })}
        </p>
      </div>
    </div>
  );
};
