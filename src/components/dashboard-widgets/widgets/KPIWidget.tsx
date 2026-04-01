// KPIWidget - Display a single metric with value and optional trend

import React, { useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import { useFormulaEngine } from '@/hooks/useFormulaEngine';
import { AlertCircle } from 'lucide-react';

export interface KPIWidgetProps {
  widget: DashboardWidget;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

const KPIWidget: React.FC<KPIWidgetProps> = ({
  widget,
  data = {},
  variables = {}
}) => {
  const config = widget.config || {};
  const formula = config.formula as string || '';
  const format = config.format as 'number' | 'currency' | 'percent' || 'number';

  // Evaluate formula
  const evaluation = useFormulaEngine(formula, data, variables);

  // Format value
  const formattedValue = useMemo(() => {
    if (evaluation.error) {
      return { display: 'Error', className: 'text-red-600' };
    }

    if (evaluation.value === undefined || evaluation.value === null) {
      return { display: 'No data', className: 'text-gray-500' };
    }

    const value = Number(evaluation.value);

    switch (format) {
      case 'currency':
        return {
          display: new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
          }).format(value),
          className: 'text-green-600'
        };

      case 'percent':
        return {
          display: `${(value * 100).toFixed(1)}%`,
          className: 'text-blue-600'
        };

      case 'number':
      default:
        return {
          display: new Intl.NumberFormat('es-ES').format(value),
          className: 'text-gray-900'
        };
    }
  }, [evaluation.value, evaluation.error, format]);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-600">{widget.name}</h3>
        {widget.description && (
          <p className="text-xs text-gray-500 mt-1">{widget.description}</p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {evaluation.error ? (
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-xs text-red-600">{evaluation.error.message}</p>
          </div>
        ) : (
          <div className="text-center">
            <div className={`text-4xl font-bold ${formattedValue.className}`}>
              {formattedValue.display}
            </div>
            {config.metric && (
              <p className="text-sm text-gray-500 mt-2">{config.metric}</p>
            )}
          </div>
        )}
      </div>

      {/* Formula */}
      {formula && (
        <div className="mt-4 p-2 bg-gray-50 rounded border border-gray-100">
          <code className="text-xs text-gray-600 font-mono break-all">
            {formula}
          </code>
        </div>
      )}
    </div>
  );
};

export default KPIWidget;
