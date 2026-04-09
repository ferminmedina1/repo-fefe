import React, { createContext, useState, ReactNode } from 'react';

export interface DateRange {
  type: 'week' | 'month' | 'year' | 'custom';
  from: Date;
  to: Date;
}

export interface DashboardFilters {
  dateRange: DateRange;
  dimension?: string; // e.g., 'country', 'product_category', 'region'
  dimensionValue?: string; // e.g., 'US', 'Electronics', 'North America'
}

interface DashboardFilterContextType {
  filters: DashboardFilters;
  setFilters: (filters: DashboardFilters) => void;
  resetFilters: () => void;
}

const defaultDateRange: DateRange = {
  type: 'month',
  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  to: new Date(),
};

const defaultFilters: DashboardFilters = {
  dateRange: defaultDateRange,
};

export const DashboardFilterContext = createContext<DashboardFilterContextType | undefined>(
  undefined
);

export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <DashboardFilterContext.Provider value={{ filters, setFilters, resetFilters }}>
      {children}
    </DashboardFilterContext.Provider>
  );
}

export function useDashboardFilters() {
  const context = React.useContext(DashboardFilterContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within DashboardFilterProvider');
  }
  return context;
}
