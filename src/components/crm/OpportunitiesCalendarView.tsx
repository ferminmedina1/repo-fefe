import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OpportunityDrawer } from "./OpportunityDrawer";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";

interface CalendarOpportunity {
  id: string;
  name: string;
  value: number | null;
  stage: string | null;
  status: string | null;
  estimated_close_date: string | null;
  last_activity_at: string | null;
  probability: number | null;
  pipeline_id: string | null;
  customers?: { name: string } | null;
  [key: string]: unknown;
}

interface Props {
  companyId: string;
  search?: string;
  filters?: {
    pipelineId?: string;
    ownerId?: string;
    status?: string;
    stageId?: string;
  };
}

function getCalendarWeeks(date: Date): Date[][] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  let current = start;
  while (current <= end) {
    const week = Array.from({ length: 7 }, (_, i) => addDays(current, i));
    weeks.push(week);
    current = addDays(current, 7);
  }
  return weeks;
}

function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const MONTH_DAY_HEADERS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getPillClass(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("ganad") || s === "won")
    return "bg-green-100 text-green-800 border border-green-200";
  if (s.includes("perdid") || s === "lost")
    return "bg-red-100 text-red-800 border border-red-200";
  return "bg-primary/10 text-primary border border-primary/20";
}

const formatCurrency = (value: number | null) => {
  if (value == null) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
};

