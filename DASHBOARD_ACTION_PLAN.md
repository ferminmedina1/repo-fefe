# ✅ PLAN DE ACCIÓN - MEJORAS DASHBOARD

**Fecha**: 28 de abril de 2026  
**Versión**: 1.0  
**Status**: Listo para implementación  

---

## 🎯 OBJETIVOS

### Línea Base (Actual)
- ⚠️ Performance: 6.5/10
- ⚠️ Accesibilidad: 5/10
- ⚠️ Mantenibilidad: 7/10
- 📊 **Score Total: 6.2/10**

### Target (Post-Implementación)
- ✅ Performance: 9/10
- ✅ Accesibilidad: 9/10
- ✅ Mantenibilidad: 9/10
- 📊 **Score Target: 9/10**

---

## 📅 TIMELINE

| Semana | Tareas | Horas | Status |
|--------|--------|-------|--------|
| Semana 1 (28 Apr - 4 May) | Fixes críticos | 12h | 🔴 Por hacer |
| Semana 2 (5 - 11 May) | Refactorización media | 16h | 🔴 Por hacer |
| Semana 3 (12 - 18 May) | Features nuevas | 12h | 🔴 Por hacer |
| Semana 4 (19 - 25 May) | Testing + docs | 10h | 🔴 Por hacer |

**Total estimado**: 50 horas (6-7 días desarrollador)

---

## 🔴 FASE 1: FIXES CRÍTICOS (Semana 1)

### ✅ Tarea 1.1: Refactorizar N+1 Queries
**Archivo**: `src/components/dashboard/DashboardBuilder.tsx`  
**Dificultad**: 🟢 Fácil  
**Tiempo**: 30 min  
**Prioridad**: 🔴 Crítico  

**Cambios**:
```typescript
// ❌ ANTES: 8 queries independientes
const monthlyComparisonQuery = useMonthlyComparison(...);
const topProductsQuery = useTopProducts(...);
const topCustomersQuery = useTopCustomers(...);
const receivablesQuery = useReceivables(...);
const criticalStockQuery = useCriticalStock(...);
const exchangeRatesQuery = useExchangeRates(...);
const historicalRatesQuery = useHistoricalRates(...);
const sevenDaysSalesChartQuery = useSevenDaysSalesChart(...);

// ✅ DESPUÉS: Una sola query agregada
const { data, isLoading, error } = useDashboardData(currentCompany?.id, filters);

// Acceder a datos específicos
data.get('kpi-monthly-sales')
data.get('top-products')
// ... etc
```

**Steps**:
- [ ] Paso 1: Abrir `src/components/dashboard/DashboardBuilder.tsx`
- [ ] Paso 2: Comentar los 8 useXxx hooks (líneas ~110-150)
- [ ] Paso 3: Agregar `const { data, isLoading, error } = useDashboardData(...);`
- [ ] Paso 4: Reemplazar referencias de `monthlyComparisonQuery.data` por `data.get('kpi-monthly-sales')`
- [ ] Paso 5: Test en navegador - verificar que datos cargan igual
- [ ] Paso 6: Abrir DevTools Network - verificar solo 1-2 queries en lugar de 8
- [ ] Paso 7: Commit: "perf: consolidate 8 queries into single useDashboardData hook"

**Verificación**:
```bash
# Antes
Network tab: 8 queries, 800ms load time

# Después
Network tab: 1-2 queries, 200ms load time (4x más rápido)
```

---

### ✅ Tarea 1.2: Sincronizar URL + Estado Local
**Archivo**: `src/components/dashboard/DashboardBuilder.tsx`  
**Dificultad**: 🟢 Fácil  
**Tiempo**: 15 min  
**Prioridad**: 🔴 Crítico  

**Cambios**:
```typescript
// ❌ ANTES: Duplicado
const [selectedDashboardId, setSelectedDashboardId] = useState<string | undefined>(() => {
  return searchParams.get("dashboard") || undefined;
});

// useEffect para sincronizar URL
useEffect(() => {
  const dashboardParam = searchParams.get("dashboard");
  if (dashboardParam) {
    setSelectedDashboardId(dashboardParam);
  }
}, [searchParams]);

// ✅ DESPUÉS: Single source of truth
const selectedDashboardId = searchParams.get("dashboard") || undefined;

// Para cambiar dashboard
const handleDashboardChange = (newDashboardId: string) => {
  navigate(`?dashboard=${newDashboardId}`);
};
```

