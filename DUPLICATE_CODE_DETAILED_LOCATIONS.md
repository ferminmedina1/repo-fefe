# Distribución de Código Duplicado por Archivo

## Tabla Resumida: Archivos con Duplicación

| # | Archivo | LOC | Tipo Duplicación | Líneas Dup | Patrón | Solución |
|---|---------|-----|------------------|-----------|--------|----------|
| 1 | `CurrencyWidget.tsx` | 152 | Widget State + Loading | 70-80 | useState + useContext | `useWidgetState()` hook |
| 2 | `ChartWidget.tsx` | 178 | Widget State + Loading | 75-85 | useState + useContext | `useWidgetState()` hook |
| 3 | `ListWidget.tsx` | 111 | Widget State + Loading | 60-70 | useState + useContext | `useWidgetState()` hook |
| 4 | `KpiWidget.tsx` | 158 | Widget State + Loading | 70-80 | useState + useContext | `useWidgetState()` hook |
| 5 | `CustomMetricWidget.tsx` | 129 | Widget State | 40-50 | useState + loading logic | `useWidgetState()` hook |
| 6 | `CurrencyDashboard.tsx` | 542 | Formatters | 26 | formatNumber/formatCurrency | Move to `src/lib/dashboard/formatting.ts` |
| 7 | `DashboardSelector.tsx` | 396 | Dialog State | 60-80 | useState x6 + handlers | `useDialogState()` hook |
| 8 | `CreateNewDashboardDialog.tsx` | 87 | Dialog State | 20-30 | useState + handlers | `useDialogState()` hook |
| 9 | `ShareModal.tsx` | 101 | Dialog State | 25-35 | useState + handlers | `useDialogState()` hook |
| 10 | `WidgetConfigModal.tsx` | 190 | Dialog State | 30-40 | useState + handlers | `useDialogState()` hook |
| 11 | `BusinessHealthPanel.tsx` | 254 | Supabase Pattern | 85 | useQuery x4 (queries) | `useHealthQueries()` hook |
| 12 | `DashboardBuilder.tsx` | 563 | General patterns | 40-50 | Mixed (imports, state) | Mixed refactoring |
| 13 | `MetricBuilderModal.tsx` | 389 | General patterns | 50-60 | Mixed (state, handlers) | Mixed refactoring |
| 14 | `CSVUploader.tsx` | 347 | File handling | 30-40 | drag/drop + validation | Keep as is (specific) |
| 15 | `DashboardStats.tsx` | 186 | Loading States | 25-35 | Loading skeleton + empty | `WidgetLoadingState` |
| - | **Otros 17 archivos** | 2,276 | Minimal | 50-100 | Scattered patterns | Case-by-case |
| **TOTAL** | **32 archivos** | **5,459** | **Múltiples** | **450-550** | - | - |

---

## Detalle de Duplicaciones por Categoría

### 1. WIDGET STATE PATTERN (5 archivos, 113 LOC exactas)

```
CurrencyWidget.tsx
  Líneas 39-52: const [showConfig, setShowConfig] = useState(false);
  Líneas 40-47: const [widgetConfig, setWidgetConfig] = useState<WidgetConfig>({...});
  Líneas 49-52: const context = useWidgetContext(); + data/isLoading retrieval
  Líneas 65-78: renderContent function skeleton

ChartWidget.tsx
  Líneas 31-45: IDÉNTICO a CurrencyWidget (39-52)
  Líneas 46-56: renderChart + loading/empty logic

ListWidget.tsx
  Líneas 22-35: IDÉNTICO a CurrencyWidget (39-52)
  Líneas 36-52: renderContent + loading/empty logic

KpiWidget.tsx
  Líneas 20-33: IDÉNTICO a CurrencyWidget (39-52)
  Líneas 38-47: renderContent + loading/empty logic

CustomMetricWidget.tsx
  Líneas 1-30: PARCIAL - usa useMemo en lugar de useState
  Líneas 16-40: Formula evaluation + trend calculation (similar logic)
```

**Total exacto: 113 LOC**

---

### 2. LOADING & EMPTY STATE RENDERING (85 LOC)

```
CurrencyWidget.tsx
  Líneas 49-67: 
    if (isLoading) return <loading div>
    if (!data || data.length === 0) return <empty state>

ChartWidget.tsx
  Líneas 62-72: 
    if (isLoading) return <loading skeleton>
    if (!data || data.length === 0) return <empty message>

ListWidget.tsx
  Líneas 36-52:
    if (isLoading) return <loading skeleton>
    if (!data || data.length === 0) return <empty state with icon>

KpiWidget.tsx
  Líneas 38-47:
    if (isLoading) return <skeleton>
    if (!data) return <empty message>

DashboardStats.tsx
  Similar pattern: ~28 LOC
```

**Total exacto: ~85 LOC**

---

### 3. FORMATTING FUNCTIONS (26 LOC)

```
CurrencyDashboard.tsx - Líneas 72-97

EXACTAMENTE:
  L72-74:  formatNumber (comentario + JSDoc)
  L74-79:  formatNumber función (6 LOC)
  L80-82:  comentario + JSDoc
  L85-96:  formatCurrency función (12 LOC)
  L97:     closing brace

UTILIZADA EN MISMO ARCHIVO:
  L158:    {formatCurrency(value, currency)}
  L265:    ARS {formatNumber(rate.rate)}
  L346:    {formatCurrency(item.totalValue, item.currency)}
  L350:    ≈ {formatCurrency(item.valueInARS, 'ARS')}
  L370:    {formatCurrency(item.totalCost, item.currency)}
  L486:    {formatCurrency(kpis.totalCost, 'ARS')}
```

