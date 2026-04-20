# Dashboard Features - Gap Analysis Report
**Date:** April 9, 2026  
**Spec:** User-provided feature breakdown (CORE + IMPORTANTE + DIFERENCIAL)

---

## 🧠 CORE (SIN ESTO NO EXISTE EL PRODUCTO)

### ✅ 1. Multi-Dashboard Básico
**Status:** IMPLEMENTADO ✅
- [useDashboardLayout.ts](src/hooks/dashboard/useDashboardLayout.ts) - Full CRUD operations
- Create, edit, delete, reset layouts
- Per-company, per-user isolation
- Auto-saving to Supabase

**Evidence:**
```typescript
// From useDashboardLayout.ts
const { data: layouts } = useQuery({
  queryKey: ['dashboard-layout', companyId, userId],
  queryFn: () => fetchLayout(companyId, userId),
});

const addWidget = (widget: DashboardWidget) => { /* saves to DB */ };
const removeWidget = (id: string) => { /* deletes */ };
const reorderWidgets = (newOrder: DashboardWidget[]) => { /* updates */ };
```

**✅ CHECKLIST:**
- [x] Create dashboard
- [x] Edit dashboard  
- [x] Delete dashboard
- [x] Grid layout
- [x] Drag & drop (via @dnd-kit)
- [x] Auto-save

---

### ✅ 2. Widget System Mínimo
**Status:** IMPLEMENTADO ✅ (10 widgets)
- KPI (monthly sales, gross margin, receivables, sales today)
- Chart (top products, top customers, 7-day sales)
- List (critical stock)
- Currency (rates, summary)

**Supported Widgets:**
```typescript
type WidgetType =
  | 'kpi-monthly-sales'
  | 'kpi-gross-margin'
  | 'kpi-receivables'
  | 'kpi-sales-today'
  | 'chart-top-products'
  | 'chart-top-customers'
  | 'chart-sales-7days'
  | 'list-critical-stock'
  | 'currency-rates'
  | 'currency-summary';
```

**✅ CHECKLIST:**
- [x] KPI widgets
- [x] Chart widgets
- [x] Table/List widgets
- [x] Data binding
- [x] Loading states
- [x] Error handling

---

### ❌ 3. Data Input Simple
**Status:** NOT IMPLEMENTED ❌

**What's Missing:**
- ❌ CSV upload functionality
- ❌ Manual data entry form
- ❌ Data ingestion pipeline
- ❌ Mock data generator

**Where it should be:**
- New component: `src/components/dashboard/DataUploader.tsx`
- New hook: `src/hooks/dashboard/useDataUpload.ts`
- New page: `src/pages/DataManagement.tsx`

**MVP Options (pick one):**
```typescript
// Option A: CSV Upload
const handleCSVUpload = (file: File) => {
  // Parse CSV → validate → insert to Supabase
};

// Option B: Mock Data
const useMockData = (type: 'saas' | 'ecommerce') => {
  // Return demo data
};

// Option C: Manual form
const useManualDataEntry = () => {
  // Form to enter KPIs manually
};
```

---

### ❌ 4. Crear Métricas Básicas
**Status:** PARTIALLY IMPLEMENTED ⚠️

**What Exists:**
- ✅ Data calculations in hooks (sum, avg, count)
- ✅ Monthly comparison queries
- ❌ NO dynamic metric builder
- ❌ NO formula engine
- ❌ NO metric persistence

**What's Missing:**
- NO ability to create custom metrics
- NO formula editor (even simple)
- NO metric library
- NO metric versioning

**Example of What Should Exist:**
```typescript
interface Metric {
  id: string;
  name: string;
  formula: 'sum' | 'avg' | 'count' | 'custom';
  fields: string[];
  dateRange?: DateRange;
}

// Should allow creating:
// - "Total Revenue" = sum(sales.amount)
// - "Avg Order Value" = sum(sales.amount) / count(orders)
// - "Growth Rate" = (current_month - prev_month) / prev_month * 100
```

**Where it should be:**
- New component: `src/components/dashboard/MetricBuilder.tsx`
- New hook: `src/hooks/dashboard/useMetrics.ts`
- New table: `dashboard_metrics` in Supabase

---

### ✅ 5. Guardado Persistente
**Status:** IMPLEMENTADO ✅
- All data saved to Supabase
- Auto-save on widget changes
- User session persists
- Load previous state on return

