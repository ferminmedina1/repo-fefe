#!/usr/bin/env tsx

/**
 * 🎨 Currency Dashboard - Showcase & Examples
 * 
 * Este archivo contiene ejemplos de DATOS de prueba para visualizar
 * el new Currency Dashboard en diferentes escenarios.
 * 
 * Uso: Copiar y pegar los datos en tu componente de testing.
 */

// ============================================================================
// SCENARIO 1: Empresa Pequeña (Solo ARS, margen normal)
// ============================================================================

export const scenarioSmallBusiness = {
  exchangeRates: [
    {
      id: '1',
      currency: 'ARS',
      rate: 1,
      updated_at: '2026-03-25T14:32:00Z'
    }
  ],
  historicalRates: [
    { date: '25/02', ARS: 1 },
    { date: '04/03', ARS: 1 },
    { date: '11/03', ARS: 1 },
    { date: '18/03', ARS: 1 },
    { date: '25/03', ARS: 1 }
  ],
  inventoryByCurrency: [
    {
      currency: 'ARS',
      totalValue: 2500000,
      totalCost: 1875000,
      productCount: 45,
      valueInARS: 2500000
    }
  ],
  // KPI esperado
  expectedKPIs: {
    totalInventory: '$ 2.500.000',
    margin: '25.0%',
    products: '45',
    cost: '$ 1.875.000',
    insight: 'Margen normal. 45 productos activos en ARS.'
  }
};

// ============================================================================
// SCENARIO 2: Empresa Mediana (Multimoneda, diversificada)
// ============================================================================

export const scenarioMediumBusiness = {
  exchangeRates: [
    {
      id: '1',
      currency: 'ARS',
      rate: 1,
      updated_at: '2026-03-25T14:32:00Z'
    },
    {
      id: '2',
      currency: 'USD',
      rate: 296.50,
      updated_at: '2026-03-25T14:32:00Z'
    },
    {
      id: '3',
      currency: 'EUR',
      rate: 324.80,
      updated_at: '2026-03-25T14:32:00Z'
    }
  ],
  historicalRates: [
    { 
      date: '25/02', 
      USD: 285.00, 
      EUR: 310.00,
      ARS: 1
    },
    { 
      date: '04/03', 
      USD: 288.50, 
      EUR: 315.20,
      ARS: 1
    },
    { 
      date: '11/03', 
      USD: 291.00, 
      EUR: 318.50,
      ARS: 1
    },
    { 
      date: '18/03', 
      USD: 294.00, 
      EUR: 322.00,
      ARS: 1
    },
    { 
      date: '25/03', 
      USD: 296.50, 
      EUR: 324.80,
      ARS: 1
    }
  ],
  inventoryByCurrency: [
    {
      currency: 'ARS',
      totalValue: 5000000,
      totalCost: 3750000,
      productCount: 80,
      valueInARS: 5000000
    },
    {
      currency: 'USD',
      totalValue: 45000,
      totalCost: 36000,
      productCount: 15,
      valueInARS: 13326000
    },
    {
      currency: 'EUR',
      totalValue: 42500,
      totalCost: 38250,
      productCount: 12,
      valueInARS: 13793600
    }
  ],
  // KPI esperado
  expectedKPIs: {
    totalInventory: '$ 32.119.600',
    margin: '20.1%',
    products: '107',
    cost: '$ 8.044.250',
    insight: '✓ Cartera diversificada en 3 monedas. Exposición equilibrada.'
  }
};

// ============================================================================
// SCENARIO 3: Empresa Grande (Múltiples monedas, margen excelente)
// ============================================================================

export const scenarioLargeBusiness = {
  exchangeRates: [
    {
      id: '1',
      currency: 'ARS',
      rate: 1,
      updated_at: '2026-03-25T14:32:00Z'
    },
    {
      id: '2',
      currency: 'USD',
      rate: 296.50,
      updated_at: '2026-03-25T14:32:00Z'
    },
    {
      id: '3',
      currency: 'EUR',
      rate: 324.80,
      updated_at: '2026-03-25T14:32:00Z'
    },
    {
      id: '4',
      currency: 'BRL',
      rate: 57.50,
      updated_at: '2026-03-25T14:32:00Z'
    }
  ],
  historicalRates: [
    { 
      date: '25/02', 
      USD: 280.00, 
      EUR: 300.00,
      BRL: 54.00
    },
    { 
      date: '04/03', 
      USD: 285.00, 
      EUR: 308.00,
      BRL: 55.50
    },
    { 
      date: '11/03', 
      USD: 290.00, 
      EUR: 316.00,
      BRL: 56.50
    },
    { 
      date: '18/03', 
      USD: 293.50, 
      EUR: 320.00,
      BRL: 57.00
    },
    { 
      date: '25/03', 
      USD: 296.50, 
      EUR: 324.80,
      BRL: 57.50
    }
  ],
  inventoryByCurrency: [
    {
      currency: 'ARS',
      totalValue: 15000000,
      totalCost: 9000000,
      productCount: 200,
      valueInARS: 15000000
    },
    {
      currency: 'USD',
      totalValue: 150000,
      totalCost: 100000,
      productCount: 50,
      valueInARS: 44475000
    },
    {
      currency: 'EUR',
      totalValue: 125000,
      totalCost: 75000,
      productCount: 40,
      valueInARS: 40600000
    },
    {
      currency: 'BRL',
      totalValue: 500000,
      totalCost: 375000,
      productCount: 60,
      valueInARS: 28750000
    }
  ],
  // KPI esperado
  expectedKPIs: {
    totalInventory: '$ 128.825.000',
    margin: '33.2%',
    products: '350',
    cost: '$ 59.000.000',
    insight: '✓ Margen excelente. Cartera diversificada en 4 monedas.'
  }
};