**Steps**:
- [ ] Paso 1: Reemplazar `const [selectedDashboardId, setSelectedDashboardId]` por variable simple
- [ ] Paso 2: Remover `useEffect` de sincronización (líneas ~85-95)
- [ ] Paso 3: Actualizar `handleDashboardChange` para usar `navigate`
- [ ] Paso 4: Test: Cambiar de dashboard, refrescar página - debe mantener dashboard seleccionado
- [ ] Paso 5: Test: Compartir URL con ?dashboard=xxx - debe cargar ese dashboard
- [ ] Paso 6: Commit: "refactor: use URL as single source of truth for selectedDashboardId"

---

### ✅ Tarea 1.3: Cargar Dimensiones desde BD
**Archivo**: `src/components/dashboard/DashboardFilters.tsx`  
**Dificultad**: 🟢 Fácil  
**Tiempo**: 20 min  
**Prioridad**: 🔴 Crítico  

**Cambios**:

**Paso 1**: Crear hook `src/hooks/dashboard/useDashboardDimensions.ts`
```typescript
export function useDashboardDimensions(companyId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard-dimensions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // Fetch unique values de cada dimensión
      const { data: countries } = await supabase
        .from('sales')
        .select('country')
        .eq('company_id', companyId)
        .distinct();
      
      const { data: categories } = await supabase
        .from('products')
        .select('category')
        .eq('company_id', companyId)
        .distinct();
      
      return {
        country: countries?.map(r => r.country) || [],
        product_category: categories?.map(r => r.category) || [],
        // ... más dimensiones
      };
    },
    enabled: !!companyId,
  });
}
```

**Paso 2**: Usar en DashboardFilters
```typescript
// ✅ ANTES: Mock hardcoded
const DIMENSIONS = [{ value: 'country', ... }];
const DIMENSION_VALUES = { country: ['US', 'UK', ...] };

// ✅ DESPUÉS: Desde BD
const { data: dimensions } = useDashboardDimensions(companyId);

// En render
{dimensions && Object.keys(dimensions).map(dim => (
  <SelectItem key={dim} value={dim}>{dim}</SelectItem>
))}
```

**Steps**:
- [ ] Paso 1: Crear `src/hooks/dashboard/useDashboardDimensions.ts`
- [ ] Paso 2: Implementar query que fetchea valores únicos
- [ ] Paso 3: Exportar en `src/hooks/dashboard/index.ts`
- [ ] Paso 4: Actualizar DashboardFilters para usar el hook
- [ ] Paso 5: Remover DIMENSIONS y DIMENSION_VALUES hardcodeados
- [ ] Paso 6: Test: Cambiar de empresa, verificar que dimensiones se cargan
- [ ] Paso 7: Commit: "feat: load dashboard dimensions from database"

---

### ✅ Tarea 1.4: Agregar ARIA Labels
**Archivo**: `src/components/dashboard/DashboardFilters.tsx`  
**Dificultad**: 🟢 Muy fácil  
**Tiempo**: 15 min  
**Prioridad**: 🟠 Alto  

**Cambios**:
```typescript
// ✅ Actualizar cada Select
<Select 
  value={filters.dimension || 'all'}
  onValueChange={(value) => handleDimensionChange(value === 'all' ? undefined : value)}
  aria-label="Dimensión para filtrado de dashboard"
  aria-describedby="dimension-help"
>
  <SelectValue placeholder="Selecciona una dimensión..." />
</Select>

{/* Descripción para screen readers */}
<p id="dimension-help" className="sr-only">
  Selecciona una dimensión para filtrar datos en el dashboard
</p>
```

