# Widget System - Sistema de Validación y Monitoreo

## 📋 Descripción

El Widget System proporciona herramientas para **validar, monitorear y optimizar** el rendimiento de los widgets en el Panel de Control.

## 🎯 Características

### 1. **WidgetValidator** - Validación Automática
```typescript
import { WidgetValidator } from '@/lib/dashboard/widgetSystem';

const health = WidgetValidator.validateWidget(
  'my-widget-id',
  data,
  isLoading,
  error,
  renderTime,
  loadTime
);

// Retorna:
// - healthy: boolean
// - issues: WidgetIssue[] (errores, advertencias, info)
// - performance: métricas de rendimiento
```

**Valida automáticamente:**
- ✅ Errores en el widget
- ✅ Datos vacíos o faltantes
- ✅ Carga lenta (>5s)
- ✅ Renderizado lento (>1s)
- ✅ Datos muy grandes (>5MB)

### 2. **useWidgetHealth** - Hook de Monitoreo
```typescript
import { useWidgetHealth } from '@/lib/dashboard/widgetSystem';

function MyWidget() {
  const { health, statusColor, summary, isHealthy } = useWidgetHealth(
    'widget-id',
    data,
    isLoading,
    error,
    { enableLogging: true }
  );

  return (
    <div>
      <p>{summary}</p> // ✅ Healthy | ❌ 2 error(s) | ⚠️ 1 warning
      <span style={{ color: statusColor }}>{health?.issues.length || 0} issues</span>
    </div>
  );
}
```

### 3. **useDashboardHealth** - Salud Global
```typescript
import { useDashboardHealth } from '@/lib/dashboard/widgetSystem';

function Dashboard() {
  const dashboardHealth = useDashboardHealth(widgetStatuses);

  return (
    <div>
      <p>Salud: {dashboardHealth?.healthPercentage.toFixed(0)}%</p>
      <p>Errores: {dashboardHealth?.errors}</p>
      <p>Advertencias: {dashboardHealth?.warnings}</p>
    </div>
  );
}
```

### 4. **DashboardStats** - Componente de Estadísticas
```typescript
import { DashboardStats } from '@/lib/dashboard/widgetSystem';

function Dashboard() {
  return (
    <DashboardStats
      widgetCount={widgets.length}
      widgetStatuses={widgetStatuses}
      isLoading={isLoading}
    />
  );
}
```

**Muestra:**
- Conteo de widgets saludables
- Porcentaje de salud general
- Conteo de errores y advertencias
- Métricas de rendimiento (carga, renderizado, tamaño de datos)
- Barra de progreso de salud
- Resumen de problemas detectados

## 📊 Tipos de Issues

### Error
Problemas críticos que requieren atención inmediata:
- Widget en error (exception)
- Fallo en carga de datos

### Warning
Problemas que pueden afectar el rendimiento:
- Carga muy lenta (>5s)
- Renderizado muy lento (>1s)
- Datos muy grandes (>5MB)
- Datos vacíos

### Info
Información de diagnóstico:
- Renderizado moderadamente lento (0.5-1s)

## 🔍 Ejemplos de Uso Completo

### Dashboard con Monitoreo Completo
```typescript
import { DashboardStats, useWidgetHealth } from '@/lib/dashboard/widgetSystem';

export function Dashboard() {
  const [widgetStatuses, setWidgetStatuses] = useState({});

  // Monitorear cada widget
  const health = useWidgetHealth(
    'kpi-widget',
    data,
    isLoading,
    error,
    {
      enableLogging: true,
      onHealthChange: (status) => {
        setWidgetStatuses(prev => ({
          ...prev,
          'kpi-widget': status
        }));
      }
    }
  );

  return (
    <div>
      {/* Mostrar estadísticas generales */}
      <DashboardStats
        widgetCount={widgets.length}
        widgetStatuses={widgetStatuses}
        isLoading={isLoading}
      />

      {/* Indicador del widget individual */}
      <div className="flex items-center gap-2">
        <span>{health.summary}</span>
        <span style={{ color: health.statusColor }}>●</span>
      </div>
    </div>
  );
}
```

### Generar Reporte de Diagnóstico
```typescript
import { WidgetValidator } from '@/lib/dashboard/widgetSystem';

const report = WidgetValidator.generateDiagnosticReport(widgetStatuses);
console.log(report);

// Exportar a archivo
const element = document.createElement('a');
element.href = `data:text/plain;charset=utf-8,${encodeURIComponent(report)}`;
element.download = 'dashboard-diagnostic.txt';
element.click();
```

## 📈 Métricas de Rendimiento

### Performance Tracking
- **loadTime**: Tiempo desde inicio de carga hasta completarse (ms)
- **renderTime**: Tiempo desde render hasta estabilización (ms)
- **dataSize**: Tamaño total de datos en JSON (bytes)

### Agregadas a Nivel Dashboard
- **avgLoadTime**: Promedio de loadTime de todos los widgets
- **avgRenderTime**: Promedio de renderTime de todos los widgets
- **totalDataSize**: Suma de todos los dataSizes

## 🚀 Best Practices

1. **Enable Logging en Development**
   ```typescript
   useWidgetHealth('widget-id', data, isLoading, error, {
     enableLogging: process.env.NODE_ENV === 'development'
   })
   ```

2. **Monitorear Cambios de Salud**
   ```typescript
   onHealthChange: (status) => {
     if (status.issues.some(i => i.type === 'error')) {
       alertAdmin(status);
     }
   }
   ```

3. **Optimizar Basado en Reportes**
   - Usar `generateDiagnosticReport()` regularmente
   - Identificar widgets con carga lenta
   - Optimizar queries o añadir paginación

## 🔧 Integración con DashboardBuilder

El sistema ya está integrado en DashboardBuilder. Solo necesitas:

1. Importar `DashboardStats`
2. Pasar `widgetStatuses` desde el contexto
3. Mostrar el componente en el dashboard

```typescript
import { DashboardStats } from '@/lib/dashboard/widgetSystem';

// En DashboardBuilder
<DashboardStats
  widgetCount={widgets.length}
  widgetStatuses={widgetHealthStatuses}
  isLoading={isSaving}
/>
```

## 📝 Changelog

### v1.0 (2026-04-20)
- ✅ WidgetValidator con validaciones automáticas
- ✅ useWidgetHealth hook para monitoreo individual
- ✅ useDashboardHealth hook para salud global
- ✅ DashboardStats componente visual
- ✅ Generador de reportes de diagnóstico
