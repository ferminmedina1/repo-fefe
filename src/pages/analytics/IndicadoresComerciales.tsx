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
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  format, startOfMonth, endOfMonth, startOfDay, endOfDay,
  subMonths, eachDayOfInterval, isSameDay, getHours, differenceInDays,
} from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Calendar, TrendingUp,
  DollarSign, Activity, AlertTriangle, Clock, ChevronRight, Calculator,
  ShoppingCart,
} from "lucide-react";
import { useMemo } from "react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);

const COST_FACTOR = 0.6;

export default function IndicadoresComerciales() {
  const { currentCompany } = useCompany();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canView = hasPermission("sales", "view");

  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // ── Ventas del mes actual (con items para margen)
  const { data: currentSales = [], isLoading: loadingCurrent } = useQuery({
    queryKey: ["indicadores-current-sales", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, total, created_at, sale_items(product_id, product_name, subtotal, quantity)")
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

  // ── Ventas mes anterior
  const { data: lastMonthTotal = 0, isLoading: loadingLast } = useQuery({
    queryKey: ["indicadores-last-sales", currentCompany?.id],
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

  // ── Ventas hoy
  const { data: todaySales = [], isLoading: loadingToday } = useQuery({
    queryKey: ["indicadores-today-sales", currentCompany?.id, format(now, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, total, created_at, customers(name)")
        .eq("company_id", currentCompany!.id)
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: canView && !!currentCompany?.id,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // ── Cuentas por cobrar
  const { data: movements = [], isLoading: loadingReceivables } = useQuery({
    queryKey: ["indicadores-receivables", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_account_movements")
        .select("id, debit_amount, credit_amount, status, due_date, created_at, customer_id, customers(name)")
        .eq("company_id", currentCompany!.id)
        .eq("movement_type", "sale")
        .in("status", ["pending", "partial"])
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: canView && !!currentCompany?.id,
    staleTime: 2 * 60 * 1000,
  });

  const isLoading = loadingCurrent || loadingLast;

  // ── KPIs: Ventas del Mes
  const ventasKpis = useMemo(() => {
    const currentTotal = currentSales.reduce((acc, s) => acc + Number(s.total), 0);
    const pctChange = lastMonthTotal > 0
      ? ((currentTotal - lastMonthTotal) / lastMonthTotal) * 100
      : currentTotal > 0 ? 100 : 0;
    const daysElapsed = now.getDate();
    return {
      currentTotal,
      pctChange,
      isPositive: pctChange >= 0,
      avgPerDay: daysElapsed > 0 ? currentTotal / daysElapsed : 0,
      txCount: currentSales.length,
    };
  }, [currentSales, lastMonthTotal]);

  // ── KPIs: Margen Bruto
  const margenKpis = useMemo(() => {
    const ventas = currentSales.reduce((acc, s) => acc + Number(s.total), 0);
    let costo = 0;
    currentSales.forEach((s) => {
      (s.sale_items as any[])?.forEach((item) => { costo += Number(item.subtotal) * COST_FACTOR; });
    });
    const margen = ventas - costo;
    const pct = ventas > 0 ? (margen / ventas) * 100 : 0;
    return { ventas, costo, margen, pct };
  }, [currentSales]);

  // ── KPIs: Cuentas por Cobrar
  const receivablesKpis = useMemo(() => {
    const enriched = movements.map((m) => ({
      ...m,
      daysOverdue: m.due_date ? differenceInDays(now, new Date(m.due_date)) : 0,
      amount: Number(m.debit_amount) - Number((m as any).credit_amount ?? 0),
      customerName: (m.customers as any)?.name ?? "Sin nombre",
    }));
    const total = enriched.reduce((acc, m) => acc + m.amount, 0);
    const overdueItems = enriched.filter((m) => m.daysOverdue > 0);
    const overdueTotal = overdueItems.reduce((acc, m) => acc + m.amount, 0);
    const pct = total > 0 ? (overdueTotal / total) * 100 : 0;
    return { total, overdueTotal, pct, overdueCount: overdueItems.length, overdueItems: overdueItems.slice(0, 5) };
  }, [movements]);

  // ── KPIs: Ventas Hoy
  const todayKpis = useMemo(() => {
    const total = todaySales.reduce((acc, s) => acc + Number(s.total), 0);
    const count = todaySales.length;
    return { total, count, avg: count > 0 ? total / count : 0 };
  }, [todaySales]);

  // ── Charts
  const byDayData = useMemo(() => {
    const days = eachDayOfInterval({ start: currentMonthStart, end: startOfDay(now) });
    return days.map((day) => ({
      dia: format(day, "d", { locale: es }),
      ventas: currentSales
        .filter((s) => isSameDay(new Date(s.created_at), day))
        .reduce((sum, s) => sum + Number(s.total), 0),
    }));
  }, [currentSales]);

  const byHour = useMemo(() => {
    const currentHour = getHours(now);
    return Array.from({ length: currentHour + 1 }, (_, h) => ({
      hora: `${String(h).padStart(2, "0")}h`,
      ventas: todaySales
        .filter((s) => getHours(new Date(s.created_at)) === h)
        .reduce((acc, s) => acc + Number(s.total), 0),
    }));
  }, [todaySales]);

  return (
    <Layout>
      <div className="space-y-6 md:space-y-8">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")} className="shrink-0 mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold">Indicadores Comerciales</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {format(currentMonthStart, "MMMM yyyy", { locale: es })} · vista consolidada
            </p>
          </div>
        </div>

        {/* ── Resumen — 4 KPI cards ─────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">

          <Card
            className="border-l-4 border-blue-500/30 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/analytics/monthly-sales")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Ventas del Mes</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-1">
              {loadingCurrent ? <Skeleton className="h-7 w-28" /> : (
                <p className="text-xl md:text-2xl font-bold">{formatCurrency(ventasKpis.currentTotal)}</p>
              )}
              {!loadingCurrent && (
                <Badge
                  variant="outline"
                  className={`text-xs w-fit flex items-center gap-0.5 ${ventasKpis.isPositive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}
                >
                  {ventasKpis.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(ventasKpis.pctChange).toFixed(1)}%
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card
            className="border-l-4 border-green-500/30 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/analytics/gross-margin")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Margen Bruto</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-1">
              {loadingCurrent ? <Skeleton className="h-7 w-28" /> : (
                <p className="text-xl md:text-2xl font-bold">{formatCurrency(margenKpis.margen)}</p>
              )}
              {!loadingCurrent && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 w-fit">
                  {margenKpis.pct.toFixed(1)}% margen
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card
            className={`border-l-4 cursor-pointer hover:shadow-md transition-shadow ${receivablesKpis.overdueCount > 0 ? "border-orange-500/30" : "border-blue-500/30"}`}
            onClick={() => navigate("/analytics/accounts-receivable")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Por Cobrar</CardTitle>
              <div className="flex items-center gap-1">
                <div className={`p-1.5 rounded-lg ${receivablesKpis.overdueCount > 0 ? "bg-orange-500/10" : "bg-blue-500/10"}`}>
                  {receivablesKpis.overdueCount > 0
                    ? <AlertTriangle className="w-4 h-4 text-orange-600" />
                    : <DollarSign className="w-4 h-4 text-blue-600" />}
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-1">
              {loadingReceivables ? <Skeleton className="h-7 w-28" /> : (
                <p className="text-xl md:text-2xl font-bold">{formatCurrency(receivablesKpis.total)}</p>
              )}
              {!loadingReceivables && receivablesKpis.overdueCount > 0 && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 w-fit">
                  {receivablesKpis.overdueCount} vencida{receivablesKpis.overdueCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card
            className="border-l-4 border-purple-500/30 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/analytics/daily-sales")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Ventas Hoy</CardTitle>
              <div className="flex items-center gap-1">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-1">
              {loadingToday ? <Skeleton className="h-7 w-28" /> : (
                <p className="text-xl md:text-2xl font-bold">{formatCurrency(todayKpis.total)}</p>
              )}
              {!loadingToday && (
                <p className="text-xs text-muted-foreground">{todayKpis.count} transacciones · 60s</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sección 1: Ventas del Mes ───────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              Ventas del Mes
            </h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0" onClick={() => navigate("/analytics/monthly-sales")}>
              Ver detalle <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="grid gap-3 md:gap-4 md:grid-cols-3">
            {/* Comparativa numérica */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comparativa mensual</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium capitalize">{format(currentMonthStart, "MMM yyyy", { locale: es })}</span>
                    {isLoading ? <Skeleton className="h-5 w-20" /> : (
                      <span className="text-lg font-bold">{formatCurrency(ventasKpis.currentTotal)}</span>
                    )}
                  </div>
                  <div className="flex justify-between items-baseline text-muted-foreground">
                    <span className="text-sm capitalize">{format(lastMonthStart, "MMM yyyy", { locale: es })}</span>
                    {loadingLast ? <Skeleton className="h-4 w-20" /> : (
                      <span className="text-sm font-medium">{formatCurrency(lastMonthTotal)}</span>
                    )}
                  </div>
                  {!isLoading && (
                    <div className={`flex items-center gap-1 text-sm font-semibold pt-1 ${ventasKpis.isPositive ? "text-green-600" : "text-red-600"}`}>
                      {ventasKpis.isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(ventasKpis.pctChange).toFixed(1)}% vs mes anterior
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Promedio diario</span>
                    <span className="font-medium">{isLoading ? "-" : formatCurrency(ventasKpis.avgPerDay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transacciones</span>
                    <span className="font-medium">{isLoading ? "-" : ventasKpis.txCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket promedio</span>
                    <span className="font-medium">{isLoading || ventasKpis.txCount === 0 ? "-" : formatCurrency(ventasKpis.currentTotal / ventasKpis.txCount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart por día */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Evolución diaria del mes</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                {loadingCurrent ? <Skeleton className="h-44 w-full" /> : (
                  <ResponsiveContainer width="100%" height={176}>
                    <BarChart data={byDayData} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={42} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(v: number) => [formatCurrency(v), "Ventas"]}
                      />
                      <Bar dataKey="ventas" fill="rgb(59 130 246)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Sección 2: Margen Bruto ─────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              Margen Bruto
            </h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0" onClick={() => navigate("/analytics/gross-margin")}>
              Ver detalle <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30 text-xs text-muted-foreground">
            <Calculator className="w-4 h-4 shrink-0" />
            <span>
              <strong className="text-foreground">Margen Bruto</strong> = Ventas − Costo estimado
              <span className="ml-1">(costo al {Math.round(COST_FACTOR * 100)}% del precio de venta)</span>
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Ventas del mes", value: formatCurrency(margenKpis.ventas), color: "blue", icon: DollarSign },
              { label: "Costo estimado", value: formatCurrency(margenKpis.costo), color: "slate", icon: Calculator },
              { label: "Ganancia bruta", value: formatCurrency(margenKpis.margen), color: "green", icon: TrendingUp },
              {
                label: "Rentabilidad",
                value: `${margenKpis.pct.toFixed(1)}%`,
                color: margenKpis.pct >= 30 ? "green" : margenKpis.pct >= 15 ? "yellow" : "red",
                icon: TrendingUp,
                sub: margenKpis.pct >= 30 ? "Alta" : margenKpis.pct >= 15 ? "Media" : "Baja",
              },
            ].map(({ label, value, color, icon: Icon, sub }) => (
              <Card key={label} className={`border-l-4 border-${color}-500/30`}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                  <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
                    <Icon className={`w-3.5 h-3.5 text-${color}-600`} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-0.5">
                  {loadingCurrent ? <Skeleton className="h-6 w-20" /> : <p className="text-lg md:text-xl font-bold">{value}</p>}
                  {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Sección 3: Por Cobrar ───────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${receivablesKpis.overdueCount > 0 ? "bg-orange-500/10" : "bg-blue-500/10"}`}>
                {receivablesKpis.overdueCount > 0
                  ? <AlertTriangle className="w-4 h-4 text-orange-600" />
                  : <DollarSign className="w-4 h-4 text-blue-600" />}
              </div>
              Por Cobrar
            </h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0" onClick={() => navigate("/analytics/accounts-receivable")}>
              Ver detalle <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          {!loadingReceivables && receivablesKpis.overdueCount > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50/50">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="text-sm">
                <span className="font-semibold text-red-700">
                  {receivablesKpis.overdueCount} factura{receivablesKpis.overdueCount !== 1 ? "s" : ""} vencida{receivablesKpis.overdueCount !== 1 ? "s" : ""}
                </span>
                <span className="text-red-600"> por {formatCurrency(receivablesKpis.overdueTotal)} — requieren atención.</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { label: "Total pendiente", value: formatCurrency(receivablesKpis.total), color: "blue" },
              {
                label: "Total vencido",
                value: formatCurrency(receivablesKpis.overdueTotal),
                color: receivablesKpis.overdueCount > 0 ? "red" : "green",
              },
              {
                label: "% Vencido",
                value: `${receivablesKpis.pct.toFixed(1)}%`,
                color: receivablesKpis.pct > 30 ? "red" : receivablesKpis.pct > 10 ? "orange" : "green",
              },
            ].map(({ label, value, color }) => (
              <Card key={label} className={`border-l-4 border-${color}-500/30`}>
                <CardContent className="px-4 py-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {loadingReceivables
                    ? <Skeleton className="h-6 w-20" />
                    : <p className="text-base md:text-lg font-bold">{value}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          {!loadingReceivables && receivablesKpis.overdueItems.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Facturas vencidas más antiguas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {receivablesKpis.overdueItems.map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.customerName}</p>
                        <p className="text-xs text-muted-foreground">
                          Venció: {m.due_date ? format(new Date(m.due_date), "dd/MM/yy") : "-"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4 space-y-0.5">
                        <p className="text-sm font-semibold font-mono">{formatCurrency(m.amount)}</p>
                        <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          {m.daysOverdue}d vencida
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!loadingReceivables && receivablesKpis.overdueCount === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              ✅ Sin facturas vencidas. Todas las cuentas al día.
            </p>
          )}
        </section>

        {/* ── Sección 4: Ventas Hoy ───────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10">
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
              Ventas Hoy
              <Badge variant="outline" className="text-[10px] md:text-xs font-normal">
                <span className="hidden sm:inline">Auto-refresh · </span>60s
              </Badge>
            </h2>
            <Button variant="ghost" size="sm" className="text-xs gap-1 shrink-0" onClick={() => navigate("/analytics/daily-sales")}>
              Ver detalle <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { label: "Total del día", value: formatCurrency(todayKpis.total), color: "purple", icon: DollarSign },
              { label: "Transacciones", value: String(todayKpis.count), color: "blue", icon: ShoppingCart },
              { label: "Ticket promedio", value: formatCurrency(todayKpis.avg), color: "green", icon: Activity },
            ].map(({ label, value, color, icon: Icon }) => (
              <Card key={label} className={`border-l-4 border-${color}-500/30`}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground hidden sm:block">{label}</CardTitle>
                  <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
                    <Icon className={`w-3.5 h-3.5 text-${color}-600`} />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-0.5">
                  {loadingToday ? <Skeleton className="h-6 w-20" /> : <p className="text-base md:text-xl font-bold">{value}</p>}
                  <p className="text-xs text-muted-foreground sm:hidden">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Ventas por hora
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {loadingToday ? (
                <Skeleton className="h-44 w-full" />
              ) : byHour.every((h) => h.ventas === 0) ? (
                <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">
                  Sin ventas registradas hoy.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={176}>
                  <BarChart data={byHour} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={42} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(v: number) => [formatCurrency(v), "Ventas"]}
                    />
                    <Bar dataKey="ventas" fill="rgb(147 51 234)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </section>

      </div>
    </Layout>
  );
}
