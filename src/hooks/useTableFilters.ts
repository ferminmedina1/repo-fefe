// useTableFilters - Hook for table filtering and sorting

import { useState, useMemo } from 'react';

export interface FilterConfig {
  [key: string]: {
    type: 'text' | 'select' | 'date' | 'number' | 'range';
    label: string;
    options?: { value: string; label: string }[]; // For select type
    placeholder?: string;
  };
}

export interface TableFilter {
  [key: string]: any;
}

export interface SortConfig {
  key: string | null;
  direction: 'asc' | 'desc';
}

export interface UseTableFiltersResult {
  filters: TableFilter;
  sortConfig: SortConfig;
  filteredAndSortedData: any[];
  setFilter: (key: string, value: any) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
  setSortConfig: (key: string, direction?: 'asc' | 'desc') => void;
  isFiltered: boolean;
}

export function useTableFilters(
  data: any[],
  filterConfig?: FilterConfig
): UseTableFiltersResult {
  const [filters, setFilters] = useState<TableFilter>({});
  const [sortConfig, setSortConfigState] = useState<SortConfig>({
    key: null,
    direction: 'asc'
  });

  const setFilter = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' || value === null ? undefined : value
    }));
  };

  const clearFilter = (key: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSortConfigState({ key: null, direction: 'asc' });
  };

  const setSortConfig = (key: string, direction?: 'asc' | 'desc') => {
    // Si pasamos una key vacía, limpiar el ordenamiento
    if (!key) {
      setSortConfigState({ key: null, direction: 'asc' });
      return;
    }

    setSortConfigState({
      key,
      direction: direction || (sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc')
    });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;

      result = result.filter(item => {
        const itemValue = getNestedValue(item, key);

        switch (filterConfig?.[key]?.type) {
          case 'text':
            return String(itemValue).toLowerCase().includes(String(value).toLowerCase());

          case 'select':
            return String(itemValue) === String(value);

          case 'date':
            const itemDate = new Date(itemValue).toDateString();
            const filterDate = new Date(value).toDateString();
            return itemDate === filterDate;

          case 'number':
            return Number(itemValue) === Number(value);

          case 'range':
            if (Array.isArray(value) && value.length === 2) {
              const [min, max] = value;
              const num = Number(itemValue);
              return num >= min && num <= max;
            }
            return true;

          default:
            // Generic string comparison
            return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        }
      });
    });

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, sortConfig.key!);
        const bValue = getNestedValue(b, sortConfig.key!);

        // Handle null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

        // Compare values
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;

        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, filters, sortConfig, filterConfig]);

  const isFiltered = Object.keys(filters).length > 0;

  return {
    filters,
    sortConfig,
    filteredAndSortedData,
    setFilter,
    clearFilter,
    clearAllFilters,
    setSortConfig,
    isFiltered
  };
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value && typeof value === 'object') {
      value = value[key];
    } else {
      return null;
    }
  }

  return value;
}
