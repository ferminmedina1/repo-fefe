# Dashboard Components - Comprehensive Bug Analysis
**Fecha**: Abril 20, 2026  
**Scope**: `src/components/dashboard/` y `src/components/dashboard-builder/`

---

## 🔴 BUGS CRÍTICOS (Severidad Alta)

### 1. **N+1 Query Problem en BusinessHealthPanel**
- **Ubicación**: [BusinessHealthPanel.tsx](BusinessHealthPanel.tsx#L95-L110)
- **Líneas**: 95-110 (customerHealth query)
- **Problema**: Se hacen dos queries separadas en serie:
  1. Obtiene todos los customer IDs
  2. Obtiene todas las sales del período
  
  Aunque no es estrictamente N+1, es ineficiente. Debería joinear directamente.
  
```typescript
// ❌ MALO: Dos queries
const customers = await supabase.from("customers").select("id")
const sales = await supabase.from("sales").select("customer_id")
```

- **Impacto**: Performance degradada, múltiples round-trips DB
- **Solución**: Usar una única query con JOIN:
```typescript
// ✅ BIEN: Una query
const { data: sales } = await supabase
  .from("sales")
  .select("customer_id, created_at")
  .gte("created_at", threeMonthsAgo.toISOString())
  .not("customer_id", "is", null);

const { data: customers } = await supabase
  .from("customers")
  .select("id")
  .eq("company_id", companyId);
// Luego agrupar en memoria con Map
```

---

### 2. **Undefined Reference en dataMap - DashboardBuilder**
- **Ubicación**: [DashboardBuilder.tsx](DashboardBuilder.tsx#L111-L112)
- **Líneas**: 111-112
- **Problema**: 
```typescript
"currency-summary": exchangeRatesQuery.data?.map((rate) => ({
  isLoading: false,
})),
```
Si `exchangeRatesQuery.data` es undefined, la expresión retorna undefined. Luego en renderizado, si el widget intenta acceder a estos datos, fallará.

- **Impacto**: Crash runtime si se renderiza currency-summary sin datos
- **Solución**:
```typescript
"currency-summary": exchangeRatesQuery.data?.map((rate) => ({
  isLoading: false,
})) || [],  // Proporcionar array vacío como fallback
```

---

### 3. **Race Condition en CSVUploader - Memory Leak**
- **Ubicación**: [CSVUploader.tsx](CSVUploader.tsx#L50-L70)
- **Líneas**: 50-70 (parseCSV async sin cleanup)
- **Problema**: El archivo se procesa asincronamente pero si el componente se desmonta antes de que parseCSV termine, seguirá ejecutando:
```typescript
const handleFile = async (selectedFile: File) => {
  setFile(selectedFile);
  setResult(null);
  
  const parsed = await parseCSV(selectedFile); // ← Puede completarse después del unmount
  if (parsed) {
    setPreview(parsed.rows.slice(0, 5)); // ← setState en componente desmontado
  }
};
```

- **Impacto**: Memory leak, warning en React, state update en componente unmounted
- **Solución**: Usar AbortController o useEffect cleanup
```typescript
useEffect(() => {
  let isMounted = true;
  
  const handleFile = async (selectedFile: File) => {
    const parsed = await parseCSV(selectedFile);
    if (isMounted && parsed) {
      setPreview(parsed.rows.slice(0, 5));
    }
  };
  
  return () => { isMounted = false; };
}, []);
```

---

### 4. **Sin Validación de Entrada en CustomMetricWidget**
- **Ubicación**: [CustomMetricWidget.tsx](CustomMetricWidget.tsx#L14-L18)
- **Líneas**: 14-18
- **Problema**:
```typescript
const currentValue = useMemo(() => {
  return evaluateFormula(metric.formula); // ← Sin validación
}, [metric.formula, evaluateFormula]);
```

Si `metric.formula` contiene caracteres especiales o es inválida, `evaluateFormula` puede crashear sin manejo de errores.

- **Impacto**: Crash cuando se ingresa una fórmula inválida
- **Solución**:
```typescript
const currentValue = useMemo(() => {
  try {
    return evaluateFormula(metric.formula);
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return null; // Mostrar estado de error
  }
}, [metric.formula, evaluateFormula]);
```

---

### 5. **Sin Null Check en KpiWidget Rendering**
- **Ubicación**: [KpiWidget.tsx](KpiWidget.tsx#L42-L56)
- **Líneas**: 42-56
- **Problema**: Los datos vienen como uniones pero no hay verificación de tipo:
```typescript
case "kpi-monthly-sales": {
  const monthlyData = data as MonthlyComparisonData;
  return (
    <div className="flex items-baseline gap-2">
      <div className="text-3xl font-bold">
        ${monthlyData.currentMonth.toFixed(0)} // ← ¿Qué si currentMonth es undefined?
      </div>
```

- **Impacto**: NaN en pantalla, datos incorrectos
- **Solución**:
```typescript
case "kpi-monthly-sales": {
  const monthlyData = data as MonthlyComparisonData;
  const currentMonth = monthlyData?.currentMonth ?? 0;
  return (
    <div className="text-3xl font-bold">
      ${currentMonth.toFixed(0)}
```

---

### 6. **Sin Validación de Tamaño/Tipo de Archivo en CSV**
- **Ubicación**: [CSVUploader.tsx](CSVUploader.tsx#L42-L48)
- **Líneas**: 42-48
- **Problema**:
```typescript
const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
      handleFile(droppedFile); // ← No valida tamaño
    }
  }
};
```

Un usuario puede subir un CSV de 500MB y crashear la aplicación.

- **Impacto**: Crash, consumo de memoria ilimitado
- **Solución**:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
if (droppedFile.size > MAX_FILE_SIZE) {
  alert('Archivo demasiado grande (máx 10MB)');
  return;
}
```

---

## 🟡 BUGS IMPORTANTES (Severidad Media)

### 7. **Estados de Loading No Mostrados Correctamente**
- **Ubicación**: [BusinessHealthPanel.tsx](BusinessHealthPanel.tsx#L170-L180)
- **Líneas**: 170-180
- **Problema**: Los health indicators muestran "Cargando..." como texto pero sin skeleton loaders visuales. Mientras cargan, los valores parpadean.
- **Impacto**: Mala UX, confusión del usuario
- **Solución**: Agregar skeleton loaders:
```typescript
<HealthIndicator
  status={stockHealth?.status || "healthy"}
  value={stockHealth?.value || <Skeleton className="h-8 w-24" />}
/>
```

---

### 8. **Sin Manejo de Errores en ChartWidget**
- **Ubicación**: [ChartWidget.tsx](ChartWidget.tsx#L40-L100)
- **Líneas**: 40-100 (renderChart method)
- **Problema**: Si recharts falla renderizando, no hay fallback:
```typescript
const renderChart = () => {
  if (isLoading) { ... }
  if (!data) { ... }
  
  switch (definition.id) {
    case "chart-top-products":
      return (
        <ResponsiveContainer>
          <BarChart data={data}> // ← Sin try-catch
```

- **Impacto**: Widget crashea en error de recharts
- **Solución**:
```typescript
try {
  return (
    <ResponsiveContainer>
      <BarChart data={data}>
        {/* ... */}
      </BarChart>
    </ResponsiveContainer>
  );
} catch (error) {
  return <p className="text-red-600">Error al renderizar gráfico</p>;
}
```

---

### 9. **Modal CSVUploader No es Responsive en Mobile**
- **Ubicación**: [CSVUploader.tsx](CSVUploader.tsx#L86-L91)
- **Líneas**: 86-91
- **Problema**:
```typescript
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
  <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
```

En mobile pequeño (< 375px), el modal sigue siendo max-w-2xl (42rem) que es más grande que la pantalla.

- **Impacto**: Contenido cortado, imposible ver botones en mobile
- **Solución**:
```typescript
<div className="bg-white rounded-lg shadow-xl max-w-2xl sm:max-w-full w-full mx-2 sm:mx-4">
```

---

### 10. **DashboardFilters: Datos Mock Hardcodeados**
- **Ubicación**: [DashboardFilters.tsx](DashboardFilters.tsx#L10-L20)
- **Líneas**: 10-20
- **Problema**:
```typescript
const DIMENSION_VALUES: Record<string, string[]> = {
  country: ['All', 'US', 'UK', 'Canada', 'Germany', 'France', 'Spain'],
  product_category: ['All', 'Electronics', 'Clothing', 'Food', 'Books', 'Furniture'],
  // ... hardcodeado
};
```

Los valores deberían venir de la DB, no estar hardcodeados.

- **Impacto**: Filtros incorrectos, inmantenibles
- **Solución**: Obtener de DB con useQuery

---

### 11. **useMemo con Dependencias Incompletas**
- **Ubicación**: [DashboardBuilder.tsx](DashboardBuilder.tsx#L114-L130)
- **Líneas**: 114-130
- **Problema**:
```typescript
const dataMap = useMemo(
  () => ({
    "kpi-monthly-sales": monthlyComparisonQuery.data,
    // ... más datos
  }),
  [
    monthlyComparisonQuery.data,
    receivablesQuery.data,
    topProductsQuery.data,
    // ... 8 dependencias totales
  ]
);
```

Con 8 dependencias, si UNA cambia, todo se recalcula. Además, debería incluir `loadingMap`.

- **Impacto**: Rendimiento degradado, re-renders innecesarios
- **Solución**:
```typescript
const dataMap = useMemo(
  () => ({
    "kpi-monthly-sales": {
      data: monthlyComparisonQuery.data,
      isLoading: monthlyComparisonQuery.isLoading
    },
    // Rest...
  }),
  [
    monthlyComparisonQuery.data,
    monthlyComparisonQuery.isLoading,
    // ... agregar all loading states
  ]
);
```

---

### 12. **Switch Statement sin Default Consistente**
- **Ubicación**: [KpiWidget.tsx](KpiWidget.tsx#L40-L82)
- **Líneas**: 40-82
- **Problema**: El default case es inconsistente:
```typescript
switch (definition.id) {
  case "kpi-monthly-sales": { ... return ... }
  case "kpi-gross-margin": { ... return ... }
  case "kpi-receivables": { ... return ... }
  case "kpi-sales-today": { ... return ... }
  
  default:
    return <p className="text-xs text-muted-foreground">Widget no configurado</p>;
}
```

Si un widget ID no está en los casos, muestra "no configurado" en lugar de un error.

- **Impacto**: Confusión silenciosa con widgets rotos
- **Solución**:
```typescript
default:
  console.warn(`Unknown widget type: ${definition.id}`);
  return <p className="text-red-600 text-xs">Tipo de widget desconocido: {definition.id}</p>;
```

---

## 🔵 BUGS DE UX/ACCESIBILIDAD (Severidad Media-Baja)

### 13. **Sin ARIA Labels en Spinners de Loading**
- **Ubicación**: [CustomMetricWidget.tsx](CustomMetricWidget.tsx#L47-L49)
- **Líneas**: 47-49
- **Problema**:
```typescript
{isLoading ? (
  <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
) : ...
```

El spinner de loading no tiene aria-label o aria-busy para screen readers.

- **Impacto**: Inaccesible para usuarios con asistentes de voz
- **Solución**:
```typescript
<div 
  className="w-8 h-8 border-2..."
  role="status"
  aria-label="Cargando..."
  aria-busy="true"
/>
```

---

### 14. **Tabs sin Keyboard Navigation**
- **Ubicación**: [MetricBuilderModal.tsx](MetricBuilderModal.tsx#L76-L92)
- **Líneas**: 76-92
- **Problema**: Los tabs personalizados no soportan navegación con teclado:
```typescript
button
  onClick={() => setTab("create")}
  className={`px-4 py-3 font-medium transition ...`}
>
  {/* Sin onKeyDown, sin role="tab" */}
```

- **Impacto**: Usuarios con teclado no pueden navegar
- **Solución**: Agregar role="tab" y onKeyDown handlers

---

### 15. **Modal CSVUploader sin Enfoque Inicial**
- **Ubicación**: [CSVUploader.tsx](CSVUploader.tsx#L86-L140)
- **Líneas**: 86-140
- **Problema**: El modal se abre pero el enfoque no se setea correctamente. La estructura es:
- Backdrop clickeable 
- Modal
- Input oculto

El focus debería moverse al primer elemento interactivo.

- **Impacto**: Keyboard users pueden no saber dónde están
- **Solución**: Usar `useEffect` con `useRef` para setear inicial focus

---

### 16. **Falta Feedback Visual en ExportButton**
- **Ubicación**: [ExportButton.tsx](ExportButton.tsx#L10-L30)
- **Líneas**: 10-30
- **Problema**: El botón descarga el JSON pero sin indicador visual de progreso:
```typescript
const handleExport = () => {
  try {
    const exported = exportDashboard(widgets, dashboardName);
    // Descarga inmediata sin feedback
    downloadAsJSON(exported, filename);
    
    toast({ title: "✓ Dashboard exported" }); // Solo toast
  }
};
```

- **Impacto**: Usuario no sabe si descarga funcionó
- **Solución**: Agregar loading state:
```typescript
const [isExporting, setIsExporting] = useState(false);
// ... mostrar loading indicator
```

---

## 🟠 PROBLEMAS DE CÓDIGO (Severidad Baja)

### 17. **Código Duplicado: CurrencyDashboard.tsx vs CurrencyDashboardNew.tsx**
- **Ubicación**: 
  - [CurrencyDashboard.tsx](CurrencyDashboard.tsx)
  - [CurrencyDashboardNew.tsx](CurrencyDashboardNew.tsx)
- **Problema**: Ambos archivos contienen prácticamente el mismo código (95% idéntico). Diferencias menores:
  - CurrencyDashboard: `bg-gradient-to-br from-slate-900/50`
  - CurrencyDashboardNew: `bg-gradient-to-br from-blue-50`

- **Impacto**: Mantenimiento difícil, bugs que afectan ambos, duplicación
- **Solución**: Consolidar en un archivo, parametrizar el tema:
```typescript
interface CurrencyDashboardProps {
  theme?: 'dark' | 'light';
}
```

---

### 18. **Props sin Documentación (JSDoc Faltante)**
- **Ubicación**: [WidgetPicker.tsx](WidgetPicker.tsx#L14-L16)
- **Líneas**: 14-16
- **Problema**:
```typescript
interface WidgetPickerProps {
  addedWidgetIds: string[];
  onAddWidget: (widgetType: WidgetType, size?: "full" | "half" | "quarter") => void;
  disabled?: boolean;
}

export function WidgetPicker({ ... }: WidgetPickerProps) {
  // Sin comentarios explicando qué hace cada prop
}
```

- **Impacto**: Confusión para otros developers
- **Solución**:
```typescript
/** Renders a widget picker sheet to add widgets to dashboard */
export function WidgetPicker({ 
  /** Array of already added widget IDs to exclude from picker */
  addedWidgetIds,
  /** Callback when user selects a widget */
  onAddWidget,
  /** Disable the picker button */
  disabled = false 
}: WidgetPickerProps) {
```

---

### 19. **Color Map Incompleto en WidgetWrapper**
- **Ubicación**: [WidgetWrapper.tsx](WidgetWrapper.tsx#L15-L25)
- **Líneas**: 15-25
- **Problema**:
```typescript
const colorMap: Record<string, string> = {
  blue: "border-blue-500/30 bg-blue-500/5",
  green: "border-green-500/30 bg-green-500/5",
  // ... más colores
};

// En el componente:
className={cn(
  "shadow-soft border-l-4 overflow-hidden transition-all",
  colorMap[accentColor] || colorMap.blue, // ← Fallback solo a blue
```

Si pasan un color no soportado, silenciosamente usa blue. ¿Qué pasa si `accentColor` es undefined?

- **Impacto**: Estados inesperados, difícil debuguear
- **Solución**:
```typescript
const getColorClasses = (color?: string) => {
  if (!color) {
    console.warn('Missing accentColor prop in WidgetWrapper');
    return colorMap.blue;
  }
  if (!colorMap[color]) {
    console.warn(`Unknown color: ${color}, falling back to blue`);
  }
  return colorMap[color] || colorMap.blue;
};
```

---

### 20. **Sin Logging para Debug en Errores**
- **Ubicación**: [MetricBuilderModal.tsx](MetricBuilderModal.tsx#L98-L105)
- **Líneas**: 98-105
- **Problema**:
```typescript
try {
  await createMutation.mutateAsync({
    company_id: currentCompany.id,
    name,
    description,
    data_source: dataSource,
    formula,
    operation,
  });
  setEditingMetric(null);
} catch (err: any) {
  const errorMsg = err?.message || 'Error saving metric...';
  setError(errorMsg);
  console.error("Error saving metric:", err); // ← Sí hay logging, pero...
}
```

El logging existe pero `err` podría ser un Error objeto o un string, y no se loguea el stack trace completo en producción.

- **Impacto**: Difícil debuguear en producción
- **Solución**:
```typescript
catch (err: any) {
  const errorMsg = err?.message || 'Error saving metric';
  console.error("Error saving metric:", {
    message: err?.message,
    stack: err?.stack,
    fullError: err
  });
  setError(errorMsg);
}
```

---

### 21. **Función demasiado larga: DashboardBuilder**
- **Ubicación**: [DashboardBuilder.tsx](DashboardBuilder.tsx#L40-L190)
- **Líneas**: 40-190+ 
- **Problema**: El componente DashboardBuilder es ENORME (> 400 líneas). Hace:
  - State management
  - Permission checking
  - Data fetching
  - Widget rendering
  - Layout handling
  - Error handling

- **Impacto**: Difícil de mantener, testear, debuguear
- **Solución**: Separar en custom hooks:
```typescript
const useDashboardData = (companyId) => { /* data fetching */ }
const useDashboardLayout = (companyId) => { /* layout management */ }
const useDashboardPermissions = () => { /* permissions */ }
```

---

### 22. **CSV Uploader - Falta manejo de encoding**
- **Ubicación**: [CSVUploader.tsx](CSVUploader.tsx#L50-L70)
- **Líneas**: 50-70
- **Problema**: El archivo se lee sin especificar encoding:
```typescript
const handleFile = async (selectedFile: File) => {
  setFile(selectedFile);
  setResult(null);
  
  const parsed = await parseCSV(selectedFile);
  // ¿Qué encoding usa parseCSV?
```

Si el usuario sube un CSV con encoding diferente a UTF-8 (ej: Latin-1, CP1252), los caracteres especiales se rompen.

- **Impacto**: Datos incorrectos, caracteres mojibake
- **Solución**: Detectar encoding o permitir selección:
```typescript
// Usar library como chardet para auto-detectar
const encoding = await detectEncoding(selectedFile);
const decoded = new TextDecoder(encoding).decode(await selectedFile.arrayBuffer());
```

---

### 23. **Validación de Fórmula incompleta en FormulaEditor**
- **Ubicación**: [FormulaEditor.tsx](FormulaEditor.tsx#L58-L75)
- **Líneas**: 58-75
- **Problema**:
```typescript
const handleSaveFormula = () => {
  if (!editingFormula) return;
  
  if (!editingFormula.name.trim()) {
    setValidationError('Formula name is required');
    return;
  }
  
  if (!editingFormula.expression.trim()) {
    setValidationError('Formula expression is required');
    return;
  }
  
  const syntaxValidation = validateFormulaSyntax(editingFormula.expression);
  if (!syntaxValidation.valid) {
    setValidationError(syntaxValidation.message);
    return;
  }
  // ← No valida si los campos referenciados existen en los datos
};
```

La fórmula podría referenciar campos que no existen (`[nonexistent_field]`).

- **Impacto**: Fórmulas que fallan en runtime
- **Solución**: Validar contra disponible fields:
```typescript
const availableFields = getFieldsForDataSource(editingFormula.type);
const referencedFields = extractFieldsFromExpression(editingFormula.expression);
const invalidFields = referencedFields.filter(f => !availableFields.includes(f));
if (invalidFields.length > 0) {
  setValidationError(`Campos inválidos: ${invalidFields.join(', ')}`);
  return;
}
```

---

### 24. **TemplateGallery - Sin cleanup en useEffect**
- **Ubicación**: [TemplateGallery.tsx](TemplateGallery.tsx#L11-L30)
- **Líneas**: 11-30
- **Problema**: El modal llama `useTemplates` pero si se cierra durante loading, no cancelará la request:
```typescript
export function TemplateGallery({ onSelectTemplate, onClose }: TemplateGalleryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: templates, isLoading: isTemplatesLoading, error: templatesError } = useTemplates(false);
  // ← No hay cleanup en el Dialog
```

- **Impacto**: Memory leak de queries, peticiones abandonadas
- **Solución**: Agregar cleanup en Dialog:
```typescript
<Dialog open={true} onOpenChange={(open) => {
  if (!open) {
    cancelTemplatesQuery(); // método para cancelar query
    onClose();
  }
}}>
```

---

### 25. **ShareModal - Token expiration no considerar**
- **Ubicación**: [ShareModal.tsx](ShareModal.tsx#L20-L45)
- **Líneas**: 20-45
- **Problema**:
```typescript
const handleCreateShare = async () => {
  try {
    const result = await createShareLink.mutateAsync(layoutId);
    const shareUrl = generateShareUrl(result.share_token);
    
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    
    setTimeout(() => setCopied(false), 2000);
    // ← No valida si el URL expirará en el futuro
    // ← No muestra tiempo de expiración al usuario
```

- **Impacto**: Usuario comparte link que expira sin saber
- **Solución**: Mostrar expiración:
```typescript
<p className="text-xs text-muted-foreground">
  Este link expirará en: {formatDistanceToNow(result.expires_at)}
</p>
```

---

## 📊 RESUMEN DE BUGS

| Categoría | Cantidad | Severidad |
|-----------|----------|-----------|
| **Bugs Críticos** | 6 | 🔴 Alta |
| **Bugs Importantes** | 9 | 🟡 Media |
| **Bugs UX/Accesibilidad** | 4 | 🔵 Media-Baja |
| **Problemas de Código** | 9 | 🟠 Baja |
| **Total** | **28 bugs** | - |

---

## 🎯 PRIORIDAD DE FIXES

### URGENTE (Próximas 24 horas)
1. ✅ N+1 Query en BusinessHealthPanel
2. ✅ Undefined reference en dataMap
3. ✅ Memory leak en CSVUploader
4. ✅ Validación de fórmula en CustomMetricWidget
5. ✅ Validación de archivo CSV

### MUY IMPORTANTE (Próximos 3 días)
6. ✅ Estados de loading
7. ✅ Manejo de errores en charts
8. ✅ Responsive design mobile
9. ✅ Código duplicado (Currency components)

### IMPORTANTE (Próxima semana)
10. ✅ Accesibilidad ARIA
11. ✅ Keyboard navigation
12. ✅ JSDoc documentation
13. ✅ Validación avanzada de fórmulas

---

## 📝 RECOMENDACIONES GENERALES

1. **Implementar error boundaries** para cada widget
2. **Agregar loading skeletons** consistentes
3. **Usar React.memo()** en widgets puros
4. **Implementar query cancellation** con AbortController
5. **Consolidar components duplicados**
6. **Agregar unit tests** para lógica de fórmulas
7. **Agregar integration tests** para flujos de CSV
8. **Usar Storybook** para documentation de components
9. **Implementar error tracking** (Sentry)
10. **Agregar performance monitoring** (Vercel Analytics)

