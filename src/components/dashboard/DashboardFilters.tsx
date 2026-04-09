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
import { X } from 'lucide-react';

// Available dimensions for filtering
const DIMENSIONS = [
  { value: '', label: 'All Dimensions' },
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

  const handleDimensionChange = (dimension: string) => {
    setFilters({
      ...filters,
      dimension: dimension || undefined,
      dimensionValue: undefined, // Reset value when dimension changes
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
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg border">
      {/* Date Range Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Date Range:</span>
        <DateRangeSelector value={filters.dateRange} onChange={handleDateRangeChange} />
      </div>

      {/* Dimension Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
        <Select value={filters.dimension || ''} onValueChange={handleDimensionChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Choose dimension..." />
          </SelectTrigger>
          <SelectContent>
            {DIMENSIONS.map((dim) => (
              <SelectItem key={dim.value} value={dim.value}>
                {dim.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dimension Value Filter */}
      {filters.dimension && (
        <div className="flex items-center gap-2">
          <Select value={filters.dimensionValue || 'All'} onValueChange={handleDimensionValueChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select value..." />
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

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="gap-2"
          title="Reset filters"
        >
          <X className="w-4 h-4" />
          Clear
        </Button>
      )}

      {/* Active Filter Badge */}
      {hasActiveFilters && (
        <div className="text-xs text-muted-foreground">
          Filtering by: {filters.dimension}
          {filters.dimensionValue && ` = ${filters.dimensionValue}`}
        </div>
      )}
    </div>
  );
}
