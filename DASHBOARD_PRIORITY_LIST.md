# 📋 DASHBOARD: Lista de Prioridades Ordenada - Abril 2026

## 🎯 Estado Actual

**Scoring:** 8.2/10 (↑ desde 6.0/10)  
**Implementadas:** 5 mejoras críticas ✅  
**Tiempo de desarrollo:** 4.3 horas  
**Status:** En producción ✓  

---

## 📊 PRIORIDADES: De Mayor a Menor Importancia

### 🔴 TIER 1: CRÍTICO (Implementar esta semana)

#### 1. **Refactorizar 4 widgets con useWidgetState()** [60 min]
**Impacto:** Mantenibilidad +40%, Código -50 LOC  
**Status:** 1/5 widgets refactorizado (CurrencyWidget ✅)  
**Archivos:** ChartWidget, ListWidget, KpiWidget, CustomMetricWidget  
**Por qué:** El patrón de estado aún duplicado en 4 componentes  
**Beneficio:** Cambios centralizados, testing simplificado  

```tsx
// APLICA ESTE PATRÓN A 4 WIDGETS MÁS:
const { data, isLoading, error, onRemove } = useWidgetState(definition);

if (isLoading) return <WidgetLoadingSkeleton />;
if (error) return <WidgetErrorState error={error} />;
if (!data) return <WidgetEmptyState />;
```

**Checklist:**
- [ ] ChartWidget.tsx (10 min)
- [ ] ListWidget.tsx (10 min)
- [ ] KpiWidget.tsx (10 min)
- [ ] CustomMetricWidget.tsx (10 min)
- [ ] Testing en browser
- [ ] Git commit

---

#### 2. **Validación y Sanitización de CSV** [30 min]
**Impacto:** Seguridad, Confiabilidad de datos  
**Status:** NO IMPLEMENTADO 🔴  
**Riesgo:** Corrupción de datos en BD  
**Por qué:** Actualmente acepta cualquier CSV sin validar  

**Lo que hacer:**
```tsx
// src/lib/csv/csvValidator.ts
function validateCSVData(data: any[]): ValidationResult {
  // 1. Schema validation
  // 2. Tipo de dato checking
  // 3. Rango de valores
  // 4. Campos requeridos
  // 5. Duplicate detection
  return { valid: true, errors: [] }
}
```

**Checklist:**
- [ ] Crear `csvValidator.ts`
- [ ] Integrar en CSVUploader
- [ ] Mensajes de error claros
- [ ] Testing con archivos malformados
- [ ] Documentar soportados vs rechazados

---

#### 3. **Virtualización de ListWidget** [30 min]
**Impacto:** Performance con 100+ filas, UX fluida  
**Status:** NO IMPLEMENTADO 🔴  
**Problema:** Renderiza todas las filas, lags visibles  
**Por qué:** Critical para datasets grandes  

**Lo que hacer:**
```tsx
import { FixedSizeList } from 'react-window';

// Antes: <div>{items.map(item => <Row />)}</div>
// Después: <FixedSizeList height={400} itemCount={1000} itemSize={35}>
```

**Checklist:**
- [ ] Instalar react-window
- [ ] Implementar en ListWidget
- [ ] Testing con 1000+ items
- [ ] Medir performance antes/después
- [ ] Verificar scroll fluido

---

### 🟠 TIER 2: IMPORTANTE (Implementar en 2 semanas)

#### 4. **Persistencia de Filtros** [20 min]
**Impacto:** UX, Permite guardar vistas personalizadas  
**Status:** NO IMPLEMENTADO 🔴  
**Problema:** Filtros se pierden al refresh  
**Por qué:** Usuario expectativa = guardar preferencias  

**Lo que hacer:**
```tsx
// En useDashboardFilters (context)
// Guardar en URL o sessionStorage
// Cargar al montar
```

**Checklist:**
- [ ] Almacenar filtros en URL params
- [ ] O usar sessionStorage como backup
- [ ] Cargar al componente mount
- [ ] Testing: refresh, back button
- [ ] Documentar política de almacenamiento

---

#### 5. **Refactorizar CurrencyDashboard** [45 min]
**Impacto:** Mantenibilidad +50%, Código -150 LOC  
**Status:** PARCIAL ✓ (542 LOC consolidado)  
**Problema:** 542 LOC en 1 archivo, muy monolítico  
**Por qué:** Difícil de mantener, testing lento  

**Lo que hacer:**
```
CurrencyDashboard.tsx (542 LOC) → 
├── CurrencyKPICard.tsx (utils)
├── CurrencyRateCard.tsx (component)
├── InventoryCard.tsx (component)
├── CurrencyChart.tsx (component)
└── currencyUtils.ts (logic: formatCurrency, etc.)
```

**Checklist:**
- [ ] Crear sub-componentes
- [ ] Extraer utilidades a currencyUtils.ts
- [ ] Mantener funcionalidad 100%
- [ ] Testing visual
- [ ] Reducir a 200-250 LOC principal

---

#### 6. **Soporte Multiidioma en Panel** [60 min]
**Impacto:** Usabilidad global, Marca  
**Status:** NO IMPLEMENTADO 🔴  
**Audiencia:** Usuarios en otros idiomas  
**Por qué:** App soporta múltiples idiomas, dashboard no  

**Lo que hacer:**
- Extraer todas las strings a i18n
- Formateo de números según locale
- Nombres de widgets traducibles

---

### 🟡 TIER 3: MEJORAS (Implementar próximo mes)

