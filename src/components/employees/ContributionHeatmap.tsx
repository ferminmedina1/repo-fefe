import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { subDays, eachDayOfInterval, format, getMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';

// Dark mode GitHub-style contribution heatmap
const heatmapStyles = `
  .contribution-card {
    background: #0d1117;
    border: 1px solid #30363d;
  }

  .contribution-card .card-title {
    color: #c9d1d9;
  }

  .contribution-card .legend-text {
    color: #8b949e;
  }

  .contribution-tooltip {
    position: absolute;
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    color: #c9d1d9;
    z-index: 50;
    white-space: nowrap;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    pointer-events: none;
  }

  .contribution-grid {
    display: grid;
    grid-template-columns: repeat(53, 12px);
    grid-template-rows: repeat(7, 12px);
    gap: 2px;
  }

  .contribution-day {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid;
    cursor: pointer;
    transition: all 120ms ease-in-out;
  }

  .contribution-day:hover {
    transform: scale(1.25);
    box-shadow: 0 0 10px rgba(248, 248, 248, 0.3);
  }

  .months-header {
    display: flex;
    gap: 2px;
    padding: 0 0 8px 0;
    font-size: 11px;
    font-weight: 500;
    color: #8b949e;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .month-label {
    flex-shrink: 0;
    width: 53px;
    text-align: left;
    padding-left: 2px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .days-column {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-right: 8px;
    min-width: 30px;
  }

  .day-label {
    height: 12px;
    font-size: 11px;
    color: #8b949e;
    text-align: right;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .heatmap-wrapper {
    display: flex;
    gap: 8px;
  }

  .heatmap-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .heatmap-inner {
    display: inline-block;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    font-size: 11px;
    color: #8b949e;
  }

  .legend-square {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    border: 1px solid;
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = heatmapStyles;
  if (!document.querySelector('style[data-contribution]')) {
    style.setAttribute('data-contribution', 'true');
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
  onDayClick?: (date: string, count: number) => void;
}

const BLUE_SCALE = [
  { bg: '#0d1117', border: '#30363d' },      // Empty (dark background)
  { bg: '#0e4429', border: '#0c542d' },      // 1-2
  { bg: '#006d32', border: '#0d542d' },      // 3-5
  { bg: '#1f6feb', border: '#1f6feb' },      // 6-10
  { bg: '#0969da', border: '#0969da' },      // 11-15
  { bg: '#0c4a6e', border: '#0c4a6e' }       // 16+
];

export function ContributionHeatmap({ 
  data = [], 
  title = 'X contributions in the last year',
  onDayClick
}: ContributionHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Build 53-week x 7-day matrix
  const { weeks, totalCount, monthLabels } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { weeks: [], totalCount: 0, monthLabels: [] };

    const oneYearAgo = subDays(new Date(), 365);
    const endDate = new Date();

    // Create date map
    const dateMap = new Map<string, number>();
    let totalCount = 0;
    data.forEach((item: any) => {
      if (item && item.date) {
        dateMap.set(item.date, item.count || 0);
        totalCount += item.count || 0;
      }
    });

    // Get all days in the range
    const allDays = eachDayOfInterval({
      start: oneYearAgo,
      end: endDate
    });

    // Start from Sunday of the first week
    const firstSunday = startOfWeek(allDays[0], { weekStartsOn: 0 });
    
    // Build 53 weeks (52 + partial)
    const weeks: Array<{ date: Date; count: number; dayOfWeek: number }[]> = [];
    
    for (let weekNum = 0; weekNum < 53; weekNum++) {
      const week: Array<{ date: Date; count: number; dayOfWeek: number }> = [];
      
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const date = new Date(firstSunday);
        date.setDate(date.getDate() + weekNum * 7 + dayOfWeek);
        
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = dateMap.get(dateStr) || 0;
        
        week.push({ date, count, dayOfWeek });
      }
      
      weeks.push(week);
    }

    // Get month labels
    const monthLabels: Array<{ month: string; weekIndex: number }> = [];
    const seenMonths = new Set<number>();
    
    weeks.forEach((week, weekIndex) => {
      const month = getMonth(week[0].date);
      if (!seenMonths.has(month)) {
        seenMonths.add(month);
        const monthName = format(week[0].date, 'MMM', { locale: es });
        monthLabels.push({
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          weekIndex
        });
      }
    });

    return { weeks, totalCount, monthLabels };
  }, [data]);

  const getColorClass = (count: number) => {
    if (count === 0) return BLUE_SCALE[0];
    if (count <= 2) return BLUE_SCALE[1];
    if (count <= 5) return BLUE_SCALE[2];
    if (count <= 10) return BLUE_SCALE[3];
    if (count <= 15) return BLUE_SCALE[4];
    return BLUE_SCALE[5];
  };

  const getTooltipText = (date: Date, count: number): string => {
    const day = format(date, 'd');
    const month = format(date, 'MMMM', { locale: es });
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
    
    if (count === 0) {
      return `Sin actividad el ${day} de ${capitalizedMonth}`;
    }
    return `${count} tarea${count !== 1 ? 's' : ''} el ${day} de ${capitalizedMonth}`;
  };

  const displayTitle = title === 'X contributions in the last year' 
    ? `${totalCount} contributions in the last year`
    : title;

  const visibleDays = [0, 2, 4]; // Sun, Tue, Thu (visible on left)
  const dayLabels = ['Dom', 'Mié', 'Vie'];

  return (
    <Card className="contribution-card rounded-lg overflow-hidden">
      <CardHeader className="border-b border-gray-700 pb-3">
        <CardTitle className="card-title text-sm font-semibold">
          {displayTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 pb-6">
        {weeks.length === 0 ? (
          <div className="text-muted-foreground text-sm py-8">
            No hay datos de actividad para mostrar
          </div>
        ) : (
          <div>
            {/* Months Header */}
            <div className="months-header">
              {monthLabels.map((label, idx) => (
                <div key={idx} className="month-label">
                  {label.month}
                </div>
              ))}
            </div>

            {/* Main Wrapper: Days Column + Grid */}
            <div className="heatmap-wrapper">
              {/* Days of Week Labels */}
              <div className="days-column">
                {visibleDays.map((dayNum, idx) => (
                  <div key={idx} className="day-label">
                    {dayLabels[idx]}
                  </div>
                ))}
              </div>

              {/* Scrollable Heatmap */}
              <div className="heatmap-container flex-1">
                <div className="heatmap-inner">
                  <div className="contribution-grid">
                    {weeks.flatMap((week, weekIdx) => 
                      week.map((day, dayIdx) => {
                        const colors = getColorClass(day.count);
                        const tooltipText = getTooltipText(day.date, day.count);
                        const dateStr = format(day.date, 'yyyy-MM-dd');

                        return (
                          <div
                            key={`${weekIdx}-${dayIdx}`}
                            className="contribution-day"
                            style={{
                              backgroundColor: colors.bg,
                              borderColor: colors.border
                            }}
                            title={tooltipText}
                            onMouseEnter={() => setHoveredDay({ date: dateStr, count: day.count })}
                            onMouseLeave={() => setHoveredDay(null)}
                            onMouseMove={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipPos({
                                x: rect.left + rect.width / 2,
                                y: rect.top - 10 // Position above the element with 10px gap
                              });
                            }}
                            onClick={() => {
                              if (onDayClick) onDayClick(dateStr, day.count);
                              console.log(`[Contribution] ${dateStr}: ${day.count} tasks`);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                if (onDayClick) onDayClick(dateStr, day.count);
                              }
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="legend">
              <span>Menos</span>
              {BLUE_SCALE.map((color, idx) => (
                <div
                  key={idx}
                  className="legend-square"
                  style={{
                    backgroundColor: color.bg,
                    borderColor: color.border
                  }}
                />
              ))}
              <span>Más</span>
            </div>

            {/* Tooltip */}
            {hoveredDay && (
              <div 
                className="contribution-tooltip" 
                style={{ 
                  position: 'fixed',
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y}px`,
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none'
                }}
              >
                {hoveredDay.count === 0
                  ? `Sin actividad el ${format(new Date(hoveredDay.date), 'd')} de ${format(new Date(hoveredDay.date), 'MMMM', { locale: es })}`
                  : `${hoveredDay.count} tarea${hoveredDay.count !== 1 ? 's' : ''} el ${format(new Date(hoveredDay.date), 'd')} de ${format(new Date(hoveredDay.date), 'MMMM', { locale: es })}`}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
