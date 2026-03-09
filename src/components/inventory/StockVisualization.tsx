import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Package } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface StockDistributionProps {
  productName: string;
  totalStock: number;
  distributions: Array<{
    warehouseCode: string;
    warehouseName: string;
    stock: number;
  }>;
  showPercentage?: boolean;
}

export function StockDistributionVisualization({
  productName,
  totalStock,
  distributions,
  showPercentage = true,
}: StockDistributionProps) {
  if (totalStock === 0) {
    return (
      <Card className="p-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          <Package className="h-4 w-4" />
          <span className="text-sm font-medium">{productName} sin stock</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-medium text-sm">{productName}</h4>
        <Badge variant="outline">Total: {totalStock}</Badge>
      </div>

      <div className="space-y-2">
        {distributions.map((dist, idx) => {
          const percentage = (dist.stock / totalStock) * 100;
          return (
            <div key={`${dist.warehouseCode}-${idx}`} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{dist.warehouseCode}</span>
                <span className="text-muted-foreground">
                  {dist.stock} {showPercentage && `(${percentage.toFixed(0)}%)`}
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

interface TransferFlowProps {
  from: {
    code: string;
    name: string;
    quantity: number;
  };
  to: {
    code: string;
    name: string;
  };
  product: string;
  status?: "pending" | "in_transit" | "completed" | "failed";
  createdAt?: Date;
}

const statusConfig = {
  pending: {
    color: "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100",
    label: "Pendiente",
  },
  in_transit: {
    color: "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100",
    label: "En tránsito",
  },
  completed: {
    color: "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100",
    label: "Completado",
  },
  failed: {
    color: "bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100",
    label: "Falló",
  },
};

export function TransferFlowVisualization({
  from,
  to,
  product,
  status = "pending",
  createdAt,
}: TransferFlowProps) {
  const config = statusConfig[status];

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">{product}</h4>
          <Badge className={config.color}>{config.label}</Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs font-medium text-muted-foreground">Origen</div>
            <div className="font-semibold">{from.code}</div>
            <div className="text-sm text-muted-foreground">{from.name}</div>
            <div className="mt-1 text-lg font-bold text-green-600 dark:text-green-400">
              -{from.quantity}
            </div>
          </div>

          <div className="flex-shrink-0">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex-1">
            <div className="text-xs font-medium text-muted-foreground">Destino</div>
            <div className="font-semibold">{to.code}</div>
            <div className="text-sm text-muted-foreground">{to.name}</div>
            <div className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
              +{from.quantity}
            </div>
          </div>
        </div>

        {createdAt && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            {format(createdAt, "PPp", { locale: es })}
          </div>
        )}
      </div>
    </Card>
  );
}
