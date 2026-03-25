# 📚 Guía de Componentes - Currency Dashboard

## 📦 Componente Principal: `CurrencyDashboardNew`

### Importación
```tsx
import { CurrencyDashboardNew } from '@/components/dashboard/CurrencyDashboardNew';
```

### Uso Básico
```tsx
<CurrencyDashboardNew
  exchangeRates={exchangeRates || []}
  historicalRates={historicalRates || []}
  inventoryByCurrency={inventoryByCurrency || []}
/>
```

### Props
```tsx
interface CurrencyDashboardNewProps {
  exchangeRates?: ExchangeRateData[];      // Cotizaciones actuales
  historicalRates?: any[];                 // Últimos 30 días
  inventoryByCurrency?: InventoryByMoneda[]; // Valorización por moneda
}
```

### Data Structures

#### ExchangeRateData
```tsx
interface ExchangeRateData {
  id: string;          // UUID
  currency: string;    // "USD" | "EUR" | "BRL" | etc
  rate: number;        // 296.50
  updated_at: string;  // ISO timestamp
}
```

#### InventoryByMoneda
```tsx
interface InventoryByMoneda {
  currency: string;    // "USD" | "ARS" | etc
  totalValue: number;  // Suma de (price * stock)
  totalCost: number;   // Suma de (cost * stock)
  productCount: number; // Cantidad de productos
  valueInARS: number;  // Conversión a ARS
}
```

### Ejemplo de Integración Completa
```tsx
import { useQuery } from "@tanstack/react-query";
import { CurrencyDashboardNew } from '@/components/dashboard/CurrencyDashboardNew';

export default function Dashboard() {
  const { data: exchangeRates } = useQuery({
    queryKey: ["exchange-rates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("exchange_rates")
        .select("*");
      return data;
    }
  });

  const { data: inventoryByCurrency } = useQuery({
    queryKey: ["inventory-by-currency"],
    queryFn: async () => {
      // Tu lógica de cálculo
      return calculatedData;
    }
  });

  return (
    <CurrencyDashboardNew
      exchangeRates={exchangeRates}
      historicalRates={historicalRates}
      inventoryByCurrency={inventoryByCurrency}
    />
  );
}
```

---

## 🧩 Componentes Internos (Reutilizables)

### 1. KPIHeroCard

Tarjeta principal grande para el KPI más importante.

#### API
```tsx
interface KPIHeroCardProps {
  value: number;           // 13388250
  label: string;           // "Inventario Total (Consolidado)"
  trend?: number;          // 2.5 (porcentaje)
  currency?: string;       // "ARS" (default)
  insight?: string;        // "Cartera diversificada..."
}
```

#### Ejemplos

**Ejemplo 1: KPI Simple**
```tsx
<KPIHeroCard
  value={13388250}
  label="Inventario Total"
  currency="ARS"
/>
```

**Ejemplo 2: Con Tendencia**
```tsx
<KPIHeroCard
  value={13388250}
  label="Inventario Total (Consolidado)"
  trend={2.5}
  currency="ARS"
/>
```

**Ejemplo 3: Con Insight**
```tsx
<KPIHeroCard
  value={13388250}
  label="Inventario Total (Consolidado)"
  trend={2.5}
  currency="ARS"
  insight="✓ Cartera diversificada en 3 monedas. Exposición equilibrada."
/>
```

#### Styling
- Altura: Auto
- Ancho: Full width
- Padding: 24px (6 units)
- Text Size: Hero (text-5xl)
- Background: Gradient dark
- Border: Slate 700/50

---

### 2. CurrencyRateCard

Tarjeta para mostrar una cotización individual.

#### API
```tsx
interface CurrencyRateCardProps {
  rate: ExchangeRateData;        // Objeto de cotización
  previousRate?: number;         // Para calcular variación
}
```

#### Ejemplos

