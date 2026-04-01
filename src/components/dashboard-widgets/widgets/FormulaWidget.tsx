// FormulaWidget - Display formula calculation result

import React, { useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import { useFormulaEngine } from '@/hooks/useFormulaEngine';
import { AlertCircle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FormulaWidgetProps {
  widget: DashboardWidget;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

const FormulaWidget: React.FC<FormulaWidgetProps> = ({
  widget,
  data = {},
  variables = {}
}) => {
  const config = widget.config || {};
  const formula = config.formula as string || '';
  const format = config.format as 'number' | 'currency' | 'percent' | 'decimal' || 'number';

  // Evaluate formula
  const evaluation = useFormulaEngine(formula, data, variables);

  // Format value based on format type
  const formattedValue = useMemo(() => {
    if (evaluation.error) {
      return { display: 'Error', className: 'text-red-600' };
    }

    if (evaluation.value === undefined || evaluation.value === null) {
      return { display: 'No value', className: 'text-gray-500' };
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
          display: `${(value * 100).toFixed(2)}%`,
          className: 'text-blue-600'
        };

      case 'decimal':
        return {
          display: value.toFixed(4),
          className: 'text-gray-900'
        };

      case 'number':
      default:
        return {
          display: new Intl.NumberFormat('es-ES').format(value),
          className: 'text-gray-900'
        };
    }
  }, [evaluation.value, evaluation.error, format]);

  const handleCopy = () => {
    const text = evaluation.value?.toString() || '';
    navigator.clipboard.writeText(text).catch(() => {});
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

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {evaluation.error ? (
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-xs text-red-600 font-medium">Formula Error</p>
            <p className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded">
              {evaluation.error.message}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className={`text-3xl font-bold ${formattedValue.className}`}>
              {formattedValue.display}
            </div>
            <div className="text-xs text-gray-500 mt-3">
              {format.charAt(0).toUpperCase() + format.slice(1)}
            </div>

            {/* Copy Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="mt-3 text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
        )}
      </div>

      {/* Formula Display */}
      <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-100">
        <div className="text-xs font-medium text-gray-700 mb-1">Formula:</div>
        <code className="text-xs text-gray-600 font-mono break-all block overflow-hidden text-ellipsis max-h-16">
          {formula}
        </code>
      </div>
    </div>
  );
};

export default FormulaWidget;
