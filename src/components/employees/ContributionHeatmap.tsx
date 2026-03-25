import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subDays, startOfYear, eachDayOfInterval, format, getMonth } from 'date-fns';
import { es } from 'date-fns/locale';

// Professional Minimal Styles
const professionalStyles = `
  @keyframes subtleGlow {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  .professional-card {
    position: relative;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }

  /* Professional background animation - behind content */
  .professional-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(59, 130, 246, 0.02) 0%,
      rgba(107, 114, 128, 0.01) 50%,
      rgba(59, 130, 246, 0.02) 100%
    );
    background-size: 200% 200%;
    animation: subtleGlow 6s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }

  .professional-overlay {
    position: relative;
    z-index: 1;
  }
`;
    width: 2px;
    height: 2px;
    left: 50%;
    top: 70%;
    animation: floatingCrystals 16s ease-in-out infinite;
    box-shadow: 0 0 8px rgba(14, 165, 233, 0.5);
  }

  .crystal-particle-4 {
    width: 3px;
    height: 3px;
    left: 30%;
    top: 80%;
    animation: floatingCrystals 13s ease-in-out infinite reverse;
    box-shadow: 0 0 10px rgba(236, 72, 153, 0.5);
  }

  .futuristic-overlay {
    position: relative;
    z-index: 2;
  }
`;

// Inject styles into document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = futuristicStyles;
  if (!document.querySelector('style[data-futuristic]')) {
    style.setAttribute('data-futuristic', 'true');
    document.head.appendChild(style);
  }
}

interface ContributionData {
  date: string;
  count: number;
}

interface ContributionHeatmapProps {
  data: ContributionData[];
  title?: string;
}

export function ContributionHeatmap({ data = [], title = 'Actividad Último Año' }: ContributionHeatmapProps) {
  const heatmapData = useMemo(() => {
    if (!Array.isArray(data)) return { weeks: [], allDays: [] };
    
    const oneYearAgo = subDays(new Date(), 365);
    const yearStart = startOfYear(oneYearAgo);
    
    // Crear mapa de fechas con conteos
    const dateMap = new Map<string, number>();
    data.forEach((item: any) => {
      if (item && item.date) {
        dateMap.set(item.date, item.count || 0);
      }
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
    if (count === 0) return 'bg-gray-100 border-gray-200';
    if (count <= 2) return 'bg-blue-100 border-blue-200';
    if (count <= 5) return 'bg-blue-300 border-blue-400';
    if (count <= 10) return 'bg-blue-500 border-blue-600';
    return 'bg-blue-700 border-blue-800';
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
          const monthName = format(day.date, 'MMM', { locale: es });
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
    <Card className="futuristic-card">
      {/* Crystal particles */}
      <div className="crystal-particle crystal-particle-1" />
      <div className="crystal-particle crystal-particle-2" />
      <div className="crystal-particle crystal-particle-3" />
      <div className="crystal-particle crystal-particle-4" />
      
      <CardHeader className="futuristic-overlay">
        <CardTitle className="text-lg text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="futuristic-overlay">
        {!heatmapData.weeks || heatmapData.weeks.length === 0 ? (
          <div className="text-sm text-gray-500 py-8">
            No hay datos de actividad para mostrar
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="inline-block min-w-full">
              {/* Month labels */}
              <div className="flex gap-1 pb-2 pl-12">
                {months.map((item, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-gray-500 font-medium"
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
                      className="h-3 w-10 flex items-center justify-end pr-2 text-xs text-gray-500 font-medium"
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
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
                <span>Menos</span>
                <div className="h-3 w-3 bg-gray-100 border border-gray-200 rounded-sm" />
                <div className="h-3 w-3 bg-blue-100 border border-blue-200 rounded-sm" />
                <div className="h-3 w-3 bg-blue-300 border border-blue-400 rounded-sm" />
                <div className="h-3 w-3 bg-blue-500 border border-blue-600 rounded-sm" />
                <div className="h-3 w-3 bg-blue-700 border border-blue-800 rounded-sm" />
                <span>Más</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
