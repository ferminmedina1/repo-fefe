# 🏗️ Dashboard Architecture Proposals
**Senior Frontend Engineer Recommendations**  
**April 20, 2026**

---

## PROPUESTA 1: NUEVA ARQUITECTURA DE COMPONENTES

### ACTUAL (Problema)
```
DashboardBuilder (320 LOC)
├─ LOCAL STATE (10 hooks)
├─ BUSINESS LOGIC (mixed)
├─ RENDERING (mixed)
├─ MODALS (3)
└─ DATA FETCHING (5+ queries)

RESULTADO: Componente monolítico, difícil de testear
```

### PROPUESTO (Solución)

```
DashboardPage
├─ LayoutLoader
│  └─ DashboardLayout (orchestrator)
│     ├─ DashboardHeader (title, refresh, export)
│     ├─ DashboardToolbar (filters, picker, actions)
│     ├─ WidgetProvider (context + data)
│     │  ├─ DragDropZone
│     │  │  └─ SortableWidget[] (presentation)
│     │  │     └─ WidgetRenderer (dispatcher)
│     │  │        └─ <KPI|Chart|List> (specific)
│     │  └─ WidgetModals
│     │     ├─ MetricBuilderModal
│     │     ├─ ShareModal
│     │     └─ CSVUploaderModal
│     └─ ErrorBoundary (fallback)
 
Context Providers (en orden):
  WidgetProvider      → dataMap, definitions
  DashboardFilterContext → filters
  WidgetModalContext  → modal state

BENEFICIOS:
✅ Single Responsibility Principle
✅ Testable (cada componente 50-100 LOC)
✅ Reusable (WidgetRenderer, WidgetProvider)
✅ Scalable (agregar widgets sin tocar core)
```

---

## PROPUESTA 2: DATA FETCHING STRATEGY

### OPCIÓN A: Declarativa + React Query (RECOMENDADO)
```typescript
// Single source of truth
const dashboardQueries = [
  { key: 'monthly-comparison', fetcher: fetchMonthlyComparison },
  { key: 'top-products', fetcher: fetchTopProducts },
  { key: 'top-customers', fetcher: fetchTopCustomers },
  // ...
];

// Auto-managed caching + synchronization
export function useDashboardData(companyId: string) {
  const results = useQueries({
    queries: dashboardQueries.map(q => ({
      queryKey: [q.key, companyId],
      queryFn: () => q.fetcher(companyId),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes
    })),
  });
  
  return Object.fromEntries(
    dashboardQueries.map((q, i) => [q.key, results[i]])
  );
}

// En DashboardBuilder
const { 
  'monthly-comparison': monthlyComparison, 
  'top-products': topProducts, 
  // ... 
} = useDashboardData(companyId);
```

**Ventajas**:
- ✅ Automatic caching + deduplication
- ✅ Easy cache invalidation
- ✅ DevTools integration
- ✅ Stale-while-revalidate pattern

**Desventajas**:
- Curva de aprendizaje React Query

---

### OPCIÓN B: Manual + Suspense (ADVANCED)
```typescript
// Para poder render widgets en paralelo
const DATA_CACHE = new Map<string, Promise<any>>();

export function getCachedData(key: string, fetcher: () => Promise<any>) {
  if (!DATA_CACHE.has(key)) {
    DATA_CACHE.set(key, fetcher());
  }
  return DATA_CACHE.get(key)!;
}

// En widgets
export function KpiWidget({ definition }: Props) {
  const data = use(getCachedData(definition.id, () => 
    fetchData(definition.id)
  ));
  
  return <div>{data}</div>; // Suspense catches promise
}

// En parent
<Suspense fallback={<Skeleton />}>
  <KpiWidget definition={kpiDef} />
  <ChartWidget definition={chartDef} />
</Suspense>
```

**Ventajas**:
- ✅ Mejor UX (no espera todo, muestra componentes listos)
- ✅ Streaming ready
- ✅ Fine-grained control

**Desventajas**:
- ⚠️ React 18+ Suspense aún experimental
- Más complejo

---

### RECOMENDACIÓN
**OPCIÓN A (React Query)** temporalmente, luego migrar A OPCIÓN B cuando React 19 sea stable.

---

## PROPUESTA 3: WIDGET TYPING & ABSTRACTION

### Problema Actual
```typescript
// Cada widget define su interfaz
interface KpiWidgetProps {
  definition: KpiWidgetDefinition;
  data: MonthlyComparisonData | undefined;
  isLoading: boolean;
  onRemove?: () => void;
  isDragging?: boolean;
}

// 5 versiones diferentes de lo mismo!
```

