# 🎯 CHECKLIST RÁPIDO: Elementos data-tutorial por Página

## DASHBOARD.tsx ✅ 67% 

```
✅ data-tutorial="kpis"
   └─ Línea 457 | Status: FUNCIONAL
   └─ Grid 4 tarjetas KPIs (ventas, margen, cobrar, saldo)

✅ data-tutorial="chart-sales"  
   └─ Línea 780 | Status: FUNCIONAL
   └─ LineChart vendtas últimos 7 días

⚠️  data-tutorial="stock-alerts" (config dice "stock-alert")
   └─ Línea: ~850 | Status: EXISTE PERO NOMBRE INCONSISTENTE
   └─ Card con productos bajo stock crítico

❌ data-tutorial="quick-actions"
   └─ Línea: ??? | Status: NO EXISTE
   └─ Necesario: Card con botones (Nueva Venta, Cliente, Producto)
```

---

## SALES.tsx ✅ 67%

```
✅ data-tutorial="sales-filters"
   └─ Línea 269 | Status: FUNCIONAL
   └─ Grid con Input búsqueda + Select producto

✅ data-tutorial="sales-table"
   └─ Línea 298 | Status: FUNCIONAL
   └─ Table con historial completo de ventas

❌ data-tutorial="btn-create-sale"
   └─ Línea: ??? | Status: NO EXISTE
   └─ Necesario: Botón "Nueva Venta" (ubicación a definir)
```

---

## PRODUCTS.tsx ✅ 67%

```
✅ data-tutorial="btn-create-product"
   └─ Línea 1871 | Status: FUNCIONAL
   └─ Button "Agregar Producto" (abre dialog)

✅ data-tutorial="product-table"
   └─ Línea 2877 | Status: FUNCIONAL
   └─ Table con catálogo completo

❌ data-tutorial="stock-alert"
   └─ Línea: ??? | Status: POSIBLE DUPLICADO O UBICACIÓN CONFUSA
   └─ ¿Dashboard o Products? Verificar
```

---

## POS.tsx ❌ 0% - CRÍTICO

```
❌ data-tutorial="search-product"
   └─ Línea ~1050 | Status: ELEMENTO EXISTE, FALTA ATRIBUTO
   └─ Fix: Agregar data-tutorial="search-product" al Input
   
❌ data-tutorial="cart-items"
   └─ Línea ~1200 | Status: ELEMENTO EXISTE, FALTA ATRIBUTO
   └─ Fix: Agregar data-tutorial="cart-items" al div contenedor
   
❌ data-tutorial="payment-method"
   └─ Línea ~1480 | Status: ELEMENTO EXISTE, FALTA ATRIBUTO
   └─ Fix: Agregar data-tutorial="payment-method" al Select
   
❌ data-tutorial="finalize-sale"
   └─ Línea ~1560 | Status: ELEMENTO EXISTE, FALTA ATRIBUTO
   └─ Fix: Agregar data-tutorial="finalize-sale" al Button "Cobrar"
```

---

## 📊 Estadísticas

| Métrica | Valor |
|---------|-------|
| **Total elementos esperados** | 13 |
| **Elementos implementados** | 6 |
| **Elementos parcialmente impl.** | 1 |
| **Elementos faltantes** | 6 |
| **Cobertura actual** | 46% |
| **Fácil de fix (< 5 min)** | 4 elementos (POS) |
| **Mediano de fix (15-30 min)** | 2 elementos (quick-actions, btn-create-sale) |
| **Tiempo total estimado** | < 1 hora |

---

## 🚀 Plan de Acción (Prioridad)

### FASE 1 - SUPER RÁPIDO (< 10 min)
Archivo: `src/pages/POS.tsx`

```diff
# Cambio 1 - Línea ~1050
- <div className="relative">
+ <div className="relative" data-tutorial="search-product">

# Cambio 2 - Línea ~1200
- <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto">
+ <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto" data-tutorial="cart-items">

# Cambio 3 - Línea ~1480
- <Select value={currentPaymentMethod} onValueChange={setCurrentPaymentMethod}>
+ <Select value={currentPaymentMethod} onValueChange={setCurrentPaymentMethod} data-tutorial="payment-method">

# Cambio 4 - Línea ~1560  
- <Button 
+ <Button data-tutorial="finalize-sale"
    onClick={() => processSaleMutation.mutate()} 
    disabled={processSaleMutation.isPending || remaining > 0.01}
```

### FASE 2 - MEDIANO (30-45 min)
Trabajar en quick-actions (Dashboard) y btn-create-sale (Sales)

---

## 📱 Vista de Interfaz Usuario - Dónde están

### Dashboard (Top to Bottom)
```
┌─────────────────────────────────────┐
│ Dashboard    [Business Health Panel] │
├─────────────────────────────────────┤
│ ✅ [KPI Cards Grid]  ← data-tutorial="kpis"
│    ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│    │ Sales│ │Margin│ │Cobrar│ │Saldo │
│    └──────┘ └──────┘ └──────┘ └──────┘
├─────────────────────────────────────┤
│ ❌ [Quick Actions] ← data-tutorial="quick-actions" MISSING
│    ┌──────────┐ ┌──────────┐ ┌──────────┐
│    │New Sale  │ │New Cust. │ │New Prod. │
│    └──────────┘ └──────────┘ └──────────┘
├─────────────────────────────────────┤
│ ✅ [Sales Chart]  ← data-tutorial="chart-sales"
│    ╱╲      ╱╲
│   ╱  ╲    ╱  ╲
│  ╱    ╲  ╱    ╲
├─────────────────────────────────────┤
│ ⚠️ [Stock Alerts] ← data-tutorial="stock-alerts" (nombre inconsistente)
│    • Product A: 2 / Mín: 10
│    • Product B: 5 / Mín: 20
└─────────────────────────────────────┘
```

