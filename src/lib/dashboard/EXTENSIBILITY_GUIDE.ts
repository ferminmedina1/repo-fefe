/**
 * DASHBOARD EXTENSIBILITY GUIDE
 * =============================
 * Complete documentation for extending widgets, metrics, and customization
 * 
 * This system is designed to be highly extensible with minimal code changes.
 * Developers can add new metrics, widgets, and customization options easily.
 */

// ============================================
// SYSTEM ARCHITECTURE
// ============================================

/*
 * The dashboard system is built on 4 core layers:
 * 
 * 1. METRICS LAYER (metricPresets.ts)
 *    - Pre-configured metric definitions
 *    - Formulas, formats, icons, colors
 *    - 60+ metrics across 5 categories
 *    - Easily extendable: just add to METRIC_PRESETS object
 * 
 * 2. WIDGET LAYER (widgets.ts, *Widget.tsx)
 *    - KPI, Chart, List, Currency widget types
 *    - Each widget can use any metric
 *    - Integrated with MetricEditorModal for post-creation editing
 * 
 * 3. TEMPLATES LAYER (widgetPresets.ts)
 *    - Pre-configured widget layout templates
 *    - Dashboard bundles: Sales, Inventory, Finance, Customers, Marketing, Operations
 *    - Users apply entire dashboards with one click
 *    - Easily extendable: add to WIDGET_PRESETS object
 * 
 * 4. CUSTOMIZATION LAYER (widgetCustomizer.ts)
 *    - Advanced visual and behavioral customization
 *    - Color themes, fonts, density, animations
 *    - Data aggregation, sorting, filtering
 *    - Conditional formatting
 */

// ============================================
// ADDING NEW METRICS
// ============================================

/*
 * STEP 1: Define the metric in metricPresets.ts
 * 
 * export const METRIC_PRESETS = {
 *   'sales-new-metric': {
 *     id: 'sales-new-metric',
 *     name: 'Mi Nueva Métrica',
 *     description: 'Una métrica de ejemplo',
 *     category: 'sales',
 *     icon: DollarSign,
 *     color: 'green',
 *     format: 'currency',
 *     unit: 'ARS',
 *     trend: { enabled: true, period: 'month' },
 *     formula: 'SUM(sales.amount) WHERE custom_condition = true',
 *   },
 * };
 * 
 * Required fields:
 * - id: unique identifier
 * - name: display name
 * - description: brief description
 * - category: 'sales', 'inventory', 'customers', 'finance', or 'products'
 * - icon: lucide-react icon component
 * - color: 'green', 'blue', 'red', 'orange', 'purple', 'cyan', etc.
 * - format: 'currency', 'number', 'percentage', 'decimal'
 * 
 * Optional fields:
 * - unit: 'ARS', 'USD', 'días', etc.
 * - defaultChartType: 'line', 'bar', 'pie', 'area'
 * - trend: { enabled, period }
 * - formula: query formula
 * - dataSource: database table
 * 
 * STEP 2: The metric is automatically available in:
 * - WidgetCreatorModal (Catalog tab)
 * - MetricEditorModal (for editing existing widgets)
 * - DashboardQuickStart (if marked as popular)
 * - Widget presets (can reference by metricId)
 */

// ============================================
// ADDING NEW WIDGET PRESETS
// ============================================

/*
 * STEP 1: Create a new widget preset in widgetPresets.ts
 * 
 * export const WIDGET_PRESETS = {
 *   'custom-dashboard': {
 *     id: 'custom-dashboard',
 *     name: 'Mi Dashboard Personalizado',
 *     description: 'Una configuración de widgets pre-hecha',
 *     category: 'sales',
 *     icon: '📊',
 *     difficulty: 'beginner',
 *     popular: true,
 *     tags: ['ventas', 'personalizado'],
 *     widgets: [
 *       {
 *         id: 'widget-1',
 *         type: 'custom-kpi',
 *         size: 'quarter',
 *         metricConfig: {
 *           metricId: 'sales-monthly-total',
 *         },
 *       },
 *       {
 *         id: 'widget-2',
 *         type: 'custom-chart',
 *         size: 'half',
 *         metricConfig: {
 *           metricId: 'sales-by-category',
 *         },
 *       },
 *     ],
 *   },
 * };
 * 
 * Required fields:
 * - id: unique identifier
 * - name: template name
 * - description: brief description
 * - category: category (matches metric categories)
 * - icon: emoji or icon representation
 * - difficulty: 'beginner', 'intermediate', 'advanced'
 * - tags: search tags
 * - widgets: array of widget definitions
 * 
 * Optional fields:
 * - popular: boolean (shows in featured templates)
 * - thumbnail: image URL
 * 
 * STEP 2: The template is automatically available in:
 * - WidgetTemplatesGallery (accessible from dashboard)
 * - Searchable and filterable by category
 * - Users can apply entire dashboard with one click
 */

// ============================================
// ADDING NEW CUSTOMIZATION OPTIONS
// ============================================

