# Dashboard System Documentation

## Overview

Complete customizable dashboard system with no-code formula builder, drag-drop editor, and 7 widget types.

## Architecture

```
┌─────────────────────────────────────────┐
│        DashboardBuilder (Editor)         │
├─────────────────────────────────────────┤
│  Canvas  │  PropertyPanel  │  FormulaEd │
└─────────────────────────────────────────┘
           ↓ saves to ↓
┌─────────────────────────────────────────┐
│   Supabase Database (dashboard_configs)  │
└─────────────────────────────────────────┘
           ↓ loads from ↓
┌─────────────────────────────────────────┐
│     DashboardViewer (Display)            │
├─────────────────────────────────────────┤
│  WidgetRenderer (dispatches by type)     │
├─────────────────────────────────────────┤
│  KPI │ Chart │ Table │ Gauge │ Formula  │
│           Map │ Number                   │
└─────────────────────────────────────────┘
```

## Components

### Editor Components

#### `DashboardBuilder`
Main editor component that orchestrates the dashboard editing experience.

```tsx
<DashboardBuilder
  dashboardId="dashboard-123"
  initialConfig={existingConfig}
  onSave={async (config) => {
    await saveDashboard(config);
  }}
  onCancel={() => navigate('/dashboards')}
/>
```

**Features:**
- Undo/Redo with full history
- Drag-drop widgets on canvas
- Real-time property editing
- Formula management
- Save/Cancel actions

#### `DashboardCanvas`
Editable canvas area where widgets are positioned.

**Features:**
- Drag to move widgets
- Drag handle to resize
- Grid-based positioning (12 columns)
- Visual feedback for selection
- Duplicate/Delete/Edit buttons

#### `PropertyPanel`
Edit properties of selected widget.

**Features:**
- Widget name/description
- Type-specific configuration
- Position and size controls
- Real-time updates

#### `FormulaEditor`
Create and manage formulas used by widgets.

**Features:**
- Create named formulas
- Validate syntax
- Preview available functions
- Delete formulas

#### `WidgetLibrary`
Templates for creating new widgets.

### Viewer Components

#### `DashboardViewer`
Display a read-only dashboard with live data.

```tsx
<DashboardViewer
  config={dashboardConfig}
  dataFetcher={async (widget) => {
    // Fetch data for widget
    return data;
  }}
  onEditClick={() => setEditMode(true)}
  autoRefreshInterval={30000}
/>
```

**Features:**
- Responsive grid layout
- Auto-refresh capability
- Manual refresh button
- Widget error handling
- Loading states

#### `WidgetRenderer`
Main dispatcher that renders widgets by type.

### Widget Types

#### 1. **KPI Widget**
Display a single metric with formatted value.

```tsx
config: {
  metric: "Total Revenue",
  formula: "SUM([revenue])",
  format: "currency" // | "number" | "percent"
}
```

#### 2. **Chart Widget**
Visualize data with various chart types.

```tsx
config: {
  chartType: "line", // | "bar" | "area" | "pie"
  xAxis: "date",
  yAxis: "SUM([value])"
}
```

Supported charts: Line, Bar, Area, Pie

#### 3. **Table Widget**
Display tabular data with pagination.

```tsx
config: {
  columns: ["name", "email", "status"],
  rowsPerPage: 10
}
```

#### 4. **Gauge Widget**
Show value within min/max range.

```tsx
config: {
  formula: "[currentValue]",
  min: 0,
  max: 100
}
```

#### 5. **Formula Widget**
Display custom formula calculation.

```tsx
config: {
  formula: "[revenue] - [costs]",
  format: "currency" // | "number" | "percent" | "decimal"
}
```

#### 6. **Number Widget**
Simple number display.

```tsx
config: {
  value: 42,
  format: "number" // | "currency" | "percent"
}
```

#### 7. **Map Widget**
Display geographic data.

```tsx
config: {
  latitude: "lat",
  longitude: "lng",
  zoom: 10
}
```

## Formula System

### Supported Functions (40+)

**Aggregation:**
- `SUM()`, `AVG()`, `COUNT()`, `MIN()`, `MAX()`
- `MEDIAN()`, `STDEV()`, `PERCENTILE()`

**Text:**
- `CONCAT()`, `UPPER()`, `LOWER()`, `TRIM()`
- `MID()`, `FIND()`, `REPLACE()`, `LEN()`

**Math:**
- `ABS()`, `ROUND()`, `FLOOR()`, `CEIL()`
- `SQRT()`, `POWER()`, `MOD()`

**Logic:**
- `IF()`, `AND()`, `OR()`, `NOT()`

**Date:**
- `TODAY()`, `NOW()`, `YEAR()`, `MONTH()`, `DAY()`
- `DATEDIFF()`, `DATEADD()`, `FORMAT()`

**Lookup:**
- `VLOOKUP()`, `INDEX()`, `MATCH()`

**Conditional Aggregation:**
- `SUMIF()`, `COUNTIF()`, `AVERAGEIF()`

### Formula Syntax

```
[fieldName]              // Field reference
123                      // Number
"text"                   // String
+, -, *, /, **          // Operators
<, >, <=, >=, ==, !=    // Comparisons
AND, OR, NOT            // Logical operators
FUNCTION([field1], arg2) // Function call
```

### Formula Examples

```
[revenue] - [costs]
SUM([amounts]) / COUNT([items])
IF([status] = "active", [value], 0)
CONCAT([firstName], " ", [lastName])
DATEDIFF([endDate], [startDate])
SUMIF([category], "Sales", [amount])
```

### Hooks

#### `useFormulaEngine(formulaText, data, variables)`
Parse, validate, and evaluate a formula in real-time.