### Solución: Generic Widget Component

```typescript
// lib/dashboard/types.ts
export type WidgetCategory = 'kpi' | 'chart' | 'list' | 'formula';

export interface GenericWidgetProps<T = any> {
  definition: WidgetDefinition & { category: WidgetCategory };
  data?: T;
  isLoading?: boolean;
  error?: Error;
  onRemove?: () => void;
  isDragging?: boolean;
}

// Define widget once
export const WIDGET_SPEC = {
  'kpi-monthly-sales': {
    category: 'kpi',
    dataSchema: MonthlyComparisonData,
    Component: KpiWidget,
    size: { default: '4x2', min: '2x2' },
  },
  'chart-top-products': {
    category: 'chart',
    dataSchema: z.array(z.object({ nombre: z.string(), total: z.number() })),
    Component: ChartWidget,
    size: { default: '6x4', min: '3x3' },
  },
  // ...
} as const;

// Type-safe usage
export function WidgetRenderer({ widgetId }: { widgetId: string }) {
  const spec = WIDGET_SPEC[widgetId as keyof typeof WIDGET_SPEC];
  if (!spec) return <WidgetNotFound />;
  
  const { definition, data } = useWidgetContext();
  const Component = spec.Component;
  const validatedData = spec.dataSchema.parse(data);
  
  return <Component definition={definition} data={validatedData} />;
}
```

**Beneficios**:
- ✅ Single source of truth (WIDGET_SPEC)
- ✅ Type safety (TypeScript infers types)
- ✅ Size constraints enforced
- ✅ Easy to add new widgets (declarative)

---

## PROPUESTA 4: ERROR HANDLING STRATEGY

### Current: Inconsistent
- Some widgets show error state
- Some hide errors
- Some show toast only
- Inconsistent UX

### Proposed: Layered Error Handling

```typescript
// Layer 1: Data Level (React Query)
const query = useQuery({
  // ...
  retry: 2, // Auto retry
  onError: (error) => {
    // Log to Sentry
    captureException(error);
  },
});

// Layer 2: Widget Level (Error Boundary)
export function WidgetErrorBoundary({ children }: Props) {
  return (
    <ErrorBoundary
      fallback={<WidgetErrorState />}
      onReset={() => queryClient.invalidateQueries()}
    >
      {children}
    </ErrorBoundary>
  );
}

// Layer 3: Layout Level (Toast)
export function DashboardLayout() {
  useEffect(() => {
    if (hasErrors) {
      toast({
        title: '⚠️ Algunos widgets tienen errores',
        description: 'Intenta actualizar o contacta soporte',
        duration: 5000,
      });
    }
  }, [hasErrors]);
}

// Result UX:
// - Widget shows error state (Layer 2)
// - Toast notifies user (Layer 3)
// - Error logged to Sentry (Layer 1)
// - User can retry or dismiss
```

**Ventajas**:
- ✅ Graceful degradation (1 widget fail ≠ whole dashboard fail)
- ✅ User informed but not overwhelmed
- ✅ Error tracking for debugging

---

## PROPUESTA 5: RESPONSIVE & LAYOUT SYSTEM

### Current Problem
```typescript
// Items stack vertically only
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
// All same height

// Issues:
// - Large charts next to small KPIs = wasted space
// - No customization
// - Hard to implement 12-column grid
```

### Proposed: CSS Grid + Tailwind Config

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      gridTemplateColumns: {
        'dashboard': 'repeat(auto-fit, minmax(300px, 1fr))',
        'dashboard-strict': 'repeat(12, 1fr)',
      },
      gridAutoRows: {
        'widget': 'minmax(200px, auto)',
      },
    },
  },
};

// Usage
<div className="grid grid-cols-dashboard-strict gap-4 lg:gap-6">
  {widgets.map(widget => (
    <div 
      key={widget.id}
      style={{
        gridColumn: `span ${widget.span || 4}`,
        gridRow: `span ${widget.height || 2}`,
      }}
    >
      <WidgetRenderer widgetId={widget.id} />
    </div>
  ))}
</div>

// Result:
// ✅ Responsive (auto-fit)
// ✅ 12-column system (strict version)
// ✅ Customizable per widget
// ✅ Mobile-friendly (stacks on small screens)
```

---

## PROPUESTA 6: TESTING STRATEGY

### Pyramid Recomendada
```
          △ E2E (Cypress)
         △△ Integration (React Testing Library)
        △△△ Unit (Vitest)
      △△△△△△ Types (TypeScript)

