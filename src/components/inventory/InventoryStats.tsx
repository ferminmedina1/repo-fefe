import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Warehouse,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function InventoryStats() {
  const { currentCompany } = useCompany();

  const { data: stats } = useQuery({
    queryKey: ["inventory-stats", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("active", true);

      if (productsError) throw productsError;

      const { data: warehouses, error: warehousesError } = await supabase
        .from("warehouses")
        .select("id")
        .eq("company_id", currentCompany.id)
        .eq("active", true);

      if (warehousesError) throw warehousesError;

      const totalProducts = products?.length || 0;
      const lowStockCount =
        products?.filter((p) => p.stock <= p.min_stock && p.min_stock > 0).length || 0;
      const zeroStockCount = products?.filter((p) => p.stock === 0).length || 0;
      const totalValue = products?.reduce((sum, p) => {
        const price = Number(p.price) || 0;
        const stock = Number(p.stock) || 0;
        return sum + (price * stock);
      }, 0) || 0;
      const warehouseCount = warehouses?.length || 0;

      return {
        totalProducts,
        lowStockCount,
        zeroStockCount,
        totalValue,
        warehouseCount,
        alerts: (lowStockCount + zeroStockCount) | 0,
      };
    },
    enabled: !!currentCompany?.id,
  });

  const StatCard = ({
    title,
    value,
    icon: Icon,
    variant = "default",
    subtext,
  }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    variant?: "default" | "warning" | "critical" | "success";
    subtext?: string;
  }) => {
    const variantClasses = {
      default: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800",
      warning: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800",
      critical: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
      success: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
    };

    const iconClasses = {
      default: "text-blue-600 dark:text-blue-400",
      warning: "text-yellow-600 dark:text-yellow-400",
      critical: "text-red-600 dark:text-red-400",
      success: "text-green-600 dark:text-green-400",
    };

    return (
      <Card className={cn("border", variantClasses[variant])}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <Icon className={cn("h-5 w-5", iconClasses[variant])} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subtext && (
            <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!stats)
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg"></div>
        ))}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Productos"
          value={stats.totalProducts}
          icon={Package}
          subtext={`${stats.warehouseCount} depósito${stats.warehouseCount !== 1 ? "s" : ""}`}
        />

        <StatCard
          title="Alertas Activas"
          value={stats.alerts}
          icon={AlertTriangle}
          variant={stats.alerts > 0 ? "critical" : "success"}
          subtext={`${stats.lowStockCount} bajo stock`}
        />

        <StatCard
          title="Sin Stock"
          value={stats.zeroStockCount}
          icon={TrendingDown}
          variant={stats.zeroStockCount > 0 ? "warning" : "success"}
          subtext={`${stats.totalProducts > 0 ? ((stats.zeroStockCount / stats.totalProducts) * 100).toFixed(1) : '0'}% del total`}
        />

        <StatCard
          title="Valor Total"
          value={`$${(stats.totalValue / 1000).toFixed(1)}k`}
          icon={DollarSign}
          subtext="Valor en inventario"
        />

        <StatCard
          title="Depósitos"
          value={stats.warehouseCount}
          icon={Warehouse}
          subtext={`${stats.totalProducts} productos`}
        />
      </div>

      {/* Alert Bar */}
      {stats.alerts > 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900 dark:text-red-100">
              Acción requerida
            </h4>
            <p className="text-sm text-red-800 dark:text-red-200 mt-1">
              Tiene {stats.alerts} producto{stats.alerts !== 1 ? "s" : ""} con stock bajo o crítico
              que requieren atención.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
