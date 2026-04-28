# 🎯 REFERENCIA RÁPIDA - DASHBOARD FILES

**Uso**: Consultar rápidamente dónde está cada componente, hook o tipo  
**Actualizado**: 28 de abril de 2026

---

## 🔍 BÚSQUEDA RÁPIDA

### Busco un componente que...

| Necesito | Archivo | Líneas |
|----------|---------|--------|
| **Mostrar KPI/números** | `KpiWidget.tsx` | 120 |
| **Mostrar gráficos** | `ChartWidget.tsx` | 150 |
| **Mostrar tabla/lista** | `ListWidget.tsx` | 180 |
| **Mostrar tasas de cambio** | `CurrencyWidget.tsx` | 140 |
| **Editar dashboard** | `DashboardBuilder.tsx` (builder folder) | 220 |
| **Seleccionar dashboard** | `DashboardSelector.tsx` | 80 |
| **Filtrar datos** | `DashboardFilters.tsx` | 160 |
| **Agregar widget** | `WidgetPicker.tsx` | 90 |
| **Drag-drop widgets** | `EnhancedDragDropContainer.tsx` | 200 |
| **Ver plantillas** | `TemplateGallery.tsx` | 120 |
| **Compartir dashboard** | `ShareModal.tsx` | 100 |
| **Exportar dashboard** | `ExportButton.tsx` | 60 |
| **Importar dashboard** | `ImportButton.tsx` | 70 |
| **Subir CSV** | `CSVUploader.tsx` | 110 |

### Busco un hook que...

| Necesito | Archivo | Ubicación |
|----------|---------|-----------|
| **Cargar/guardar layout** | `useDashboardLayout` | `hooks/dashboard/useDashboardLayout.ts` |
| **Agregador de datos** | `useDashboardData` | `hooks/dashboard/useDashboardData.ts` |
| **Comparación mes a mes** | `useMonthlyComparison` | `hooks/dashboard/useMonthlyComparison.ts` |
| **Top productos** | `useTopProducts` | `hooks/dashboard/useTopProducts.ts` |
| **Top clientes** | `useTopCustomers` | `hooks/dashboard/useTopCustomers.ts` |
| **Cuentas por cobrar** | `useReceivables` | `hooks/dashboard/useReceivables.ts` |
| **Stock crítico** | `useCriticalStock` | `hooks/dashboard/useCriticalStock.ts` |
| **Tasas de cambio** | `useExchangeRates` | `hooks/dashboard/useExchangeRates.ts` |
| **Gráfico 7 días** | `useSevenDaysSalesChart` | `hooks/dashboard/useSevenDaysSalesChart.ts` |
| **Plantillas** | `useTemplates` | `hooks/dashboard/useTemplates.ts` |
| **Exportar** | `useExportDashboard` | `hooks/dashboard/useExportDashboard.ts` |
| **Importar** | `useImportDashboard` | `hooks/dashboard/useImportDashboard.ts` |
| **Link compartible** | `useShareLink` | `hooks/dashboard/useShareLink.ts` |
| **Filtros** | `useDashboardFilters` | `contexts/DashboardFilterContext.tsx` |
| **Widget context** | `useWidgetContext` | `contexts/WidgetContext.tsx` |

### Busco un tipo que...

| Necesito | Archivo | Tipo |
|----------|---------|------|
| **Config de dashboard** | `dashboard.ts` | `DashboardConfig` |
| **Widget en dashboard** | `dashboard.ts` | `DashboardWidget` |
| **Configuración de KPI** | `dashboard.ts` | `KPIWidgetConfig` |
| **Configuración de gráfico** | `dashboard.ts` | `ChartWidgetConfig` |
| **Configuración de tabla** | `dashboard.ts` | `TableWidgetConfig` |
| **Plantilla** | `dashboard.ts` | `DashboardTemplate` |
| **Filtros** | `DashboardFilterContext.tsx` | `DashboardFilters` |
| **Data de un widget** | `WidgetContext.tsx` | `WidgetData` |
| **Rango de fechas** | `DashboardFilterContext.tsx` | `DateRange` |

---

## 📁 ESTRUCTURA DE CARPETAS