**Steps**:
- [ ] Paso 1: Abrir `src/components/dashboard/DashboardFilters.tsx`
- [ ] Paso 2: Agregar `aria-label` a Select de dimensión
- [ ] Paso 3: Agregar `aria-label` a Select de valor
- [ ] Paso 4: Agregar `aria-label` a DateRangeSelector
- [ ] Paso 5: Agregar `aria-label` a botón Reset
- [ ] Paso 6: Test con screen reader (NVDA/JAWS)
- [ ] Paso 7: Commit: "a11y: add aria labels to dashboard filters"

**Checklist visual**:
```typescript
// DateRangeSelector
aria-label="Rango de fechas para el dashboard"

// Select dimensión
aria-label="Selecciona dimensión de filtrado"
aria-describedby="dimension-help"

// Select valor
aria-label="Selecciona valor de dimensión"

// Reset button
aria-label="Limpiar todos los filtros"
```

---

### ✅ Tarea 1.5: Consolidar CurrencyDashboard
**Archivo**: `src/components/dashboard/CurrencyDashboard.tsx` y `CurrencyDashboardNew.tsx`  
**Dificultad**: 🟡 Medio  
**Tiempo**: 45 min  
**Prioridad**: 🟠 Alto  

**Análisis previo**:
```bash
# Contar LOC
wc -l src/components/dashboard/CurrencyDashboard.tsx     # 543
wc -l src/components/dashboard/CurrencyDashboardNew.tsx  # 400
# Total: 943 LOC, 400+ duplicados
```

**Steps**:
- [ ] Paso 1: Comparar ambos archivos lado a lado
  ```bash
  diff CurrencyDashboard.tsx CurrencyDashboardNew.tsx
  ```
- [ ] Paso 2: Identificar diferencias (máximo 50-100 LOC diferencias)
- [ ] Paso 3: Seleccionar versión mejor escrita (probablemente CurrencyDashboard.tsx)
- [ ] Paso 4: Fusionar features únicas de la otra versión
- [ ] Paso 5: Verificar que funcionalidad es igual
- [ ] Paso 6: Buscar imports de CurrencyDashboardNew
  ```bash
  grep -r "CurrencyDashboardNew" src/
  ```
- [ ] Paso 7: Actualizar esos imports a CurrencyDashboard
- [ ] Paso 8: Deletear `src/components/dashboard/CurrencyDashboardNew.tsx`
- [ ] Paso 9: Test: Dashboard debe funcionar igual
- [ ] Paso 10: Commit: "refactor: consolidate CurrencyDashboard into single component"

---

## 🟠 FASE 2: REFACTORIZACIÓN MEDIA (Semana 2)

### ✅ Tarea 2.1: Keyboard Navigation en Drag-Drop
**Archivo**: `src/components/dashboard/EnhancedDragDropContainer.tsx`  
**Dificultad**: 🟡 Medio  
**Tiempo**: 45 min  
**Prioridad**: 🟠 Alto  

**Cambios**:
```typescript
const handleKeyDown = (e: React.KeyboardEvent, widgetId: string) => {
  switch (e.key) {
    case 'ArrowUp':
      e.preventDefault();
      const currentIndex = widgets.findIndex(w => w.id === widgetId);
      if (currentIndex > 0) {
        reorderWidgets(currentIndex, currentIndex - 1);
      }
      break;
      
    case 'ArrowDown':
      e.preventDefault();
      const index = widgets.findIndex(w => w.id === widgetId);
      if (index < widgets.length - 1) {
        reorderWidgets(index, index + 1);
      }
      break;
      
    case 'Enter':
      e.preventDefault();
      openWidgetConfig(widgetId);
      break;
      
    case 'Delete':
      e.preventDefault();
      showConfirmDelete(widgetId);
      break;
  }
};

// En JSX
<div
  draggable
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  onKeyDown={(e) => handleKeyDown(e, widgetId)}
  tabIndex={0}
  role="button"
  aria-pressed={isDragging}
  aria-label={`Widget ${widget.name}, arrastra para reordenar o presiona Enter para editar`}
>
  {children}
</div>
```