```tsx
const { value, error, isLoading } = useFormulaEngine(
  "[revenue] - [costs]",
  { revenue: 1000, costs: 300 }
);
```

#### `useFormulaValidation(formulaText)`
Check formula syntax without evaluation.

```tsx
const { valid, message, errors } = useFormulaValidation(formula);
```

#### `useFormulaMetadata(formulaText)`
Extract fields and functions needed by formula.

```tsx
const { fieldsNeeded, functionsUsed } = useFormulaMetadata(formula);
```

#### `useDebouncedFormulaEngine(formulaText, data, variables, debounceMs)`
Debounced evaluation for performance.

#### `useFormulaFieldValidation(formulaText, availableFields)`
Check if all required fields are available.

## Database Schema

### dashboard_configs
```sql
{
  id: UUID,
  company_id: UUID,
  name: string,
  description: string,
  widgets: Widget[],
  layout: { columns: 12, gap: 4, padding: 4 },
  theme: { primary, accent, background, border },
  version: number,
  created_at: timestamp,
  updated_at: timestamp
}
```

### dashboard_widgets
```sql
{
  id: UUID,
  dashboard_id: UUID,
  name: string,
  description: string,
  type: WidgetType,
  config: Record<string, any>,
  position: { x, y },
  size: { width, height },
  created_at: timestamp,
  updated_at: timestamp
}
```

### dashboard_data_sources
```sql
{
  id: UUID,
  dashboard_id: UUID,
  name: string,
  type: "table"|"view"|"query"|"api",
  config: Record<string, any>,
  created_at: timestamp,
  updated_at: timestamp
}
```

### dashboard_formulas
```sql
{
  id: UUID,
  dashboard_id: UUID,
  name: string,
  description: string,
  type: "calculation"|"aggregation"|"conditional",
  expression: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

## API Hooks (useDashboardAPI)

### `useDashboards(companyId)`
Fetch all dashboards for a company.

### `useDashboard(dashboardId)`
Fetch single dashboard with all widgets.

### `useCreateDashboard(companyId)`
Create new dashboard.

### `useUpdateDashboard()`
Update dashboard config.

### `useDeleteDashboard()`
Delete dashboard.

### `useSaveDashboard()`
Save complete dashboard (config + widgets).

### `useAddWidget(dashboardId)`
Add widget to dashboard.

### `useUpdateWidget()`
Update widget config.

### `useDeleteWidget(dashboardId)`
Delete widget.

## Examples

### Basic Usage

```tsx
import { useSaveDashboard, useDashboard } from '@/hooks/useDashboardAPI';
import DashboardBuilder from '@/components/dashboard-builder/DashboardBuilder';

function MyDashboardPage() {
  const { data: dashboard } = useDashboard('dashboard-123');
  const saveMutation = useSaveDashboard();

  return (
    <DashboardBuilder
      dashboardId="dashboard-123"
      initialConfig={dashboard}
      onSave={(config) => saveMutation.mutateAsync(config)}
    />
  );
}
```

### With Company Context

```tsx
import { useCompanyContext } from '@/contexts/CompanyContext';

function DashboardsPage() {
  const { currentCompany } = useCompanyContext();
  const { data: dashboards } = useDashboards(currentCompany.id);

  return (
    <div>
      {dashboards?.map(dashboard => (
        <DashboardLink key={dashboard.id} dashboard={dashboard} />
      ))}
    </div>
  );
}
```

## Security

- **Row-Level Security (RLS)**: All database tables have RLS policies enforcing company_id isolation
- **Formula Evaluation**: Safe parser-based evaluation, no `eval()` used
- **Function Whitelist**: Only approved functions available in formula engine
- **Input Validation**: All user input validated before execution

## Performance

- **Caching**: Formula parser results cached
- **Debouncing**: Optional debounced formula evaluation
- **Lazy Loading**: Widgets render only when visible
- **Batch Operations**: Multi-widget updates in single query
- **Indexing**: Strategic indexes on company_id, dashboard_id, widget_id

## Customization

### Adding Custom Functions

Edit `/src/lib/formulaEngine/FunctionLibrary.ts`:

```typescript
export const FUNCTION_LIBRARY: Record<string, Function> = {
  // ... existing functions
  CUSTOM_FUNC: (...args: any[]) => {
    return computed_value;
  }
};
```

### Adding Widget Types

1. Create `/src/components/dashboard-widgets/widgets/CustomWidget.tsx`
2. Update `WidgetRenderer.tsx` switch statement
3. Update `WidgetLibrary.tsx` with template

### Custom Data Fetcher

```tsx
const customDataFetcher = async (widget: DashboardWidget) => {
  // Fetch from API, database, or cache
  const data = await fetchFromMySource(widget.config);
  return data;
};

<DashboardViewer
  config={dashboard}
  dataFetcher={customDataFetcher}
/>
```

## Troubleshooting

### Formula Errors

1. Check field names match data structure
2. Verify function names capitalized
3. Use bracket syntax for field references: `[fieldName]`
4. Check data types match function requirements

### Widget Not Rendering

1. Verify widget type is supported
2. Check config has required fields
3. Look at browser console for errors
4. Ensure data fetcher returns proper structure

### Performance Issues

1. Reduce widget count per dashboard
2. Increase `autoRefreshInterval` for less frequent updates
3. Optimize data fetcher queries
4. Use debounced formula evaluation

## Migration Deployment

Deploy Supabase migration:

```bash
supabase db push
```

Or via Supabase CLI:

```bash
supabase migrations up
```

Verify tables created:

```bash
supabase db list-tables
```
