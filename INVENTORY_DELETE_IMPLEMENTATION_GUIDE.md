# 🗑️ GUÍA DE IMPLEMENTACIÓN: DELETE ITEMS EN SELECTS (INVENTARIO)

## Overview
Esta guía explica cómo implementar la funcionalidad de **eliminar items desde selects** (como lo hicimos con categorías en Productos) en todos los módulos de inventario.

**Patrón a seguir:**
- ✅ Un emoji `❌` en hover de cada item
- ✅ AlertDialog de confirmación
- ✅ Validación de dependencias (no eliminar si hay items relacionados)
- ✅ Toast de éxito/error

---

## 📦 MÓDULOS A ACTUALIZAR

### 1. **Warehouses** (`src/pages/Warehouses.tsx`)

#### Ubicación: Form Dialogs donde se selecciona almacén

**Casos de uso:**
- Transferencias entre almacenes (selects de "origen" y "destino")
- Asignación de stock a almacén

**Implementación:**

```typescript
// Estados necesarios
const [isDeleteWarehouseDialogOpen, setIsDeleteWarehouseDialogOpen] = useState(false);
const [warehouseToDelete, setWarehouseToDelete] = useState<any>(null);

// Mutación para eliminar (similar a deleteCategoryMutation)
const deleteWarehouseMutation = useMutation({
  mutationFn: async (warehouseId: string) => {
    // Verificar que no es el almacén principal
    const warehouse = warehouses?.find(w => w.id === warehouseId);
    if (warehouse?.is_main) {
      throw new Error('No se puede eliminar el almacén principal');
    }

    // Verificar que no tiene stock
    const { data: warehouseStock } = await supabase
      .from("warehouse_stock")
      .select("id")
      .eq("warehouse_id", warehouseId);

    if (warehouseStock && warehouseStock.length > 0) {
      throw new Error(`No se puede eliminar: tiene ${warehouseStock.length} producto(s) en stock`);
    }

    // Verificar transferencias
    const { data: transfers } = await supabase
      .from("warehouse_transfers")
      .select("id")
      .or(`source_warehouse_id.eq.${warehouseId},target_warehouse_id.eq.${warehouseId}`);

    if (transfers && transfers.length > 0) {
      throw new Error('No se puede eliminar: hay transferencias asociadas');
    }

    // Marcar como inactivo
    const { error } = await supabase
      .from("warehouses")
      .update({ active: false })
      .eq("id", warehouseId);

    if (error) throw error;
  },
  onSuccess: () => {
    toast.success("Almacén eliminado exitosamente");
    queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    setIsDeleteWarehouseDialogOpen(false);
    setWarehouseToDelete(null);
  },
  onError: (error: any) => {
    toast.error(error.message || "Error al eliminar el almacén");
  },
});
```

**En SelectContent (donde se muestran warehouse items):**

```typescript
<SelectContent>
  {warehouses?.map((warehouse) => (
    <div
      key={warehouse.id}
      className="flex items-center justify-between px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer group"
      onClick={() => setFormData({ ...formData, warehouse_id: warehouse.id })}
    >
      <span className="flex-1">{warehouse.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setWarehouseToDelete(warehouse);
          setIsDeleteWarehouseDialogOpen(true);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ))}
</SelectContent>
```

**AlertDialog:**
```typescript
<AlertDialog open={isDeleteWarehouseDialogOpen} onOpenChange={setIsDeleteWarehouseDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        Eliminar Almacén
      </AlertDialogTitle>
      <AlertDialogDescription className="space-y-3 pt-2">
        <p>Se eliminará el almacén <span className="font-semibold">{warehouseToDelete?.name}</span></p>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded p-3 text-sm">
          <strong>Validaciones:</strong>
          <ul className="list-disc ml-4 mt-2 text-xs">
            <li>No puede ser el almacén principal</li>
            <li>No debe tener stock asociado</li>
            <li>No debe tener transferencias pendientes</li>
          </ul>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={() => deleteWarehouseMutation.mutate(warehouseToDelete.id)}
        className="bg-destructive"
      >
        Eliminar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

### 2. **Warehouse Transfers** (`src/pages/WarehouseTransfers.tsx`)

#### Ubicaciones:
- Select de **almacén origen**
- Select de **almacén destino**

**Nota:** Similar a Warehouses, pero con validación adicional:
- No permitir transferencia de mismo almacén a sí mismo
- Mostrar stock disponible

```typescript
// Estados
const [isDeleteSourceWarehouseDialogOpen, setIsDeleteSourceWarehouseDialogOpen] = useState(false);
const [sourceWarehouseToDelete, setSourceWarehouseToDelete] = useState<any>(null);

