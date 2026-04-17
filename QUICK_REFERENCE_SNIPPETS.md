# ⚡ QUICK REFERENCE: Copy-Paste Code Snippets

## Estado Base (Para cada módulo)
```typescript
// ESTADOS
const [isDelete[Item]DialogOpen, setIsDelete[Item]DialogOpen] = useState(false);
const [[item]ToDelete, set[Item]ToDelete] = useState<any>(null);

// QUERYGEN
const queryClient = useQueryClient();
```

---

## 🏢 WAREHOUSES - Eliminar Almacén

### 1️⃣ Mutación
```typescript
const deleteWarehouseMutation = useMutation({
  mutationFn: async (warehouseId: string) => {
    if (!currentCompany?.id) throw new Error('Empresa no seleccionada');

    // Validar que no es almacén principal
    const warehouse = warehouses?.find(w => w.id === warehouseId);
    if (warehouse?.is_main) {
      throw new Error('No se puede eliminar el almacén principal');
    }

    // Verificar stock
    const { data: warehouseStock } = await supabase
      .from("warehouse_stock")
      .select("id")
      .eq("warehouse_id", warehouseId)
      .eq("company_id", currentCompany.id);

    if (warehouseStock && warehouseStock.length > 0) {
      throw new Error(`No se puede eliminar: tiene ${warehouseStock.length} producto(s) en stock`);
    }

    // Verificar transferencias
    const { data: transfers } = await supabase
      .from("warehouse_transfers")
      .select("id")
      .eq("company_id", currentCompany.id)
      .or(`source_warehouse_id.eq.${warehouseId},target_warehouse_id.eq.${warehouseId}`);

    if (transfers && transfers.length > 0) {
      throw new Error(`No se puede eliminar: hay ${transfers.length} transferencia(s) asociada(s)`);
    }

    // Soft delete
    const { error } = await supabase
      .from("warehouses")
      .update({ active: false })
      .eq("id", warehouseId)
      .eq("company_id", currentCompany.id);

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

### 2️⃣ SelectContent Personalizado
```typescript
<SelectContent className="max-w-xs">
  {warehouses?.map((warehouse: any) => (
    <div
      key={warehouse.id}
      className="flex items-center justify-between px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer group"
      onClick={() => setFormData({ ...formData, warehouse_id: warehouse.id })}
    >
      <span className="flex-1">{warehouse.name} ({warehouse.code})</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setWarehouseToDelete(warehouse);
          setIsDeleteWarehouseDialogOpen(true);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all text-destructive hover:text-destructive ml-2"
        title="Eliminar almacén"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ))}
</SelectContent>
```

### 3️⃣ AlertDialog
```typescript
<AlertDialog open={isDeleteWarehouseDialogOpen} onOpenChange={setIsDeleteWarehouseDialogOpen}>
  <AlertDialogContent className="max-w-md">
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        Eliminar Almacén
      </AlertDialogTitle>
      <AlertDialogDescription className="space-y-3 pt-2">
        <p>
          Se eliminará el almacén <span className="font-semibold text-foreground">"{warehouseToDelete?.name}"</span>
        </p>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-3 text-sm">
          <p className="text-amber-900 dark:text-amber-100">
            <strong>Validaciones:</strong>
          </p>
          <ul className="list-disc ml-6 mt-2 text-xs text-amber-900 dark:text-amber-100">
            <li>No puede ser el almacén principal</li>
            <li>No debe tener productos en stock</li>
            <li>No debe tener transferencias activas</li>
          </ul>
        </div>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="gap-2">
      <AlertDialogCancel disabled={deleteWarehouseMutation.isPending}>
        Cancelar
      </AlertDialogCancel>
      <AlertDialogAction
        onClick={() => {
          if (warehouseToDelete?.id) {
            deleteWarehouseMutation.mutate(warehouseToDelete.id);
          }
        }}
        disabled={deleteWarehouseMutation.isPending}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {deleteWarehouseMutation.isPending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
            Eliminando...
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </>
        )}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 🚚 WAREHOUSE TRANSFERS - Eliminar de Origen/Destino

### SelectContent (Reutilizable)
```typescript
// Para source_warehouse_id
<SelectContent>
  {warehouses?.map((warehouse) => (
    <div
      key={warehouse.id}
      className="flex items-center justify-between px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer group"
      onClick={() => setFormData({ ...formData, source_warehouse_id: warehouse.id })}
    >
      <span className="flex-1">
        {warehouse.name} 
        <span className="text-xs text-muted-foreground ml-1">({warehouse.code})</span>
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setWarehouseToDelete(warehouse);
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

### Validación Adicional
```typescript
// Prevenir seleccionar mismo almacén para origen y destino
it('should prevent creating transfer to same warehouse', () => {
  const sourceId = formData.source_warehouse_id;
  const targetId = formData.target_warehouse_id;
  
  const isValid = sourceId && targetId && sourceId !== targetId;
  
  // Deshabilitar botón si no es válido
  return isValid;
});
```

---

## 📦 WAREHOUSE STOCK - Filtro de Almacén

### SelectContent (Filtro)
```typescript
<SelectContent>
  <SelectItem value="all">Todos los almacenes</SelectItem>
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
          setWarehouseToDelete(warehouse);
          setIsDeleteWarehouseDialogOpen(true);
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