/*
 * STEP 1: Extend WidgetCustomizationOptions interface in widgetCustomizer.ts
 * 
 * export interface WidgetCustomizationOptions {
 *   // ... existing options ...
 *   myNewOption?: string;
 *   myNewNumericOption?: number;
 * }
 * 
 * STEP 2: Add to DEFAULT_CUSTOMIZATION
 * 
 * export const DEFAULT_CUSTOMIZATION: WidgetCustomizationOptions = {
 *   // ... existing defaults ...
 *   myNewOption: 'default-value',
 *   myNewNumericOption: 0,
 * };
 * 
 * STEP 3: Add UI control in WidgetCustomizerModal.tsx
 * 
 * <div className="space-y-3">
 *   <Label>Mi Nueva Opción</Label>
 *   <Select 
 *     value={options.myNewOption} 
 *     onValueChange={(value) => 
 *       setOptions({ ...options, myNewOption: value })
 *     }
 *   >
 *     <SelectTrigger><SelectValue /></SelectTrigger>
 *     <SelectContent>
 *       <SelectItem value="option-1">Opción 1</SelectItem>
 *       <SelectItem value="option-2">Opción 2</SelectItem>
 *     </SelectContent>
 *   </Select>
 * </div>
 * 
 * STEP 4: Apply option in widget component
 * 
 * import { getCustomizationClasses } from "@/lib/dashboard/widgetCustomizer";
 * 
 * <div className={getCustomizationClasses(customizationOptions)}>
 *   {/* Widget content uses customization */}
 * </div>
 */

// ============================================
// ADDING NEW WIDGET TYPES
// ============================================

/*
 * STEP 1: Create widget component (e.g., src/components/dashboard/CustomWidget.tsx)
 * 
 * import { WidgetWrapper } from "./WidgetWrapper";
 * import { MetricEditorModal } from "./MetricEditorModal";
 * 
 * interface CustomWidgetProps {
 *   id: string;
 *   definition: WidgetDefinition;
 *   metricConfig?: WidgetMetricConfig;
 *   onUpdateMetricConfig?: (config: WidgetMetricConfig) => void;
 * }
 * 
 * export function CustomWidget({
 *   id,
 *   definition,
 *   metricConfig,
 *   onUpdateMetricConfig,
 * }: CustomWidgetProps) {
 *   const [showMetricEditor, setShowMetricEditor] = useState(false);
 *   
 *   return (
 *     <>
 *       <MetricEditorModal
 *         open={showMetricEditor}
 *         onOpenChange={setShowMetricEditor}
 *         currentConfig={metricConfig || {}}
 *         onSave={(config) => {
 *           if (onUpdateMetricConfig) {
 *             onUpdateMetricConfig(config);
 *           }
 *           setShowMetricEditor(false);
 *         }}
 *       />
 *       <WidgetWrapper
 *         id={id}
 *         title={definition.name}
 *         description={definition.description}
 *         icon={<definition.icon className="h-5 w-5" />}
 *         accentColor={definition.color}
 *         onEditMetric={() => setShowMetricEditor(true)}
 *       >
 *         {/* Widget content */}
 *       </WidgetWrapper>
 *     </>
 *   );
 * }
 * 
 * STEP 2: Add to WIDGET_CATALOG in src/lib/dashboard/widgets.ts
 * 
 * import { CustomWidget } from "@/components/dashboard/CustomWidget";
 * 
 * export const WIDGET_CATALOG = {
 *   'custom-widget': {
 *     id: 'custom-widget',
 *     name: 'Mi Widget Personalizado',
 *     description: 'Widget con funcionalidad especial',
 *     category: 'custom',
 *     component: CustomWidget,
 *     icon: MyIcon,
 *     color: 'blue',
 *     defaultSize: 'quarter',
 *   },
 *   // ... other widgets ...
 * };
 * 
 * STEP 3: Register in DashboardBuilder.tsx
 * 
 * case 'custom-widget':
 *   return (
 *     <CustomWidget 
 *       id={widget.id}
 *       definition={definition}
 *       metricConfig={widget.metricConfig}
 *       onUpdateMetricConfig={handleUpdateMetricConfig}
 *     />
 *   );
 */

// ============================================
// COLOR THEMES & PALETTES
// ============================================

/*
 * To add a new color theme:
 * 
 * STEP 1: Add to COLOR_PALETTES in widgetCustomizer.ts
 * 
 * export const COLOR_PALETTES: Record<ColorScheme, ColorPalette> = {
 *   'my-theme': {
 *     primary: '#your-color',
 *     secondary: '#your-color',
 *     accent: '#your-color',
 *     // ... all required colors
 *   },
 * };
 * 
 * STEP 2: Add to colorSchemes array in WidgetCustomizerModal
 * 
 * const colorSchemes: ColorScheme[] = [
 *   'default', 'vibrant', 'pastel', 'grayscale', 'professional', 'my-theme'
 * ];
 */

// ============================================
// BEST PRACTICES
// ============================================