// En SelectContent:
<SelectContent>
  {warehouses?.map((warehouse) => (
    <div
      key={warehouse.id}
      className="flex items-center justify-between px-2 py-2 text-sm hover:bg-accent rounded group"
      onClick={() => setFormData({ ...formData, source_warehouse_id: warehouse.id })}
    >
      <span className="flex-1">{warehouse.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setSourceWarehouseToDelete(warehouse);
          setIsDeleteSourceWarehouseDialogOpen(true);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ))}
</SelectContent>
```

---

### 3. **Warehouse Stock** (`src/pages/WarehouseStock.tsx`)

#### Ubicación:
- Select de **almacén** para filtrar

**Implementación:** Mostrar opción de eliminar almacén desde el select.

```typescript
// En el SelectContent del filtro de almacenes:
<SelectContent>
  {warehouses?.map((warehouse) => (
    <div
      key={warehouse.id}
      className="flex items-center justify-between px-2 py-2 text-sm hover:bg-accent rounded group cursor-pointer"
      onClick={() => setSelectedWarehouse(warehouse.id)}
    >
      <span className="flex-1">{warehouse.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteWarehouse(warehouse);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ))}
</SelectContent>
```

---

### 4. **Inventory Alerts** (`src/pages/InventoryAlerts.tsx`)

#### Ubicaciones:
- Select de **almacén**
- Select de **producto**
- Select de **tipo de alerta**

**Implementación:**

```typescript
// Para eliminar almacén:
<SelectContent>
  {warehouses?.map((warehouse) => (
    <div className="flex items-center justify-between px-2 py-2 group cursor-pointer" 
         onClick={() => setFormData({ ...formData, warehouse_id: warehouse.id })}>
      <span>{warehouse.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setWarehouseToDelete(warehouse);
          setIsDeleteDialogOpen(true);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ))}
</SelectContent>

// Similar para productos y otros items
```

---

## ⚙️ PASOS DE IMPLEMENTACIÓN (Por Orden de Prioridad)

### **Fase 1: Core** (Crítica)  
1. ✅ **Warehouses.tsx** - Eliminar almacén
   - [ ] Agregar estado `isDeleteWarehouseDialogOpen`
   - [ ] Agregar mutación `deleteWarehouseMutation`
   - [ ] Implementar select con botón X
   - [ ] Implementar AlertDialog

2. ✅ **Warehouse Transfers.tsx** - Almacén origen/destino
   - Similar a #1

### **Fase 2: Filtros** (Importante)
3. ✅ **Warehouse Stock.tsx** - Filtro de almacén
   - Agregar delete en select de almacén

4. ✅ **Inventory Alerts.tsx** - Filtros múltiples
   - Agregar delete en almacén y producto

---

## 🧪 TESTING CHECKLIST

Para CADA módulo que implementes:

```typescript
// Test que debe pasar:
it('should allow deleting item from select', async () => {
  // 1. Render select
  // 2. Click delete button (X)
  // 3. Confirm in AlertDialog
  // 4. Verify item removed
});

it('should prevent delete if item has dependencies', async () => {
  // 1. Try to delete item with related data
  // 2. Verify error message shows why
});

it('should show loading state during delete', async () => {
  // 1. Click delete
  // 2. Verify button/dialog shows loading
});

it('should show success toast after delete', async () => {
  // 1. Delete item
  // 2. Verify toast appears
  // 3. Verify cache invalidates
});
```

---

## 🔄 VALIDACIONES ESPECÍFICAS

### Warehouse Deletions
- ❌ No puede ser almacén principal (`is_main: true`)
- ❌ No puede tener stock (`warehouse_stock` records)
- ❌ No puede tener transferencias activas/pendientes

### Product in Alerts Deletions
- ❌ Validar que no hay alertas críticas
- ❌ Mantener historial (soft delete)

### Alert Type/Severity Deletions
- ✅ Sin dependencias, eliminar directamente

---

## 📝 REQUISITOS TÉCNICOS

**Cada implementación debe tener:**

1. **Mutación de eliminación** - con validaciones en DB
2. **Estados React** - para dialogs y data
3. **SelectContent personalizado** - con botón X en hover
4. **AlertDialog** - con confirmación y advertencias
5. **Toast notifications** - éxito/error
6. **QueryClient invalidation** - actualizar caché
7. **Error messages** - específicas y útiles
8. **Loading states** - UX feedback

---

## 🎯 PRIORIDAD DE IMPLEMENTACIÓN

```
1. Warehouses.tsx              [CRÍTICA]     
2. WarehouseTransfers.tsx      [CRÍTICA]
3. WarehouseStock.tsx          [IMPORTANTE]
4. InventoryAlerts.tsx         [IMPORTANTE]
```

---

## ✅ VALIDACIÓN FINAL

Después de implementar todo, ejecuta:

```bash
# Tests de categorías + productos
npm test -- __tests__/Products.category*.test.ts

# Tests de inventario
npm test -- __tests__/Inventory.comprehensive.test.ts

# Todo junto
npm test
```

Debe haber:
- ✅ 12 tests de categorías (creación/eliminación)
- ✅ 36 tests avanzados (edge cases)
- ✅ 30 tests de inventario
- ✅ **Total: 78+ tests pasando**
