/**
 * Currency Dashboard Utilities
 * Reusable formatting, calculations, and styling functions
 */

// ============================================
// FORMATTING UTILITIES
// ============================================

export const formatNumber = (num: number, decimals = 2): string => {
  return num.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatCurrency = (amount: number, currency: string = 'ARS'): string => {
  const symbols: Record<string, string> = {
    ARS: '$',
    USD: 'US$',
    EUR: '€',
    BRL: 'R$',
    CLP: '$',
    UYU: '$',
  };
  return `${symbols[currency] || '$'} ${formatNumber(amount)}`;
};

export const getCurrencyFlag = (currency: string): string => {
  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    BRL: '🇧🇷',
    CLP: '🇨🇱',
    UYU: '🇺🇾',
    ARS: '🇦🇷',
  };
  return flags[currency] || '💱';
};

// ============================================
// CALCULATION UTILITIES
// ============================================

export const calculateVariation = (current: number, previous: number): number => {
  return previous === 0 ? 0 : ((current - previous) / previous) * 100;
};

export const calculateMargin = (value: number, cost: number): number => {
  return value > 0 ? (((value - cost) / value) * 100) : 0;
};

export const calculateGlobalMargin = (
  inventoryItems: Array<{ totalValue: number; totalCost: number }>
): number => {
  const totalValue = inventoryItems.reduce((acc, item) => acc + item.totalValue, 0);
  const totalCost = inventoryItems.reduce((acc, item) => acc + item.totalCost, 0);
  return totalValue > 0 ? (((totalValue - totalCost) / totalValue) * 100) : 0;
};

// ============================================
// COLOR UTILITIES (Semantic colors by margin)
// ============================================

export const getMarginColor = (margin: number): string => {
  if (margin >= 30) return 'text-emerald-600 dark:text-emerald-400';
  if (margin >= 15) return 'text-blue-600 dark:text-blue-400';
  if (margin >= 5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

export const getMarginBg = (margin: number): string => {
  if (margin >= 30) return 'bg-emerald-500/10 border-emerald-500/30';
  if (margin >= 15) return 'bg-blue-500/10 border-blue-500/30';
  if (margin >= 5) return 'bg-amber-500/10 border-amber-500/30';
  return 'bg-red-500/10 border-red-500/30';
};

export const getMarginStatus = (margin: number): 'good' | 'warning' | 'critical' => {
  if (margin >= 15) return 'good';
  if (margin >= 5) return 'warning';
  return 'critical';
};

export const getMarginInsight = (margin: number): string => {
  if (margin >= 30) return '✓ Margen saludable';
  if (margin >= 15) return '→ Margen normal';
  if (margin >= 5) return '⚠ Margen bajo';
  return '⛔ Margen crítico';
};

// ============================================
// TREND UTILITIES
// ============================================

export const getTrendIndicator = (value: number) => {
  return value >= 0
    ? { icon: 'up' as const, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
    : { icon: 'down' as const, color: 'text-red-500', bg: 'bg-red-500/10' };
};
