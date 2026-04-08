// WidgetRenderer - Main component that renders widgets by type

import React, { useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import { useFormulaEngine } from '@/hooks/useFormulaEngine';
import KPIWidget from './widgets/KPIWidget';
import ChartWidget from './widgets/ChartWidget';
import TableWidget from './widgets/TableWidget';
import GaugeWidget from './widgets/GaugeWidget';
import FormulaWidget from './widgets/FormulaWidget';
import NumberWidget from './widgets/NumberWidget';
import MapWidget from './widgets/MapWidget';
import { AlertCircle, Loader } from 'lucide-react';

export interface WidgetRendererProps {
  widget: DashboardWidget;
  data?: Record<string, any>;
  variables?: Record<string, any>;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
}

const WidgetRenderer: React.FC<WidgetRendererProps> = ({
  widget,
  data = {},
  variables = {},
  isLoading = false,
  error = null,
  onRefresh
}) => {
  const containerClassName = `
    h-full w-full flex flex-col
    bg-gradient-to-br from-white to-slate-50 rounded-lg border border-gray-200/50
    hover:border-blue-300/50 transition-all duration-300
    shadow-sm hover:shadow-lg group
  `;

  // Error state
  if (error) {
    return (
      <div className={containerClassName + ' items-center justify-center'}>
        <div className="text-center p-4 animate-in fade-in duration-300">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 font-medium">{widget.name}</p>
          <p className="text-xs text-red-500 mt-1">{error.message}</p>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100/30 mt-2 underline px-2 py-1 rounded transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={containerClassName + ' items-center justify-center'}>
        <div className="text-center animate-in fade-in duration-300">
          <Loader className="w-8 h-8 text-blue-500 mx-auto animate-spin mb-2" />
          <p className="text-xs text-gray-600">{widget.name}</p>
        </div>
      </div>
    );
  }

  // Render based on type
  switch (widget.type) {
    case 'kpi':
      return (
        <KPIWidget
          widget={widget}
          data={data}
          variables={variables}
        />
      );

    case 'chart':
      return (
        <ChartWidget
          widget={widget}
          data={data}
          variables={variables}
        />
      );

    case 'table':
      return (
        <TableWidget
          widget={widget}
          data={data}
          variables={variables}
        />
      );

    case 'gauge':
      return (
        <GaugeWidget
          widget={widget}
          data={data}
          variables={variables}
        />
      );

    case 'formula':
      return (
        <FormulaWidget
          widget={widget}
          data={data}
          variables={variables}
        />
      );

    case 'number':
      return (
        <NumberWidget
          widget={widget}
          data={data}
          variables={variables}
        />
      );

    case 'map':
      return (
        <MapWidget
          widget={widget}
          data={data}
          variables={variables}
        />
      );

    default:
      return (
        <div className={containerClassName + ' items-center justify-center'}>
          <div className="text-center p-4 animate-in fade-in duration-300">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-gray-900 font-medium">Unknown widget type</p>
            <p className="text-xs text-gray-500 mt-1">{(widget as any).type}</p>
          </div>
        </div>
      );
  }
};

export default WidgetRenderer;