### Sales (Top to Bottom)
```
┌────────────────────────────────────┐
│ Ventas          [Reportes Button]  │  ← ❌ btn-create-sale MISSING
├────────────────────────────────────┤
│ ✅ [Filters]  ← data-tutorial="sales-filters"
│    ┌──────────────────┐ ┌────────────────┐
│    │ Buscar número... │ │ Filtrar por... │
│    └──────────────────┘ └────────────────┘
├────────────────────────────────────┤
│ ✅ [Sales Table]  ← data-tutorial="sales-table"
│    ┌─────┬───────┬─────────────────────┐
│    │ No. │ Fecha │ Cliente │ Total │ ... │
│    ├─────┼───────┼─────────────────────┤
│    │ #1  │ Today │ Cliente │ $100  │ ... │
│    │ #2  │ Today │ Cliente │ $250  │ ... │
│    └─────┴───────┴─────────────────────┘
└────────────────────────────────────┘
```

### Products (Top to Bottom)
```
┌────────────────────────────────────┐  
│ Productos   [Search] [✅ Agregar]  │  ← ✅ data-tutorial="btn-create-product"
├────────────────────────────────────┤
│ ✅ [Products Table]  ← data-tutorial="product-table"
│    ┌────┬──────┬────┬──────────────┐
│    │ Img│ Name │SKU │ Price │Stock │
│    ├────┼──────┼────┼──────────────┤
│    │ [📦]│ Prod │ SKU│ $10   │ 50  │
│    │ [📦]│ Prod │ SKU│ $20   │ ⚠️ 3│
│    └────┴──────┴────┴──────────────┘
│                   ⚠️ ← stock-alert posible location
└────────────────────────────────────┘
```

### POS (Grid 3 cols)
```
┌─────────────────────────────────────────────────────┐
│ Punto de Venta           [$500] [🛒 5]              │
├──────────────────────────────────┬──────────────────┤
│                                  │                  │
│  ❌ [Search] ← data-tutorial=    │ ✅ Carrito      │
│  data-tutorial="search-product"  │ ← data-tutorial= │
│  ┌────────────────────────┐      │ "cart-items"    │
│  │ Buscar productos...  🔍 │     │                  │
│  └────────────────────────┘     │ ┌──────────────┐ │
│                                  │ │ Prod A x2    │ │
│  [Grid de Productos Cards]        │ │ Prod B x1    │ │
│  ┌──────┐ ┌──────┐ ┌──────┐     │ │ Prod C x3    │ │
│  │Prod A│ │Prod B│ │Prod C│     │ └──────────────┘ │
│  │ $10  │ │ $20  │ │ $15  │     │                  │
│  └──────┘ └──────┘ └──────┘     │ Subtotal: $100   │
│  ┌──────┐ ┌──────┐ ┌──────┐     │ Desc: -$10       │
│  │Prod D│ │Prod E│ │Prod F│     │ Impuesto: $15    │
│  │ $25  │ │ $30  │ │ $12  │     │ TOTAL: $105      │
│  └──────┘ └──────┘ └──────┘     │                  │
│                                  │ ❌ [Método Pago]│
│                                  │ ← data-tutorial= │
│                                  │ "payment-method" │
│                                  │ ┌──────────────┐ │
│                                  │ │ Seleccionar  │ │
│                                  │ └──────────────┘ │
│                                  │ Monto: $_____    │
│                                  │                  │
│                                  │ ❌ [Cobrar]     │
│                                  │ ← data-tutorial= │
│                                  │ "finalize-sale"  │
│                                  │ ┌──────────────┐ │
│                                  │ │ 💰 Cobrar    │ │
│                                  │ └──────────────┘ │
└──────────────────────────────────┴──────────────────┘
```

---

## ✅ Verificación Final

### Después de implementar todos los fixes:

```
Dashboard:
  ✅ data-tutorial="kpis"
  ✅ data-tutorial="chart-sales"
  ✅ data-tutorial="stock-alerts"
  ✅ data-tutorial="quick-actions" ← NEW

Sales:
  ✅ data-tutorial="sales-filters"
  ✅ data-tutorial="sales-table"
  ✅ data-tutorial="btn-create-sale" ← NEW

Products:
  ✅ data-tutorial="btn-create-product"
  ✅ data-tutorial="product-table"
  ✅ data-tutorial="stock-alert" ← Clarify location

POS:
  ✅ data-tutorial="search-product"
  ✅ data-tutorial="cart-items"
  ✅ data-tutorial="payment-method"
  ✅ data-tutorial="finalize-sale"

TOTAL: 13/13 elementos ✅ = 100% Cobertura
```

---

## 💡 Notas Importantes

1. **POS es el objetivo principal del tutorial** - Es donde los usuarios más necesitan guía  
   → Los 4 elementos del POS cubren todo el flujo: buscar → agregar → pagar → finalizar

2. **Dashboard quick-actions es el segundo objetivo** - Punto de entrada para nuevos usuarios  
   → Debería tener accesos rápidos a las 3 acciones principales

3. **Consistencia de nomenclatura** - "stock-alert" (singular) vs "stock-alerts" (plural)  
   → Verificar config.ts para alinearse

---

## 📎 Referencias

- **Tutorial Config**: `src/lib/tutorial/config.ts`
- **Main Audit**: `TUTORIAL_ELEMENTS_AUDIT.md` (este directorio)
- **Dashboard**: `src/pages/Dashboard.tsx`
- **Sales**: `src/pages/Sales.tsx`
- **Products**: `src/pages/Products.tsx`
- **POS**: `src/pages/POS.tsx`