export function OpportunitiesCalendarView({ companyId, search, filters }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month");
  const [dateField, setDateField] = useState<"estimated_close_date" | "last_activity_at">(
    "estimated_close_date"
  );
  const [editingOpportunity, setEditingOpportunity] = useState<CalendarOpportunity | null>(null);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (calendarMode === "month") {
      return {
        rangeStart: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
        rangeEnd: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
      };
    }
    return {
      rangeStart: startOfWeek(currentDate, { weekStartsOn: 1 }),
      rangeEnd: endOfWeek(currentDate, { weekStartsOn: 1 }),
    };
  }, [currentDate, calendarMode]);

  const fromStr = format(rangeStart, "yyyy-MM-dd");
  const toStr = format(rangeEnd, "yyyy-MM-dd");

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["crm-calendar-opps", companyId, fromStr, toStr, dateField, search, filters],
    queryFn: async () => {
      let q = supabase
        .from("crm_opportunities")
        .select(
          "id, name, value, stage, status, estimated_close_date, last_activity_at, probability, pipeline_id, customers(name)"
        )
        .eq("company_id", companyId);

      if (dateField === "estimated_close_date") {
        q = q.gte("estimated_close_date", fromStr).lte("estimated_close_date", toStr);
      } else {
        q = q
          .gte("last_activity_at", fromStr + "T00:00:00")
          .lte("last_activity_at", toStr + "T23:59:59");
      }

      if (filters?.pipelineId) q = q.eq("pipeline_id", filters.pipelineId);
      if (filters?.ownerId) q = q.eq("owner_id", filters.ownerId);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.stageId) q = q.eq("stage", filters.stageId);
      if (search) q = q.ilike("name", `%${search}%`);

      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as CalendarOpportunity[];
    },
    enabled: !!companyId,
  });

  const oppsByDate = useMemo(() => {
    const map: Record<string, CalendarOpportunity[]> = {};
    opportunities.forEach((opp) => {
      const rawDate = opp[dateField] as string | null | undefined;
      if (rawDate) {
        const key = rawDate.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(opp);
      }
    });
    return map;
  }, [opportunities, dateField]);

  const navigatePrev = () => {
    if (calendarMode === "month") setCurrentDate((d) => subMonths(d, 1));
    else setCurrentDate((d) => subWeeks(d, 1));
  };

  const navigateNext = () => {
    if (calendarMode === "month") setCurrentDate((d) => addMonths(d, 1));
    else setCurrentDate((d) => addWeeks(d, 1));
  };

  const titleLabel = useMemo(() => {
    if (calendarMode === "month") {
      return format(currentDate, "MMMM yyyy", { locale: es });
    }
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(weekStart, "d MMM", { locale: es })} – ${format(weekEnd, "d MMM yyyy", { locale: es })}`;
  }, [currentDate, calendarMode]);

  const calendarWeeks = useMemo(() => {
    if (calendarMode === "month") return getCalendarWeeks(currentDate);
    return [getWeekDays(currentDate)];
  }, [currentDate, calendarMode]);

  const weekHeaders = useMemo(() => {
    if (calendarMode === "week") {
      return getWeekDays(currentDate).map((d) => format(d, "EEE d", { locale: es }));
    }
    return MONTH_DAY_HEADERS;
  }, [currentDate, calendarMode]);

  return (
    <div className="space-y-3">
      {/* ── Controls bar ── */}
      <div className="space-y-2">
        {/* Row 1: nav + title + mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="outline" size="icon" onClick={navigatePrev} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext} aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <span className="text-sm md:text-base font-semibold capitalize flex-1 min-w-0 truncate">
            {titleLabel}
          </span>

          <div className="flex rounded-md border overflow-hidden shrink-0">
            <Button
              variant={calendarMode === "month" ? "default" : "ghost"}
              size="sm"
              className="rounded-none px-2 sm:px-3"
              onClick={() => setCalendarMode("month")}
            >
              <span className="hidden sm:inline">Mes</span>
              <span className="sm:hidden">M</span>
            </Button>
            <Button
              variant={calendarMode === "week" ? "default" : "ghost"}
              size="sm"
              className="rounded-none border-l px-2 sm:px-3"
              onClick={() => setCalendarMode("week")}
            >
              <span className="hidden sm:inline">Semana</span>
              <span className="sm:hidden">S</span>
            </Button>
          </div>
        </div>

        {/* Row 2: date field selector — full width on mobile */}
        <Select value={dateField} onValueChange={(v) => setDateField(v as typeof dateField)}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="estimated_close_date">Cierre estimado</SelectItem>
            <SelectItem value="last_activity_at">Última actividad</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Calendar grid ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        /* Both modes scroll horizontally on narrow screens */
        <div className="overflow-x-auto">
          <div className="rounded-lg border overflow-hidden min-w-[480px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted">
              {weekHeaders.map((d, i) => (
                <div
                  key={i}
                  className="px-1 py-2 text-xs font-medium text-muted-foreground text-center capitalize"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {calendarWeeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-t">
                {week.map((day, di) => {
                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayOpps = oppsByDate[dateKey] ?? [];
                  const isCurrentMonth =
                    calendarMode === "week" || isSameMonth(day, currentDate);
                  const todayFlag = isToday(day);
                  const MAX_PILLS = calendarMode === "month" ? 2 : dayOpps.length;
                  const visibleOpps = dayOpps.slice(0, MAX_PILLS);
                  const remainingCount = dayOpps.length - visibleOpps.length;

                  return (
                    <div
                      key={di}
                      className={[
                        "p-1 border-l first:border-l-0 flex flex-col gap-0.5",
                        calendarMode === "month" ? "min-h-[72px]" : "min-h-[280px]",
                        !isCurrentMonth ? "bg-muted/30" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {/* Day number */}
                      <div className="flex items-center mb-0.5">
                        <span
                          className={[
                            "text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full",
                            todayFlag
                              ? "bg-primary text-primary-foreground"
                              : !isCurrentMonth
                              ? "text-muted-foreground"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {format(day, "d")}
                        </span>
                      </div>

                      {/* Opportunity pills */}
                      {visibleOpps.map((opp) => (
                        <button
                          key={opp.id}
                          className={[
                            "w-full text-left text-xs px-1 py-0.5 rounded truncate hover:opacity-80 transition-opacity leading-tight",
                            getPillClass(opp.status),
                          ].join(" ")}
                          onClick={() => setEditingOpportunity(opp)}
                          title={`${opp.name}${opp.value != null ? " · " + formatCurrency(opp.value) : ""}`}
                        >
                          <span className="font-medium truncate block">{opp.name}</span>
                          {opp.value != null && calendarMode === "week" && (
                            <span className="opacity-70">{formatCurrency(opp.value)}</span>
                          )}
                        </button>
                      ))}

                      {remainingCount > 0 && (
                        <span className="text-xs text-muted-foreground px-1">
                          +{remainingCount} más
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <OpportunityDrawer
        open={!!editingOpportunity}
        onClose={() => setEditingOpportunity(null)}
        companyId={companyId}
        opportunity={editingOpportunity as any}
      />
    </div>
  );
}