```
src/
├─ components/
│  ├─ dashboard/                    ← Componentes de usuario (32 archivos)
│  │  ├─ DashboardBuilder.tsx       [PRINCIPAL - Orquestador]
│  │  ├─ DashboardSelector.tsx
│  │  ├─ DashboardFilters.tsx       ⚠️ Datos hardcodeados
│  │  ├─ KpiWidget.tsx             ← Números/KPIs
│  │  ├─ ChartWidget.tsx            ← Gráficos
│  │  ├─ ListWidget.tsx             ← Tablas (sin virtualizar)
│  │  ├─ CurrencyWidget.tsx         ← Tasas
│  │  ├─ CurrencyDashboard.tsx      ← 543 LOC (duplicado)
│  │  ├─ EnhancedDragDropContainer.tsx ← Drag-drop (sin keyboard nav)
│  │  ├─ WidgetErrorBoundary.tsx    ← Error boundary
│  │  ├─ WidgetPicker.tsx
│  │  ├─ TemplateGallery.tsx
│  │  ├─ ShareModal.tsx
│  │  ├─ ExportButton.tsx
│  │  ├─ ImportButton.tsx
│  │  ├─ CSVUploader.tsx            ⚠️ Sin validación
│  │  ├─ MetricBuilderModal.tsx
│  │  ├─ RefreshButton.tsx
│  │  └─ ... (19 más)
│  │
│  ├─ dashboard-builder/             ← Editor avanzado (5 archivos)
│  │  ├─ DashboardBuilder.tsx        [DIFERENTE del anterior!]
│  │  ├─ DashboardCanvas.tsx
│  │  ├─ PropertyPanel.tsx
│  │  ├─ FormulaEditor.tsx
│  │  └─ WidgetLibrary.tsx
│  │
│  └─ dashboard-widgets/             ← Renderizadores (3 archivos)
│     ├─ DashboardViewer.tsx
│     ├─ WidgetRenderer.tsx
│     └─ widgets/
│
├─ contexts/
│  ├─ DashboardFilterContext.tsx     [Filtros]
│  ├─ WidgetContext.tsx              [Data sharing]
│  ├─ CompanyContext.tsx
│  └─ TutorialContext.tsx
│
├─ hooks/
│  ├─ dashboard/                     ← 20 hooks específicos
│  │  ├─ index.ts                   [Exportador]
│  │  ├─ useDashboardLayout.ts      [CRÍTICO - Layout + CRUD]
│  │  ├─ useDashboardData.ts        [Agregador de queries]
│  │  ├─ useMonthlyComparison.ts
│  │  ├─ useTopProducts.ts
│  │  ├─ useTopCustomers.ts
│  │  ├─ useReceivables.ts
│  │  ├─ useCriticalStock.ts
│  │  ├─ useExchangeRates.ts        [Incluye históricos]
│  │  ├─ useSevenDaysSalesChart.ts
│  │  ├─ useExportDashboard.ts
│  │  ├─ useImportDashboard.ts
│  │  ├─ useTemplates.ts
│  │  ├─ useShareLink.ts
│  │  ├─ useMetricBuilder.ts
│  │  ├─ useCSVUpload.ts
│  │  ├─ useDashboardTableCheck.ts  [Validación]
│  │  ├─ useInvalidateDashboard.ts
│  │  └─ useMetricFormula.ts
│  │
│  ├─ useDashboardAPI.ts
│  ├─ useDashboardValidation.ts
│  ├─ useEnterpriseDashboard.ts
│  └─ useWidgetHealth.ts
│
├─ lib/dashboard/                   ← 25 librerías/utilidades
│  ├─ widgets.ts                    [Catálogo + migraciones]
│  ├─ templates.ts                  [Plantillas]
│  ├─ validation.ts                 [Validación]
│  ├─ widgetValidator.ts
│  ├─ widgetSystem.ts
│  ├─ errorHandling.ts              [Enterprise]
│  ├─ securityManager.ts
│  ├─ accessibilityManager.ts
│  ├─ performanceOptimization.ts
│  ├─ queryOptimization.ts
│  ├─ formulaEvaluator.ts
│  ├─ lazyLoading.tsx
│  ├─ design-tokens.ts
│  ├─ typeGuards.ts
│  └─ ... (10 más)
│
└─ types/
   └─ dashboard.ts                  [280+ LOC - Tipos principales]
```

---

## ⚡ ARCHIVO POR PROBLEMA

### Si tengo problema con... Busca en:

```
RENDIMIENTO (N+1 queries)
  → src/components/dashboard/DashboardBuilder.tsx [líneas 110-150]
  → src/hooks/dashboard/useDashboardData.ts [centralizar]

ACCESIBILIDAD
  → src/components/dashboard/DashboardFilters.tsx [agregar aria-label]
  → src/components/dashboard/EnhancedDragDropContainer.tsx [keyboard nav]

DUPLICACIÓN DE CÓDIGO
  → src/components/dashboard/CurrencyDashboard.tsx [543 LOC]
  → src/components/dashboard/CurrencyDashboardNew.tsx [400 LOC] ← ELIMINAR

DRAG-DROP SIN KEYBOARD
  → src/components/dashboard/EnhancedDragDropContainer.tsx [agregar onKeyDown]

TABLA NO VIRTUALIZA
  → src/components/dashboard/ListWidget.tsx [usar VirtualizedList]

DATOS HARDCODEADOS
  → src/components/dashboard/DashboardFilters.tsx [líneas 10-20]
  → src/components/dashboard/DashboardFilters.tsx [DIMENSION_VALUES]

CSV SIN VALIDACIÓN
  → src/components/dashboard/CSVUploader.tsx [falta validación]

FILTROS NO PERSISTEN
  → src/contexts/DashboardFilterContext.tsx [agregar localStorage]

ERROR EN WIDGET
  → src/components/dashboard/WidgetErrorBoundary.tsx [error handling]

LAYOUT NO SE GUARDA
  → src/hooks/dashboard/useDashboardLayout.ts [auto-save]
```

---

## 🔗 RUTAS DE IMPORTACIÓN RÁPIDAS

```typescript
// ✅ Componentes principais
import { DashboardBuilder } from '@/components/dashboard/DashboardBuilder';
import { KpiWidget } from '@/components/dashboard/KpiWidget';
import { ChartWidget } from '@/components/dashboard/ChartWidget';
import { ListWidget } from '@/components/dashboard/ListWidget';

// ✅ Contextos
import { useDashboardFilters } from '@/contexts/DashboardFilterContext';
import { useWidgetContext } from '@/contexts/WidgetContext';

// ✅ Hooks datos
import { useDashboardLayout } from '@/hooks/dashboard';
import { useDashboardData } from '@/hooks/dashboard/useDashboardData';
import { useMonthlyComparison } from '@/hooks/dashboard';
import { useTopProducts } from '@/hooks/dashboard';

// ✅ Tipos
import type { DashboardConfig, DashboardWidget } from '@/types/dashboard';
import type { KPIWidgetConfig } from '@/types/dashboard';

// ✅ Utilidades
import { WidgetValidator } from '@/lib/dashboard/widgetValidator';
import { WIDGET_CATALOG } from '@/lib/dashboard/widgets';
```

---

## 📊 ÁRBOL DE DEPENDENCIAS SIMPLIFICADO

```
DashboardBuilder.tsx [ENTRADA]
│
├─ useDashboardLayout          ← Gestiona widgets
│  └─ Supabase (dashboard_layouts)
│
├─ useDashboardData            ← Agregador de datos
│  ├─ useMonthlyComparison
│  ├─ useTopProducts
│  ├─ useTopCustomers
│  ├─ useReceivables
│  ├─ useCriticalStock
│  ├─ useExchangeRates
│  ├─ useHistoricalRates
│  └─ useSevenDaysSalesChart
│
├─ DashboardFilterContext      ← Filtros globales
│  └─ DateRange, Dimension, DimensionValue
│
├─ WidgetContext              ← Data sharing
│  └─ dataMap, definitions
│
└─ Componentes renderizados
   ├─ DashboardSelector
   ├─ DashboardFilters
   ├─ KpiWidget
   ├─ ChartWidget
   ├─ ListWidget
   ├─ CurrencyWidget
   ├─ WidgetPicker
   ├─ TemplateGallery
   ├─ ShareModal
   ├─ ExportButton
   ├─ ImportButton
   ├─ RefreshButton
   └─ EnhancedDragDropContainer
```

---

## 🎨 COLORES Y ESTADOS

### Estado de cada archivo

```
🟢 VERDE - Sin problemas conocidos
  ✅ DashboardEmptyState.tsx
  ✅ DashboardLoadingScreen.tsx
  ✅ DashboardStats.tsx
  ✅ WidgetErrorBoundary.tsx
  ✅ RefreshButton.tsx

🟡 AMARILLO - Mejoras sugeridas
  ⚠️ DashboardSelector.tsx (no filtra por permisos)
  ⚠️ TemplateGallery.tsx (podría lazy load)
  ⚠️ DashboardStats.tsx (performance)

🟠 NARANJA - Problemas conocidos
  ⚠️ DashboardFilters.tsx (datos hardcodeados)
  ⚠️ ListWidget.tsx (sin virtualización)
  ⚠️ CSVUploader.tsx (sin validación)
  ⚠️ EnhancedDragDropContainer.tsx (sin keyboard nav)

🔴 ROJO - Bloqueantes
  ❌ DashboardBuilder.tsx (N+1 queries)
  ❌ CurrencyDashboard.tsx (duplicado)
  ❌ CurrencyDashboardNew.tsx (duplicado - ELIMINAR)
  ❌ DashboardFilterContext.tsx (sin persistencia)
```