**Steps**:
- [ ] Paso 1: Abrir `src/components/dashboard/EnhancedDragDropContainer.tsx`
- [ ] Paso 2: Crear función `handleKeyDown`
- [ ] Paso 3: Agregar listeners `onKeyDown`, `tabIndex={0}`, `role="button"`
- [ ] Paso 4: Agregar aria attributes
- [ ] Paso 5: Test con teclado (Tab → Focus → Arrow keys)
- [ ] Paso 6: Test con screen reader
- [ ] Paso 7: Commit: "a11y: add keyboard navigation to drag-drop widgets"

---

### ✅ Tarea 2.2: Usar VirtualizedList en ListWidget
**Archivo**: `src/components/dashboard/ListWidget.tsx`  
**Dificultad**: 🟡 Medio  
**Tiempo**: 30 min  
**Prioridad**: 🟠 Alto  

**Cambios**:
```typescript
import { VirtualizedList } from '../VirtualizedList';

export function ListWidget({ data, columns, ...props }: Props) {
  // Para datasets pequeños, mostrar normalmente
  if (data.length < 50) {
    return <RegularTable data={data} columns={columns} />;
  }
  
  // Para datasets grandes, usar virtualización
  return (
    <VirtualizedList
      items={data}
      itemHeight={48}
      height={500}
      renderItem={(item, index) => (
        <tr key={item.id}>
          {columns.map(col => (
            <td key={col.key}>{item[col.key]}</td>
          ))}
        </tr>
      )}
    />
  );
}
```

**Steps**:
- [ ] Paso 1: Revisar `src/components/dashboard/VirtualizedList.tsx`
- [ ] Paso 2: Entender cómo funciona
- [ ] Paso 3: Agregar import en ListWidget
- [ ] Paso 4: Condicionar visualización (pequeño vs grande)
- [ ] Paso 5: Test con dataset de 100+ filas
- [ ] Paso 6: Verificar scroll performance
- [ ] Paso 7: Commit: "perf: add virtualization to ListWidget for large datasets"

---

### ✅ Tarea 2.3: Persistencia de Filtros en localStorage
**Archivo**: `src/contexts/DashboardFilterContext.tsx`  
**Dificultad**: 🟢 Fácil  
**Tiempo**: 20 min  
**Prioridad**: 🟡 Medio  

**Cambios**:
```typescript
// ✅ Usar hook useLocalStorage (si existe) o implementar
const useLocalStorage = (key: string, initialValue: any) => {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.error('Failed to save to localStorage');
    }
  }, [value, key]);

  return [value, setValue];
};

// En DashboardFilterProvider
export function DashboardFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useLocalStorage('dashboard-filters', {
    dateRange: getDefaultDateRange(),
  });

  // ... resto igual
}
```

**Steps**:
- [ ] Paso 1: Crear hook `useLocalStorage` si no existe
- [ ] Paso 2: Usar en DashboardFilterProvider
- [ ] Paso 3: Test: Cambiar filtros, refrescar página
- [ ] Paso 4: Verificar que filtros persisten
- [ ] Paso 5: Limpiar localStorage con botón Reset
- [ ] Paso 6: Commit: "feat: persist dashboard filters in localStorage"

---

### ✅ Tarea 2.4: Validación en CSV Import
**Archivo**: `src/components/dashboard/CSVUploader.tsx`  
**Dificultad**: 🟡 Medio  
**Tiempo**: 30 min  
**Prioridad**: 🟠 Alto  

**Cambios**:
```typescript
import { validateCSV, type CSVValidationResult } from '@/lib/dashboard/validation';

const handleFileUpload = async (file: File) => {
  try {
    const text = await file.text();
    const lines = text.split('\n');
    
    // ✅ Validar CSV
    const validation = validateCSV(text);
    if (!validation.valid) {
      toast({
        title: "❌ CSV inválido",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return;
    }
    
    // ✅ Mostrar preview
    setPreview(lines.slice(0, 10));
    
    // Usuario confirma
    setShowPreview(true);
  } catch (err) {
    toast({
      title: "❌ Error",
      description: "No se pudo leer el archivo",
      variant: "destructive"
    });
  }
};
```

**Validaciones a implementar**:
- [ ] CSV tiene headers
- [ ] Headers no son vacíos
- [ ] Al menos 1 fila de datos
- [ ] Datos coinciden con tipos esperados
- [ ] No hay valores NULL en campos requeridos

