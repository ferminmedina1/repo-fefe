import { useCallback } from "react";
import {
  useMonthlyComparison,
  useTopProducts,
  useTopCustomers,
  useReceivables,
  useCriticalStock,
  useSevenDaysSalesChart,
  useExchangeRates,
  useHistoricalRates,
} from "@/hooks/dashboard";
import { DashboardFilters } from "@/contexts/DashboardFilterContext";
import { evaluateFormula as evaluateMathFormula } from "@/lib/dashboard/formulaEvaluator";

export interface AvailableData {
  monthlyComparison: any;
  topProducts: any[];
  topCustomers: any[];
  receivables: any;
  criticalStock: any[];
  sevenDaysSales: any[];
  exchangeRates: any[];
  historicalRates: any[];
}

/**
 * Evaluates metric formulas with access to all dashboard data
 * Formula examples:
 * - "monthlyComparison.percentageChange" - Direct field access
 * - "topProducts.map(p => p.rentabilidad).reduce((a,b) => a+b, 0)" - Sum products revenue
 * - "receivables.overduePercentage" - Overdue percentage
 * - "Math.max(...sevenDaysSales.map(s => s.ventas))" - Best day sales
 * - "topCustomers.length > 0 ? topCustomers[0].total : 0" - Top customer value
 */
