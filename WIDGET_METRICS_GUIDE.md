# Widget Metrics System - Guía de Uso

## 🎯 Visión General

El sistema permite:
1. ✅ **Crear widgets** con métricas pre-hechas o personalizadas
2. ✅ **Editar métricas** sin eliminar el widget
3. ✅ **Menú discreto** con todas las acciones en arriba-derecha (flechita)

---

## 📊 Arquitectura de Componentes

### 1. **Métricas Pre-hechas** (`metricPresets.ts`)

Pre-configuradas con:
- Nombre y descripción
- Categoría (Sales, Inventory, Customers, Finance, Products)
- Icono y color
- Formato (currency, number, percentage, decimal)
- Unidad (ARS, USD, EUR, etc.)
- Tendencia (opcional)
- Fórmula por defecto

```typescript
export interface MetricPreset {
  id: string;
  name: string;
  category: MetricCategory;
  icon: any;
  format?: 'currency' | 'number' | 'percentage' | 'decimal';
  unit?: string;
  formula?: string;
  defaultChartType?: 'line' | 'bar' | 'pie' | 'area';
}
```

**Uso:**
```typescript
import { METRIC_PRESETS, getMetricPreset } from '@/lib/dashboard/metricPresets';

const salesMetric = getMetricPreset('sales-monthly-total');
// {
//   id: 'sales-monthly-total',
//   name: 'Ventas del Mes',
//   format: 'currency',
//   unit: 'ARS',
//   ...
// }
```

---

### 2. **Widget Creator Modal** (`WidgetCreatorModal.tsx`)

Modal para crear widgets con dos modos:

#### **MODO PRESET** (Recomendado)
- Seleccionar métrica pre-hecha
- Elegir tamaño (25%, 50%, 100%)
- Elegir tipo (KPI o Gráfico)
- ✅ One-click create

#### **MODO CUSTOM**
- Ingresa fórmula personalizada
- Elige formato y unidad
- Flexible para casos especiales

**Uso en WidgetPicker:**
```typescript
<WidgetCreatorModal
  onCreateWidget={(widget) => {
    // widget.name: "Ventas del Mes"
    // widget.metricPreset: MetricPreset
    // widget.size: "half"
    // widget.type: "kpi"
    
    // TODO: Agregar widget al dashboard
  }}
/>
```

---

### 3. **Metric Editor Modal** (`MetricEditorModal.tsx`)

Modal para **editar la métrica de un widget existente**:

- Cambiar entre métrica pre-hecha o personalizada
- Cambiar fórmula
- Cambiar formato (currency → percentage)
- Cambiar unidad (ARS → USD)

**Interfaz:**
```typescript
export interface WidgetMetricConfig {
  metricId?: string;
  metricPreset?: MetricPreset;
  customFormula?: string;
  customFormat?: 'currency' | 'number' | 'percentage' | 'decimal';
  customUnit?: string;
}
```

**Uso:**
```typescript
<MetricEditorModal
  open={showMetricEditor}
  onOpenChange={setShowMetricEditor}
  currentConfig={{
    metricPreset: salesMetric,
    metricFormat: 'currency'
  }}
  onSave={(config) => {
    // Guardar nueva configuración
    updateWidgetMetric(widgetId, config);
  }}
/>
```

---

### 4. **Widget Action Menu** (`WidgetActionMenu.tsx`)

Menú **discreto y elegante** en arriba-derecha de cada widget:

```
┌─────────────────────┐
│ 📊 Sales      ▼     │  ← Menú aquí
├─────────────────────┤
│                     │
│  Gráfico            │
│                     │
└─────────────────────┘
```

Al clickear `▼`:
- ✏️ Editar Métrica
- ⚙️ Configurar
- 🗑️ Eliminar

**Props:**
```typescript
interface WidgetActionMenuProps {
  widgetId: string;
  widgetName: string;
  onEditMetric: () => void;  // Abre MetricEditorModal
  onConfigure: () => void;   // Abre WidgetConfigModal
  onRemove: () => void;      // Elimina widget
}
```

---

### 5. **Widget Wrapper** (Actualizado)

Ahora incluye:
- ✅ `id` prop para identificar widget
- ✅ `onEditMetric` callback
- ✅ Integración con `WidgetActionMenu`

```typescript
<WidgetWrapper
  id="widget-123"
  title="Ventas del Mes"
  icon={<DollarSign />}
  accentColor="green"
  onEditMetric={() => setShowMetricEditor(true)}
  onConfigure={() => setShowConfig(true)}
  onRemove={() => removeWidget()}
>
  {/* Widget content */}
</WidgetWrapper>
```

---

## 🔄 Flujo de Uso (Usuario)

