import { useDashboardFilters, DateRange } from '@/contexts/DashboardFilterContext';
import { DateRangeSelector } from '@/components/common/DateRangeSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Calendar, Filter, RotateCcw } from 'lucide-react';

// Available dimensions for filtering
const DIMENSIONS = [
  { value: 'all', label: 'All Dimensions' },
  { value: 'country', label: 'Country' },
  { value: 'product_category', label: 'Product Category' },
  { value: 'region', label: 'Region' },
  { value: 'sales_rep', label: 'Sales Rep' },
];

// Mock data for dimension values (in real app, fetch from DB)
const DIMENSION_VALUES: Record<string, string[]> = {
  country: ['All', 'US', 'UK', 'Canada', 'Germany', 'France', 'Spain'],
  product_category: ['All', 'Electronics', 'Clothing', 'Food', 'Books', 'Furniture'],
  region: ['All', 'North America', 'Europe', 'Asia', 'South America', 'Africa'],
  sales_rep: ['All', 'John Smith', 'Jane Doe', 'Bob Johnson', 'Alice Williams'],
};

export function DashboardFilters() {
  const { filters, setFilters, resetFilters } = useDashboardFilters();

  const handleDateRangeChange = (range: DateRange) => {
    setFilters({
      ...filters,
      dateRange: range,
    });
  };

  const handleDimensionChange = (dimension: string | undefined) => {
    setFilters({
      ...filters,
      dimension,
      dimensionValue: undefined,
    });
  };

  const handleDimensionValueChange = (value: string) => {
    setFilters({
      ...filters,
      dimensionValue: value === 'All' ? undefined : value,
    });
  };

  const hasActiveFilters = filters.dimension || filters.dimensionValue;

  return (
    <div className="w-full">
      {/* ✅ IMPROVED: Modern filter bar with glassmorphism effect - Better layout */}
      <div className="relative group">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
        
        {/* Filter container */}
        <div className="relative backdrop-blur-sm bg-gradient-to-r from-background/95 to-muted/50 border border-border/50 rounded-xl p-6 shadow-lg group-hover:shadow-2xl group-hover:border-border/80 transition-all duration-300">
          {/* Header: Title and reset button */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm">
                <Filter className="w-4 h-4 text-primary font-semibold" />
              </div>
              <span className="text-sm font-bold text-foreground uppercase tracking-wider">Filtros</span>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-2 text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors h-8"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Filters section - Improved layout */}
          <div className="space-y-5">
            {/* Date Range Filter - Full width with cleaner design */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-primary/70" />
                <label className="text-xs font-semibold text-foreground uppercase tracking-widest">
                  Rango de fechas
                </label>
              </div>
              {/* DateRangeSelector content directly - no wrapper */}
              <DateRangeSelector value={filters.dateRange} onChange={handleDateRangeChange} />
            </div>

            {/* Dimension Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5 pt-5 border-t border-border/20">
              {/* Dimension Filter */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-primary/60" />
                  Dimensión
                </label>
                <Select
                  value={filters.dimension || 'all'}
                  onValueChange={(value) => handleDimensionChange(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger className="bg-background/40 border-border/40 hover:border-border/70 hover:bg-background/60 transition-all h-9 text-sm font-medium">
                    <SelectValue placeholder="Selecciona una dimensión..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border/50">
                    <SelectItem value="all" className="text-sm">Todas las dimensiones</SelectItem>
                    {DIMENSIONS.filter(d => d.value !== 'all').map((dim) => (
                      <SelectItem key={dim.value} value={dim.value} className="text-sm">
                        {dim.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dimension Value Filter */}
              {filters.dimension && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-semibold text-foreground uppercase tracking-widest">
                    Valor
                  </label>
                  <Select
                    value={filters.dimensionValue || 'All'}
                    onValueChange={handleDimensionValueChange}
                  >
                    <SelectTrigger className="bg-background/40 border-border/40 hover:border-border/70 hover:bg-background/60 transition-all h-9 text-sm font-medium">
                      <SelectValue placeholder="Selecciona un valor..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border/50">
                      {(DIMENSION_VALUES[filters.dimension] || []).map((value) => (
                        <SelectItem key={value} value={value} className="text-sm">
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Active filters summary - Enhanced indicator */}
            {hasActiveFilters && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/8 to-primary/5 border border-primary/20 rounded-lg mt-5 animate-in fade-in duration-300">
                <div className="w-2 h-2 rounded-full bg-primary/80 animate-pulse" />
                <span className="text-xs text-muted-foreground font-medium">
                  <span className="text-foreground font-semibold">Filtros activos:</span> {filters.dimension}
                  {filters.dimensionValue && ` • ${filters.dimensionValue}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