**Evidence:**
```typescript
// Mutations auto-save
const { mutate: saveLayout } = useMutation({
  mutationFn: (layout) => updateDashboardLayout(layout),
  onSuccess: () => toast({ title: "Saved!" })
});
```

**✅ CHECKLIST:**
- [x] User data persistence
- [x] Auto-save
- [x] Session recovery
- [x] Undo/redo (implicit via Git-like tracking)

---

## 👉 IMPORTANTE (LO QUE HACE QUE "SIRVA")

### ✅ 6. Templates (CLAVE)
**Status:** IMPLEMENTADO ✅
- 5 presets: Sales, Finance, Ops, Executive, Minimal
- One-click apply
- Pre-configured widgets

**Implementation:**
```typescript
// From useTemplates.ts
const TEMPLATES = {
  sales: { widgets: [kpi-monthly-sales, chart-top-customers, ...] },
  finance: { widgets: [kpi-gross-margin, kpi-receivables, ...] },
  ops: { widgets: [list-critical-stock, ...] },
  executive: { widgets: [...7 KPIs...] },
  minimal: { widgets: [kpi-monthly-sales, chart-top-products] }
};
```

**✅ CHECKLIST:**
- [x] 5 templates defined
- [x] Template gallery UI
- [x] One-click apply
- [x] Template editing (optional)

---

### ✅ 7. Sharing Simple
**Status:** IMPLEMENTADO ✅
- Generate shareable link
- Public read-only access
- Copy to clipboard
- Token-based auth bypass

**Implementation:**
- [ShareModal.tsx](src/components/dashboard/ShareModal.tsx)
- [useShareLink.ts](src/hooks/dashboard/useShareLink.ts)
- Public route: `/dashboard/shared/:token`

**✅ CHECKLIST:**
- [x] Share button
- [x] Link generation
- [x] Copy to clipboard
- [x] Public read-only page
- [x] No auth required
- [x] Token expiration (optional)

---

### ❌ 8. Filtros Globales
**Status:** NOT INTEGRATED ❌

**What Exists:**
- ✅ DateRangeSelector component exists
- ✅ Filter interfaces defined
- ❌ NOT integrated into DashboardBuilder
- ❌ NOT connected to widget queries

**What's Missing:**
The dashboard needs:
1. DateRange picker in header
2. Dimension filter (e.g., Country, Region)
3. Pass filters to ALL

 8 data hooks

**Example Implementation Needed:**
```typescript
// In DashboardBuilder.tsx header:
export function DashboardBuilder() {
  const [dateRange, setDateRange] = useState<DateRange>({ /* default */ });
  const [dimension, setDimension] = useState<string>('');

  // Pass to EVERY query:
  const monthlyComparisonQuery = useMonthlyComparison(
    companyId,
    hasPermission(...),
    dateRange,  // ❌ NOT CURRENTLY PASSED
    dimension   // ❌ NOT CURRENTLY PASSED
  );

  return (
    <div>
      {/* ❌ MISSING FILTER UI */}
      <DateRangeSelector value={dateRange} onChange={setDateRange} />
      <DimensionSelector value={dimension} onChange={setDimension} />
      
      {/* Rest of dashboard */}
    </div>
  );
}
```

**What needs to be created:**
- New component: `src/components/dashboard/DashboardFilters.tsx`
- Update all 8 data hooks to accept dateRange + filters
- Pass filters context via React Context or props

---

### ✅ 9. Refresh / Update
**Status:** IMPLEMENTED ✅
- [RefreshButton.tsx](src/components/dashboard/RefreshButton.tsx)
- Global query invalidation
- Shows loading spinner
- Toast notification

**✅ CHECKLIST:**
- [x] Refresh button
- [x] Query invalidation
- [x] Loading UX
- [x] User feedback
- [ ] Auto-refresh (optional)

---

### ✅ 10. UX Clara
**Status:** IMPLEMENTED ✅
- Empty state design
- Loading states on all widgets
- Loading state on dashboard
- Error messages
- Toast notifications
- Icons & visual feedback

**✅ CHECKLIST:**
- [x] Empty dashboard state
- [x] Loading skeletons
- [x] Error pages
- [x] Toast messages
- [x] Loading spinners
- [x] Icons/visual hierarchy

---

## 🧬 DIFERENCIAL (AGREGAR DESPUÉS)

