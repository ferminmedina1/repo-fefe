import { WidgetWrapper } from "./WidgetWrapper";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ChartData {
  producto?: string;
  cliente?: string;
  date?: string;
  rentabilidad?: number;
  total?: number;
  ventas?: number;
  unidades?: number;
  compras?: number;
}

interface ChartWidgetProps {
  definition: WidgetDefinition;
  data?: ChartData[] | null;
  isLoading?: boolean;
  onRemove?: () => void;
  isDragging?: boolean;
}

export function ChartWidget({
  definition,
  data,
  isLoading = false,
  onRemove,
  isDragging,
}: ChartWidgetProps) {
  const renderChart = () => {
    if (isLoading) {
      return <div className="h-80 bg-muted animate-pulse rounded" />;
    }

    if (!data || data.length === 0) {
      return (
        <div className="h-80 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
        </div>
      );
    }

    switch (definition.id) {
      case "chart-top-products":
      case "chart-top-customers":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis
                dataKey={definition.id === "chart-top-products" ? "producto" : "cliente"}
                type="category"
                width={100}
                className="text-xs"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
              />
              <Bar
                dataKey={definition.id === "chart-top-products" ? "rentabilidad" : "total"}
                fill={`hsl(var(--primary))`}
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case "chart-sales-7days":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Ventas"]}
              />
              <Line
                type="monotone"
                dataKey="ventas"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return <p className="text-sm text-muted-foreground">Gráfico no configurado</p>;
    }
  };

  return (
    <WidgetWrapper
      title={definition.name}
      description={definition.description}
      icon={<definition.icon className="h-5 w-5" />}
      accentColor={definition.color}
      onRemove={onRemove}
      isDragging={isDragging}
    >
      {renderChart()}
    </WidgetWrapper>
  );
}
