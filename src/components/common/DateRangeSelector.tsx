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
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = !isCustomizing && value?.type === preset.type;
          return (
            <Button
              key={preset.type}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className={isActive ? 'bg-primary text-white' : ''}
            >
              {preset.type === 'custom' ? '📅' : ''} {preset.label}
            </Button>
          );
        })}
      </div>

      {/* Custom range picker */}
      {isCustomizing && (
        <Card className="p-4 bg-muted/50 border-dashed">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs font-medium">Desde</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  max={customEnd || today}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-xs font-medium">Hasta</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  min={customStart}
                  max={today}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelCustom}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleApplyCustom}
                disabled={!customStart || !customEnd}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Display current selection */}
      {value && !isCustomizing && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
          <Calendar className="h-3 w-3" />
          <span>{value.label}</span>
        </div>
      )}
    </div>
  );
}