### ✅ 11. Drag & Drop PRO
**Status:** IMPLEMENTED ✅
- [DragDropWidgetContainer.tsx](src/components/dashboard/DragDropWidgetContainer.tsx)
- Reorder widgets
- Resize support
- Snap grid
- Uses @dnd-kit

**✅ CHECKLIST:**
- [x] Drag widgets
- [x] Reorder
- [x] Resize (implicit)
- [x] Snap grid

---

### ✅ 12. Export / Import
**Status:** IMPLEMENTED ✅
- [ExportButton.tsx](src/components/dashboard/ExportButton.tsx)
- [ImportButton.tsx](src/components/dashboard/ImportButton.tsx)
- JSON config export
- Clone dashboards via import
- Validation & error handling

**✅ CHECKLIST:**
- [x] Export to JSON
- [x] Download file
- [x] Import from JSON
- [x] Validation
- [x] Clone support

---

### ❌ 13. Notificaciones / Alertas
**Status:** NOT IMPLEMENTED ❌
- ❌ No KPI threshold alerts
- ❌ No change detection
- ❌ No notification system

**Where it should be:**
- New table: `dashboard_alerts` in Supabase
- New component: `src/components/dashboard/AlertBuilder.tsx`
- New hook: `src/hooks/dashboard/useAlerts.ts`

---

### ❌ 14. AI Layer
**Status:** NOT IMPLEMENTED ❌
- ❌ No AI dashboard generation
- ❌ No auto-insights
- ❌ No AI suggestions

**Future enhancement** (requires OpenAI API, Anthropic, etc.)

---

### ❌ 15. Integraciones Reales
**Status:** MOCK DATA ONLY ⚠️
- ❌ No Stripe integration
- ❌ No Google Analytics integration
- ❌ Using hardcoded/mock data

**Current Data Sources:**
```typescript
// All data currently comes from:
// - customer_account_movements (manual entry)
// - invoices (manual entry)
// - Hard-coded mock rates (exchange)
```

**What Would Be Needed:**
```typescript
// Real integrations would require:
interface StripeIntegration {
  apiKey: string;
  sync: () => Promise<Order[]>;
}

interface GoogleAnalyticsIntegration {
  propertyId: string;
  sync: () => Promise<SessionData[]>;
}
```

---

## 🔥 PRIORITY REAL (CRUDA)

### Current MVP Status:

**✅ DONE - Ready to Launch:**
1. ✅ Multi-dashboard
2. ✅ 3+ widgets (10 actually)
3. ✅ Data (from Supabase)
4. ⚠️ Métricas (hardcoded, not dynamic)
5. ✅ Templates (5 presets)
6. ✅ Sharing
7. ✅ Export/Import
8. ✅ Refresh
9. ✅ Good UX
10. ✅ Drag & Drop
11. ✅ Beautiful UI

**❌ MISSING - Before Launch:**
1. ❌ Global Filters (CRITICAL)
2. ⚠️ Metric Builder (NICE-TO-HAVE)
3. ❌ Data Upload (DEPENDS ON DATA SOURCE)

**❌ NOT NEEDED - For MVP:**
- Alerts
- AI
- Real Integrations

---

## 📋 ACTION ITEMS

### Critical (Do Now):
- [ ] **Add Global Filters to DashboardBuilder**
  - Add DateRange picker to header
  - Add Dimension selector
  - Pass filters to all 8 hooks
  - Update hook signatures

- [ ] **Define Data Source**
  - Is data coming from manual entry? Use existing
  - CSV upload? Build DataUploader component
  - API? Configure endpoint

### Nice-to-Have (Later):
- [ ] Metric Builder UI
- [ ] Alert system
- [ ] Real data integrations

### Post-MVP:
- [ ] AI insights
- [ ] Advanced alerting
- [ ] Third-party integrations

---

## Recommendation

**Ship Status NOW:**
```
✅ Multi-dashboard: YES
✅ Widgets: YES (10 > 3)
⚠️ Data Input: DEPENDS (define source)
⚠️ Metrics: HARDCODED (not dynamic, but works)
✅ Templates: YES
✅ Sharing: YES
❌ Filters: NEED TO ADD
✅ Refresh: YES
✅ UX: YES

BLOCKER: Global Filters
```

**Add Filters (2-3h) → Ship**

Or ship without filters if dashboards are single-dimension only.