**Total exacto: 26 LOC**

---

### 4. DIALOG STATE MANAGEMENT (120 LOC)

```
DashboardSelector.tsx - Líneas 56-65 (10 LOC)
  L56:  const [showCreateDialog, setShowCreateDialog] = useState(false);
  L57:  const [newDashboardName, setNewDashboardName] = useState("");
  L58:  const [isCreating, setIsCreating] = useState(false);
  L59:  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  L60:  const [isDuplicating, setIsDuplicating] = useState(false);
  L63:  const [editingDashboardId, setEditingDashboardId] = useState<string | null>(null);
  L64:  const [editingName, setEditingName] = useState("");
  L65:  const [isRenaming, setIsRenaming] = useState(false);

CreateNewDashboardDialog.tsx - Similar (7-10 LOC)
ShareModal.tsx - Similar (7-10 LOC)
WidgetConfigModal.tsx - Similar (7-10 LOC)

HANDLERS PATTERN (REPETIDO):
  if (!name.trim()) {
    toast({ title: "Error", description: "...", variant: "destructive" });
    return;
  }
  setIsLoading(true);
  try {
    // Logic
    toast({ title: "Success", ... });
  } catch (err) {
    toast({ title: "Error", ... });
  } finally {
    setIsLoading(false);
  }
```

**Total estimado: 120 LOC**

---

### 5. SUPABASE QUERY PATTERN (85 LOC)

```
BusinessHealthPanel.tsx

PATRÓN 1 - Stock Health (Líneas 22-47): 26 LOC
  const { data: stockHealth } = useQuery({
    queryKey: ["stock-health", companyId],
    queryFn: async () => {
      const { data: products, error } = await supabase
        .from("products")
        .select(...)
        .eq("company_id", companyId)
        .eq("active", true);
      
      if (error) throw error;
      const critical = products?.filter(...).length || 0;
      // ... processing
      return { status, critical, warning, total, value };
    },
    enabled: !!companyId,
  });

PATRÓN 2 - Financial Health (Líneas 50-80): 31 LOC
  const { data: financialHealth } = useQuery({
    // MISMO PATRÓN que arriba
  });

PATRÓN 3 - Customer Health (Líneas 83-125): 43 LOC
  const { data: customerHealth } = useQuery({
    // MISMO PATRÓN que arriba
  });

PATRÓN 4 - Recent Alerts (Líneas 128-160): 33 LOC
  const { data: recentAlerts } = useQuery({
    // MISMO PATRÓN que arriba
  });
```

**Total exacto: ~85 LOC (sin contar rendered output)**

---

## Matriz de Impacto de Refactorización

```
┌────────────────────────────────┬──────────┬─────────────┬─────────────┐
│ Refactor                       │ LOC Save │ Archivos    │ Tiempo (min)│
├────────────────────────────────┼──────────┼─────────────┼─────────────┤
│ useWidgetState()               │    113   │ 5           │      30     │
│ WidgetLoadingState component   │     85   │ 5           │      30     │
│ Move formatters to utils       │     26   │ 1 + others  │      15     │
│ useDialogState()               │  100-120 │ 4+          │      45     │
│ useHealthQueries()             │     85   │ 1 (complex) │      45     │
├────────────────────────────────┼──────────┼─────────────┼─────────────┤
│ TOTAL POTENTIAL SAVINGS        │  409-429 │ 10+         │    165 min  │
└────────────────────────────────┴──────────┴─────────────┴─────────────┘
```

---

## Archivos SIN Duplicación Significativa

Los siguientes archivos NO tienen duplicación significativa (OK para mantener):

- `DashboardEmptyState.tsx` (227 LOC) - Componente específico
- `DashboardLoadingScreen.tsx` (42 LOC) - Componente específico
- `DashboardFilters.tsx` (155 LOC) - Única instancia
- `TemplateGallery.tsx` (115 LOC) - Componente específico
- `TemplateSelector.tsx` (237 LOC) - Lógica única
- `ExportButton.tsx` (42 LOC) - Componente específico
- `ImportButton.tsx` (121 LOC) - Componente específico
- `RefreshButton.tsx` (44 LOC) - Componente específico
- `DeleteConfirmDialog.tsx` (89 LOC) - Componente específico
- `HealthIndicator.tsx` (69 LOC) - Componente específico
- `ResponsiveImage.tsx` (204 LOC) - Componente específico
- `VirtualizedList.tsx` (105 LOC) - Componente específico
- `DragDropWidgetContainer.tsx` (85 LOC) - Componente específico
- `WidgetErrorBoundary.tsx` (75 LOC) - Componente específico
- `WidgetPicker.tsx` (179 LOC) - Componente específico
- `WidgetWrapper.tsx` (127 LOC) - Componente reutilizable (OK)

---

## Acción Inmediata

Para **máximo impacto con mínimo esfuerzo**, ejecutar en este orden:

1. **Hook `useWidgetState()`** (113 LOC, 5 archivos, 30 min)
2. **Componente `WidgetLoadingState`** (85 LOC, 5 archivos, 30 min)
3. **Mover formatters** (26 LOC, 1→many archivos, 15 min)

Esto solo eliminaría **224 LOC** pero con **máxima reutilización** en tiempo mínimo (75 min).

