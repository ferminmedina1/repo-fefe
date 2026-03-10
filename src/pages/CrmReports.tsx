import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { CalendarIcon, RefreshCw, Target, TrendingUp, Trophy, Clock, DollarSign, Users } from "lucide-react";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  differenceInDays,
  addDays,
  subMonths,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

const DATE_RANGES = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "180", label: "Últimos 180 días" },
  { value: "365", label: "Últimos 12 meses" },
  { value: "custom", label: "Rango personalizado" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

const normalizeStatus = (value?: string | null) => (value ?? "").trim().toLowerCase();

const isWon = (status?: string | null, stage?: string | null) => {
  const statusValue = normalizeStatus(status);
  const stageValue = normalizeStatus(stage);
  return statusValue.includes("ganad") || statusValue.includes("won") || stageValue.includes("ganad");
};

const isLost = (status?: string | null, stage?: string | null) => {
  const statusValue = normalizeStatus(status);
  const stageValue = normalizeStatus(stage);
  return statusValue.includes("perdid") || statusValue.includes("lost") || stageValue.includes("perdid");
};

export default function CrmReports() {
  const { currentCompany } = useCompany();
  const [dateRangeType, setDateRangeType] = useState("30");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleTimezone, setScheduleTimezone] = useState("America/Argentina/Buenos_Aires");
  const [scheduleRecipients, setScheduleRecipients] = useState("");
  const [payloadMode, setPayloadMode] = useState<"full" | "summary">("full");

  const getDateRange = () => {
    if (dateRangeType === "custom" && customDateRange?.from && customDateRange?.to) {
      return {
        start: startOfDay(customDateRange.from),
        end: endOfDay(customDateRange.to),
      };
    }
    const days = Number(dateRangeType);
    return {
      start: startOfDay(subDays(new Date(), days)),
      end: endOfDay(new Date()),
    };
  };

  const { data: pipelines = [] } = useQuery({
    queryKey: ["crm-pipelines", currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("id, name, stages")
        .eq("company_id", currentCompany?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: reportSchedule, refetch: refetchSchedule, isFetching: scheduleLoading } = useQuery({
    queryKey: ["crm-report-schedule", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from("crm_report_schedules" as any)
        .select("*")
        .eq("company_id", currentCompany.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  useEffect(() => {
    const schedule = reportSchedule as any;
    if (!schedule) return;
    setScheduleEnabled(!!schedule.enabled);
    setScheduleFrequency(schedule.frequency || "weekly");
    setScheduleTime((schedule.send_time || "09:00:00").slice(0, 5));
    setScheduleTimezone(schedule.timezone || "America/Argentina/Buenos_Aires");
    setScheduleRecipients((schedule.recipients || []).join(", "));
    setPayloadMode(schedule.payload_mode || "full");
  }, [reportSchedule]);

  const [companyName, setCompanyName] = useState<string>("");
  if (!currentCompany?.id) throw new Error("Empresa inválida");
      useEffect(() => {
        supabase
          .from("companies")
          .select("name")
          .eq("id", currentCompany.id)
          .maybeSingle()
          .then(({ data }) => setCompanyName(data?.name ?? ""));
      }, [currentCompany?.id]);
  const saveSchedule = useMutation({
    mutationFn: async () => {
      const recipients = scheduleRecipients
        .split(/[\n,;]+/)
        .map((email) => email.trim())
        .filter(Boolean);

      const payload = {
        company_id: currentCompany.id,
        company_name: companyName,
        enabled: scheduleEnabled,
        frequency: scheduleFrequency,
        send_time: scheduleTime.length === 5 ? `${scheduleTime}:00` : scheduleTime,
        timezone: scheduleTimezone,
        recipients,
        payload_mode: payloadMode,
      };

      const { error } = await supabase
        .from("crm_report_schedules" as any)
        .upsert(payload, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      refetchSchedule();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al guardar configuración");
    },
  });

  const sendNow = useMutation({
    mutationFn: async () => {
      const schedule = reportSchedule as any;
      if (!schedule?.id) throw new Error("Guardá la configuración primero");
      const { data, error } = await supabase.functions.invoke("send-crm-report-webhook", {
        body: { scheduleId: schedule.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Reporte enviado"),
    onError: (error: any) => toast.error(error.message || "Error al enviar reporte"),
  });

  const { data: opportunities = [], isFetching, refetch } = useQuery({
    queryKey: ["crm-reports-opportunities", currentCompany?.id, dateRangeType, customDateRange],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { start, end } = getDateRange();
      const { data, error } = await supabase
        .from("crm_opportunities")
        .select("id, pipeline_id, stage, value, status, created_at, close_date, owner_id")
        .eq("company_id", currentCompany.id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });

  // Trend: last 12 months, independent of date range selector
  const { data: trendRaw = [] } = useQuery({
    queryKey: ["crm-trend", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("crm_opportunities")
        .select("id, created_at, status, stage")
        .eq("company_id", currentCompany.id)
        .gte("created_at", startOfDay(subMonths(new Date(), 11)).toISOString());
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Upcoming closes: next 30 days, open only
  const { data: upcomingCloses = [] } = useQuery({
    queryKey: ["crm-upcoming", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("crm_opportunities")
        .select("id, name, value, estimated_close_date, stage, status")
        .eq("company_id", currentCompany.id)
        .gte("estimated_close_date", format(new Date(), "yyyy-MM-dd"))
        .lte("estimated_close_date", format(addDays(new Date(), 30), "yyyy-MM-dd"))
        .order("estimated_close_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data ?? []).filter(
        (o) => !isWon(o.status, o.stage) && !isLost(o.status, o.stage)
      );
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Employees for owner ranking
  const { data: employees = [] } = useQuery({
    queryKey: ["crm-owners", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name")
        .eq("company_id", currentCompany.id)
        .order("first_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const kpis = useMemo(() => {
    const totalCount = opportunities.length;
    const totalValue = opportunities.reduce(
      (sum, opp) => sum + (Number(opp.value) || 0),
      0
    );
    const averageValue = totalCount ? totalValue / totalCount : 0;

    const wonOpps = opportunities.filter((opp) => isWon(opp.status, opp.stage));
    const lostOpps = opportunities.filter((opp) => isLost(opp.status, opp.stage));
    const wonCount = wonOpps.length;
    const lostCount = lostOpps.length;
    const closedCount = wonCount + lostCount;
    const winRate = closedCount ? (wonCount / closedCount) * 100 : 0;
    const wonValue = wonOpps.reduce((sum, opp) => sum + (Number(opp.value) || 0), 0);

    const cycleDays = opportunities
      .filter((opp) => opp.close_date && opp.created_at)
      .map((opp) =>
        differenceInDays(new Date(opp.close_date as string), new Date(opp.created_at as string))
      );
    const avgCycle = cycleDays.length
      ? cycleDays.reduce((sum, days) => sum + days, 0) / cycleDays.length
      : 0;

    return {
      totalCount,
      totalValue,
      averageValue,
      wonCount,
      lostCount,
      winRate,
      wonValue,
      avgCycle,
    };
  }, [opportunities]);

  const pipelineOverview = useMemo(() => {
    return pipelines.map((pipeline: any) => {
      const pipelineOpportunities = opportunities.filter(
        (opp) => opp.pipeline_id === pipeline.id
      );
      const totalValue = pipelineOpportunities.reduce(
        (sum, opp) => sum + (Number(opp.value) || 0),
        0
      );
      return {
        id: pipeline.id,
        name: pipeline.name,
        totalValue,
        count: pipelineOpportunities.length,
      };
    });
  }, [pipelines, opportunities]);

  const pipelineFunnels = useMemo(() => {
    return pipelines.map((pipeline: any) => {
      const pipelineOpportunities = opportunities.filter(
        (opp) => opp.pipeline_id === pipeline.id
      );
      const funnel = (pipeline.stages || []).map((stage: string) => {
        const normalizedStage = (stage ?? "").trim().toLowerCase();
        const stageOpps = pipelineOpportunities.filter(
          (opp) => (opp.stage ?? "").trim().toLowerCase() === normalizedStage
        );
        return {
          stage,
          count: stageOpps.length,
          value: stageOpps.reduce((sum, opp) => sum + (Number(opp.value) || 0), 0),
        };
      });
      return {
        id: pipeline.id,
        name: pipeline.name,
        data: funnel,
      };
    });
  }, [pipelines, opportunities]);

  // Monthly trend data for last 12 months
  const trendData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const month = subMonths(startOfMonth(new Date()), 11 - i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthOpps = trendRaw.filter((o) => {
        const d = new Date(o.created_at!);
        return d >= monthStart && d <= monthEnd;
      });
      return {
        mes: format(month, "MMM yy", { locale: es }),
        nuevas: monthOpps.length,
        ganadas: monthOpps.filter((o) => isWon(o.status, o.stage)).length,
      };
    });
  }, [trendRaw]);

  // Owner ranking derived from current period opportunities
  const ownerRanking = useMemo(() => {
    const map: Record<
      string,
      { name: string; total: number; won: number; wonValue: number }
    > = {};
    opportunities.forEach((opp) => {
      if (!opp.owner_id) return;
      if (!map[opp.owner_id]) {
        const emp = employees.find((e: any) => e.id === opp.owner_id);
        const name = emp
          ? `${emp.first_name ?? ""} ${emp.last_name ?? ""}`.trim() || opp.owner_id
          : opp.owner_id;
        map[opp.owner_id] = { name, total: 0, won: 0, wonValue: 0 };
      }
      map[opp.owner_id].total++;
      if (isWon(opp.status, opp.stage)) {
        map[opp.owner_id].won++;
        map[opp.owner_id].wonValue += Number(opp.value) || 0;
      }
    });
    return Object.values(map)
      .sort((a, b) => b.wonValue - a.wonValue)
      .slice(0, 8);
  }, [opportunities, employees]);

  const dateLabel = useMemo(() => {
    if (dateRangeType !== "custom") {
      const option = DATE_RANGES.find((item) => item.value === dateRangeType);
      return option?.label ?? "";
    }
    if (customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, "dd/MM/yyyy")} - ${format(
        customDateRange.to,
        "dd/MM/yyyy"
      )}`;
    }
    return "Rango personalizado";
  }, [dateRangeType, customDateRange]);

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Reportes automáticos CRM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Activar reportes automáticos</Label>
                <p className="text-xs text-muted-foreground">
                  Envía reportes periódicos al endpoint configurado internamente.
                </p>
              </div>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select value={scheduleFrequency} onValueChange={(value) => setScheduleFrequency(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hora de envío</Label>
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Zona horaria</Label>
                <Input value={scheduleTimezone} onChange={(e) => setScheduleTimezone(e.target.value)} />
                <p className="text-xs text-muted-foreground">Ej: America/Argentina/Buenos_Aires</p>
              </div>
              <div className="space-y-2">
                <Label>Modo de payload</Label>
                <Select value={payloadMode} onValueChange={(value) => setPayloadMode(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Completo</SelectItem>
                    <SelectItem value="summary">Resumido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Emails destinatarios</Label>
              <Input
                value={scheduleRecipients}
                onChange={(e) => setScheduleRecipients(e.target.value)}
                placeholder="email1@empresa.com, email2@empresa.com"
              />
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => saveSchedule.mutate()} disabled={saveSchedule.isPending || scheduleLoading}>
                Guardar configuración
              </Button>
              <Button variant="outline" onClick={() => sendNow.mutate()} disabled={sendNow.isPending || !(reportSchedule as any)?.id}>
                Enviar ahora
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Reportes CRM</h1>
            <p className="text-sm text-muted-foreground">
              Dashboards de KPIs y embudos por pipeline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={dateRangeType} onValueChange={setDateRangeType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Rango" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    dateRangeType !== "custom" && "opacity-70"
                  )}
                  disabled={dateRangeType !== "custom"}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={customDateRange}
                  onSelect={setCustomDateRange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* KPI cards — 5 cards */}
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total oportunidades</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.totalCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{dateLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpis.totalValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Prom. {formatCurrency(kpis.averageValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valor ganado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(kpis.wonValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpis.wonCount} oportunidades cerradas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de cierre</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.winRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ganadas {kpis.wonCount} · Perdidas {kpis.lostCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ciclo promedio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpis.avgCycle.toFixed(1)}
                <span className="text-base font-normal text-muted-foreground ml-1">días</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Basado en oportunidades cerradas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tendencia mensual + Próximos cierres */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Tendencia mensual */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencia mensual</CardTitle>
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
            </CardHeader>
            <CardContent className="h-72">
              {trendData.some((d) => d.nuevas > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip labelStyle={{ fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="nuevas"
                      name="Nuevas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ganadas"
                      name="Ganadas"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Sin datos en los últimos 12 meses.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Próximos cierres */}
          <Card>
            <CardHeader>
              <CardTitle>Próximos cierres</CardTitle>
              <p className="text-xs text-muted-foreground">Oportunidades abiertas en los próximos 30 días</p>
            </CardHeader>
            <CardContent>
              {upcomingCloses.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                  Sin cierres próximos.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingCloses.map((opp) => {
                    const daysLeft = differenceInDays(
                      new Date(opp.estimated_close_date as string + "T00:00:00"),
                      new Date()
                    );
                    const badgeClass =
                      daysLeft <= 0
                        ? "bg-red-100 text-red-700"
                        : daysLeft <= 7
                        ? "bg-orange-100 text-orange-700"
                        : "bg-muted text-muted-foreground";
                    return (
                      <div
                        key={opp.id}
                        className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{opp.name}</p>
                          {opp.stage && (
                            <p className="text-xs text-muted-foreground">{opp.stage}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {opp.value != null && (
                            <span className="text-xs font-medium text-primary">
                              {formatCurrency(opp.value)}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}
                          >
                            {daysLeft <= 0
                              ? "Hoy"
                              : daysLeft === 1
                              ? "1 día"
                              : `${daysLeft} días`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ranking de responsables */}
        {ownerRanking.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Ranking de responsables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4 font-medium">#</th>
                      <th className="text-left py-2 pr-4 font-medium">Responsable</th>
                      <th className="text-right py-2 pr-4 font-medium">Total</th>
                      <th className="text-right py-2 pr-4 font-medium">Ganadas</th>
                      <th className="text-right py-2 font-medium">Valor ganado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerRanking.map((owner, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-4 text-muted-foreground font-medium">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium">{owner.name}</td>
                        <td className="py-2 pr-4 text-right text-muted-foreground">{owner.total}</td>
                        <td className="py-2 pr-4 text-right">
                          <span className="text-green-600 font-medium">{owner.won}</span>
                        </td>
                        <td className="py-2 text-right font-semibold text-primary">
                          {formatCurrency(owner.wonValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Valor por pipeline */}
        <Card>
          <CardHeader>
            <CardTitle>Valor por pipeline</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {pipelineOverview.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineOverview} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="totalValue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">Sin datos.</div>
            )}
          </CardContent>
        </Card>

        {/* Embudos por pipeline */}
        <div className="grid gap-4 lg:grid-cols-2">
          {pipelineFunnels.map((pipeline) => (
            <Card key={pipeline.id}>
              <CardHeader>
                <CardTitle>Embudo — {pipeline.name}</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {pipeline.data.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={pipeline.data}
                      layout="vertical"
                      margin={{ top: 10, right: 16, left: 32, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="stage" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === "value" ? formatCurrency(value) : value
                        }
                        labelStyle={{ fontSize: 12 }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-muted-foreground">Sin datos para este pipeline.</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
