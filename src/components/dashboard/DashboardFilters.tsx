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
    <div className="w-full space-y-4">
      {/* ✅ NEW: Modern filter bar with glassmorphism effect */}
      <div className="relative">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-xl blur-xl opacity-50" />
        
        {/* Filter container */}
        <div className="relative backdrop-blur-sm bg-gradient-to-r from-background/95 to-muted/50 border border-border/50 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow">
          <div className="flex flex-col gap-4">
            {/* Top row: Title and reset button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Filter className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Filtros</span>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="gap-2 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpiar filtros
                </Button>
              )}
            </div>

            {/* Filters grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Date Range Filter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Rango de fechas
                  </label>
                </div>
                <div className="bg-background/50 rounded-lg p-2 border border-border/30 hover:border-border/60 transition-colors">
                  <DateRangeSelector value={filters.dateRange} onChange={handleDateRangeChange} />
                </div>
              </div>

              {/* Dimension Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Dimensión
                </label>
                <Select
                  value={filters.dimension || 'all'}
                  onValueChange={(value) => handleDimensionChange(value === 'all' ? undefined : value)}
                >
                  <SelectTrigger className="bg-background/50 border-border/30 hover:border-border/60 transition-colors">
                    <SelectValue placeholder="Selecciona una dimensión..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las dimensiones</SelectItem>
                    {DIMENSIONS.filter(d => d.value !== 'all').map((dim) => (
                      <SelectItem key={dim.value} value={dim.value}>
                        {dim.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dimension Value Filter */}
              {filters.dimension && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Valor
                  </label>
                  <Select
                    value={filters.dimensionValue || 'All'}
                    onValueChange={handleDimensionValueChange}
                  >
                    <SelectTrigger className="bg-background/50 border-border/30 hover:border-border/60 transition-colors">
                      <SelectValue placeholder="Selecciona un valor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(DIMENSION_VALUES[filters.dimension] || []).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Active filters summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Filtros activos: {filters.dimension}
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