Ratio: 10% E2E : 30% Integration : 60% Unit
```

### Unit Tests (por componente)
```typescript
// components/dashboard/KpiWidget.test.tsx
import { render, screen } from '@testing-library/react';
import { KpiWidget } from './KpiWidget';

describe('KpiWidget', () => {
  it('displays value from data', () => {
    render(
      <KpiWidget 
        definition={MOCK_DEFINITION}
        data={{ currentMonth: 100, lastMonth: 80 }}
      />
    );
    
    screen.getByText('$100');
  });
  
  it('shows loading skeleton', () => {
    render(
      <KpiWidget 
        definition={MOCK_DEFINITION}
        isLoading={true}
      />
    );
    
    screen.getByRole('status', { hidden: true });
  });
  
  it('handles null data gracefully', () => {
    render(
      <KpiWidget 
        definition={MOCK_DEFINITION}
        data={null}
      />
    );
    
    screen.getByText('Sin datos');
  });
});
```

### Integration Tests (flujos)
```typescript
// __tests__/dashboard.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from './DashboardLayout';

describe('Dashboard Integration', () => {
  it('loads and displays all widgets', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardLayout companyId="test-123" />
      </QueryClientProvider>
    );
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Top Products')).toBeInTheDocument();
    });
  });
  
  it('handles widget removal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardLayout companyId="test-123" />
      </QueryClientProvider>
    );
    
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Total Revenue')).not.toBeInTheDocument();
    });
  });
});
```

---

## PROPUESTA 7: PERFORMANCE MONITORING

### Web Vitals
```typescript
// lib/analytics/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function initPerformanceMonitoring() {
  getCLS(metric => logMetric('CLS', metric.value));
  getFID(metric => logMetric('FID', metric.value));
  getFCP(metric => logMetric('FCP', metric.value));
  getLCP(metric => logMetric('LCP', metric.value));
  getTTFB(metric => logMetric('TTFB', metric.value));
}

export function logMetric(name: string, value: number) {
  console.log(`${name}: ${value.toFixed(2)}ms`);
  
  // Send to your analytics backend
  fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({ name, value, timestamp: Date.now() }),
  });
}
```

### React DevTools Profiler
```typescript
// components/dashboard/DashboardLayout.tsx
export const DashboardLayout = React.memo(({ companyId }: Props) => {
  // ...
});

// Use React DevTools Profiler tab to:
// ✅ See render times per component
// ✅ Identify unnecessary re-renders
// ✅ Compare before/after refactoring
```

### Render Count Tracking
```typescript
// hooks/useRenderCount.ts
export function useRenderCount(componentName: string) {
  const countRef = useRef(0);
  
  useEffect(() => {
    countRef.current++;
    console.log(`${componentName} rendered ${countRef.current} times`);
  });
  
  return countRef.current;
}

// Usage
export function KpiWidget(props: Props) {
  const renderCount = useRenderCount('KpiWidget');
  // If too high, optimize with useMemo/useCallback
}
```

---

## MATRIZ DECISIONES DE ARQUITECTURA

| Decisión | Opción A | Opción B | **Recomendación** |
|----------|----------|----------|------------------|
| **Data Fetching** | React Query | Suspense | Query (then Suspense) |
| **State Management** | Context | Zustand | Context (lightweight) |
| **Component API** | Props | Render Props | Props + Context |
| **Testing** | Vitest | Jest | Vitest (faster) |
| **Layout** | CSS Grid | Flexbox | Grid (12-col) |
| **Forms** | React Hook Form | Formik | RHF (smaller) |
| **Error Handling** | Try-catch | Error Boundary | Both (layered) |
| **Performance** | React.memo | useDeferredValue | Both (strategic) |

---

## TIMELINE ESTIMADO

```
WEEK 1:  Architecture setup (Context, component split)    
WEEK 2:  Security (math.js), Data consolidation               
WEEK 3:  Performance optimization                             
WEEK 4:  Cleanup, testing, documentation                     

Post-refactor: Easier to add features, maintain, scale
```

---

## RIESGOS & MITIGACIÓN

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|--------|-----------|
| Regression bugs | MEDIA | BAJO | Comprehensive testing |
| Performance degradation | BAJA | BAJO | Profiling before/after |
| Team confusion | MEDIA | BAJO | Documentation + pairing |
| Deployment issues | BAJA | MEDIO | Staging environment |

---

