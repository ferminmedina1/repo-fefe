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
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  format, startOfMonth, endOfMonth, subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, TrendingUp, DollarSign, Percent, Calculator } from "lucide-react";
import { useMemo } from "react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(v);

// Cost estimation factor (same as dashboard)
const COST_FACTOR = 0.6;

export default function GrossMarginAnalytics() {
  const { currentCompany } = useCompany();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const canView = hasPermission("sales", "view");

  const now = new Date();

  // Current month sales + items
  const { data: currentMonthData, isLoading: loadingCurrent } = useQuery({
    queryKey: ["analytics-gm-current", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("total, sale_items(product_id, product_name, subtotal, quantity, unit_price)")
        .eq("company_id", currentCompany!.id)
        .gte("created_at", startOfMonth(now).toISOString())
        .lte("created_at", endOfMonth(now).toISOString());
      if (error) throw error;
      return data ?? [];
    },
    enabled: canView && !!currentCompany?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Last 6 months trend (query each month independently via a single wide query)
  const { data: trendRaw = [], isLoading: loadingTrend } = useQuery({
    queryKey: ["analytics-gm-trend", currentCompany?.id],
    queryFn: async () => {
      const start = startOfMonth(subMonths(now, 5));
      const { data, error } = await supabase
        .from("sales")
        .select("total, created_at, sale_items(subtotal)")
        .eq("company_id", currentCompany!.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", endOfMonth(now).toISOString());
      if (error) throw error;
      return data ?? [];
    },
    enabled: canView && !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingCurrent || loadingTrend;

  // KPIs
  const kpis = useMemo(() => {
    const ventas = (currentMonthData ?? []).reduce((acc, s) => acc + Number(s.total), 0);
    let costo = 0;
    (currentMonthData ?? []).forEach((s) => {
      (s.sale_items as any[])?.forEach((item) => {
        costo += Number(item.subtotal) * COST_FACTOR;
      });
    });
    const margen = ventas - costo;
    const pct = ventas > 0 ? (margen / ventas) * 100 : 0;
    return { ventas, costo, margen, pct };
  }, [currentMonthData]);

  // Monthly trend (last 6 months)
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(startOfMonth(now), 5 - i);
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const monthSales = trendRaw.filter((s) => {
        const d = new Date(s.created_at);
        return d >= mStart && d <= mEnd;
      });
      const ventas = monthSales.reduce((acc, s) => acc + Number(s.total), 0);
      let costo = 0;
      monthSales.forEach((s) => {
        (s.sale_items as any[])?.forEach((item) => {
          costo += Number(item.subtotal) * COST_FACTOR;
        });
      });
      const margen = ventas - costo;
      return {
        mes: format(month, "MMM yy", { locale: es }),
        ventas,
        margen,
        pct: ventas > 0 ? Math.round((margen / ventas) * 100) : 0,
      };
    });
  }, [trendRaw]);

  // By product
  const byProduct = useMemo(() => {
    const map = new Map<string, { producto: string; ventas: number; costo: number }>();
    (currentMonthData ?? []).forEach((s) => {
      (s.sale_items as any[])?.forEach((item) => {
        const key = item.product_name || "Sin nombre";
        const existing = map.get(key) ?? { producto: key, ventas: 0, costo: 0 };
        map.set(key, {
          producto: key,
          ventas: existing.ventas + Number(item.subtotal),
          costo: existing.costo + Number(item.subtotal) * COST_FACTOR,
        });
      });
    });
    return Array.from(map.values())
      .map((p) => ({
        ...p,
        margen: p.ventas - p.costo,
        pct: p.ventas > 0 ? ((p.ventas - p.costo) / p.ventas) * 100 : 0,
      }))
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 10);
  }, [currentMonthData]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/app")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Margen Bruto</h1>
            <p className="text-sm text-muted-foreground">
              {format(startOfMonth(now), "MMMM yyyy", { locale: es })} · rentabilidad y tendencia
            </p>
          </div>
        </div>

        {/* Formula card */}
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
          <Calculator className="w-4 h-4 shrink-0" />
          <span>
            <strong className="text-foreground">Margen Bruto</strong> = Ventas − Costo de productos vendidos
            <span className="ml-2 text-xs">(costo estimado al {Math.round(COST_FACTOR * 100)}% del precio de venta)</span>
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Ventas del mes", value: formatCurrency(kpis.ventas), icon: DollarSign, color: "blue" },
            { label: "Costo estimado", value: formatCurrency(kpis.costo), icon: TrendingUp, color: "gray" },
            { label: "Margen bruto", value: formatCurrency(kpis.margen), icon: TrendingUp, color: "green" },
            {
              label: "Margen %",
              value: `${kpis.pct.toFixed(1)}%`,
              icon: Percent,
              color: kpis.pct >= 30 ? "green" : kpis.pct >= 15 ? "yellow" : "red",
              sub: kpis.pct >= 30 ? "Rentabilidad alta" : kpis.pct >= 15 ? "Rentabilidad media" : "Rentabilidad baja",
            },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <Card key={label} className={`border-l-4 border-${color}-500/30`}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
                <div className={`p-1.5 rounded-lg bg-${color}-500/10`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-1">
                {isLoading ? <Skeleton className="h-8 w-28" /> : <p className="text-xl md:text-2xl font-bold">{value}</p>}
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trend chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendencia — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(v: number, name: string) => [
                      name === "pct" ? `${v}%` : formatCurrency(v),
                      name === "ventas" ? "Ventas" : name === "margen" ? "Margen" : "Margen %",
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="ventas" stroke="rgb(59 130 246)" strokeWidth={2} dot={false} name="ventas" />
                  <Line type="monotone" dataKey="margen" stroke="rgb(34 197 94)" strokeWidth={2} dot={false} name="margen" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By product table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Margen por producto
              <Badge variant="secondary" className="ml-2">{byProduct.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted-foreground">Producto</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">Ventas</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Costo est.</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">Margen $</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-xs uppercase tracking-wide text-muted-foreground">Margen %</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>{[1, 2, 3, 4, 5].map((j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4" /></td>)}</tr>
                      ))
                    : byProduct.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Sin datos este mes.</td></tr>
                      )
                    : byProduct.map((p) => (
                        <tr key={p.producto} className="hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-medium truncate max-w-[200px]">{p.producto}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(p.ventas)}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-muted-foreground hidden md:table-cell">{formatCurrency(p.costo)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-700">{formatCurrency(p.margen)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <Badge
                              variant="secondary"
                              className={`text-xs ${p.pct >= 30 ? "bg-green-100 text-green-700" : p.pct >= 15 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}
                            >
                              {p.pct.toFixed(1)}%
                            </Badge>
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