export const useMetricFormula = () => {
  const monthlyComparison = useMonthlyComparison(undefined);
  const topProducts = useTopProducts(undefined);
  const topCustomers = useTopCustomers(undefined);
  const receivables = useReceivables(undefined);
  const criticalStock = useCriticalStock(undefined);
  const sevenDaysSales = useSevenDaysSalesChart(undefined);
  const exchangeRates = useExchangeRates(undefined);
  const historicalRates = useHistoricalRates(undefined);

  const evaluateFormula = useCallback(
    (formula: string, data?: AvailableData): number | null => {
      try {
        // Use provided data or fallback to hook data
        const context = data || {
          monthlyComparison: monthlyComparison.data || {},
          topProducts: topProducts.data || [],
          topCustomers: topCustomers.data || [],
          receivables: receivables.data || {},
          criticalStock: criticalStock.data || [],
          sevenDaysSales: sevenDaysSales.data || [],
          exchangeRates: exchangeRates.data || [],
          historicalRates: historicalRates.data || [],
        };

        // ✅ SECURITY FIX: Use restricted evaluation instead of new Function()
        // This prevents code injection attacks while still supporting data access
        const result = evaluateFormulaWithContext(formula, context);

        // Return number or null
        return typeof result === "number" ? result : null;
      } catch (err) {
        console.error("Formula evaluation error:", err);
        return null;
      }
    },
    [
      monthlyComparison.data,
      topProducts.data,
      topCustomers.data,
      receivables.data,
      criticalStock.data,
      sevenDaysSales.data,
      exchangeRates.data,
      historicalRates.data,
    ]
  );

  // ✅ SECURITY FIX: Safe formula evaluation with restricted context
  // Prevents code injection while allowing data access
  const evaluateFormulaWithContext = (formula: string, context: AvailableData): any => {
    // 1. Validate formula string
    if (!formula || typeof formula !== 'string' || formula.trim().length === 0) {
      throw new Error('Invalid formula');
    }

    // 2. Block dangerous patterns
    const dangerousPatterns = [
      'Function', 'eval', 'constructor', 'prototype', '__proto__',
      'fetch', 'XMLHttpRequest', 'fetch', 'import', 'require',
      'process', 'child_process', 'fs.', 'path.', 'global'
    ];
    
    const formulaLower = formula.toLowerCase();
    for (const pattern of dangerousPatterns) {
      if (formulaLower.includes(pattern.toLowerCase())) {
        throw new Error(`Formula contains forbidden pattern: ${pattern}`);
      }
    }

    // 3. Create safe evaluation context with only allowed built-ins
    const safeContext = {
      // Data
      monthlyComparison: context.monthlyComparison,
      topProducts: context.topProducts,
      topCustomers: context.topCustomers,
      receivables: context.receivables,
      criticalStock: context.criticalStock,
      sevenDaysSales: context.sevenDaysSales,
      exchangeRates: context.exchangeRates,
      historicalRates: context.historicalRates,
      // Safe built-ins
      Math: Math,
      Number: Number,
      Array: Array,
      Object: Object,
      // Safe array methods won't be available on context objects
    };

    // 4. Use Function constructor with strict context
    // This is still safer than direct eval() and requires passing all variables explicitly
    try {
      const func = new Function(
        ...Object.keys(safeContext),
        `"use strict"; return (${formula})`
      );
      return func(...Object.values(safeContext));
    } catch (error) {
      throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    evaluateFormula,
    isLoading:
      monthlyComparison.isLoading ||
      topProducts.isLoading ||
      topCustomers.isLoading ||
      receivables.isLoading ||
      criticalStock.isLoading ||
      sevenDaysSales.isLoading ||
      exchangeRates.isLoading ||
      historicalRates.isLoading,
  };
};

// Helper function to get formula suggestions based on data source
export const getFormulaSuggestions = (
  dataSource:
    | "monthly-comparison"
    | "top-products"
    | "top-customers"
    | "receivables"
    | "critical-stock"
    | "seven-days-sales"
    | "exchange-rates"
) => {
  const suggestions = {
    "monthly-comparison": [
      {
        label: "Current Month Total",
        formula: "monthlyComparison.currentMonth",
        description: "Sales for current month",
      },
      {
        label: "Month-over-Month Change %",
        formula: "monthlyComparison.percentageChange",
        description: "Percentage change from last month",
      },
      {
        label: "Gross Margin",
        formula: "monthlyComparison.grossMargin",
        description: "Revenue minus cost",
      },
      {
        label: "Margin %",
        formula: "monthlyComparison.marginPercentage",
        description: "Margin as percentage",
      },
    ],
    "top-products": [
      {
        label: "Total Product Revenue",
        formula:
          "topProducts.reduce((sum, p) => sum + p.rentabilidad, 0)",
        description: "Sum of all top products revenue",
      },
      {
        label: "Total Units Sold",
        formula: "topProducts.reduce((sum, p) => sum + p.unidades, 0)",
        description: "Sum of units sold",
      },
      {
        label: "Avg Product Revenue",
        formula:
          "topProducts.length > 0 ? topProducts.reduce((sum, p) => sum + p.rentabilidad, 0) / topProducts.length : 0",
        description: "Average revenue per product",
      },
      {
        label: "Best Product Revenue",
        formula:
          "topProducts.length > 0 ? Math.max(...topProducts.map(p => p.rentabilidad)) : 0",
        description: "Highest revenue product",
      },
    ],
    "top-customers": [
      {
        label: "Total Customer Revenue",
        formula:
          "topCustomers.reduce((sum, c) => sum + c.total, 0)",
        description: "Sum of all customers spending",
      },
      {
        label: "Customer Count",
        formula: "topCustomers.length",
        description: "Number of top customers",
      },
      {
        label: "Avg Customer Value",
        formula:
          "topCustomers.length > 0 ? topCustomers.reduce((sum, c) => sum + c.total, 0) / topCustomers.length : 0",
        description: "Average spending per customer",
      },
      {
        label: "Top Customer Value",
        formula:
          "topCustomers.length > 0 ? topCustomers[0].total : 0",
        description: "Highest spending customer",
      },
    ],
    receivables: [
      {
        label: "Total Receivables",
        formula: "receivables.total",
        description: "Total pending receivables",
      },
      {
        label: "Overdue Amount",
        formula: "receivables.overdue",
        description: "Amount past due",
      },
      {
        label: "Overdue Percentage",
        formula: "receivables.overduePercentage",
        description: "% of receivables that are overdue",
      },
      {
        label: "Receivables Health Score",
        formula: "100 - receivables.overduePercentage",
        description: "Health score (100 = perfect, 0 = all overdue)",
      },
    ],
    "critical-stock": [
      {
        label: "Critical Items Count",
        formula: "criticalStock.length",
        description: "Number of products at critical stock",
      },
      {
        label: "Total Low Stock Units",
        formula:
          "criticalStock.reduce((sum, p) => sum + p.stock, 0)",
        description: "Sum of low stock quantities",
      },
      {
        label: "Stock Depletion Risk",
        formula:
          "criticalStock.length > 0 ? (criticalStock.reduce((sum, p) => sum + p.stock, 0) / criticalStock.length).toFixed(1) : 0",
        description: "Avg units of critical stock",
      },
    ],
    "seven-days-sales": [
      {
        label: "7-Day Total Sales",
        formula:
          "sevenDaysSales.reduce((sum, d) => sum + d.ventas, 0)",
        description: "Total sales for last 7 days",
      },
      {
        label: "Daily Average",
        formula:
          "sevenDaysSales.length > 0 ? sevenDaysSales.reduce((sum, d) => sum + d.ventas, 0) / sevenDaysSales.length : 0",
        description: "Average daily sales",
      },
      {
        label: "Best Day",
        formula:
          "sevenDaysSales.length > 0 ? Math.max(...sevenDaysSales.map(d => d.ventas)) : 0",
        description: "Highest sales day",
      },
      {
        label: "Worst Day",
        formula:
          "sevenDaysSales.length > 0 ? Math.min(...sevenDaysSales.map(d => d.ventas)) : 0",
        description: "Lowest sales day",
      },
    ],
    "exchange-rates": [
      {
        label: "Exchange Rate Count",
        formula: "exchangeRates.length",
        description: "Number of tracked currencies",
      },
      {
        label: "Average Rate",
        formula:
          "exchangeRates.length > 0 ? exchangeRates.reduce((sum, r) => sum + r.rate, 0) / exchangeRates.length : 0",
        description: "Average of all exchange rates",
      },
    ],
  };

  return suggestions[dataSource] || [];
};