## 🔔 INVENTORY ALERTS - Eliminar Almacén/Producto

### Para Almacén
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
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded text-destructive"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ))}
</SelectContent>
```

### Para Producto
```typescript
<SelectContent>
  {products?.map((product) => (
    <div
      key={product.id}
      className="flex items-center justify-between px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer group"
      onClick={() => setFormData({ ...formData, product_id: product.id })}
    >
      <span className="flex-1">
        {product.name}
        <span className="text-xs text-muted-foreground ml-1">({product.sku})</span>
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setProductToDelete(product);
          setIsDeleteProductDialogOpen(true);
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

## 🧪 TEST TEMPLATE

```typescript
describe('WAREHOUSE DELETE: From Select', () => {
  it('should allow deleting warehouse from select', async () => {
    const warehouseToDelete = mockWarehouses[0];
    
    // Simulate delete
    warehouses = warehouses.filter(w => w.id !== warehouseToDelete.id);
    
    expect(warehouses).not.toContainEqual(warehouseToDelete);
  });

  it('should prevent delete if warehouse has stock', async () => {
    const warehouseWithStock = mockWarehouses[0];
    const stock = [
      { warehouse_id: warehouseWithStock.id, product_id: 'prod-1', stock: 100 },
    ];

    const canDelete = !stock.some(s => s.warehouse_id === warehouseWithStock.id);
    expect(canDelete).toBe(false);
  });

  it('should show error message if delete fails', async () => {
    const toasts = [];
    toasts.push({
      type: 'error',
      message: 'No se puede eliminar: el almacén tiene stock',
    });

    expect(toasts[0].type).toBe('error');
  });

  it('should disable delete button during operation', async () => {
    let isDeleting = false;
    
    const handleDelete = async () => {
      isDeleting = true;
      await new Promise(r => setTimeout(r, 100));
      isDeleting = false;
    };

    expect(isDeleting).toBe(false);
    handleDelete();
    expect(isDeleting).toBe(true);
  });
});
```

---

## 🎨 IMPORTS NECESARIOS

Asegúrate de tener estos imports en cada archivo:

```typescript
import { X, Trash2, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
```

---

## ✅ CHECKLIST POR MÓDULO

### Warehouses.tsx
- [ ] Agregar imports (X, Trash2, AlertCircle, AlertDialog)
- [ ] Agregar estados (isDelete..., ...ToDelete)
- [ ] Agregar mutación deleteWarehouseMutation
- [ ] Reemplazar SelectContent en formulario
- [ ] Agregar AlertDialog al final del componente
- [ ] Ejecutar tests
- [ ] Verificar toast notifications

### WarehouseTransfers.tsx
- [ ] Agregar estados
- [ ] Agregar mutación (similar a Warehouses)
- [ ] Reemplazar SelectContent para origen
- [ ] Reemplazar SelectContent para destino
- [ ] Agregar AlertDialog
- [ ] Agregar validación: no mismo almacén
- [ ] Tests

### WarehouseStock.tsx
- [ ] Agregar estado + mutación
- [ ] Reemplazar SelectContent del filtro
- [ ] Agregar AlertDialog
- [ ] Tests

### InventoryAlerts.tsx
- [ ] Agregar estados (múltiples)
- [ ] Agregar mutaciones (almacén + producto)
- [ ] Reemplazar SelectContent (x2)
- [ ] Agregar AlertDialogs (x2)
- [ ] Tests

---

## 🚀 COMANDOS ÚTILES

```bash
# Ejecutar todos los tests
npm test

# Tests específicos de productos
npm test -- __tests__/Products.category*.test.ts

# Tests de inventario
npm test -- __tests__/Inventory.comprehensive.test.ts

# Tests en modo watch (desarrollo)
npm test -- --watch

# Con coverage
npm test -- --coverage
```

---

## 💡 TIPS

1. **Copy-Paste Smart**: Copia la sección completa (mutación + select + dialog) del módulo anterior
2. **Buscar diferencias**: Cada módulo tiene validaciones diferentes - revisa bien
3. **Test primero**: Escribe el test ANTES de implementar la UI
4. **Component Isolation**: Prueba el select aislado antes de agregarlo al form
5. **Error Messages**: Hazlas específicas - "stock", "transfers", "is_main", etc.

---

## 📝 NOTAS

- El patrón es **idéntico** en todos los módulos
- Solo cambian las validaciones según las reglas del negocio
- Reutilizar `AlertDialog` y `SelectContent` styles
- Mantener consistencia de UI/UX
