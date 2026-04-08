// TableFilterHeader - Reusable filter header component for tables

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, ArrowUpDown, Filter } from 'lucide-react';
import { FilterConfig, TableFilter, SortConfig } from '@/hooks/useTableFilters';

export interface TableFilterHeaderProps {
  filterConfig: FilterConfig;
  filters: TableFilter;
  sortConfig: SortConfig;
  isFiltered: boolean;
  onFilterChange: (key: string, value: any) => void;
  onClearFilter: (key: string) => void;
  onClearAllFilters: () => void;
  onSort: (key: string) => void;
  columns: string[];
}

export const TableFilterHeader: React.FC<TableFilterHeaderProps> = ({
  filterConfig,
  filters,
  sortConfig,
  isFiltered,
  onFilterChange,
  onClearFilter,
  onClearAllFilters,
  onSort,
  columns,
}) => {
  return (
    <div className="space-y-4 mb-4">
      {/* Filtros */}
      <div className="bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-lg border border-blue-200/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
            {isFiltered && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                {Object.values(filters).filter(v => v !== undefined).length}
              </span>
            )}
          </div>
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAllFilters}
              className="text-xs h-7 transition-all duration-200 hover:bg-red-100 hover:text-red-600"
            >
              Limpiar todo
            </Button>
          )}
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Object.entries(filterConfig).map(([key, config]) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-gray-700">{config.label}</label>

              {config.type === 'select' ? (
                <div className="flex gap-1">
                  <Select
                    value={filters[key] || ''}
                    onValueChange={(value) => onFilterChange(key, value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={config.placeholder || 'Seleccionar...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {config.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters[key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClearFilter(key)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : config.type === 'date' ? (
                <div className="flex gap-1">
                  <Input
                    type="date"
                    value={filters[key] || ''}
                    onChange={(e) => onFilterChange(key, e.target.value)}
                    className="h-8 text-xs"
                  />
                  {filters[key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClearFilter(key)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : config.type === 'number' ? (
                <div className="flex gap-1">
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters[key] || ''}
                    onChange={(e) => onFilterChange(key, e.target.value)}
                    className="h-8 text-xs"
                  />
                  {filters[key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClearFilter(key)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex gap-1">
                  <Input
                    type="text"
                    placeholder={config.placeholder || 'Buscar...'}
                    value={filters[key] || ''}
                    onChange={(e) => onFilterChange(key, e.target.value)}
                    className="h-8 text-xs"
                  />
                  {filters[key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClearFilter(key)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ordenamiento */}
      <div className="bg-gradient-to-r from-purple-50/50 to-pink-50/50 rounded-lg border border-purple-200/50 p-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-purple-600" />
          <span className="text-xs font-semibold text-gray-900">Ordenar por:</span>

          <div className="flex flex-wrap gap-2">
            {columns.map((column) => (
              <Button
                key={column}
                variant={sortConfig.key === column ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSort(column)}
                className={`h-7 text-xs transition-all duration-200 ${
                  sortConfig.key === column
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                    : 'hover:border-purple-300'
                }`}
              >
                {column}
                {sortConfig.key === column && (
                  <span className="ml-1.5">
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </Button>
            ))}
            {sortConfig.key && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort('')}
                className="h-7 text-xs text-gray-600"
              >
                Sin orden
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableFilterHeader;