#### 7. **Testing Automatizado del Dashboard** [120 min]
**Impacto:** Confiabilidad, Prevención de regresiones  
**Status:** NO IMPLEMENTADO 🔴  
**Coverage:** ~0%  
**Por qué:** Critical para cambios futuros  

**Lo que hacer:**
```
Tests para:
- useDashboardAllData (mocking queries)
- useWidgetState (state transitions)
- useDashboardSelection (URL sync)
- getWidgetDimensions (class generation)
- widgetDimensions (size calculations)
```

**Checklist:**
- [ ] Setup vitest/jest
- [ ] Mock Supabase queries
- [ ] Test hooks con @testing-library
- [ ] Test componentes (integration)
- [ ] Reach 80%+ coverage

---

#### 8. **Dark Mode para Componentes Dashboard** [90 min]
**Impacto:** UX, Accesibilidad, Preferencia usuario  
**Status:** PARCIAL (usa CSS variables, pero no optimizado)  
**Por qué:** Usuarios nocturnos, ojos cansados  

**Checklist:**
- [ ] Verificar contraste en dark mode
- [ ] Optimizar colores por widget
- [ ] Testing visual en ambos temas
- [ ] Persistir preferencia

---

#### 9. **Exportación Avanzada de Datos** [75 min]
**Impacto:** Business intelligence, Valor usuario  
**Status:** PARCIAL (solo JSON)  
**Formatos:** CSV, Excel, PDF con gráficos  

**Checklist:**
- [ ] CSV export con headers
- [ ] Excel con múltiples sheets
- [ ] PDF con gráficos embebidos
- [ ] Scheduling de exportes automáticos

---

#### 10. **Dashboard Templates (Presets Personalizados)** [120 min]
**Impacto:** Valor usuario, Productividad  
**Status:** PARCIAL (existe TemplateGallery)  
**Casos de uso:** Vendor, Gerente, Auditor  

**Checklist:**
- [ ] Expandir templates existentes
- [ ] Agregar 5+ templates comunes
- [ ] Permitir guardar custom templates
- [ ] Sistema de rating/tags
- [ ] Compartir templates entre usuarios

---

### ⚪ TIER 4: MEJORAS FUTURAS (Backlog)

#### 11. **Real-time Dashboard Updates** [200 min]
**Impacto:** Datos frescos, Decisiones en tiempo real  
**Tecnología:** WebSockets o Server-Sent Events  

#### 12. **Alertas y Notificaciones** [150 min]
**Impacto:** Proactividad, Detección de anomalías  

#### 13. **Comparativa Período a Período** [90 min]
**Impacto:** Análisis business, Trends  

#### 14. **API Pública para Dashboard** [180 min]
**Impacto:** Integraciones, Extensibilidad  

#### 15. **Machine Learning: Recomendaciones** [300+ min]
**Impacto:** Smart insights, Valor diferenciador  

---

## 📅 ROADMAP RECOMENDADO

### Semana 1 (Abril 29 - Mayo 3)
```
Lunes:   Tier 1.1 - Refactorizar 4 widgets (60 min)
Martes:  Tier 1.2 - CSV validation (30 min)
Miércoles: Tier 1.3 - ListWidget virtualization (30 min)
Jueves:  Tier 2.1 - Filter persistence (20 min)
Viernes: Testing y QA (60 min)
```

**Salida:** 4 mejoras más implementadas, +40% calidad

### Semana 2 (Mayo 6 - Mayo 10)
```
Lunes-Martes: Tier 2.2 - Refactor CurrencyDashboard (45 min)
Miércoles:    Tier 2.3 - Multiidioma (60 min)
Jueves-Viernes: Tier 3.1 - Testing automatizado (120 min)
```

**Salida:** 3 mejoras, 80%+ test coverage

---

## 📊 Tabla Resumida de Prioridades

| # | Nombre | Impacto | Esfuerzo | ROI | Status |
|---|--------|---------|----------|-----|--------|
| 1 | Refactorizar 4 widgets | 🔴 Alto | 60 min | 9/10 | 🔴 |
| 2 | CSV Validation | 🔴 Alto | 30 min | 10/10 | 🔴 |
| 3 | ListWidget Virtual | 🔴 Alto | 30 min | 10/10 | 🔴 |
| 4 | Filter Persistence | 🟠 Med | 20 min | 9/10 | 🔴 |
| 5 | Refactor Currency | 🟠 Med | 45 min | 8/10 | 🔴 |
| 6 | Multiidioma | 🟠 Med | 60 min | 7/10 | 🔴 |
| 7 | Testing Auto | 🟠 Med | 120 min | 10/10 | 🔴 |
| 8 | Dark Mode Opt | 🟡 Bajo | 90 min | 6/10 | 🔴 |
| 9 | Export Adv | 🟡 Bajo | 75 min | 7/10 | 🔴 |
| 10 | Dashboard Presets | 🟡 Bajo | 120 min | 8/10 | 🔴 |

---

## 🎯 Métrica de Éxito

```
Actual:   8.2/10 (Performance 9, Mantenibilidad 8.5, Accesibilidad 8, Escalabilidad 8.5)
Target:   9.5/10 (todas las áreas ≥ 9.0)
Delta:    +1.3 puntos (16% más mejora)
Timeline: 4-6 semanas con desarrollo diario
```

---

**Documento:** Abril 28, 2026  
**Versión:** 1.0  
**Status:** ✅ ACTIVO Y PRIORIZADO