**Ejemplo 1: Solo Rate**
```tsx
<CurrencyRateCard
  rate={{
    id: "uuid",
    currency: "USD",
    rate: 296.50,
    updated_at: "2026-03-25T14:32:00Z"
  }}
/>
```

**Ejemplo 2: Con Variación**
```tsx
<CurrencyRateCard
  rate={currentRate}
  previousRate={290.0}  // Calcula % de cambio
/>
```

#### Styling
- Tamaño: Grid (md:grid-cols-2 lg:grid-cols-3)
- Padding: 16px
- Hover: Brightens + color border
- Font: Semibold para código

#### Output Visual
```
┌─────────────────┐
│ 🇺🇸 USD  Cotiz. │
│                 │
│  ARS 296.50     │
│  1 USD = ...    │
│  ↑ 2.1%        │
│  ↻ 14:32        │
└─────────────────┘
```

---

### 3. InventoryCard

Tarjeta para mostrar valorización de inventario en una moneda.

#### API
```tsx
interface InventoryCardProps {
  item: InventoryByMoneda;            // Datos de inventario
  exchangeRate?: ExchangeRateData;   // Para contexto
}
```

#### Ejemplos

**Ejemplo 1: USD**
```tsx
<InventoryCard
  item={{
    currency: "USD",
    totalValue: 45000,
    totalCost: 36000,
    productCount: 8,
    valueInARS: 13.388.250
  }}
/>
```

**Ejemplo 2: Con Exchange Rate**
```tsx
<InventoryCard
  item={usdInventory}
  exchangeRate={usdRate}
/>
```

#### Styling
- Grid: md:grid-cols-2
- Background: Gradient oscuro
- Margin Box: Color semántico (emerald/blue/amber/red)
- Padding: 20px

#### Color Semantics (Margin)

| Margen | Color | Insight |
|--------|-------|---------|
| ≥ 30% | ✓ Verde | Margen saludable |
| 15-30% | → Azul | Margen normal |
| 5-15% | ⚠ Amber | Margen bajo |
| < 5% | ⛔ Rojo | Margen crítico |

#### Output Visual
```
┌─────────────────────┐
│ 🇺🇸 USD  8 productos│
│                     │
│ Inventario          │
│ US$ 45.000          │
│ ≈ $ 13.388.250     │
│                     │
│ [Margen 22%: ✓OK]  │
│                     │
│ Costo: US$ 35.100  │
└─────────────────────┘
```

---

## 🛠️ Funciones Utilitarias

### formatNumber()
Formatea número con separadores de miles (esquema es-AR).

```tsx
const formatNumber = (num: number, decimals = 2): string
```

#### Ejemplos
```tsx
formatNumber(13388250)      // "13.388.250,00"
formatNumber(45000.5, 0)    // "45.000"
formatNumber(1234.567, 3)   // "1.234,567"
```

---

### formatCurrency()
Formatea con símbolo de moneda + número.

```tsx
const formatCurrency = (amount: number, currency: string = 'ARS'): string
```

#### Ejemplos
```tsx
formatCurrency(13388250, 'ARS')  // "$ 13.388.250"
formatCurrency(45000, 'USD')     // "US$ 45.000"
formatCurrency(42500, 'EUR')     // "€ 42.500"
```

#### Símbolos Soportados
- ARS → `$`
- USD → `US$`
- EUR → `€`
- BRL → `R$`
- CLP → `$`
- UYU → `$`

---

### getMarginColor()
Retorna clase Tailwind de color basada en margen.

```tsx
const getMarginColor = (margin: number): string
```

#### Ejemplos
```tsx
getMarginColor(35)   // "text-emerald-600 dark:text-emerald-400"
getMarginColor(20)   // "text-blue-600 dark:text-blue-400"
getMarginColor(10)   // "text-amber-600 dark:text-amber-400"
getMarginColor(2)    // "text-red-600 dark:text-red-400"
```

#### Uso
```tsx
<span className={getMarginColor(margin)}>
  {margin.toFixed(1)}%
</span>
```

---

