// GaugeWidget - Display value within a range as a gauge/speedometer

import React, { useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import { useFormulaEngine } from '@/hooks/useFormulaEngine';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { AlertCircle } from 'lucide-react';

export interface GaugeWidgetProps {
  widget: DashboardWidget;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

const GaugeWidget: React.FC<GaugeWidgetProps> = ({
  widget,
  data = {},
  variables = {}
}) => {
  const config = widget.config || {};
  const formula = config.formula as string || '';
  const min = config.min as number || 0;
  const max = config.max as number || 100;

  // Evaluate formula
  const evaluation = useFormulaEngine(formula, data, variables);

  const gaugeValue = useMemo(() => {
    if (evaluation.error || evaluation.value === undefined || evaluation.value === null) {
      return 0;
    }
    const val = Number(evaluation.value);
    return Math.max(min, Math.min(max, val));
  }, [evaluation.value, evaluation.error, min, max]);

  // Calculate percentage
  const percentage = ((gaugeValue - min) / (max - min)) * 100;

  // Gauge data for Recharts
  const gaugeData = [
    { name: 'Value', value: percentage, fill: '#3b82f6' },
    { name: 'Remaining', value: 100 - percentage, fill: '#e5e7eb' }
  ];

  // Color based on percentage
  const getColor = (pct: number) => {
    if (pct >= 80) return '#10b981'; // green
    if (pct >= 60) return '#3b82f6'; // blue
    if (pct >= 40) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  gaugeData[0].fill = getColor(percentage);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-900">{widget.name}</h3>
        {widget.description && (
          <p className="text-xs text-gray-600 mt-1">{widget.description}</p>
        )}
      </div>

      {/* Gauge */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {evaluation.error ? (
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-xs text-red-600">{evaluation.error.message}</p>
          </div>
        ) : (
          <div className="w-full max-w-xs">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gaugeData}
                  cx="50%"
                  cy="50%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {gaugeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Value Display */}
            <div className="text-center mt-4">
              <div className="text-3xl font-bold" style={{ color: getColor(percentage) }}>
                {gaugeValue.toFixed(0)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {min} - {max}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                {percentage.toFixed(0)}% Progress
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
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

export default GaugeWidget;
