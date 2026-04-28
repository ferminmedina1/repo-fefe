import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  formatCurrency,
  getCurrencyFlag,
  calculateMargin,
  getMarginColor,
  getMarginBg,
  getMarginInsight,
} from '@/lib/dashboard/currencyUtils';

interface InventoryByCurrency {
  currency: string;
  totalValue: number;
  totalCost: number;
  productCount: number;
  valueInARS: number;
}

export const InventoryCard: React.FC<{
  item: InventoryByCurrency;
  exchangeRate?: any;
}> = ({ item }) => {
  const margin = calculateMargin(item.totalValue, item.totalCost);
  const marginColor = getMarginColor(margin);
  const marginBg = getMarginBg(margin);

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-slate-700/50 p-5 hover:border-slate-600/80 transition-all">
      <div className={`absolute inset-0 opacity-5 ${marginBg}`} />

      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{getCurrencyFlag(item.currency)}</span>
            <span className="font-semibold text-white">{item.currency}</span>
          </div>
          <Badge variant="secondary" className="text-xs bg-slate-700/50">
            {item.productCount} {item.productCount === 1 ? 'producto' : 'productos'}
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-400">Inventario</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(item.totalValue, item.currency)}</p>
          {item.currency !== 'ARS' && (
            <p className="text-sm text-slate-400">≈ {formatCurrency(item.valueInARS, 'ARS')}</p>
          )}
        </div>

        <div className={`rounded-lg border ${marginBg} p-3 space-y-2`}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-300">Margen de Ganancia</p>
            <span className={`font-bold text-sm ${marginColor}`}>{margin.toFixed(1)}%</span>
          </div>
          <p className={`text-xs ${marginColor} font-medium`}>{getMarginInsight(margin)}</p>
        </div>

        <div className="pt-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">Costo Base: {formatCurrency(item.totalCost, item.currency)}</p>
        </div>
      </div>
    </div>
  );
};