**Steps**:
- [ ] Paso 1: Crear función `validateCSV` en `src/lib/dashboard/validation.ts`
- [ ] Paso 2: Implementar todas las validaciones
- [ ] Paso 3: Usar en CSVUploader
- [ ] Paso 4: Mostrar preview antes de importar
- [ ] Paso 5: Test con CSV inválido
- [ ] Paso 6: Commit: "feat: add CSV validation and preview"

---

## 🟡 FASE 3: FEATURES NUEVAS (Semana 3)

### ✅ Tarea 3.1: Refactorizar useDashboardLayout
**Archivo**: `src/hooks/dashboard/useDashboardLayout.ts`  
**Dificultad**: 🟡 Medio  
**Tiempo**: 60 min  
**Prioridad**: 🟡 Medio  

**Objetivo**: Separar responsabilidades

**Dividir en 3 hooks**:

```typescript
// 1. useDashboardLayoutData - Fetch del layout
export function useDashboardLayoutData(
  userId: string | undefined,
  companyId: string | undefined,
  dashboardId?: string
) {
  return useQuery({...});
}

// 2. useDashboardLayoutMutations - Save/update
export function useDashboardLayoutMutations() {
  return {
    saveLayout: useMutation({...}),
    addWidget: useMutation({...}),
    removeWidget: useMutation({...}),
  };
}

// 3. useDashboardLayout - Agregador (para backward compatibility)
export function useDashboardLayout(companyId, userId, dashboardId) {
  const layoutData = useDashboardLayoutData(userId, companyId, dashboardId);
  const mutations = useDashboardLayoutMutations();
  // ... combinar y retornar
}
```

**Steps**:
- [ ] Paso 1: Crear `useDashboardLayoutData.ts`
- [ ] Paso 2: Crear `useDashboardLayoutMutations.ts`
- [ ] Paso 3: Actualizar `useDashboardLayout.ts` para agregar
- [ ] Paso 4: Verificar que API es compatible
- [ ] Paso 5: Test que todo funciona igual
- [ ] Paso 6: Commit: "refactor: split useDashboardLayout into separate concerns"

---

### ✅ Tarea 3.2: Dashboard History / Versioning
**Archivo**: New hook `src/hooks/dashboard/useDashboardHistory.ts`  
**Dificultad**: 🟠 Difícil  
**Tiempo**: 120 min  
**Prioridad**: 🟡 Medio  

**Objetivo**: Permitir ver/restaurar versiones anteriores

**Cambios en BD** (si no existen):
```sql
CREATE TABLE dashboard_versions (
  id UUID PRIMARY KEY,
  dashboard_id UUID NOT NULL REFERENCES dashboard_layouts(id),
  version_number INT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);
```

**Implementación**:
```typescript
export function useDashboardHistory(dashboardId: string | undefined) {
  // Fetch all versions
  const { data: versions } = useQuery({
    queryKey: ['dashboard-versions', dashboardId],
    queryFn: async () => {
      const { data } = await supabase
        .from('dashboard_versions')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('version_number', { ascending: false });
      return data;
    },
  });

  // Restore version
  const restoreMutation = useMutation({
    mutationFn: async (versionNumber: number) => {
      // Copiar versión anterior a current
      // Crear nueva versión de referencia
    },
  });

  return { versions, restore: restoreMutation };
}
```

**UI para versiones** (new component):
```typescript
// src/components/dashboard/DashboardVersionHistory.tsx
export function DashboardVersionHistory() {
  const { versions, restore } = useDashboardHistory(dashboardId);

  return (
    <div className="space-y-2">
      {versions?.map(v => (
        <div key={v.id} className="flex justify-between items-center p-2 border rounded">
          <span>{formatDate(v.created_at)}</span>
          <Button 
            size="sm"
            onClick={() => restore.mutate(v.version_number)}
          >
            Restaurar
          </Button>
        </div>
      ))}
    </div>
  );
}
```

---

### ✅ Tarea 3.3: Analytics y Telemetría
**Archivo**: New utility `src/lib/dashboard/analytics.ts`  
**Dificultad**: 🟠 Difícil  
**Tiempo**: 90 min  
**Prioridad**: 🟡 Medio  

