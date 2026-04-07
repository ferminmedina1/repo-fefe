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

interface ExchangeRateData {
  id: string;
  currency: string;
  rate: number;
  updated_at: string;
}

interface InventoryByMoneda {
  currency: string;
  totalValue: number;
  totalCost: number;
  productCount: number;
  valueInARS: number;
}

interface CurrencyDashboardNewProps {
  exchangeRates?: ExchangeRateData[];
  historicalRates?: any[];
  inventoryByCurrency?: InventoryByMoneda[];
}

// Utility: Format number with thousands separator
const formatNumber = (num: number, decimals = 2): string => {
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// Utility: Format as currency
const formatCurrency = (amount: number, currency: string = 'ARS'): string => {
  const currencySymbols: { [key: string]: string } = {
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

// Utility: Get semantic color based on margin
const getMarginColor = (margin: number): string => {
  if (margin >= 30) return 'text-emerald-600 dark:text-emerald-400';
  if (margin >= 15) return 'text-blue-600 dark:text-blue-400';
  if (margin >= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

const getMarginBg = (margin: number): string => {
  if (margin >= 30) return 'bg-emerald-500/10 border-emerald-500/30';
  if (margin >= 15) return 'bg-blue-500/10 border-blue-500/30';
  if (margin >= 5) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

// Utility: Calculate variation
const calculateVariation = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// KPI Hero Card Component
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
  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 border border-blue-200/40 dark:border-blue-800/40 p-8 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow">
    <div className="absolute -right-20 -top-20 w-40 h-40 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
    
    <div className="relative space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {label}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(value, currency)}
          </h2>
        </div>
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg">
          <DollarSign className="h-8 w-8 text-white" />
        </div>
      </div>

      {trend !== undefined && (
        <div className="flex items-center gap-2 pt-2">
          {trend >= 0 ? (
            <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
          )}
          <span className={`font-semibold ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {Math.abs(trend).toFixed(2)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">vs período anterior</span>
        </div>
      )}

      {insight && (
        <div className="text-sm text-gray-700 dark:text-gray-300 pt-3 border-t border-blue-200/50 dark:border-blue-800/50">
          {insight}
        </div>
      )}
    </div>
  </div>
);

// Currency Rate Card
const CurrencyRateCard = ({ 
  rate, 
  previousRate 
}: { 
  rate: ExchangeRateData;
  previousRate?: number;
}) => {
  const variation = previousRate ? calculateVariation(rate.rate, previousRate) : 0;
  const isPositive = variation >= 0;
  
  const flags: { [key: string]: string } = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    BRL: '🇧🇷',
    CLP: '🇨🇱',
    UYU: '🇺🇾',
  };

  return (
    <div className="group relative overflow-hidden rounded-md bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/40 dark:to-gray-800/40 border border-gray-200/60 dark:border-gray-700/60 p-3 hover:shadow-md transition-all duration-300 hover:border-blue-300/60 dark:hover:border-blue-600/60">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 to-blue-400/0 group-hover:from-blue-400/5 group-hover:to-blue-400/10 transition-all" />
      
      <div className="relative space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{flags[rate.currency] || '💱'}</span>
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{rate.currency}</span>
          </div>
          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/60 h-fit">
            {rate.currency !== 'ARS' ? '$/USD' : 'Local'}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900 dark:text-white">
            ${formatNumber(rate.rate, 2)}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            1 {rate.currency}
          </p>
        </div>

        {previousRate && (
          <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(variation).toFixed(2)}%
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-500 pt-1 border-t border-gray-200/50 dark:border-gray-700/50">
          ↻ {format(new Date(rate.updated_at), 'HH:mm', { locale: es })}
        </p>
      </div>
    </div>
  );
};

// Inventory Card by Currency
const InventoryCard = ({ 
  item, 
  exchangeRate 
}: { 
  item: InventoryByMoneda;
  exchangeRate?: ExchangeRateData;
}) => {
  const margin = item.totalValue > 0 
    ? (((item.totalValue - item.totalCost) / item.totalValue) * 100)
    : 0;
  
  const marginColor = getMarginColor(margin);
  const marginBg = getMarginBg(margin);
  
  const flags: { [key: string]: string } = {
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
    <div className="relative overflow-hidden rounded-md bg-gradient-to-br from-gray-50 via-blue-50/50 to-gray-50 dark:from-gray-900/40 dark:via-indigo-950/20 dark:to-gray-900/40 border border-gray-200/60 dark:border-gray-700/60 p-3 hover:border-blue-300/60 dark:hover:border-blue-600/60 transition-all hover:shadow-md">
      <div className={`absolute inset-0 opacity-10 ${marginBg}`} />
      
      <div className="relative space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{flags[item.currency] || '💱'}</span>
            <span className="font-semibold text-gray-900 dark:text-white text-sm">{item.currency}</span>
          </div>
          <Badge variant="secondary" className="text-xs bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/60 h-fit">
            {item.productCount}
          </Badge>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Valor</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {formatCurrency(item.totalValue, item.currency)}
          </p>
          {item.currency !== 'ARS' && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              ${formatNumber(item.valueInARS, 0)}
            </p>
          )}
        </div>

        <div className={`rounded-md border ${marginBg} p-2 space-y-1`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Margen</p>
            <span className={`font-bold text-sm ${marginColor}`}>
              {margin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Component
export const CurrencyDashboardNew: React.FC<CurrencyDashboardNewProps> = ({
  exchangeRates = [],
  historicalRates = [],
  inventoryByCurrency = [],
}) => {
  // Calculate KPIs
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

  // Get previous exchange rate
  const getPreviousRate = (currency: string): number => {
    if (historicalRates.length < 2) return 0;
    const current = historicalRates[historicalRates.length - 1];
    const previous = historicalRates[historicalRates.length - 2];
    return previous[currency] || 0;
  };

  // Get insights
  const getInsights = (): string => {
    const margin = kpis.globalMargin;
    const diversification = inventoryByCurrency.length;

    if (margin < 5) {
      return `⚠️ Margen crítico. Considera revisar precios en ${inventoryByCurrency.filter(i => {
        const m = i.totalValue > 0 ? (((i.totalValue - i.totalCost) / i.totalValue) * 100) : 0;
        return m < 5;
      }).map(i => i.currency).join(', ')}`;
    }
    
    if (diversification > 2) {
      return `✓ Cartera diversificada en ${diversification} monedas.`;
    }

    return `${kpis.totalProducts} productos activos en ${diversification} moneda${diversification > 1 ? 's' : ''}.`;
  };

  if (!exchangeRates.length && !inventoryByCurrency.length) {
    return (
      <div className="col-span-full text-center py-8 text-slate-400">
        <AlertCircle className="h-8 w-8 mx-auto mb-2" />
        <p>No hay datos disponibles aún. Configura cotizaciones y productos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Dashboard de Monedas</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Exchange Rates - Left Column */}
        {exchangeRates.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Cotizaciones Actuales</h3>
            <div className="space-y-2">
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

        {/* Inventory by Currency - Right Column */}
        {inventoryByCurrency.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Valorización de Inventario</h3>
            <div className="space-y-2">
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
    </div>
  );
};

export default CurrencyDashboardNew;
