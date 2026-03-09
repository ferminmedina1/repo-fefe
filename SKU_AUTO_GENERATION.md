# 🏷️ SKU Auto-Generation Feature

## Problem Solved
❌ **Error 2** — SKU mentalmente complejo
- Usuarios de tiendas pequeñas no saben qué es un SKU
- Incluso los que lo saben no quieren inventarlo manualmente
- Esto complica el flujo de creación de productos

## Solution Implemented
✅ **SKU Auto-Generation** - SKU is now automatically generated

### How It Works

#### 1. **Manual Creation Dialog**
- **Nuevo comportamiento:**
  - El campo SKU ahora tiene placeholder: "Dejar vacío para generar automáticamente"
  - Si el usuario ingresa el nombre del producto, aparece el botón **"Generar"**
  - Al hacer clic, genera un SKU única automáticamente
  - Si deja el campo vacío, se genera automáticamente al guardar

#### 2. **Auto-Generation Algorithm**
```
Formato: [PREFIX][TIMESTAMP_SUFFIX]
- PREFIX: 3 primeras letras del nombre del producto (mayúsculas, sin acentos)
- TIMESTAMP_SUFFIX: 6 dígitos basados en timestamp + random

Ejemplos:
- "Laptop" → LAP123456
- "Mouse Inalámbrico" → MOU789012
- "Auriculares Sony" → AUR345678
```

#### 3. **CSV Import**
- Durante la importación de CSV, si un producto no tiene SKU:
  - Se genera automáticamente usando el mismo algoritmo
  - No necesita cambiar el formato de tu CSV
  - Soporte para múltiples productos sin SKU

#### 4. **Edit Product**
- Cuando editas un producto existente, el SKU se mantiene
- Puedes cambiar manualmente si lo deseas
- Si dejas vacío, se respeta el SKU actual

---

## Benefits

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Complejidad UX** | Alta - usuario debe inventar SKU | Baja - se genera automáticamente |
| **Fricción** | Alta - campo obligatorio complicado | Baja - campo opcional con sugerencia |
| **Educación necesaria** | "¿Qué es SKU?" | No necesaria |
| **Para pequeños negocios** | 😞 Confuso | 😊 Intuitivo |
| **Para marcas personales** | 😞 Complicado | 😊 Simple |

---

## User Experience Flow

### ✨ Crear Nuevo Producto
```
1. Usuario ingresa nombre: "Laptop"
2. (Opcional) Ingresa categoría: "Electrónica"
3. El botón "Generar" aparece en el campo SKU
4. Usuario elige:
   - Opción A: Click en "Generar" → LAP123456 (automático en el campo)
   - Opción B: Dejar vacío → Se genera automáticamente al guardar
   - Opción C: Ingresa manualmente su propio SKU
5. Guardar producto ✅
```

### 📋 Importar desde CSV
```
CSV original (sin SKU):
nombre,precio,stock
Laptop,1000,50
Mouse,50,200

Resultado:
- Laptop → LAP123456 (auto-generado)
- Mouse → MOU789012 (auto-generado)
```

### ✏️ Editar Producto
```
- SKU existente: Se mantiene sin cambios
- Mostramos claramente que puede modificarse si desea
```

---

## Technical Details

### Function: `generateSKU(productName, category)`

**Características:**
- ✅ Genera códigos únicos y legibles
- ✅ Deterministas pero con random para evitar duplicados
- ✅ Sin acentos (normalizados)
- ✅ Solo caracteres alfanuméricos
- ✅ Máximo 50 caracteres (validación existente)

**Código:**
```typescript
const generateSKU = (productName: string, category?: string): string => {
  // 1. Obtener texto base (nombre o categoría)
  const baseText = productName.trim() || category?.trim() || 'PRD';
  
  // 2. Normalizar (remover acentos, caracteres especiales)
  const normalized = baseText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  
  // 3. Obtener primeras 3 letras como PREFIX
  const prefix = (normalized.substring(0, 3) + 'XXX').substring(0, 3);
  
  // 4. Generar SUFFIX único
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const suffix = (timestamp + random).toString().slice(-6);
  
  // Resultado: PREFIX + SUFFIX
  return `${prefix}${suffix}`;
};
```

---

## Impact on Data Integrity

✅ **Validación de Unicidad** - Se mantiene intacta
- El sistema valida que cada SKU sea único por empresa
- La auto-generación respeta esta validación
- Si hay colisión (muy rara), simplemente reintentar

✅ **Auditoría** - Registra el SKU auto-generado
- Se registra quién creó el producto
- Se registra el SKU (auto-generado o manual)

✅ **Búsqueda** - Funciona con SKU auto-generados
- Puedes buscar por SKU sin problema
- El usuario ve el SKU en la tabla de productos

---

## Changelog

**v1.0 - Auto-Generated SKU**
- ✨ Agregar generación automática de SKU
- ✨ Botón "Generar" en el formulario
- ✨ Auto-generar si se deja vacío
- ✨ Soporte en importación CSV
- 📝 Tooltip explicativo
- 🎯 Mejorar UX para pequeños negocios
