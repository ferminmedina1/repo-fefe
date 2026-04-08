// INTEGRATION_EXAMPLE.md - Ejemplo de integración del sistema de filtros

## Ejemplo Completo: Integración en Customers.tsx

### 1. Importar componentes y hooks

```tsx
import FilterableDataTable from '@/components/ui/FilterableDataTable';
import { FilterConfig } from '@/hooks/useTableFilters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
```

### 2. Definir configuración de filtros

```tsx
const CUSTOMER_FILTERS: FilterConfig = {
  name: {
    type: 'text',
    label: 'Nombre',
    placeholder: 'Buscar por nombre...'
  },
  email: {
    type: 'text',
    label: 'Email',
    placeholder: 'Buscar por email...'
  },
  phone: {
    type: 'text',
    label: 'Teléfono'
  },
  status: {
    type: 'select',
    label: 'Estado',
    options: [
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' },
      { value: 'suspended', label: 'Suspendido' }
    ]
  },
  created_at: {
    type: 'date',
    label: 'Fecha de Creación'
  },
  // Para rango de crédito disponible
  credit_limit: {
    type: 'number',
    label: 'Límite de Crédito Mínimo'
  }
};
```

### 3. Componente del cliente con tabla filtrable

```tsx
export default function Customers() {
  const { currentCompany } = useCompany();
  const navigate = useNavigate();
  
  // Fetch customers
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gestión de clientes con filtros y ordenamiento</p>
        </div>

        {/* Nuevos botones para agregar */}
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate('/customers/new')}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Cliente
          </Button>
          <Button variant="outline" onClick={() => navigate('/customers/import')}>
            Importar CSV
          </Button>
        </div>

        {/* Tabla filtrable */}
        <FilterableDataTable
          data={customers || []}
          columns={[
            { 
              key: 'name', 
              label: 'Nombre',
              render: (value) => <strong>{value}</strong>
            },
            { 
              key: 'email', 
              label: 'Email',
              render: (value) => <span className="text-blue-600 underline">{value}</span>
            },
            { 
              key: 'phone', 
              label: 'Teléfono'
            },
            { 
              key: 'status', 
              label: 'Estado',
              render: (value) => (
                <Badge 
                  variant={value === 'active' ? 'default' : 'secondary'}
                >
                  {value === 'active' ? 'Activo' : value === 'inactive' ? 'Inactivo' : 'Suspendido'}
                </Badge>
              )
            },
            { 
              key: 'credit_limit', 
              label: 'Límite de Crédito',
              render: (value) => `$${Number(value).toLocaleString()}`
            },
            { 
              key: 'created_at', 
              label: 'Fecha Creación',
              render: (value) => format(new Date(value), 'dd/MM/yyyy')
            },
            { 
              key: 'total_purchases', 
              label: 'Compras Totales',
              render: (value) => value || 0
            }
          ]}
          filterConfig={CUSTOMER_FILTERS}
          isLoading={isLoading}
          onRowClick={(customer) => navigate(`/customers/${customer.id}`)}
          rowClassName={(customer) => 
            customer.status === 'suspended' ? 'bg-red-50' : ''
          }
          actions={(customer) => (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/customers/${customer.id}`)}
                title="Ver detalles"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/customers/${customer.id}/edit`)}
                title="Editar"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (confirm(`¿Eliminar cliente ${customer.name}?`)) {
                    deleteCustomer.mutate(customer.id);
                  }
                }}
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        />
      </div>
    </Layout>
  );
}
```

## Aplicar en Otros Módulos

### Sales.tsx
```tsx
const SALES_FILTERS: FilterConfig = {
  customer_name: { type: 'text', label: 'Cliente' },
  invoice_number: { type: 'text', label: 'Factura' },
  status: {
    type: 'select',
    label: 'Estado',
    options: [
      { value: 'pending', label: 'Pendiente' },
      { value: 'partial', label: 'Pago Parcial' },
      { value: 'paid', label: 'Pagado' }
    ]
  },
  sale_date: { type: 'date', label: 'Fecha de Venta' },
  total_amount: { type: 'number', label: 'Monto Mínimo' }
};
```

### Products.tsx
```tsx
const PRODUCT_FILTERS: FilterConfig = {
  name: { type: 'text', label: 'Nombre del Producto' },
  sku: { type: 'text', label: 'SKU' },
  category: {
    type: 'select',
    label: 'Categoría',
    options: [...categoriesFromAPI]
  },
  price: { type: 'number', label: 'Precio Mínimo' },
  stock: { type: 'number', label: 'Stock Mínimo' }
};
```

### Employees.tsx
```tsx
const EMPLOYEE_FILTERS: FilterConfig = {
  full_name: { type: 'text', label: 'Nombre' },
  email: { type: 'text', label: 'Email' },
  department: {
    type: 'select',
    label: 'Departamento',
    options: [
      { value: 'sales', label: 'Ventas' },
      { value: 'support', label: 'Soporte' },
      { value: 'management', label: 'Administración' }
    ]
  },
  status: {
    type: 'select',
    label: 'Estado',
    options: [
      { value: 'active', label: 'Activo' },
      { value: 'inactive', label: 'Inactivo' }
    ]
  },
  hire_date: { type: 'date', label: 'Fecha de Contratación' }
};
```

### AuditLogs.tsx
```tsx
const AUDIT_FILTERS: FilterConfig = {
  user_email: { type: 'text', label: 'Usuario' },
  table_name: { type: 'text', label: 'Tabla' },
  action: {
    type: 'select',
    label: 'Acción',
    options: [
      { value: 'INSERT', label: 'Crear' },
      { value: 'UPDATE', label: 'Actualizar' },
      { value: 'DELETE', label: 'Eliminar' }
    ]
  },
  created_at: { type: 'date', label: 'Fecha del Evento' }
};
```

## Ventajas de Este Sistema

✅ **Reutilizable**: Mismo componente en toda la app  
✅ **Consistente**: Same UX/UI everywhere  
✅ **Performante**: Usa useMemo para optimizar  
✅ **Flexible**: Soporta filtros personalizados  
✅ **Accesible**: Navegación por teclado  
✅ **Moderno**: Animaciones y gradientes  
✅ **Mantenible**: Código centralizado  

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterableDataTable from '@/components/ui/FilterableDataTable';

it('should filter data by text', async () => {
  const data = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' }
  ];

  render(
    <FilterableDataTable
      data={data}
      columns={[
        { key: 'name', label: 'Nombre' },
        { key: 'email', label: 'Email' }
      ]}
      filterConfig={{
        name: { type: 'text', label: 'Nombre' }
      }}
    />
  );

  const input = screen.getByPlaceholderText('Buscar...');
  await userEvent.type(input, 'John');

  expect(screen.getByText('John')).toBeInTheDocument();
  expect(screen.queryByText('Jane')).not.toBeInTheDocument();
});
```
