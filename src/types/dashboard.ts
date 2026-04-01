// Dashboard Types and Interfaces

export type WidgetType = 'kpi' | 'chart' | 'table' | 'map' | 'formula' | 'gauge' | 'number';
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter';
export type FormulaType = 'calculation' | 'aggregation' | 'conditional';
export type DataSourceType = 'table' | 'query' | 'api';
export type SourceTableName = 
  | 'sales' 
  | 'products' 
  | 'inventory' 
  | 'customers' 
  | 'employees' 
  | 'purchase_orders'
  | 'stock_movements';

// Widget Position and Layout
export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Data Source Configuration
export interface DataSourceConfig {
  tableName: SourceTableName;
  columns: string[];
  filters?: FilterCondition[];
  groupBy?: string[];
  orderBy?: { column: string; direction: 'asc' | 'desc' }[];
  limit?: number;
}

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

// Dashboard Data Source
export interface DashboardDataSource {
  id: string;
  company_id: string;
  name: string;
  source_type: DataSourceType;
  source_config: DataSourceConfig;
  is_cached: boolean;
  cache_duration: number;
  created_at: string;
  updated_at: string;
}

// Widget Configuration (different for each widget type)
export interface BaseWidgetConfig {
  title: string;
  description?: string;
  backgroundColor?: string;
  borderColor?: string;
  showBorder?: boolean;
  customCSS?: string;
}

export interface KPIWidgetConfig extends BaseWidgetConfig {
  metric: string;
  unit?: string;
  format?: 'number' | 'currency' | 'percentage' | 'decimal';
  prefix?: string;
  suffix?: string;
  showTrend?: boolean;
  trendPeriod?: 'day' | 'week' | 'month' | 'year';
  trendColor?: { up: string; down: string };
  targetValue?: number;
  showTarget?: boolean;
}

export interface ChartWidgetConfig extends BaseWidgetConfig {
  chartType: ChartType;
  xAxis?: string;
  yAxis?: string;
  series?: string[];
  colors?: string[];
  legend?: boolean;
  grid?: boolean;
  animation?: boolean;
  height?: number;
}

export interface TableWidgetConfig extends BaseWidgetConfig {
  columns: { key: string; label: string; width?: number }[];
  rowsPerPage?: number;
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  striped?: boolean;
  compact?: boolean;
}

export interface MapWidgetConfig extends BaseWidgetConfig {
  latitudeField: string;
  longitudeField: string;
  markerLabel?: string;
  markerColor?: string;
  zoom?: number;
  center?: { lat: number; lng: number };
}

export interface FormulaWidgetConfig extends BaseWidgetConfig {
  formula: string;
  displayFormat?: 'number' | 'currency' | 'percentage' | 'text';
  decimalPlaces?: number;
  refreshInterval?: number;
}

export type WidgetConfig = 
  | KPIWidgetConfig 
  | ChartWidgetConfig 
  | TableWidgetConfig 
  | MapWidgetConfig 
  | FormulaWidgetConfig
  | BaseWidgetConfig;

// Dashboard Widget
export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  widget_type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  widget_config: WidgetConfig;
  data_source_id?: string;
  formula_id?: string;
  refresh_interval?: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

// Dashboard Formula
export interface DashboardFormula {
  id: string;
  company_id: string;
  name: string;
  formula_text: string;
  description?: string;
  formula_type: FormulaType;
  parameters: Record<string, any>;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Theme Configuration
export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  spacing?: {
    small?: number;
    medium?: number;
    large?: number;
  };
}

// Layout Configuration
export interface LayoutConfig {
  gridCols: number;
  gridRows: number;
  gap: number;
  widgets: DashboardWidget[];
}

// Dashboard Configuration (Main)
export interface DashboardConfig {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  layout_config: LayoutConfig;
  theme_config: ThemeConfig;
  is_default: boolean;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Dashboard Version (for history)
export interface DashboardVersion {
  id: string;
  dashboard_id: string;
  version_number: number;
  layout_config: LayoutConfig;
  theme_config: ThemeConfig;
  change_description?: string;
  created_at: string;
  created_by?: string;
}

// Widget Data Rendered
export interface WidgetData {
  widget_id: string;
  data: any;
  timestamp: string;
  isLoading: boolean;
  error?: string;
}

// Dashboard State (for editor)
export interface DashboardEditorState {
  currentDashboard: DashboardConfig | null;
  widgets: DashboardWidget[];
  dataSources: DashboardDataSource[];
  formulas: DashboardFormula[];
  selectedWidgetId?: string;
  isEditMode: boolean;
  isDirty: boolean;
  widgetData: Record<string, WidgetData>;
}

// Formula Evaluation Context
export interface FormulaContext {
  data: Record<string, any>;
  variables: Record<string, any>;
  functions: Record<string, Function>;
}

// Formula Token
export interface FormulaToken {
  type: 'function' | 'field' | 'operator' | 'number' | 'string' | 'parenthesis' | 'comma';
  value: string;
  position: number;
}

// Formula AST Node (Abstract Syntax Tree)
export interface FormulaASTNode {
  type: 'function' | 'field' | 'literal' | 'binary' | 'unary';
  value?: any;
  name?: string;
  operator?: string;
  args?: FormulaASTNode[];
  left?: FormulaASTNode;
  right?: FormulaASTNode;
}

// Formula Validation Result
export interface FormulaValidation {
  isValid: boolean;
  errors: Array<{
    message: string;
    position: number;
    type: 'syntax' | 'semantic' | 'runtime';
  }>;
  warnings?: Array<{
    message: string;
    suggestion: string;
  }>;
}

// Widget Creation Options
export interface CreateWidgetOptions {
  type: WidgetType;
  title: string;
  dataSourceId?: string;
  formulaId?: string;
  config?: Partial<WidgetConfig>;
  position?: WidgetPosition;
}

// Dashboard Template
export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string; // 'sales', 'inventory', 'financial', 'analytics'
  preview?: string; // image URL
  layout: LayoutConfig;
  theme: ThemeConfig;
  isPublic: boolean;
}
