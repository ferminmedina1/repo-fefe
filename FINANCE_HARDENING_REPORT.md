# Reporte de Mejoras — Módulo Finance
**Fecha:** 12 de Marzo, 2026  
**Tipo:** Security Hardening + Quality P0/P1  
**Estado:** ✅ Completado

---

## Por qué se hizo

La plataforma es **multi-tenant**: múltiples empresas usan el mismo sistema, cada una aislada por `company_id`. Se detectaron dos clases de problemas críticos:

1. **Tablas sin Row Level Security (RLS)** en Supabase → cualquier usuario autenticado podía leer o modificar datos de otras empresas directamente desde el cliente si conocía o adivinaba un UUID.

2. **Mutations frontend sin scope de empresa** → operaciones UPDATE/DELETE que filtraban solo por `.eq("id", id)` sin verificar `.eq("company_id", ...)`, permitiendo que un usuario modifique registros de otra empresa si obtiene el ID del registro.

3. **Cache keys de TanStack Query sin `company_id`** → al cambiar de empresa activa, el cache mostraba datos de la empresa anterior hasta el próximo refetch.

4. **Queries sin `enabled` guard** → queries que se disparaban antes de que `currentCompany` estuviese disponible, causando requests sin `company_id` que podían devolver datos incorrectos.

---

## Qué se hizo y cómo

### PARTE 1 — Migración P0: RLS en tablas Finance (DB)

**Archivo:** `supabase/migrations/20260312114000_p0_finance_hardening.sql`  
**Estado:** ✅ Ejecutada en producción

**Tablas afectadas:** `bank_accounts`, `bank_movements`, `card_movements`, `expenses`, `checks`, `retentions`

**Por cada tabla se aplicó:**

```sql
-- 1. Activar RLS
ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY;

-- 2. Forzar RLS incluso para el rol owner
ALTER TABLE public.<tabla> FORCE ROW LEVEL SECURITY;

-- 3. Política SELECT: cualquier miembro activo de la empresa puede leer
CREATE POLICY "..." ON public.<tabla> FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = <tabla>.company_id
      AND cu.active = true
  )
);

-- 4. Política INSERT: admin, manager, (cashier en algunos casos)
-- 5. Política UPDATE: admin, manager, (cashier en algunos casos)
-- 6. Política DELETE: solo admin
```

**Granularidad de roles por tabla:**

| Tabla | INSERT | UPDATE | DELETE |
|---|---|---|---|
| `bank_accounts` | admin, manager | admin, manager | admin |
| `bank_movements` | admin, manager, cashier | admin, manager, cashier | admin |
| `card_movements` | admin, manager, cashier | admin, manager, cashier | admin |
| `expenses` | admin, manager, cashier, employee | admin, manager | admin |
| `checks` | admin, manager, cashier | admin, manager, cashier | admin |
| `retentions` | admin, manager, cashier | admin, manager | admin |

---

### PARTE 2 — Fixes P1: Frontend (10 páginas)

#### BankAccounts.tsx

**Problema:** `toggleAccountStatus` filtraba solo por `.eq("id", id)` → un usuario podía desactivar una cuenta bancaria de otra empresa.  
**Fix:**
```ts
// Antes
.eq("id", id)

// Después
.eq("id", id)
.eq("company_id", currentCompany?.id)
```

**Problema:** Invalidaciones usaban `["bank-accounts"]` → cache compartido entre empresas.  
**Fix:** `["bank-accounts", currentCompany?.id]` (2 ocurrencias)

---

#### BankMovements.tsx

**Problema:** `reconcileMovement` filtraba solo por `.eq("id", id)`.  
**Fix:** Agregado `.eq("company_id", currentCompany?.id)` a la mutation.

**Problema:** Invalidaciones sin company_id.  
**Fix:** `["bank-movements", currentCompany?.id]` y `["bank-accounts", currentCompany?.id]` (3 ocurrencias)

---

#### CardMovements.tsx

**Problema:** `markAsAccredited` filtraba solo por `.eq("id", id)` → acreditación cruzada entre empresas posible.  
**Fix:** Agregado `.eq("company_id", currentCompany?.id)`.

**Problema:** Invalidaciones sin company_id.  
**Fix:** `["card-movements", currentCompany?.id]` (2 ocurrencias)