---

## 📈 MÉTRICAS RÁPIDAS

| Métrica | Actual | Target | Gap |
|---------|--------|--------|-----|
| Load time | 450ms | 200ms | -55% |
| Bundle size | 550KB | 500KB | -9% |
| A11y violations | 12 | 0 | -100% |
| Test coverage | 45% | 80% | +78% |
| Re-renders (filter change) | 5-7 | 1-2 | -60% |
| N+1 queries | 8 | 1 | -87.5% |

---

## 🚀 QUICK START IMPLEMENTACIÓN

### Día 1 (3 horas)
```
[ ] 9:00 - Tarea 1.1: N+1 Queries (30 min)
[ ] 9:30 - Tarea 1.2: URL sync (15 min)
[ ] 9:45 - Tarea 1.3: Dynamic dimensions (20 min)
[ ] 10:05 - Tarea 1.4: ARIA labels (15 min)
[ ] 10:20 - Testing & fixes (40 min)
```

### Día 2 (3.5 horas)
```
[ ] 9:00 - Tarea 1.5: Consolidar Currency (45 min)
[ ] 9:45 - Tarea 2.1: Keyboard nav (45 min)
[ ] 10:30 - Tarea 2.2: Virtualización (30 min)
[ ] 11:00 - Tarea 2.3: localStorage (20 min)
[ ] 11:20 - Testing (40 min)
```

### Día 3 (3.5 horas)
```
[ ] 9:00 - Tarea 2.4: CSV validation (30 min)
[ ] 9:30 - Tarea 3.1: Refactor layout (60 min)
[ ] 10:30 - Unit tests (60 min)
[ ] 11:30 - Fixes (30 min)
```

### Día 4 (2.5 horas)
```
[ ] 9:00 - Integration tests (90 min)
[ ] 10:30 - Documentation (30 min)
[ ] 11:00 - Final QA (30 min)
```

**Total**: ~12.5 horas (2 días intensos o 3-4 medio tiempo)

---

## ❓ PREGUNTAS FRECUENTES

### P: ¿Dónde está el componente principal?
**R**: `src/components/dashboard/DashboardBuilder.tsx` (220 LOC)

### P: ¿Dónde se cargan los datos?
**R**: `src/hooks/dashboard/useDashboardData.ts` (agregador)

### P: ¿Dónde se guardan los cambios?
**R**: `useDashboardLayout.ts` con auto-save a Supabase

### P: ¿Dónde están los tipos?
**R**: `src/types/dashboard.ts` (280+ LOC)

### P: ¿Cómo funciona el drag-drop?
**R**: `EnhancedDragDropContainer.tsx` con React.DnD

### P: ¿Por qué hay dos DashboardBuilder?
**R**: Uno es visor (`components/dashboard/`), otro es editor (`components/dashboard-builder/`)

### P: ¿Por qué hay dos CurrencyDashboard?
**R**: Bug - Son duplicados, hay que consolidar

### P: ¿Cómo se filtran los datos?
**R**: `DashboardFilterContext` → pasado a hooks de datos

### P: ¿Por qué 12 problemas encontrados?
**R**: Ver DASHBOARD_COMPREHENSIVE_ANALYSIS.md para detalles

### P: ¿Cuánto tiempo toma arreglarlo?
**R**: ~12.5 horas de desarrollo (2-3 días intensos)

---

## 🔗 LINKS RELACIONADOS

- `DASHBOARD_COMPREHENSIVE_ANALYSIS.md` - Análisis completo
- `DASHBOARD_FILES_INDEX.md` - Índice detallado
- `DASHBOARD_ACTION_PLAN.md` - Plan de implementación
- `DASHBOARD_SYSTEM.md` - Guía del sistema
- `DASHBOARD_ARCHITECTURE_PROPOSALS.md` - Propuestas

---

## ✅ VERSIÓN

- **Documento**: DASHBOARD_QUICK_REFERENCE.md
- **Fecha**: 28 de abril de 2026
- **Versión**: 1.0
- **Status**: 🟢 Producción