### Crear un Widget
1. Click en "Crear Widget" (en WidgetPicker)
2. Selecciona tab "Crear Nuevo"
3. Elige una métrica pre-hecha (ej: "Ventas del Mes")
4. Click "Agregar Widget"
5. ✅ Widget aparece en dashboard

### Editar Métrica del Widget
1. Widget aparece en dashboard
2. Hover → aparece `▼` en arriba-derecha
3. Click `▼` → "Editar Métrica"
4. Cambia métrica o fórmula
5. Click "Guardar Cambios"
6. ✅ Widget se actualiza sin recargar

### Eliminar Widget
1. Hover sobre widget → aparece `▼`
2. Click `▼` → "Eliminar"
3. Widget desaparece

---

## 📝 Ejemplos de Configuración

### Ejemplo 1: Crear KPI de Ventas
```typescript
const metricConfig: WidgetMetricConfig = {
  metricPreset: getMetricPreset('sales-monthly-total'),
  // Resultado: Ventas del Mes en ARS con tendencia
};
```

### Ejemplo 2: Personalizar a Porcentaje
```typescript
const metricConfig: WidgetMetricConfig = {
  customFormula: '(SUM([revenue]) - SUM([costs])) / SUM([revenue]) * 100',
  customFormat: 'percentage',
  // Resultado: Margen Bruto mostrado como %
};
```

### Ejemplo 3: Cambiar Moneda
```typescript
const metricConfig: WidgetMetricConfig = {
  metricId: 'sales-monthly-total',
  customUnit: 'USD',  // Cambiar de ARS a USD
  // Resultado: Ventas en USD en lugar de ARS
};
```

---

## 🎨 Styling

### Widget Action Menu
- **Icono:** Flechita pequeña (ChevronDown)
- **Opacidad:** 60% por defecto, 100% al hover
- **Posición:** Arriba-derecha del header
- **Tamaño:** 6x6 px (muy discreto)

### Metric Editor Modal
- **Tabs:** Preset | Custom
- **Búsqueda:** Nombre y descripción
- **Categorías:** Todas | Ventas | Inventario | etc.
- **Preview:** Muestra formato y unidad actual

---

## 🚀 Próximos Pasos

### Integración con Backend
```typescript
// 1. Cuando usuario guarda métrica
const handleSaveMetric = async (widgetId, config) => {
  await updateWidgetMetric(widgetId, config);
  // Persistir en base de datos
};

// 2. Al cargar dashboard
const widgets = await fetchDashboardWidgets();
// Cada widget tiene su metricConfig asociada
```

### Dashboard Persistence
```typescript
// Structure en BD
{
  widget_id: "123",
  metric_config: {
    metricId: "sales-monthly-total",
    customFormat: null,
    customUnit: null
  }
}
```

---

## 📚 Files Creados/Modificados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `metricPresets.ts` | ✅ Nuevo | Catálogo de 20+ métricas pre-hechas |
| `WidgetCreatorModal.tsx` | ✅ Nuevo | Modal para crear widgets |
| `MetricEditorModal.tsx` | ✅ Nuevo | Modal para editar métricas |
| `WidgetActionMenu.tsx` | ✅ Nuevo | Menú discreto en arriba-derecha |
| `WidgetWrapper.tsx` | 🔄 Actualizado | + id prop, +onEditMetric |
| `ChartWidget.tsx` | 🔄 Actualizado | + MetricEditorModal, +onEditMetric |
| `KpiWidget.tsx` | 🔄 Actualizado | + MetricEditorModal, +onEditMetric |
| `WidgetPicker.tsx` | 🔄 Actualizado | + tabs, WidgetCreatorModal |

---

## ✅ Checklist de Validación

- ✅ 0 TypeScript errors
- ✅ Métrica pre-hechas (20+)
- ✅ Widget Creator Modal funcional
- ✅ Metric Editor Modal funcional
- ✅ Widget Action Menu discreto y posicionado
- ✅ WidgetWrapper integrado
- ✅ ChartWidget + KpiWidget actualizados

---

## 🎯 Métricas Disponibles

### Sales (5)
- sales-monthly-total
- sales-today
- sales-7days
- sales-by-category
- average-transaction

### Inventory (4)
- inventory-total-value
- stock-critical
- inventory-turnover
- products-out-of-stock

### Customers (4)
- total-customers
- active-customers-month
- customer-acquisition
- customer-lifetime-value

### Finance (4)
- gross-margin
- receivables
- payables
- cash-flow

### Products (3)
- top-selling-products
- product-categories
- low-performing-products

---

¡Listo! El sistema de métricas y widgets está completamente funcional. 🚀
