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
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval,
  isSameDay, startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, Calendar, ShoppingCart, BarChart3, Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);

type Breakdown = "day" | "product" | "customer";

const PAGE_SIZE = 20;

export default function MonthlySalesAnalytics() {
  const { currentCompany } = useCompany();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canView = hasPermission("sales", "view");
  const [breakdown, setBreakdown] = useState<Breakdown>("day");
  const [customerFilter, setCustomerFilter] = useState("");
  const [page, setPage] = useState(0);

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const { data: currentSales = [], isLoading } = useQuery({
    queryKey: ["analytics-monthly-sales-current", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, total, created_at, customer_id, customers(name), sale_items(product_id, product_name, subtotal, quantity)")
        .eq("company_id", currentCompany!.id)
        .gte("created_at", currentMonthStart.toISOString())
        .lte("created_at", currentMonthEnd.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: canView && !!currentCompany?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: lastMonthTotal = 0 } = useQuery({
    queryKey: ["analytics-monthly-sales-last", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("total")
        .eq("company_id", currentCompany!.id)
        .gte("created_at", lastMonthStart.toISOString())
        .lte("created_at", lastMonthEnd.toISOString());
      if (error) throw error;
      return (data ?? []).reduce((acc, s) => acc + Number(s.total), 0);
    },
    enabled: canView && !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
  });

  const currentTotal = useMemo(
    () => currentSales.reduce((acc, s) => acc + Number(s.total), 0),
    [currentSales]
  );
  const percentageChange = lastMonthTotal > 0
    ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100
    : currentTotal > 0 ? 100 : 0;
  const isPositive = percentageChange >= 0;
  const daysElapsed = now.getDate();
  const avgPerDay = daysElapsed > 0 ? currentTotal / daysElapsed : 0;

  const filteredSales = useMemo(() => {
    if (!customerFilter.trim()) return currentSales;
    const q = customerFilter.toLowerCase();
    return currentSales.filter(s =>
      ((s.customers as any)?.name ?? "").toLowerCase().includes(q)
    );
  }, [currentSales, customerFilter]);

  useEffect(() => { setPage(0); }, [customerFilter]);

  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE);
  const paginatedSales = useMemo(
    () => filteredSales.slice().reverse().slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredSales, page]
  );

  function exportCSV() {
    const rows = filteredSales.slice().reverse().map(s => ({
      Fecha: format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: es }),
      Cliente: (s.customers as any)?.name ?? "-",
      Total: Number(s.total),
    }));
    const csv = [
      "Fecha,Cliente,Total",
      ...rows.map(r => `"${r.Fecha}","${r.Cliente}",${r.Total}`),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas-${format(now, "yyyy-MM")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const byDayData = useMemo(() => {
    const days = eachDayOfInterval({ start: currentMonthStart, end: startOfDay(now) });
    return days.map((day) => ({
      dia: format(day, "d MMM", { locale: es }),
      ventas: currentSales
        .filter((s) => isSameDay(new Date(s.created_at), day))
        .reduce((sum, s) => sum + Number(s.total), 0),
    }));
  }, [currentSales]);

  const byProductData = useMemo(() => {
    const map = new Map<string, { nombre: string; ventas: number; unidades: number }>();
    currentSales.forEach((sale) => {
      (sale.sale_items as any[])?.forEach((item) => {
        const key = item.product_name || "Sin nombre";
        const existing = map.get(key) ?? { nombre: key, ventas: 0, unidades: 0 };
        map.set(key, {
          nombre: key,
          ventas: existing.ventas + Number(item.subtotal),
          unidades: existing.unidades + Number(item.quantity),
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.ventas - a.ventas).slice(0, 10);
  }, [currentSales]);

  const byCustomerData = useMemo(() => {
    const map = new Map<string, { cliente: string; ventas: number; transacciones: number }>();
    currentSales.forEach((sale) => {
      const name = (sale.customers as any)?.name ?? "Sin nombre";
      const existing = map.get(name) ?? { cliente: name, ventas: 0, transacciones: 0 };
      map.set(name, {
        cliente: name,
        ventas: existing.ventas + Number(sale.total),
        transacciones: existing.transacciones + 1,
      });
    });
    return Array.from(map.values()).sort((a, b) => b.ventas - a.ventas).slice(0, 10);
  }, [currentSales]);

  const chartData = breakdown === "day" ? byDayData
    : breakdown === "product" ? byProductData
    : byCustomerData;
  const chartKey = breakdown === "day" ? "dia" : breakdown === "product" ? "nombre" : "cliente";

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ventas del Mes</h1>
            <p className="text-sm text-muted-foreground">
              {format(currentMonthStart, "MMMM yyyy", { locale: es })} · detalle y análisis
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Mes actual",
              value: isLoading ? null : formatCurrency(currentTotal),
              icon: Calendar,
              color: "blue",
              extra: (
                <Badge
                  variant="outline"
                  className={`text-xs w-fit flex items-center gap-0.5 ${isPositive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                >
                  {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(percentageChange).toFixed(1)}%
                </Badge>
              ),
            },
            {
              label: "Mes anterior",
              value: formatCurrency(lastMonthTotal),
              icon: BarChart3,
              color: "gray",
            },
            {
              label: "Promedio diario",
              value: formatCurrency(avgPerDay),
              icon: TrendingUp,
              color: "green",
              sub: `${daysElapsed} días transcurridos`,
            },
            {
              label: "Transacciones",
              value: String(currentSales.length),
              icon: ShoppingCart,
              color: "purple",
              sub: `${currentSales.length > 0 ? formatCurrency(currentTotal / currentSales.length) : "-"} ticket promedio`,
            },
          ].map(({ label, value, icon: Icon, color, extra, sub }) => (
            <Card key={label} className={`border-l-4 border-${color}-500/30`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-1">
                {value == null ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <p className="text-xl md:text-2xl font-bold">{value}</p>
                )}
                {extra}
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Breakdown chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Breakdown</CardTitle>
            <div className="flex flex-wrap justify-end gap-1">
              {(["day", "product", "customer"] as Breakdown[]).map((b) => (
                <Button
                  key={b}
                  variant={breakdown === b ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setBreakdown(b)}
                >
                  {b === "day" ? "Por día" : b === "product" ? "Por producto" : "Por cliente"}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout={breakdown === "day" ? "horizontal" : "vertical"}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  {breakdown === "day" ? (
                    <>
                      <XAxis dataKey={chartKey} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    </>
                  ) : (
                    <>
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey={chartKey} type="category" width={120} tick={{ fontSize: 11 }} />
                    </>
                  )}
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(v: number) => [formatCurrency(v), "Ventas"]}
                  />
                  <Bar dataKey="ventas" fill="rgb(59 130 246)" radius={breakdown === "day" ? [4, 4, 0, 0] : [0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabla de ventas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">
              Ventas del mes
              <Badge variant="secondary" className="ml-2">{filteredSales.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por cliente..."
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="pl-8 h-8 text-sm w-36 sm:w-48"
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportCSV} disabled={filteredSales.length === 0}>
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Fecha</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Cliente</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <tr key={i}>
                          {[1, 2, 3].map((j) => (
                            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    : paginatedSales.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                            {customerFilter ? "No hay ventas para ese cliente." : "Sin ventas este mes."}
                          </td>
                        </tr>
                      )
                    : paginatedSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 text-sm">
                            {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                          </td>
                          <td className="px-4 py-2.5 text-sm">
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Página {page + 1} de {totalPages} · {filteredSales.length} ventas
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
