// ChartWidget - Display data with line, bar, area, or pie charts

import React, { useMemo } from 'react';
import { DashboardWidget } from '@/types/dashboard';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { AlertCircle } from 'lucide-react';

export interface ChartWidgetProps {
  widget: DashboardWidget;
  data?: Record<string, any>;
  variables?: Record<string, any>;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#6366f1'
];

const ChartWidget: React.FC<ChartWidgetProps> = ({
  widget,
  data = {},
  variables = {}
}) => {
  const config = widget.config || {};
  const chartType = config.chartType as string || 'line';
  const xAxisKey = config.xAxis as string || 'name';
  const yAxisKey = config.yAxis as string || 'value';

  // Parse chart data
  const chartData = useMemo(() => {
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === 'object') {
      const values = Object.values(data);
      if (Array.isArray(values[0])) {
        return values[0];
      }
      return values.filter(item => typeof item === 'object');
    }

    return [];
  }, [data]);

  // Render chart based on type
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm">No data available for chart</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 0, bottom: 5 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxisKey} fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={yAxisKey}
                fill="#3b82f6"
                stroke="#3b82f6"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={yAxisKey}
                nameKey={xAxisKey}
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={yAxisKey}
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-white to-slate-50 rounded-lg border border-gray-200/50 p-4 shadow-sm hover:shadow-lg hover:border-blue-300/50 transition-all duration-300 group">
      {/* Header */}
      <div className="mb-4 animate-in fade-in duration-300">
        <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{widget.name}</h3>
        {widget.description && (
          <p className="text-xs text-gray-600 mt-1 group-hover:text-gray-700 transition-colors">{widget.description}</p>
        )}
      </div>

      {/* Chart */}
      <div className="flex-1 overflow-auto">
        {renderChart()}
      </div>

      {/* Config Info */}
      <div className="mt-4 p-2.5 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded border border-gray-200/50 group-hover:border-blue-200/70 transition-all duration-300 text-xs text-gray-600 font-mono">
        <span className="font-semibold text-gray-700">Type:</span> {chartType} |{' '}
        <span className="font-semibold text-gray-700">X:</span> {xAxisKey} |{' '}
        <span className="font-semibold text-gray-700">Y:</span> {yAxisKey}
      </div>
    </div>
  );
};

export default ChartWidget;
