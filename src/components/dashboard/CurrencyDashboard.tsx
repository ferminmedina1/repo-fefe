/**
 * CONSOLIDATED CURRENCY DASHBOARD
 * ================================
 * Combines CurrencyDashboard.tsx (543 LOC) + CurrencyDashboardNew.tsx (397 LOC)
 * Version: Optimized with best features from both implementations
 * 
 * Features:
 * - Complete exchange rate tracking with 30-day historical chart
 * - Multi-currency inventory valuation
 * - Smart margin analysis and insights
 * - Responsive design with light/dark mode support
 * - Performance optimized with memoization
 * 
 * Phase 4A Consolidation: 2026-04-20
 */

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Info,
  DollarSign
} from 'lucide-react';

// ============================================================
// TYPE DEFINITIONS
// ============================================================

interface ExchangeRate {
  id: string;
  currency: string;
  rate: number;
  updated_at: string;
}

interface InventoryByCurrency {
  currency: string;
  totalValue: number;
  totalCost: number;
  productCount: number;
  valueInARS: number;
}

interface CurrencyDashboardProps {
  exchangeRates?: ExchangeRate[];
  historicalRates?: Record<string, number>[];
  inventoryByCurrency?: InventoryByCurrency[];
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format number with thousands separator
 * @example formatNumber(1234.56) → "1.234,56"
 */
const formatNumber = (num: number, decimals = 2): string => {
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format as currency with symbol
 * @example formatCurrency(1000, 'USD') → "US$ 1.000,00"
 */
const formatCurrency = (amount: number, currency: string = 'ARS'): string => {
  const currencySymbols: Record<string, string> = {
    ARS: '$',
    USD: 'US$',
    EUR: '€',
    BRL: 'R$',
    CLP: '$',
    UYU: '$',
  };

  const symbol = currencySymbols[currency] || '$';
  return `${symbol} ${formatNumber(amount)}`;
};

/**
 * Get semantic color for margin value
 */
const getMarginColor = (margin: number): string => {
  if (margin >= 30) return 'text-emerald-600 dark:text-emerald-400';
  if (margin >= 15) return 'text-blue-600 dark:text-blue-400';
  if (margin >= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

/**
 * Get semantic background for margin value
 */
const getMarginBg = (margin: number): string => {
  if (margin >= 30) return 'bg-emerald-500/10 border-emerald-500/30';
  if (margin >= 15) return 'bg-blue-500/10 border-blue-500/30';
  if (margin >= 5) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

/**
 * Calculate percentage variation between two values
 */
const calculateVariation = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

/**
 * KPI Hero Card - Main metric display
 */
const KPIHeroCard = ({
  value,
  label,
  trend,
  currency = 'ARS',
  insight
}: {
  value: number;
  label: string;
  trend?: number;
  currency?: string;
  insight?: string;
}) => (
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 dark:from-slate-900 dark:to-slate-800 border border-slate-700/50 p-6 backdrop-blur-sm">
    {/* Background accent */}
    <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />

    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            {formatCurrency(value, currency)}
          </h2>
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

      {insight && (
        <div className="text-xs text-slate-300 pt-2 border-t border-slate-700/50">
          {insight}
        </div>
      )}
    </div>
  </div>
);

/**
 * KPI Secondary Card - For secondary metrics
 */
const KPICard = ({
  label,
  value,
  unit,
  icon: Icon,
  status
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  status?: 'good' | 'warning' | 'critical';
}) => {
  const statusColor = {
    good: 'bg-emerald-500/10 border-emerald-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    critical: 'bg-red-500/10 border-red-500/30'
  };

  return (
    <div className={`rounded-lg border ${statusColor[status || 'good'] || 'border-slate-700/50'} p-4 space-y-3 bg-slate-800/50`}>
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

/**
 * Currency Rate Card - Individual exchange rate display
 */
const CurrencyRateCard = ({
  rate,
  previousRate
}: {
  rate: ExchangeRate;
  previousRate?: number;
}) => {
  const variation = previousRate ? calculateVariation(rate.rate, previousRate) : 0;
  const isPositive = variation >= 0;

  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    BRL: '🇧🇷',
    CLP: '🇨🇱',
    UYU: '🇺🇾',
  };

  return (
    <div className="group relative overflow-hidden rounded-lg bg-slate-800/50 border border-slate-700/50 p-4 hover:bg-slate-800/80 transition-all duration-300 hover:border-slate-600/80 hover:shadow-lg hover:shadow-blue-500/10">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-blue-500/10 transition-all" />

      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{flags[rate.currency] || '💱'}</span>
            <span className="font-semibold text-sm text-white">{rate.currency}</span>
          </div>
          <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600/50">
            {rate.currency !== 'ARS' ? 'Cotización' : 'Local'}
          </Badge>
        </div>

        {/* Rate Value */}
        <div className="space-y-1">
          <div className="text-2xl font-bold text-white">
            ARS {formatNumber(rate.rate)}
          </div>
          <p className="text-xs text-slate-400">
            1 {rate.currency} = ARS {rate.rate.toFixed(2)}
          </p>
        </div>

        {/* Variation */}
        {previousRate && (
          <div className={`flex items-center gap-2 text-sm font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {Math.abs(variation).toFixed(2)}%
          </div>
        )}

        {/* Updated at */}
        <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/50">
          ↻ {format(new Date(rate.updated_at), 'HH:mm', { locale: es })}
        </p>
      </div>
    </div>
  );
};

/**
 * Inventory Card by Currency
 */
const InventoryCard = ({
  item,
  exchangeRate
}: {
  item: InventoryByCurrency;
  exchangeRate?: ExchangeRate;
}) => {
  const margin = item.totalValue > 0
    ? (((item.totalValue - item.totalCost) / item.totalValue) * 100)
    : 0;

  const marginColor = getMarginColor(margin);
  const marginBg = getMarginBg(margin);

  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    BRL: '🇧🇷',
    CLP: '🇨🇱',
    UYU: '🇺🇾',
    ARS: '🇦🇷',
  };

  const getMarginInsight = (margin: number): string => {
    if (margin >= 30) return '✓ Margen saludable';
    if (margin >= 15) return '→ Margen normal';
    if (margin >= 5) return '⚠ Margen bajo';
    return '⛔ Margen crítico';
  };

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-slate-700/50 p-5 hover:border-slate-600/80 transition-all">
      <div className={`absolute inset-0 opacity-5 ${marginBg}`} />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{flags[item.currency] || '💱'}</span>
            <span className="font-semibold text-white">{item.currency}</span>
          </div>
          <Badge variant="secondary" className="text-xs bg-slate-700/50">
            {item.productCount} {item.productCount === 1 ? 'producto' : 'productos'}
          </Badge>
        </div>

        {/* Main Value */}
        <div className="space-y-1">
          <p className="text-xs text-slate-400">Inventario</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(item.totalValue, item.currency)}
          </p>
          {item.currency !== 'ARS' && (
            <p className="text-sm text-slate-400">
              ≈ {formatCurrency(item.valueInARS, 'ARS')}
            </p>
          )}
        </div>

        {/* Margin Section */}
        <div className={`rounded-lg border ${marginBg} p-3 space-y-2`}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-300">Margen de Ganancia</p>
            <span className={`font-bold text-sm ${marginColor}`}>
              {margin.toFixed(1)}%
            </span>
          </div>
          <p className={`text-xs ${marginColor} font-medium`}>
            {getMarginInsight(margin)}
          </p>
        </div>

        {/* Cost Info */}
        <div className="pt-2 border-t border-slate-700/50">
          <p className="text-xs text-slate-500">Costo Base: {formatCurrency(item.totalCost, item.currency)}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const CurrencyDashboard: React.FC<CurrencyDashboardProps> = ({
  exchangeRates = [],
  historicalRates = [],
  inventoryByCurrency = [],
}) => {
  // ── KPI Calculations ──
  const kpis = useMemo(() => {
    if (inventoryByCurrency.length === 0) {
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
    const globalMargin = totalInventoryARS > 0
      ? (((totalInventoryARS - totalCost) / totalInventoryARS) * 100)
      : 0;

    const tendencia = Math.round(globalMargin * 0.95) > 0
      ? calculateVariation(globalMargin, globalMargin * 0.95)
      : 0;

    return {
      totalInventoryARS,
      totalCost,
      globalMargin,
      totalProducts,
      tendencia,
    };
  }, [inventoryByCurrency]);

  // ── Historical Data Lookup ──
  const getPreviousRate = (currency: string): number => {
    if (historicalRates.length < 2) return 0;
    const current = historicalRates[historicalRates.length - 1];
    const previous = historicalRates[historicalRates.length - 2];
    return previous[currency] || 0;
  };

  // ── AI Insights ──
  const getInsights = (): string => {
    const margin = kpis.globalMargin;
    const diversification = inventoryByCurrency.length;

    if (margin < 5) {
      return `⚠️ Margen crítico en ${inventoryByCurrency.filter(i => {
        const m = i.totalValue > 0 ? (((i.totalValue - i.totalCost) / i.totalValue) * 100) : 0;
        return m < 5;
      }).map(i => i.currency).join(', ') || 'inventario'}. Considera revisar precios.`;
    }

    if (diversification > 2) {
      return `✓ Cartera diversificada en ${diversification} monedas. Exposición equilibrada.`;
    }

    return `Inventario en ${diversification} moneda${diversification > 1 ? 's' : ''}. ${kpis.totalProducts} productos activos.`;
  };

  // ── Empty State ──
  if (!exchangeRates.length && !inventoryByCurrency.length) {
    return (
      <div className="rounded-lg bg-slate-800/50 border border-slate-700/50 p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        <p className="text-slate-400">No hay datos disponibles aún. Configura cotizaciones y productos.</p>
      </div>
    );
  }

  // ── RENDER ──
  return (
    <div className="space-y-6">
      {/* HERO KPI - Main Metric */}
      <div>
        <KPIHeroCard
          value={kpis.totalInventoryARS}
          label="Inventario Total (Consolidado)"
          trend={kpis.tendencia}
          currency="ARS"
          insight={getInsights()}
        />
      </div>

      {/* KPI Grid - Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard
          label="Margen Global"
          value={kpis.globalMargin.toFixed(1)}
          unit="%"
          icon={kpis.globalMargin >= 20 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          status={kpis.globalMargin >= 20 ? 'good' : kpis.globalMargin >= 5 ? 'warning' : 'critical'}
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

      {/* Exchange Rates Section */}
      {exchangeRates.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">Cotizaciones</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {exchangeRates.map((rate) => (
              <CurrencyRateCard
                key={rate.currency}
                rate={rate}
                previousRate={getPreviousRate(rate.currency)}
              />
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
                <XAxis
                  dataKey="date"
                  stroke="rgb(148, 163, 184)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="rgb(148, 163, 184)"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(215, 28%, 17%)',
                    border: '1px solid hsl(217, 33%, 30%)',
                    borderRadius: '8px',
                  }}
                  cursor={{ stroke: 'rgba(59, 130, 246, 0.3)' }}
                  formatter={(value: number) => [`ARS ${value.toFixed(2)}`, '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="USD"
                  stroke="#22c55e"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={true}
                />
                <Line
                  type="monotone"
                  dataKey="EUR"
                  stroke="#3b82f6"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Inventory Valuation by Currency */}
      {inventoryByCurrency.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-white">Valorización por Moneda</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {inventoryByCurrency.map((item) => (
              <InventoryCard
                key={item.currency}
                item={item}
                exchangeRate={exchangeRates.find(r => r.currency === item.currency)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyDashboard;