### getMarginBg()
Retorna classes para background + border semánticos.

```tsx
const getMarginBg = (margin: number): string
```

#### Ejemplos
```tsx
getMarginBg(35)   // "bg-emerald-500/10 border-emerald-500/30"
getMarginBg(20)   // "bg-blue-500/10 border-blue-500/30"
getMarginBg(10)   // "bg-amber-500/10 border-amber-500/30"
getMarginBg(2)    // "bg-red-500/10 border-red-500/30"
```

#### Uso
```tsx
<div className={`rounded-lg border ${getMarginBg(margin)} p-3`}>
  {/* Content */}
</div>
```

---

### calculateVariation()
Calcula porcentaje de cambio entre dos valores.

```tsx
const calculateVariation = (current: number, previous: number): number
```

#### Ejemplos
```tsx
calculateVariation(296.5, 290)    // 2.24 (positivo)
calculateVariation(290, 296.5)    // -2.19 (negativo)
calculateVariation(100, 100)      // 0 (sin cambio)
calculateVariation(150, 0)        // 0 (división por cero protected)
```

#### Uso
```tsx
const variation = calculateVariation(currentRate, previousRate);
const isPositive = variation >= 0;

<span className={isPositive ? 'text-emerald-500' : 'text-red-500'}>
  {Math.abs(variation).toFixed(2)}%
</span>
```

---

## 🎨 Personalización

### Cambiar Colores Base
```css
/* Actualmente */
bg-slate-900/50
border-slate-700/50

/* Para modo claro cambia a */
bg-slate-50/50
border-slate-300/50
```

### Cambiar Tamaño de Componente
```tsx
// KPI Hero - reduce tamaño
<h2 className="text-3xl md:text-4xl font-bold"> {/* era text-5xl */}
```

### Cambiar Grid Columns
```tsx
// Más compacto en desktop
<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-2"> {/* era lg:grid-cols-3 */}
```

### Agregar Animaciones
```tsx
// En Cards, agregar
className="group relative ... transition-all duration-500"
// En lugar de duration-300
```

---

## 🔧 Troubleshooting

### Problema: Los números no se formatean
**Causa:** Llamadas directas sin `formatNumber()`  
**Solución:**
```tsx
// ❌ Mal
<p>{rate.rate}</p>

// ✅ Bien
<p>{formatNumber(rate.rate)}</p>
```

### Problema: Colores de margen no aparecen
**Causa:** Tailwind purge (si usas versión antigua)  
**Solución:** Asegurar que `tailwind.config.js` incluye el carpeta:
```js
content: ['./src/**/*.{tsx,jsx}'],
```

### Problema: Props undefined
**Causa:** No pasar arrays vacíos como default  
**Solución:**
```tsx
// ✅ Correcto
<CurrencyDashboardNew
  exchangeRates={exchangeRates || []}
  inventoryByCurrency={inventoryByCurrency || []}
/>
```

---

## 📈 Extensiones Futuras

### Agregar Comparación de Períodos
```tsx
const [period, setPeriod] = useState('30d');

<CurrencyDashboardNew
  exchangeRates={exchangeRates}
  period={period}  // Nueva prop
  historicalRates={filterByPeriod(historicalRates, period)}
/>
```

### Agregar Alertas
```tsx
const [alerts, setAlerts] = useState<Alert[]>([]);

{alerts.map(alert => (
  <AlertBadge key={alert.id} type={alert.type} />
))}
```

### Agregar Exportación
```tsx
const handleExport = () => {
  const pdf = generatePdfReport(kpis, inventoryByCurrency);
  download(pdf);
};

<Button onClick={handleExport}>Descargar PDF</Button>
```

---

## 📞 Support

Para dudas o sugerencias:
1. Revisa este documento completo
2. Chequea los ejemplos en `CurrencyDashboardNew.tsx`
3. Consulta las interfaces TypeScript

---

**Última Actualización:** Q1 2026  
**Versión:** 1.0  
**Status:** Producción ✓