// ============================================================================
// SCENARIO 4: Margen Crítico (⚠️ Situación de alerta)
// ============================================================================

export const scenarioCriticalMargin = {
  exchangeRates: [
    {
      id: '1',
      currency: 'ARS',
      rate: 1,
      updated_at: '2026-03-25T14:32:00Z'
    },
    {
      id: '2',
      currency: 'USD',
      rate: 296.50,
      updated_at: '2026-03-25T14:32:00Z'
    },
    {
      id: '3',
      currency: 'EUR',
      rate: 324.80,
      updated_at: '2026-03-25T14:32:00Z'
    }
  ],
  historicalRates: [
    { date: '25/02', USD: 285.00, EUR: 310.00 },
    { date: '04/03', USD: 288.50, EUR: 315.20 },
    { date: '11/03', USD: 291.00, EUR: 318.50 },
    { date: '18/03', USD: 294.00, EUR: 322.00 },
    { date: '25/03', USD: 296.50, EUR: 324.80 }
  ],
  inventoryByCurrency: [
    {
      currency: 'ARS',
      totalValue: 10000000,
      totalCost: 9800000,  // ⚠️ Margen muy bajo
      productCount: 150,
      valueInARS: 10000000
    },
    {
      currency: 'USD',
      totalValue: 50000,
      totalCost: 49000,  // ⚠️ Crítico
      productCount: 20,
      valueInARS: 14825000
    },
    {
      currency: 'EUR',
      totalValue: 40000,
      totalCost: 39200,  // ⚠️ Crítico
      productCount: 15,
      valueInARS: 12992000
    }
  ],
  // KPI esperado
  expectedKPIs: {
    totalInventory: '$ 37.817.000',
    margin: '2.1%', // ⚠️ CRÍTICO
    products: '185',
    cost: '$ 37.049.200',
    insight: '⚠️ Margen crítico en USD, EUR. Considera revisar precios en estos items.'
  }
};

// ============================================================================
// SCENARIO 5: Variación Alta (Monedas volátiles)
// ============================================================================

export const scenarioHighVolatility = {
  exchangeRates: [
    {
      id: '1',
      currency: 'ARS',
      rate: 1,
      updated_at: '2026-03-25T14:32:00Z'
    },
    {
      id: '2',
      currency: 'USD',
      rate: 296.50,  // ↑ Subió 15% en el mes
      updated_at: '2026-03-25T14:32:00Z'
    }
  ],
  historicalRates: [
    { date: '25/02', USD: 257.00 },  // Hace 30 días
    { date: '04/03', USD: 270.00 },
    { date: '11/03', USD: 280.00 },
    { date: '18/03', USD: 288.00 },
    { date: '25/03', USD: 296.50 }   // ↑ +15.4%
  ],
  inventoryByCurrency: [
    {
      currency: 'ARS',
      totalValue: 8000000,
      totalCost: 6400000,
      productCount: 50,
      valueInARS: 8000000
    },
    {
      currency: 'USD',
      totalValue: 80000,
      totalCost: 60000,
      productCount: 25,
      valueInARS: 23720000
    }
  ],
  // KPI esperado (con tendencia positiva)
  expectedKPIs: {
    totalInventory: '$ 31.720.000',
    margin: '25.0%',
    products: '75',
    cost: '$ 24.000.000',
    insight: '↑ 15.4% en USD este mes. Buena revalüación de inventario.'
  }
};

// ============================================================================
// SCENARIO 6: Sin Datos (Estado Inicial)
// ============================================================================

export const scenarioNoData = {
  exchangeRates: [],
  historicalRates: [],
  inventoryByCurrency: [],
  // Esperado: Mensaje "No hay datos disponibles"
};