---

#### Expenses.tsx

**Problema:** Query de `expense-categories` no tenía `company_id` filter ni `enabled` guard → cargaba categorías de todas las empresas y se ejecutaba antes de que `currentCompany` estuviese disponible.  
**Fix:**
```ts
// Antes
queryKey: ["expense-categories"],
queryFn: async () => {
  const { data } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("active", true)
enabled: canView,

// Después
queryKey: ["expense-categories", currentCompany?.id],
queryFn: async () => {
  const { data } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("company_id", currentCompany?.id)  // ← filtro agregado
    .eq("active", true)
enabled: canView && !!currentCompany?.id,  // ← guard reforzado
```

**Problema:** Invalidación de gastos sin company_id.  
**Fix:** `["expenses", currentCompany?.id]`

---

#### Checks.tsx

**Problema:** `updateCheckStatus` filtraba solo por `.eq("id", id)` → cambio de estado de cheques de otras empresas.  
**Fix:** Agregado `.eq("company_id", currentCompany?.id)`.

**Problema:** Invalidaciones sin company_id.  
**Fix:** `["checks", currentCompany?.id]` (2 ocurrencias)

---

#### Retentions.tsx

**Problema:** Invalidación sin company_id.  
**Fix:** `["retentions", currentCompany?.id]`

---

#### AccountsReceivable.tsx

**Problema:** Query de clientes no tenía `enabled` guard → se ejecutaba sin `company_id` disponible.  
**Fix:** Agregado `enabled: !!currentCompany?.id`.

**Problema:** Invalidaciones post-pago sin company_id → al registrar un pago el cache no se invalidaba correctamente para la empresa activa.  
**Fix:**
```ts
// Antes
queryClient.invalidateQueries({ queryKey: ["customers-with-balance"] });
queryClient.invalidateQueries({ queryKey: ["customer-movements"] });

// Después
queryClient.invalidateQueries({ queryKey: ["customers-with-balance", undefined, currentCompany?.id] });
queryClient.invalidateQueries({ queryKey: ["customer-movements", selectedCustomer?.id] });
```

---

#### MonthlyClosing.tsx
**Estado:** ✅ Sin cambios — auditada, todas las queries ya tenían `enabled: !!currentCompany?.id` y company_id scope correcto. Solo lectura, sin mutations.

---

#### AccountantReports.tsx
**Estado:** ✅ Sin cambios — auditada, query principal correctamente scoped. La única mutation invoca una edge function de Supabase y siempre pasa `companyId` explícitamente. Sin issues.

---

#### AFIPBilling.tsx
**Estado:** ✅ Sin cambios — auditada, todas las queries tienen `enabled: !!currentCompany?.id` y `company_id` scope. Sin mutations que requieran fix.

---

## Resumen de cambios por categoría

### Mutations sin scope corregidas (4 críticas)
| Página | Mutation | Riesgo |
|---|---|---|
| BankAccounts | `toggleAccountStatus` | Desactivar cuentas de otra empresa |
| BankMovements | `reconcileMovement` | Conciliar movimientos de otra empresa |
| CardMovements | `markAsAccredited` | Acreditar movimientos de otra empresa |
| Checks | `updateCheckStatus` | Cambiar estado de cheques de otra empresa |

### Cache keys corregidas (10 ocurrencias)
`bank-accounts` × 2, `bank-movements` × 2, `bank-accounts` (desde BankMovements) × 1, `card-movements` × 2, `expenses` × 1, `checks` × 2, `retentions` × 1, `customers-with-balance` × 1

### Queries con `enabled` guard corregidas (2)
- `expense-categories` en Expenses.tsx
- `customers-with-balance` en AccountsReceivable.tsx

### Políticas RLS creadas en DB (24 políticas)
6 tablas × 4 políticas (SELECT, INSERT, UPDATE, DELETE) = 24 políticas nuevas

---

## Contexto técnico

- **Framework:** React + TypeScript
- **State management:** TanStack Query v5
- **Backend:** Supabase (PostgreSQL + RLS)
- **Multi-tenancy:** `company_users` table con `user_id`, `company_id`, `role`, `active`
- **Auth:** `auth.uid()` en RLS policies, `useCompany()` hook en frontend
- **Roles:** `admin` > `manager` > `cashier` > `employee`