**Eventos a trackear**:
```typescript
export const DashboardAnalytics = {
  // Widget events
  widgetAdded: (widgetType: string) => {...},
  widgetRemoved: (widgetType: string) => {...},
  widgetUpdated: (widgetType: string, changes: string[]) => {...},
  
  // Dashboard events
  dashboardCreated: (name: string) => {...},
  dashboardDeleted: (dashboardId: string) => {...},
  dashboardShared: (shareUrl: string) => {...},
  dashboardExported: (format: string) => {...},
  
  // Filter events
  filterApplied: (filterType: string) => {...},
  dateRangeChanged: (from: Date, to: Date) => {...},
  
  // Performance
  dashboardLoadTime: (ms: number) => {...},
  widgetRenderTime: (widgetId: string, ms: number) => {...},
};
```

---

## 🟢 FASE 4: TESTING Y DOCUMENTACIÓN (Semana 4)

### ✅ Tarea 4.1: Unit Tests para Hooks
**Archivo**: `__tests__/dashboard.hooks.test.ts`  
**Dificultad**: 🟡 Medio  
**Tiempo**: 60 min  
**Prioridad**: 🟡 Medio  

**Tests a escribir**:
```typescript
describe('Dashboard Hooks', () => {
  describe('useDashboardLayout', () => {
    it('should fetch dashboard layout', async () => {...});
    it('should save layout changes', async () => {...});
    it('should normalize widget types', async () => {...});
    it('should auto-save with debounce', async () => {...});
    it('should handle table not found error', async () => {...});
  });

  describe('useDashboardFilters', () => {
    it('should initialize with current month', () => {...});
    it('should reset filters', () => {...});
    it('should update date range', () => {...});
    it('should update dimension', () => {...});
  });

  describe('useDashboardData', () => {
    it('should aggregate all queries', async () => {...});
    it('should handle loading state', () => {...});
    it('should handle errors', () => {...});
  });
});
```

---

### ✅ Tarea 4.2: Integration Tests
**Archivo**: `__tests__/dashboard.integration.test.tsx`  
**Dificultad**: 🟠 Difícil  
**Tiempo**: 90 min  
**Prioridad**: 🟡 Medio  

**Scenarios a probar**:
- [ ] Crear dashboard → Cargar → Agregar widget → Guardar
- [ ] Cambiar filtros → Datos se actualizan en widgets
- [ ] Drag-drop widget → Se reordena en layout
- [ ] Exportar → Importar → Debe tener misma config
- [ ] Compartir link → Otro usuario puede ver
- [ ] Keyboard nav → Puedo reordenar sin mouse

---

### ✅ Tarea 4.3: E2E Tests
**Archivo**: Cypress test suite  
**Dificultad**: 🟠 Difícil  
**Tiempo**: 120 min  
**Prioridad**: 🟡 Medio  

**Tests e2e**:
```typescript
describe('Dashboard E2E', () => {
  it('should create and view dashboard', () => {
    cy.visit('/dashboard');
    cy.contains('Crear nuevo').click();
    cy.get('input[placeholder="Nombre"]').type('Mi Dashboard');
    cy.contains('Crear').click();
    cy.contains('Mi Dashboard').should('be.visible');
  });

  it('should filter data and update widgets', () => {
    cy.visit('/dashboard');
    cy.get('[aria-label="Dimensión para filtro"]').select('country');
    cy.get('[aria-label="Selecciona valor de dimensión"]').select('US');
    cy.get('[data-widget="kpi-monthly-sales"]').should('be.visible');
  });

  it('should export and import dashboard', () => {
    cy.visit('/dashboard');
    cy.contains('Exportar').click();
    cy.readFile('downloads/dashboard.json').should('exist');
    // ... import test
  });
});
```

---

### ✅ Tarea 4.4: Actualizar Documentación
**Archivo**: Updated docs  
**Dificultad**: 🟢 Fácil  
**Tiempo**: 60 min  
**Prioridad**: 🟢 Bajo  