// ============================================================================
// UTILIDAD: Mock Data Generator
// ============================================================================

/**
 * Genera datos random para testing
 */
export function generateMockData(options: {
  currencyCount?: number;
  productCount?: number;
  marginRange?: [number, number];
} = {}) {
  const {
    currencyCount = 3,
    productCount = 100,
    marginRange = [10, 30]
  } = options;

  const currencies = ['ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU'].slice(0, currencyCount);
  const rates = [1, 296.50, 324.80, 57.50, 0.27, 0.08]; // Approximate rates

  const exchangeRates = currencies.map((currency, idx) => ({
    id: `rate-${idx}`,
    currency,
    rate: rates[idx],
    updated_at: new Date().toISOString()
  }));

  const inventoryByCurrency = currencies.map((currency, idx) => {
    const totalValue = Math.random() * 100000 + 20000;
    const margin = marginRange[0] + Math.random() * (marginRange[1] - marginRange[0]);
    const totalCost = totalValue * (1 - margin / 100);

    return {
      currency,
      totalValue: Math.round(totalValue),
      totalCost: Math.round(totalCost),
      productCount: Math.floor(productCount / currencyCount),
      valueInARS: currency === 'ARS' ? totalValue : totalValue * rates[idx]
    };
  });

  return {
    exchangeRates,
    historicalRates: [], // Para simplificar
    inventoryByCurrency
  };
}

// ============================================================================
// UTILIDAD: Validators
// ============================================================================

/**
 * Valida que los datos cumplan con la estructura esperada
 */
export function validateDashboardData(data) {
  const errors: string[] = [];

  // Validar exchangeRates
  if (!Array.isArray(data.exchangeRates)) {
    errors.push('exchangeRates debe ser un array');
  } else {
    data.exchangeRates.forEach((rate, idx) => {
      if (!rate.currency) errors.push(`Rate[${idx}]: falta currency`);
      if (typeof rate.rate !== 'number') errors.push(`Rate[${idx}]: rate debe ser número`);
    });
  }

  // Validar inventoryByCurrency
  if (!Array.isArray(data.inventoryByCurrency)) {
    errors.push('inventoryByCurrency debe ser un array');
  } else {
    data.inventoryByCurrency.forEach((item, idx) => {
      if (!item.currency) errors.push(`Inventory[${idx}]: falta currency`);
      if (typeof item.totalValue !== 'number') errors.push(`Inventory[${idx}]: totalValue debe ser número`);
      if (typeof item.totalCost !== 'number') errors.push(`Inventory[${idx}]: totalCost debe ser número`);
      if (typeof item.productCount !== 'number') errors.push(`Inventory[${idx}]: productCount debe ser número`);
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// TESTING HELPERS
// ============================================================================

/**
 * Test: Verify KPI calculations
 */
export function testKPICalculations(scenarioData) {
  const inventory = scenarioData.inventoryByCurrency;
  
  const totalARS = inventory.reduce((acc, item) => acc + item.valueInARS, 0);
  const totalCost = inventory.reduce((acc, item) => acc + item.totalCost, 0);
  const totalProducts = inventory.reduce((acc, item) => acc + item.productCount, 0);
  const globalMargin = totalARS > 0 
    ? (((totalARS - totalCost) / totalARS) * 100)
    : 0;

  console.log('📊 KPI Calculations:');
  console.log(`  Total Inventory (ARS): $${totalARS.toLocaleString('es-AR')}`);
  console.log(`  Total Cost (ARS): $${totalCost.toLocaleString('es-AR')}`);
  console.log(`  Total Products: ${totalProducts}`);
  console.log(`  Global Margin: ${globalMargin.toFixed(1)}%`);
  
  return {
    totalARS,
    totalCost,
    totalProducts,
    globalMargin
  };
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// En tu componente de test:

import { scenarioMediumBusiness, testKPICalculations } from '@/showcase/currencyDashboard';

export default function CurrencyDashboardTest() {
  const data = scenarioMediumBusiness;
  
  // Validar
  const validation = validateDashboardData(data);
  if (!validation.valid) {
    console.error('❌ Validation errors:', validation.errors);
  }

  // Test KPIs
  testKPICalculations(data);

  return (
    <CurrencyDashboardNew
      exchangeRates={data.exchangeRates}
      historicalRates={data.historicalRates}
      inventoryByCurrency={data.inventoryByCurrency}
    />
  );
}
*/

// ============================================================================
// EXPORT ALL
// ============================================================================

export const allScenarios = {
  small: scenarioSmallBusiness,
  medium: scenarioMediumBusiness,
  large: scenarioLargeBusiness,
  criticalMargin: scenarioCriticalMargin,
  highVolatility: scenarioHighVolatility,
  noData: scenarioNoData
};

export default allScenarios;
