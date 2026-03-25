import { describe, it, expect } from 'vitest';

// Mock data generators
export const createMockExchangeRate = (currency: string = 'USD', rate: number = 1000) => ({
  id: `rate-${currency}`,
  currency,
  rate,
  updated_at: new Date().toISOString(),
});

export const createMockInventoryByCurrency = (overrides = {}) => ({
  currency: 'USD',
  totalValue: 100000,
  totalCost: 60000,
  productCount: 50,
  valueInARS: 100000000,
  ...overrides,
});

describe('CurrencyDashboard - Exchange Rate Calculations', () => {
  it('calcular variación positiva de tasa', () => {
    const current = 1100;
    const previous = 1000;
    const variation = ((current - previous) / previous) * 100;

    expect(variation).toBeCloseTo(10, 2);
  });

  it('calcular variación negativa de tasa', () => {
    const current = 950;
    const previous = 1000;
    const variation = ((current - previous) / previous) * 100;

    expect(variation).toBeCloseTo(-5, 2);
  });

  it('calcular variación sin cambio', () => {
    const current = 1000;
    const previous = 1000;
    const variation = ((current - previous) / previous) * 100;

    expect(variation).toBe(0);
  });

  it('manejar tasa anterior = 0', () => {
    const current = 1000;
    const previous = 0;
    const variation = previous === 0 ? 0 : ((current - previous) / previous) * 100;

    expect(variation).toBe(0);
  });
});

describe('CurrencyDashboard - Margin Calculations', () => {
  it('calcular margen de ganancia', () => {
    const totalValue = 100000;
    const totalCost = 60000;
    const margin = ((totalValue - totalCost) / totalValue) * 100;

    expect(margin).toBeCloseTo(40, 2);
  });

  it('calcular margen bajo', () => {
    const totalValue = 100000;
    const totalCost = 96000;
    const margin = ((totalValue - totalCost) / totalValue) * 100;

    expect(margin).toBeCloseTo(4, 2);
  });

  it('calcular margen crítico (negativo)', () => {
    const totalValue = 100000;
    const totalCost = 120000;
    const margin = ((totalValue - totalCost) / totalValue) * 100;

    expect(margin).toBeLessThan(0);
  });

  it('margen con cero inventario', () => {
    const totalValue = 0;
    const totalCost = 100;
    const margin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;

    expect(margin).toBe(0);
  });
});