**Docs a actualizar**:
- [ ] DASHBOARD_SYSTEM.md - Actualizar sección de rendimiento
- [ ] README.md - Agregar sección de accesibilidad
- [ ] Crear DASHBOARD_ACCESSIBILITY_GUIDE.md
- [ ] Crear DASHBOARD_TESTING_GUIDE.md
- [ ] Actualizar DASHBOARD_REFACTORING_ROADMAP.md

---

## 📊 CHECKLIST DE VALIDACIÓN

### Rendimiento
```
[ ] Página carga en < 2 segundos (sin cache)
[ ] Cambio de filtros actualiza widgets en < 500ms
[ ] Lista de 1000+ filas scrollea smooth (60 fps)
[ ] No hay N+1 queries en Network tab
[ ] Bundle size < 500KB (gzipped)
```

### Accesibilidad (WCAG AA)
```
[ ] Todos los inputs tienen labels asociados
[ ] Navegación funciona con teclado sola
[ ] Contraste de colores >= 4.5:1
[ ] Modales trappean focus
[ ] Screen reader soportado (NVDA)
[ ] Errores de validación anunciados
```

### UX/UI
```
[ ] Estados de carga mostrados (skeletons)
[ ] Errores mostrados con mensajes útiles
[ ] Confirmación antes de eliminaciones
[ ] Undo/redo funciona
[ ] Mobile responsive (< 768px)
```

### Testing
```
[ ] 80%+ coverage en componentes críticos
[ ] Todos los hooks tienen tests
[ ] Integration tests pasan
[ ] E2E tests pasan
[ ] No hay console errors
```

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Deployment
```
[ ] Todos los linters pasan (ESLint)
[ ] TypeScript no tiene errores
[ ] Tests pasan (unit + integration + e2e)
[ ] Build genera sin warnings
[ ] Performance budget no se excede
[ ] Accesibilidad checked (axe DevTools)
```

### Deployment
```
[ ] Create feature branch: git checkout -b dashboard/improvements
[ ] Push cambios: git push origin dashboard/improvements
[ ] Create PR con descripción detallada
[ ] Code review aprobado
[ ] Merge a main branch
[ ] Deploy a staging
[ ] QA testing en staging
[ ] Deploy a production
```

### Post-Deployment
```
[ ] Monitor error logs (Sentry)
[ ] Monitor performance (DataDog/New Relic)
[ ] Solicitar feedback de usuarios
[ ] Document changes en CHANGELOG.md
[ ] Update docs si es necesario
```

---

## 📞 RECURSOS

### Documentación
- `DASHBOARD_COMPREHENSIVE_ANALYSIS.md` - Análisis completo
- `DASHBOARD_FILES_INDEX.md` - Índice detallado
- `DASHBOARD_SYSTEM.md` - Guía del sistema
- WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

### Herramientas
- **Accesibilidad**: axe DevTools, WAVE, NVDA
- **Performance**: Chrome DevTools, Lighthouse, WebPageTest
- **Testing**: Vitest, React Testing Library, Cypress
- **CI/CD**: GitHub Actions

### Contactos
- Equipo de Frontend: [slack]
- Product Owner: [slack]
- QA Lead: [slack]

---

## 📈 MÉTRICAS DE ÉXITO

**Pre-Implementación**:
- Performance Score: 6.5/10
- Accessibility Score: 5/10
- Mantenibilidad: 7/10

**Post-Implementación (Target)**:
- Performance Score: 9/10 ✅
- Accessibility Score: 9/10 ✅
- Mantenibilidad: 9/10 ✅

**Métricas técnicas**:
- Render time: 450ms → 200ms (55% mejora)
- Bundle size: 550KB → 500KB (9% mejora)
- A11y violations: 12 → 0 (100% mejora)
- Test coverage: 45% → 80% (78% mejora)

---

## 🎯 CONCLUSIÓN

**Estado**: Listo para comenzar  
**Tiempo total estimado**: 50 horas (6-7 días)  
**Complejidad**: Media-Alta  
**Riesgo**: Bajo (cambios bien encapsulados)  

**Siguiente paso**: Iniciar Tarea 1.1 (Refactorizar N+1 Queries)

