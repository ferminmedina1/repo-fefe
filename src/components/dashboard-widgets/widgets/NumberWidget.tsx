// NumberWidget - Display a single number value

import React, { useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import { AlertCircle } from 'lucide-react';

export interface NumberWidgetProps {
  widget: DashboardWidget;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

const NumberWidget: React.FC<NumberWidgetProps> = ({
  widget,
  data = {},
  variables = {}
}) => {
  const config = widget.config || {};
  const value = config.value ?? 0;
  const format = config.format as 'number' | 'currency' | 'percent' || 'number';

  // Format value
  const formattedValue = useMemo(() => {
    const num = Number(value);

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(num);

      case 'percent':
        return `${(num * 100).toFixed(1)}%`;

      case 'number':
      default:
        return new Intl.NumberFormat('es-ES').format(num);
    }
  }, [value, format]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-white to-slate-50 rounded-lg border border-gray-200/50 p-4 shadow-sm hover:shadow-lg hover:border-blue-300/50 transition-all duration-300 items-center justify-center group">
      <div className="w-full">
        <h3 className="text-sm font-semibold text-gray-900 text-center group-hover:text-blue-600 transition-colors animate-in fade-in duration-300">{widget.name}</h3>
        <div className="text-4xl font-bold text-gray-900 mt-4 text-center transition-all duration-500 group-hover:scale-110">
          {formattedValue}
        </div>
        {widget.description && (
          <p className="text-xs text-gray-600 mt-4 text-center group-hover:text-gray-700 transition-colors">{widget.description}</p>
        )}
      </div>
    </div>
  );
};

export default NumberWidget;
