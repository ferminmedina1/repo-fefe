// TableWidget - Display data in tabular format with pagination

import React, { useState, useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TableWidgetProps {
  widget: DashboardWidget;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

const TableWidget: React.FC<TableWidgetProps> = ({
  widget,
  data = {},
  variables = {}
}) => {
  const config = widget.config || {};
  const columns = config.columns as string[] || [];
  const rowsPerPage = config.rowsPerPage as number || 10;
  const [currentPage, setCurrentPage] = useState(0);

  // Parse data
  const tableData = useMemo(() => {
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      return Object.values(data).filter(item => typeof item === 'object');
    }

    return [];
  }, [data]);

  // Pagination
  const totalPages = Math.ceil(tableData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = currentPage * rowsPerPage;
    return tableData.slice(start, start + rowsPerPage);
  }, [tableData, currentPage, rowsPerPage]);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  // Get value from row
  const getValue = (row: any, column: string): any => {
    const keys = column.split('.');
    let value = row;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return '-';
      }
    }

    return value ?? '-';
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900">{widget.name}</h3>
        {widget.description && (
          <p className="text-xs text-gray-600 mt-1">{widget.description}</p>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {tableData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No data available</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {columns.map(column => (
                  <th
                    key={column}
                    className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 border-b border-gray-100">
                  {columns.map(column => (
                    <td
                      key={`${idx}-${column}`}
                      className="px-3 py-2 text-gray-600"
                    >
                      {typeof getValue(row, column) === 'object'
                        ? JSON.stringify(getValue(row, column))
                        : String(getValue(row, column))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-3">
          <div className="text-xs text-gray-600">
            Page {currentPage + 1} of {totalPages} ({tableData.length} rows)
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleNextPage}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableWidget;
