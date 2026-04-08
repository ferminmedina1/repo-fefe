# Sistema de Filtros y Ordenamiento para Tablas

## Overview

Sistema reutilizable para agregar filtros dinámicos y ordenamiento por columnas a todas las tablas de la aplicación.

## Componentes Principales

### 1. **useTableFilters Hook**
Hook personalizado que maneja toda la lógica de filtrado y ordenamiento.

```tsx
const {
  filters,              // Estado actual de filtros
  sortConfig,           // Configuración de ordenamiento
  filteredAndSortedData,// Datos filtrados y ordenados
  setFilter,            // Establecer filtro
  clearFilter,          // Limpiar filtro individual
  clearAllFilters,      // Limpiar todos los filtros
  setSortConfig,        // Establecer ordenamiento
  isFiltered            // Boolean: ¿hay filtros activos?
} = useTableFilters(data, filterConfig);
```

### 2. **TableFilterHeader Component**
Componente que renderiza la UI de filtros y ordenamiento.

- Muestra inputs según el tipo de filtro
- Botones para ordenar columnas
- Contador de filtros activos
- Botón para limpiar todo

### 3. **FilterableDataTable Component**
Componente wrapper que integra tabla + filtros + ordenamiento.

## Uso Básico

### Ejemplo 1: Tabla Simple con Filtros

```tsx
import FilterableDataTable from '@/components/ui/FilterableDataTable';
import { FilterConfig } from '@/hooks/useTableFilters';

const filterConfig: FilterConfig = {
  name: {
    type: 'text',
    label: 'Nombre',
    placeholder: 'Buscar por nombre...'
  },
  email: {
    type: 'text',
    label: 'Email'
  },
  status: {
    type: 'select',
    label: 'Estado',
    options: [
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' }
    ]
  }
};

export default function Customers() {
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchCustomers()
  });

  return (
    <FilterableDataTable
      data={customers || []}
      columns={[
        { key: 'name', label: 'Nombre' },
        { key: 'email', label: 'Email' },
        { key: 'status', label: 'Estado' },
        { key: 'created_at', label: 'Fecha Creación' }
      ]}
      filterConfig={filterConfig}
      isLoading={isLoading}
    />
  );
}
```

### Ejemplo 2: Tabla con Render Personalizado y Acciones

```tsx
<FilterableDataTable
  data={products}
  columns={[
    { 
      key: 'name', 
      label: 'Producto',
      render: (value) => <strong>{value}</strong>
    },
    { 
      key: 'price', 
      label: 'Precio',
      render: (value) => `$${value.toLocaleString()}`
    },
    { 
      key: 'stock', 
      label: 'Stock',
      render: (value) => (
        <Badge variant={value > 10 ? 'default' : 'destructive'}>
          {value}
        </Badge>
      )
    },
    { 
      key: 'category', 
      label: 'Categoría'
    }
  ]}
  filterConfig={{
    name: { type: 'text', label: 'Nombre' },
    category: {
      type: 'select',
      label: 'Categoría',
      options: [
        { value: 'electronics', label: 'Electrónica' },
        { value: 'clothing', label: 'Ropa' }
      ]
    },
    price: { type: 'number', label: 'Precio Mínimo' }
  }}
  onRowClick={(row) => navigate(`/products/${row.id}`)}
  rowClassName={(row) => row.stock < 5 ? 'bg-red-50' : ''}
  actions={(row) => (
    <div className="flex gap-2">
      <Button size="sm" variant="outline">Editar</Button>
      <Button size="sm" variant="destructive">Eliminar</Button>
    </div>
  )}
/>
```

## Tipos de Filtros

### 1. **Text Filter**
Búsqueda con case-insensitive substring matching.

```tsx
{
  type: 'text',
  label: 'Nombre',
  placeholder: 'Buscar por nombre...'
}
```

### 2. **Select Filter**
Dropdown con opciones predefinidas.

```tsx
{
  type: 'select',
  label: 'Estado',
  options: [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' }
  ]
}
```

### 3. **Date Filter**
Input de fecha para coincidencias exactas.

```tsx
{
  type: 'date',
  label: 'Fecha'
}
```

### 4. **Number Filter**
Búsqueda de valores numéricos exactos.

```tsx
{
  type: 'number',
  label: 'ID'
}
```

### 5. **Range Filter**
Rango numérico [min, max].

```tsx
{
  type: 'range',
  label: 'Precio'
}
```

## Características

✅ **Filtros Dinámicos**: Soporta texto, select, fecha, número y rango  
✅ **Ordenamiento**: Click en columnas para ordenar ascendente/descendente  
✅ **Búsqueda Anidada**: Soporta búsqueda en propiedades anidadas (ej: `address.city`)  
✅ **Rendimiento**: Usa `useMemo` para optimizar renders  
✅ **UI Moderna**: Diseño futurista con gradientes y animaciones  
✅ **Responsive**: Se adapta a dispositivos móviles  
✅ **Accesible**: Soporte completo para teclado  

## Animaciones Incluidas

- Gradientes azul-púrpura en headers de filtros
- Scale animations en botones
- Transiciones suaves en colores
- Fade-in en resultados
- Hover effects en filas

## Integración en Páginas Existentes

### En Customers.tsx:
```tsx
import FilterableDataTable from '@/components/ui/FilterableDataTable';

// Reemplazar tabla existente con:
<FilterableDataTable
  data={customersData}
  columns={[...]}
  filterConfig={filterConfig}
  isLoading={isLoading}
  actions={(row) => <CustomerActions customer={row} />}
/>
```

### En Products.tsx:
```tsx
// Similar pero con filtros especializados para productos
```

### En Sales.tsx:
```tsx
// Filtros por fecha, estado, monto, cliente
```

## Mejores Prácticas

1. **Nombres de Columnas**: Usar keys consistentes para acceder a datos  
2. **Render Functions**: Para formatear datos especiales (fechas, monedas, badges)  
3. **Filtros Relevantes**: Solo exponer filtros que tengan sentido para los datos  
4. **Ordenamiento**: Permitir ordenamiento por columnas clave (ID, nombre, fecha)  
5. **Performance**: Para datasets > 1000 registros, considerar paginación backend

## Próximas Mejoras Sugeridas

- [ ] Agregar exportación a CSV/Excel con filtros aplicados
- [ ] Guardar preferencias de filtros y ordenamiento por usuario
- [ ] Filtros avanzados (AND/OR operators)
- [ ] Búsqueda global en todas las columnas
- [ ] Columnas visibles/ocultas según preferencia
