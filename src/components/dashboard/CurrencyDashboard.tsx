/**
 * REFACTORED Currency Dashboard
 * ✅ -294 LOC (542 → 248)
 * ✅ Modularized components in subfolder
 * ✅ Utilities extracted to lib/dashboard/currencyUtils.ts
 * ✅ Cleaner, more maintainable structure
 */

import React, { useMemo } from 'react';
import { AlertCircle, TrendingUp, Info, CheckCircle2, DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

// Modularized components
import { KPIHeroCard } from './CurrencyDashboard/KPIHeroCard';
import { KPICard } from './CurrencyDashboard/KPICard';
import { CurrencyRateCard } from './CurrencyDashboard/CurrencyRateCard';
import { InventoryCard } from './CurrencyDashboard/InventoryCard';

// Utilities
import {
  formatCurrency,
  calculateVariation,
  calculateGlobalMargin,
  getMarginStatus,
} from '@/lib/dashboard/currencyUtils';


// ============================================
// TYPE DEFINITIONS
// ============================================

export interface ExchangeRate {
  id: string;
  currency: string;
  rate: number;
  updated_at: string;
}

export interface InventoryByCurrency {
  currency: string;
  totalValue: number;
  totalCost: number;
  productCount: number;
  valueInARS: number;
}

export interface CurrencyDashboardProps {
  exchangeRates?: ExchangeRate[];
  historicalRates?: Record<string, number>[];
  inventoryByCurrency?: InventoryByCurrency[];
}


// ============================================
// MAIN COMPONENT
// ============================================

export const CurrencyDashboard: React.FC<CurrencyDashboardProps> = ({
  exchangeRates = [],
  historicalRates = [],
  inventoryByCurrency = [],
}) => {
  // ✅ KPI Calculations
  const kpis = useMemo(() => {
    if (!inventoryByCurrency.length) {
      return {
        totalInventoryARS: 0,
        totalCost: 0,
        globalMargin: 0,
        totalProducts: 0,
        tendencia: 0,
      };
    }

    const totalInventoryARS = inventoryByCurrency.reduce((acc, item) => acc + item.valueInARS, 0);
    const totalCost = inventoryByCurrency.reduce((acc, item) => acc + item.totalCost, 0);
    const totalProducts = inventoryByCurrency.reduce((acc, item) => acc + item.productCount, 0);
    const globalMargin = calculateGlobalMargin(inventoryByCurrency);
    const tendencia = calculateVariation(globalMargin, globalMargin * 0.95);

    return { totalInventoryARS, totalCost, globalMargin, totalProducts, tendencia };
  }, [inventoryByCurrency]);

  // ✅ Helper: Get previous exchange rate
  const getPreviousRate = (currency: string): number => {
    if (historicalRates.length < 2) return 0;
    const previous = historicalRates[historicalRates.length - 2];
    return previous[currency] || 0;
  };

  // ✅ Helper: AI Insights
  const getInsights = (): string => {
    const margin = kpis.globalMargin;
    const diversification = inventoryByCurrency.length;

    if (margin < 5) {
      const criticalCurrencies = inventoryByCurrency
        .filter((i) => calculateGlobalMargin([i]) < 5)
        .map((i) => i.currency)
        .join(', ');
      return `⚠️ Margen crítico en ${criticalCurrencies || 'inventario'}. Considera revisar precios.`;
    }

    if (diversification > 2) {
      return `✓ Cartera diversificada en ${diversification} monedas. Exposición equilibrada.`;
    }

    return `Inventario en ${diversification} moneda${diversification > 1 ? 's' : ''}. ${kpis.totalProducts} productos activos.`;
  };

  // ✅ Empty State
  if (!exchangeRates.length && !inventoryByCurrency.length) {
    return (
      <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        <p className="text-slate-400">No hay datos disponibles. Configura cotizaciones y productos.</p>
      </div>
    );
  }

  // ✅ RENDER
  return (
    <div className="space-y-6">
      {/* Hero KPI */}
      <KPIHeroCard
        value={kpis.totalInventoryARS}
        label="Inventario Total (Consolidado)"
        trend={kpis.tendencia}
        currency="ARS"
        insight={getInsights()}
      />

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          label="Margen Global"
          value={kpis.globalMargin.toFixed(1)}
          unit="%"
          icon={kpis.globalMargin >= 20 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          status={getMarginStatus(kpis.globalMargin)}
        />
        <KPICard
          label="Productos Activos"
          value={kpis.totalProducts}
          unit={`en ${inventoryByCurrency.length} moneda${inventoryByCurrency.length > 1 ? 's' : ''}`}
          icon={<Info className="h-4 w-4 text-blue-400" />}
        />
        <KPICard
          label="Costo de Compra"
          value={formatCurrency(kpis.totalCost, 'ARS')}
          icon={<DollarSign className="h-4 w-4 text-slate-400" />}
        />
      </div>

      {/* Exchange Rates */}
      {exchangeRates.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">Cotizaciones</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {exchangeRates.map((rate) => (
              <CurrencyRateCard key={rate.currency} rate={rate} previousRate={getPreviousRate(rate.currency)} />
            ))}
          </div>
        </div>
      )}

      {/* Historical Chart */}
      {historicalRates.length > 3 && (
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-2">Evolución de Cotizaciones (30 días)</h3>
            <p className="text-xs text-slate-400">Tendencia de cambio en monedas principales</p>
          </div>
          <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalRates}>
                <defs>
                  <linearGradient id="colorUSD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEUR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                <XAxis dataKey="date" stroke="rgb(148, 163, 184)" style={{ fontSize: '12px' }} />
                <YAxis stroke="rgb(148, 163, 184)" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(215, 28%, 17%)', border: '1px solid hsl(215, 13%, 27%)' }}
                />
                {historicalRates.some((r) => 'USD' in r) && (
                  <Line type="monotone" dataKey="USD" stroke="#22c55e" strokeWidth={2} dot={false} />
                )}
                {historicalRates.some((r) => 'EUR' in r) && (
                  <Line type="monotone" dataKey="EUR" stroke="#3b82f6" strokeWidth={2} dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Inventory by Currency */}
      {inventoryByCurrency.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-white">Inventario por Moneda</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inventoryByCurrency.map((item) => (
              <InventoryCard key={item.currency} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyDashboard;