/*
 * 1. METRICS
 *    - Keep formulas SQL-like and clear
 *    - Always include description for end users
 *    - Use appropriate colors (green=good, red=bad)
 *    - Set format to match data type
 * 
 * 2. TEMPLATES
 *    - Create balanced layouts (quarter, half, full sizes)
 *    - Include 4-6 widgets per template
 *    - Tag appropriately for searchability
 *    - Mark popular/useful templates with popular: true
 * 
 * 3. CUSTOMIZATION
 *    - Keep defaults sensible and accessible
 *    - Group related options in tabs
 *    - Provide visual feedback in previews
 *    - Don't expose too many options (limit to 20-30)
 * 
 * 4. WIDGETS
 *    - Always support MetricEditorModal
 *    - Use WidgetWrapper for consistency
 *    - Implement WidgetActionMenu for actions
 *    - Support responsive sizing (quarter, half, full)
 * 
 * 5. PERFORMANCE
 *    - Use useMemo for expensive calculations
 *    - Batch data fetching (no N+1 queries)
 *    - Lazy load complex visualizations
 *    - Cache metric presets and templates
 */

// ============================================
// COMPONENT HIERARCHY
// ============================================

/*
 * DashboardBuilder (Main)
 * ├── DashboardSelector
 * ├── DashboardActionsMenu
 * ├── DashboardQuickStart (shows popular metrics)
 * ├── WidgetPicker
 * │   ├── Catalog Tab (shows all widgets)
 * │   └── Create Tab
 * │       └── WidgetCreatorModal
 * │           ├── Preset Tab (shows metrics)
 * │           └── Custom Tab (custom formulas)
 * ├── WidgetTemplatesGallery (shows pre-configured dashboards)
 * ├── EnterpriseDragDropContainer (drag/drop reordering)
 * │   └── EnterpriseSortableWidget
 * │       └── [Widget Type]Widget (KPI, Chart, List, Currency)
 * │           ├── WidgetWrapper
 * │           │   └── WidgetActionMenu
 * │           └── MetricEditorModal (edit metric)
 * └── WidgetCustomizerModal (advanced customization)
 */

// ============================================
// DATA FLOW
// ============================================

/*
 * 1. USER SELECTS METRIC PRESET
 *    WidgetPicker → WidgetCreatorModal → handleCreateWidgetWithMetric
 *    → addWidget(widget with metricConfig)
 *    → useDashboardLayout saves to Supabase
 * 
 * 2. USER EDITS WIDGET METRIC
 *    WidgetActionMenu → "Editar Métrica"
 *    → MetricEditorModal opens
 *    → onSave calls onUpdateMetricConfig
 *    → updateWidgetMetricConfig(widgetId, config)
 *    → useDashboardLayout saves to Supabase
 * 
 * 3. USER APPLIES TEMPLATE
 *    WidgetTemplatesGallery → select template
 *    → template.widgets array applied to dashboard
 *    → Multiple addWidget calls
 *    → useDashboardLayout saves all to Supabase
 * 
 * 4. USER CUSTOMIZES WIDGET
 *    WidgetActionMenu → "Configurar"
 *    → WidgetCustomizerModal opens
 *    → onSave persists customization
 */

// ============================================
// DATABASE SCHEMA
// ============================================

/*
 * dashboard_layouts table:
 * 
 * id: uuid
 * user_id: uuid
 * company_id: uuid
 * name: string
 * is_default: boolean
 * widgets: jsonb  -- Array of DashboardWidget
 * created_at: timestamp
 * updated_at: timestamp
 * 
 * DashboardWidget structure:
 * {
 *   id: string
 *   type: string (widget type)
 *   size: 'quarter' | 'half' | 'full'
 *   metricConfig?: {
 *     metricId?: string
 *     customFormula?: string
 *     customFormat?: string
 *     customUnit?: string
 *   }
 *   customization?: WidgetCustomizationOptions
 * }
 */

// ============================================
// QUICK START CHECKLIST
// ============================================

/*
 * To add a new sales metric:
 * ☐ Add to METRIC_PRESETS in metricPresets.ts
 * ☐ Test in WidgetCreatorModal
 * ☐ Add to METRIC_PRESETS.sales filter
 * ☐ Mark as popular if widely used
 * ☐ Add to template if applicable
 * 
 * To create new dashboard template:
 * ☐ Add to WIDGET_PRESETS in widgetPresets.ts
 * ☐ Create 4-6 widget bundle
 * ☐ Reference existing metrics
 * ☐ Set appropriate difficulty
 * ☐ Add relevant tags
 * ☐ Test in WidgetTemplatesGallery
 * ☐ Mark as popular if recommended
 * 
 * To add customization option:
 * ☐ Extend WidgetCustomizationOptions interface
 * ☐ Add to DEFAULT_CUSTOMIZATION
 * ☐ Add UI control to WidgetCustomizerModal
 * ☐ Apply in widget component
 * ☐ Test persistence to database
 */

export const DASHBOARD_EXTENSIBILITY_GUIDE = "✓ Documentation complete";
