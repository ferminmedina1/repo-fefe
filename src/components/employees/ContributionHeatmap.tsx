import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subDays, startOfYear, eachDayOfInterval, format, getWeek, getMonth } from 'date-fns';

interface ContributionData {
  date: string;
  count: number;
}

interface ContributionHeatmapProps {
  data: ContributionData[];
  title?: string;
}

export function ContributionHeatmap({ data, title = 'Actividad Último Año' }: ContributionHeatmapProps) {
  const heatmapData = useMemo(() => {
    const oneYearAgo = subDays(new Date(), 365);
    const yearStart = startOfYear(oneYearAgo);
    
    // Crear mapa de fechas con conteos
    const dateMap = new Map<string, number>();
    data.forEach(item => {
      dateMap.set(item.date, item.count);
    });

    // Generar todos los días del intervalo
    const allDays = eachDayOfInterval({
      start: yearStart,
      end: new Date()
    });

    // Agrupar por semana y día
    const weeks: { dayOfWeek: number; date: Date; count: number }[][] = [];
    let currentWeek: { dayOfWeek: number; date: Date; count: number }[] = [];

    allDays.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = date.getDay(); // 0-6 (Sun-Sat)
      const count = dateMap.get(dateStr) || 0;

      currentWeek.push({ dayOfWeek, date, count });

      // Si llegamos a sábado (6) o es el último día, terminar la semana
      if (dayOfWeek === 6 || date.getTime() === allDays[allDays.length - 1].getTime()) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });

    return { weeks, allDays };
  }, [data]);

  const getColor = (count: number): string => {
    if (count === 0) return 'bg-slate-800 border-slate-700';
    if (count <= 2) return 'bg-green-900/40 border-green-700/30';
    if (count <= 5) return 'bg-green-700/50 border-green-600/40';
    if (count <= 10) return 'bg-green-600/60 border-green-500/50';
    return 'bg-green-500/70 border-green-400/60';
  };

  const getTooltip = (count: number): string => {
    if (count === 0) return 'Sin actividad';
    return `${count} tarea${count !== 1 ? 's' : ''}`;
  };

  // Get unique months for labels
  const months = useMemo(() => {
    const monthLabels: { month: string; weekIndex: number }[] = [];
    const monthMap = new Map<number, number>();

    heatmapData.weeks.forEach((week, weekIndex) => {
      week.forEach(day => {
        const month = getMonth(day.date);
        if (!monthMap.has(month)) {
          monthMap.set(month, weekIndex);
          const monthName = format(day.date, 'MMM', { locale: { code: 'es' } as any });
          monthLabels.push({ month: monthName.toUpperCase(), weekIndex });
        }
      });
    });

    return monthLabels;
  }, [heatmapData.weeks]);

  const dayLabels = ['', 'Lun', '', 'Mié', '', 'Vie', ''];
  const getMaxCount = useMemo(() => {
    return Math.max(...heatmapData.allDays.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return data.find(d => d.date === dateStr)?.count || 0;
    }), 10);
  }, [data, heatmapData.allDays]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-4">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="flex gap-1 pb-2 pl-12">
              {months.map((item, idx) => (
                <div
                  key={idx}
                  className="text-xs text-slate-400 font-medium"
                  style={{ minWidth: `${item.weekIndex > 0 ? 16 : 0}px` }}
                >
                  {item.month}
                </div>
              ))}
            </div>

            {/* Day labels + heatmap grid */}
            <div className="flex gap-1">
              {/* Day labels (left side) */}
              <div className="flex flex-col gap-1">
                {dayLabels.map((label, idx) => (
                  <div
                    key={idx}
                    className="h-3 w-10 flex items-center justify-end pr-2 text-xs text-slate-400 font-medium"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Heatmap weeks */}
              <div className="flex gap-1">
                {heatmapData.weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1">
                    {week.map((day, dayIdx) => {
                      const dateStr = format(day.date, 'yyyy-MM-dd');
                      const dataPoint = data.find(d => d.date === dateStr);
                      const count = dataPoint?.count || 0;

                      return (
                        <div
                          key={`${weekIdx}-${dayIdx}`}
                          title={`${format(day.date, 'dd/MM/yyyy')}: ${getTooltip(count)}`}
                          className={`h-3 w-3 rounded-sm border cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${getColor(count)}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400">
              <span>Menos</span>
              <div className="h-3 w-3 bg-slate-800 border border-slate-700 rounded-sm" />
              <div className="h-3 w-3 bg-green-900/40 border border-green-700/30 rounded-sm" />
              <div className="h-3 w-3 bg-green-700/50 border border-green-600/40 rounded-sm" />
              <div className="h-3 w-3 bg-green-600/60 border border-green-500/50 rounded-sm" />
              <div className="h-3 w-3 bg-green-500/70 border border-green-400/60 rounded-sm" />
              <span>Más</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
