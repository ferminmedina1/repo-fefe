import { WidgetWrapper } from "./WidgetWrapper";
import { WidgetDefinition } from "@/lib/dashboard/widgets";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface CurrencyData {
  id?: string;
  currency?: string;
  rate?: number;
  date?: string;
  USD?: number;
  EUR?: number;
  totalValue?: number;
  totalCost?: number;
  productCount?: number;
  valueInARS?: number;
}

interface CurrencyWidgetProps {
  definition: WidgetDefinition;
  data?: CurrencyData[] | null;
  isLoading?: boolean;
  onRemove?: () => void;
  isDragging?: boolean;
}

export function CurrencyWidget({
  definition,
  data,
  isLoading = false,
  onRemove,
  isDragging,
}: CurrencyWidgetProps) {
  const renderContent = () => {
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
      case "currency-rates":
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
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="USD"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="EUR"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "currency-summary":
        return (
          <div className="space-y-3">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{item.currency}</Badge>
                  <span className="text-sm font-semibold text-foreground">
                    ${item.valueInARS?.toFixed(0) || 0}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-medium">${item.totalValue?.toFixed(0) || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Productos</p>
                    <p className="font-medium">{item.productCount || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      default:
        return <p className="text-sm text-muted-foreground">Widget no configurado</p>;
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
      {renderContent()}
    </WidgetWrapper>
  );
}
