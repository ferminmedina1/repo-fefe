import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { subDays, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar } from 'lucide-react';

export type DateRangeType = 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  type: DateRangeType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

interface DateRangeSelectorProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [isCustomizing, setIsCustomizing] = useState(value?.type === 'custom');
  const [customStart, setCustomStart] = useState(value?.startDate || '');
  const [customEnd, setCustomEnd] = useState(value?.endDate || '');

  const today = format(new Date(), 'yyyy-MM-dd');

  const presets = [
    {
      type: 'week' as const,
      label: 'Última Semana',
      getRange: () => {
        const end = today;
        const start = format(subDays(new Date(), 7), 'yyyy-MM-dd');
        return { start, end, label: 'Última semana' };
      }
    },
    {
      type: 'month' as const,
      label: 'Último Mes',
      getRange: () => {
        const end = today;
        const start = format(subDays(new Date(), 30), 'yyyy-MM-dd');
        return { start, end, label: 'Último mes' };
      }
    },
    {
      type: 'year' as const,
      label: 'Último Año',
      getRange: () => {
        const end = today;
        const start = format(subDays(new Date(), 365), 'yyyy-MM-dd');
        return { start, end, label: 'Último año' };
      }
    },
    {
      type: 'custom' as const,
      label: 'Personalizado',
      getRange: () => ({ start: '', end: '', label: 'Personalizado' })
    }
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    if (preset.type === 'custom') {
      setIsCustomizing(true);
    } else {
      const { start, end, label } = preset.getRange();
      onChange({
        type: preset.type,
        startDate: start,
        endDate: end,
        label
      });
      setIsCustomizing(false);
    }
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({
        type: 'custom',
        startDate: customStart,
        endDate: customEnd,
        label: `${format(new Date(customStart), 'dd/MM/yyyy')} - ${format(new Date(customEnd), 'dd/MM/yyyy')}`
      });
      setIsCustomizing(false);
    }
  };

  const handleCancelCustom = () => {
    setIsCustomizing(false);
  };

  return (
    <div className="space-y-4">
      {/* ✅ IMPROVED: Preset buttons - Better layout and styling */}
      <div className="flex flex-wrap gap-2.5">
        {presets.map((preset) => {
          const isActive = !isCustomizing && value?.type === preset.type;
          return (
            <Button
              key={preset.type}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className={`
                transition-all duration-200 font-medium text-sm h-9
                ${isActive 
                  ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/30' 
                  : 'bg-background/40 border-border/50 hover:border-border/80 hover:bg-background/60 text-foreground'
                }
              `}
            >
              {preset.type === 'custom' ? (
                <>
                  <Calendar className="w-4 h-4 mr-1.5" />
                  <span>{preset.label}</span>
                </>
              ) : (
                preset.label
              )}
            </Button>
          );
        })}
      </div>

      {/* Custom range picker - Improved styling */}
      {isCustomizing && (
        <Card className="p-5 bg-background/50 border border-border/50 backdrop-blur-sm rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Selecciona un rango personalizado</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Desde</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  max={customEnd || today}
                  className="bg-background/60 border-border/50 hover:border-border/80 text-sm font-medium h-9"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hasta</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={customStart}
                  max={today}
                  className="bg-background/60 border-border/50 hover:border-border/80 text-sm font-medium h-9"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelCustom}
                className="h-8 text-xs font-medium"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleApplyCustom}
                disabled={!customStart || !customEnd}
                className="h-8 text-xs font-medium bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Display current selection - Enhanced indicator */}
      {value && !isCustomizing && (
        <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-gradient-to-r from-primary/5 to-primary/5 px-3.5 py-2.5 rounded-lg border border-primary/10">
          <Calendar className="h-3.5 w-3.5 text-primary/60" />
          <span className="font-medium">{value.label}</span>
        </div>
      )}
    </div>
  );
}
