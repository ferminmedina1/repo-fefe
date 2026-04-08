// FilterableDataTable - Reusable component that combines tables with filters and sorting

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import TableFilterHeader from '@/components/ui/TableFilterHeader';
import { useTableFilters, FilterConfig } from '@/hooks/useTableFilters';
import { Loader2 } from 'lucide-react';

export interface FilterableDataTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
  }[];
  filterConfig: FilterConfig;
  isLoading?: boolean;
  onRowClick?: (row: any) => void;
  rowClassName?: (row: any) => string;
  actions?: (row: any) => React.ReactNode;
}

export const FilterableDataTable: React.FC<FilterableDataTableProps> = ({
  data,
  columns,
  filterConfig,
  isLoading = false,
  onRowClick,
  rowClassName,
  actions,
}) => {
  const {
    filters,
    sortConfig,
    filteredAndSortedData,
    setFilter,
    clearFilter,
    clearAllFilters,
    setSortConfig,
    isFiltered,
  } = useTableFilters(data, filterConfig);

  const columnKeys = columns.map(c => c.key);

  const getNestedValue = (obj: any, path: string): any => {
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
  };

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <TableFilterHeader
        filterConfig={filterConfig}
        filters={filters}
        sortConfig={sortConfig}
        isFiltered={isFiltered}
        onFilterChange={setFilter}
        onClearFilter={clearFilter}
        onClearAllFilters={clearAllFilters}
        onSort={setSortConfig}
        columns={columnKeys}
      />

      {/* Table */}
      <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-gray-200/50 sticky top-0 z-10">
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  onClick={() => setSortConfig(column.key)}
                  className={`font-semibold text-gray-900 cursor-pointer transition-all duration-200 hover:bg-blue-50/50 ${
                    sortConfig.key === column.key ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {sortConfig.key === column.key && (
                      <span className="text-xs">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-20">Acciones</TableHead>}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-8"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAndSortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="text-center py-12 text-gray-500"
                >
                  {isFiltered
                    ? 'No se encontraron resultados con los filtros aplicados'
                    : 'No hay datos para mostrar'}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedData.map((row, index) => (
                <TableRow
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  className={`transition-all duration-200 ${
                    onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'
                  } ${rowClassName?.(row) || ''}`}
                >
                  {columns.map((column) => (
                    <TableCell key={`${index}-${column.key}`} className="py-3">
                      {column.render
                        ? column.render(getNestedValue(row, column.key), row)
                        : getNestedValue(row, column.key) ?? '-'}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results Info */}
      {filteredAndSortedData.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 rounded-lg border border-blue-200/30">
          <span className="text-xs font-medium text-gray-600">
            Mostrando{' '}
            <span className="font-semibold text-gray-900">{filteredAndSortedData.length}</span>{' '}
            de <span className="font-semibold text-gray-900">{data.length}</span> resultados
            {isFiltered && ' (filtrados)'}
          </span>
        </div>
      )}
    </div>
  );
};

export default FilterableDataTable;
