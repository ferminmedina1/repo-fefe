import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, startOfDay, endOfDay, getHours } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Activity, ShoppingCart, DollarSign, Clock } from "lucide-react";
import { useMemo } from "react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);

export default function DailySalesAnalytics() {
  const { currentCompany } = useCompany();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canView = hasPermission("sales", "view");

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  const { data: todaySales = [], isLoading } = useQuery({
    queryKey: ["analytics-daily-sales", currentCompany?.id, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, total, created_at, customer_id, customers(name)")
        .eq("company_id", currentCompany!.id)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: canView && !!currentCompany?.id,
    staleTime: 60 * 1000, // refresh every minute for today
    refetchInterval: 60 * 1000,
  });

  // KPIs
  const kpis = useMemo(() => {
    const total = todaySales.reduce((acc, s) => acc + Number(s.total), 0);
    const count = todaySales.length;
    const avg = count > 0 ? total / count : 0;
    return { total, count, avg };
  }, [todaySales]);

  // Ventas por hora (0–23)
  const byHour = useMemo(() => {
    // Only show hours that have sales OR up to current hour
    const currentHour = getHours(today);
    return Array.from({ length: currentHour + 1 }, (_, h) => {
      const hoursales = todaySales
        .filter((s) => getHours(new Date(s.created_at)) === h)
        .reduce((acc, s) => acc + Number(s.total), 0);
      return {
        hora: `${String(h).padStart(2, "0")}h`,
        ventas: hoursales,
      };
    });
  }, [todaySales, today]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">Ventas Hoy</h1>
              <Badge variant="outline" className="text-[10px] md:text-xs">
                <span className="hidden sm:inline">Actualización automática · </span>cada 60s
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {format(today, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total del día", value: formatCurrency(kpis.total), icon: DollarSign, color: "purple" },
            { label: "Transacciones", value: String(kpis.count), icon: ShoppingCart, color: "blue", sub: "ventas realizadas hoy" },
            { label: "Ticket promedio", value: formatCurrency(kpis.avg), icon: Activity, color: "green" },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className={`border-l-4 border-${color}-500/30`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-1">
                {isLoading ? <Skeleton className="h-8 w-28" /> : <p className="text-2xl font-bold">{value}</p>}
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Ventas por hora */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Ventas por hora
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : byHour.every((h) => h.ventas === 0) ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Sin ventas hoy aún.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byHour}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(v: number) => [formatCurrency(v), "Ventas"]}
                  />
                  <Bar dataKey="ventas" fill="rgb(147 51 234)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabla del día */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Detalle del día
              <Badge variant="secondary" className="ml-2">{todaySales.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Hora</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Cliente</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>{[1, 2, 3].map((j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}</tr>
                      ))
                    : todaySales.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                            Sin ventas hoy.
                          </td>
                        </tr>
                      )
                    : todaySales.slice().reverse().map((sale) => (
                        <tr key={sale.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-muted-foreground tabular-nums">
                            {format(new Date(sale.created_at), "HH:mm")}
                          </td>
                          <td className="px-4 py-2.5">
                            {(sale.customers as any)?.name ?? <span className="text-muted-foreground">-</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">
                            {formatCurrency(Number(sale.total))}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