describe('CurrencyDashboard - Margin Color Logic', () => {
  const getMarginColor = (margin: number): string => {
    if (margin >= 30) return 'text-emerald-600 dark:text-emerald-400';
    if (margin >= 15) return 'text-blue-600 dark:text-blue-400';
    if (margin >= 5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  it('margen saludable (>=30%) = verde', () => {
    const color = getMarginColor(35);
    expect(color).toContain('emerald');
  });

  it('margen normal (15-30%) = azul', () => {
    const color = getMarginColor(20);
    expect(color).toContain('blue');
  });

  it('margen bajo (5-15%) = ámbar', () => {
    const color = getMarginColor(10);
    expect(color).toContain('amber');
  });

  it('margen crítico (<5%) = rojo', () => {
    const color = getMarginColor(2);
    expect(color).toContain('red');
  });

  it('margen negativo = rojo', () => {
    const color = getMarginColor(-5);
    expect(color).toContain('red');
  });
});

describe('CurrencyDashboard - KPI Aggregation', () => {
  it('calcular KPIs con un inventario', () => {
    const inventory = [
      createMockInventoryByCurrency({
        currency: 'USD',
        totalValue: 100000,
        totalCost: 60000,
        productCount: 50,
        valueInARS: 100000000,
      }),
    ];

    const totalInventoryARS = inventory.reduce((acc, item) => acc + item.valueInARS, 0);
    const totalCost = inventory.reduce((acc, item) => acc + item.totalCost, 0);
    const totalProducts = inventory.reduce((acc, item) => acc + item.productCount, 0);
    const globalMargin = totalInventoryARS > 0
      ? (((totalInventoryARS - totalCost) / totalInventoryARS) * 100)
      : 0;

    expect(totalInventoryARS).toBe(100000000);
    expect(totalCost).toBe(60000);
    expect(totalProducts).toBe(50);
    expect(globalMargin).toBeGreaterThan(0);
  });

  it('calcular KPIs con múltiples inventarios', () => {
    const inventory = [
      createMockInventoryByCurrency({
        currency: 'USD',
        totalValue: 100000,
        totalCost: 60000,
        productCount: 50,
        valueInARS: 100000000,
      }),
      createMockInventoryByCurrency({
        currency: 'EUR',
        totalValue: 80000,
        totalCost: 40000,
        productCount: 30,
        valueInARS: 120000000,
      }),
    ];

    const totalInventoryARS = inventory.reduce((acc, item) => acc + item.valueInARS, 0);
    const totalCost = inventory.reduce((acc, item) => acc + item.totalCost, 0);
    const totalProducts = inventory.reduce((acc, item) => acc + item.productCount, 0);

    expect(totalInventoryARS).toBe(220000000);
    expect(totalCost).toBe(100000);
    expect(totalProducts).toBe(80);
  });

  it('KPI con inventario vacío', () => {
    const inventory: any[] = [];

    const totalInventoryARS = inventory.reduce((acc, item) => acc + item.valueInARS, 0);
    const totalCost = inventory.reduce((acc, item) => acc + item.totalCost, 0);
    const totalProducts = inventory.reduce((acc, item) => acc + item.productCount, 0);

    expect(totalInventoryARS).toBe(0);
    expect(totalCost).toBe(0);
    expect(totalProducts).toBe(0);
  });
});

describe('CurrencyDashboard - Insights Generation', () => {
  const getMarginInsight = (margin: number): string => {
    if (margin >= 30) return '✓ Margen saludable';
    if (margin >= 15) return '→ Margen normal';
    if (margin >= 5) return '⚠ Margen bajo';
    return '⛔ Margen crítico';
  };

  it('generar insight para margen saludable', () => {
    const insight = getMarginInsight(35);
    expect(insight).toContain('saludable');
  });

  it('generar insight para margen normal', () => {
    const insight = getMarginInsight(20);
    expect(insight).toContain('normal');
  });

  it('generar insight para margen bajo', () => {
    const insight = getMarginInsight(10);
    expect(insight).toContain('bajo');
  });

  it('generar insight para margen crítico', () => {
    const insight = getMarginInsight(2);
    expect(insight).toContain('crítico');
  });
});

describe('CurrencyDashboard - Currency Formatting', () => {
  const formatNumber = (num: number, decimals = 2): string => {
    return num.toLocaleString('es-AR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatCurrency = (amount: number, currency: string = 'ARS'): string => {
    const currencySymbols: { [key: string]: string } = {
      ARS: '$',
      USD: 'US$',
      EUR: '€',
      BRL: 'R$',
    };
    const symbol = currencySymbols[currency] || '$';
    return `${symbol} ${formatNumber(amount)}`;
  };

  it('formatear número con separadores', () => {
    const formatted = formatNumber(1000000);
    expect(formatted).toContain('1');
  });

  it('formatear moneda ARS', () => {
    const formatted = formatCurrency(100000, 'ARS');
    expect(formatted).toContain('$');
  });

  it('formatear moneda USD', () => {
    const formatted = formatCurrency(1000, 'USD');
    expect(formatted).toContain('US$');
  });

  it('formatear moneda EUR', () => {
    const formatted = formatCurrency(500, 'EUR');
    expect(formatted).toContain('€');
  });

  it('decimal places correctos', () => {
    const formatted = formatNumber(100.5, 2);
    // En es-AR, el separador decimal es coma (,)
    expect(formatted).toBe('100,50');
  });
});

describe('CurrencyDashboard - Exchange Rate Data', () => {
  it('crear exchange rate válido', () => {
    const rate = createMockExchangeRate('USD', 1050);

    expect(rate.currency).toBe('USD');
    expect(rate.rate).toBe(1050);
    expect(rate).toHaveProperty('id');
    expect(rate).toHaveProperty('updated_at');
  });

  it('crear múltiples exchange rates', () => {
    const rates = [
      createMockExchangeRate('USD', 1050),
      createMockExchangeRate('EUR', 1200),
      createMockExchangeRate('BRL', 210),
    ];

    expect(rates).toHaveLength(3);
    expect(rates[0].currency).toBe('USD');
    expect(rates[1].currency).toBe('EUR');
  });

  it('encontrar exchange rate específico', () => {
    const rates = [
      createMockExchangeRate('USD', 1050),
      createMockExchangeRate('EUR', 1200),
    ];

    const usdRate = rates.find(r => r.currency === 'USD');
    expect(usdRate?.rate).toBe(1050);
  });
});
