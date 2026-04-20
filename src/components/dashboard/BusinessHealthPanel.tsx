import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HealthIndicator } from "./HealthIndicator";
import { Package, TrendingUp, Users, AlertTriangle, DollarSign, Clock, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface BusinessHealthPanelProps {
  companyId: string;
}

export function BusinessHealthPanel({ companyId }: BusinessHealthPanelProps) {
  const navigate = useNavigate();
  const [isAlertsOpen, setIsAlertsOpen] = useState(true);

  // Stock crítico
  const { data: stockHealth } = useQuery({
    queryKey: ["stock-health", companyId],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select("stock, min_stock")
        .eq("company_id", companyId)
        .eq("active", true);

      if (error) throw error;

      const critical = products?.filter(p => p.stock <= p.min_stock).length || 0;
      const warning = products?.filter(p => p.stock > p.min_stock && p.stock <= p.min_stock * 1.5).length || 0;
      const total = products?.length || 0;

      let status: "healthy" | "warning" | "critical" = "healthy";
      if (critical > 0) status = "critical";
      else if (warning > 0) status = "warning";

      return {
        status,
        critical,
        warning,
        total,
        value: critical > 0 ? `${critical} críticos` : warning > 0 ? `${warning} bajos` : "OK",
      };
    },
    enabled: !!companyId,
  });

  // Salud financiera (cobranzas)
  const { data: financialHealth } = useQuery({
    queryKey: ["financial-health", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_account_movements")
        .select("debit_amount, due_date, status")
        .eq("company_id", companyId)
        .eq("movement_type", "sale")
        .in("status", ["pending", "partial"]);

      if (error) throw error;

      const today = new Date();
      const overdue = data?.filter(m => m.due_date && new Date(m.due_date) < today) || [];
      const overdueAmount = overdue.reduce((sum, m) => sum + Number(m.debit_amount), 0);
      const totalPending = data?.reduce((sum, m) => sum + Number(m.debit_amount), 0) || 0;

      const overduePercentage = totalPending > 0 ? (overdueAmount / totalPending) * 100 : 0;

      let status: "healthy" | "warning" | "critical" = "healthy";
      if (overduePercentage > 30) status = "critical";
      else if (overduePercentage > 10) status = "warning";

      return {
        status,
        overdueCount: overdue.length,
        overdueAmount,
        totalPending,
        value: overdue.length > 0 ? `${overdue.length} vencidas` : "Al día",
      };
    },
    enabled: !!companyId,
  });

  // Salud de clientes - Optimized with parallel queries
  const { data: customerHealth } = useQuery({
    queryKey: ["customer-health", companyId],
    queryFn: async () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Execute both queries in parallel instead of series (N+1 fix)
      const [customersResult, salesResult] = await Promise.all([
        supabase
          .from("customers")
          .select("id")
          .eq("company_id", companyId),
        supabase
          .from("sales")
          .select("customer_id")
          .eq("company_id", companyId)
          .gte("created_at", threeMonthsAgo.toISOString())
          .not("customer_id", "is", null)
      ]);

      if (customersResult.error) throw customersResult.error;
      if (salesResult.error) throw salesResult.error;

      const customers = customersResult.data || [];
      const sales = salesResult.data || [];

      const activeCustomers = new Set(sales.map(s => s.customer_id));
      const totalCustomers = customers.length;
      const inactiveCount = totalCustomers - activeCustomers.size;
      const inactivePercentage = totalCustomers > 0 ? (inactiveCount / totalCustomers) * 100 : 0;

      let status: "healthy" | "warning" | "critical" = "healthy";
      if (inactivePercentage > 40) status = "critical";
      else if (inactivePercentage > 20) status = "warning";

      return {
        status,
        inactiveCount,
        totalCustomers,
        activeCount: activeCustomers.size,
        value: inactiveCount > 0 ? `${inactiveCount} inactivos` : "Activos",
      };
    },
    enabled: !!companyId,
  });

  // Alertas recientes (últimas 10 no leídas)
  const { data: recentAlerts } = useQuery({
    queryKey: ["recent-alerts", companyId],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.user.id)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const alertPriority = (type: string) => {
    if (type === "low_stock" || type === "overdue_invoice") return "critical";
    if (type === "expiring_product" || type === "expiring_check") return "warning";
    return "info";
  };

  return (
    <div className="space-y-6">
      {/* Health Indicators */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-foreground">Indicadores de Salud</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <HealthIndicator
            title="Inventario"
            status={stockHealth?.status || "healthy"}
            value={stockHealth?.value || "Cargando..."}
            description={`${stockHealth?.total || 0} productos activos`}
            icon={Package}
            onClick={() => navigate("/inventory-alerts")}
          />

          <HealthIndicator
            title="Finanzas"
            status={financialHealth?.status || "healthy"}
            value={financialHealth?.value || "Cargando..."}
            description={`Total pendiente: $${financialHealth?.totalPending.toFixed(0) || 0}`}
            icon={DollarSign}
            onClick={() => navigate("/accounts-receivable")}
          />

          <HealthIndicator
            title="Clientes"
            status={customerHealth?.status || "healthy"}
            value={customerHealth?.value || "Cargando..."}
            description={`${customerHealth?.activeCount || 0} de ${customerHealth?.totalCustomers || 0} activos últimos 3 meses`}
            icon={Users}
            onClick={() => navigate("/customers")}
          />
        </div>
      </div>

      {/* Priority Alerts */}
      {recentAlerts && recentAlerts.length > 0 && (
        <Card data-tutorial="stock-alerts">
          <CardHeader
            className="flex flex-row items-center justify-between cursor-pointer select-none p-4 md:p-6"
            onClick={() => setIsAlertsOpen((v) => !v)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
              <CardTitle className="text-base md:text-lg">Alertas Prioritarias</CardTitle>
              <Badge variant="secondary" className="text-xs shrink-0">
                {recentAlerts.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2 md:px-3"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/inventory-alerts");
                }}
              >
                Ver todas
              </Button>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                  isAlertsOpen ? "rotate-0" : "-rotate-90"
                }`}
              />
            </div>
          </CardHeader>

          {isAlertsOpen && (
            <CardContent className="pt-0 px-4 pb-4 md:px-6 md:pb-6">
              <div className="space-y-2">
                {recentAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex flex-col gap-1.5 p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    onClick={() => navigate("/inventory-alerts")}
                  >
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            alertPriority(alert.type) === "critical"
                              ? "destructive"
                              : alertPriority(alert.type) === "warning"
                              ? "default"
                              : "outline"
                          }
                          className="text-xs shrink-0"
                        >
                          {alert.type === "low_stock"
                            ? "Stock Bajo"
                            : alert.type === "overdue_invoice"
                            ? "Vencida"
                            : alert.type === "expiring_product"
                            ? "Por Vencer"
                            : alert.type === "expiring_check"
                            ? "Cheque"
                            : "Alerta"}
                        </Badge>
                        <span className="text-sm font-medium truncate">{alert.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 self-end sm:self-start sm:pt-0.5">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="whitespace-nowrap">
                        {formatDistanceToNow(new Date(alert.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
