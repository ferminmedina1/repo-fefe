# 🔧 MIGRATION SQL - signup_payment_methods (Updated)

**Versión:** 2.0 (Mercado Pago Optimizado)  
**Fecha:** March 6, 2026  
**Status:** Ready to Execute  
**Stripe Support:** Supported (pero no activo)

---

## 📋 SQL A EJECUTAR EN SUPABASE DASHBOARD

### Ubicación:
```
Supabase Dashboard 
  → SQL Editor 
  → "New Query" 
  → Copiar TODO el código de abajo
  → Click RUN
  → Esperar "Query executed successfully"
```

### El SQL Completo:

```sql
-- Create signup_payment_methods table with full Mercado Pago support
-- Includes extra fields for payment tracking, validation, and plan info

CREATE TABLE IF NOT EXISTS public.signup_payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  billing_country text NOT NULL,
  provider text NOT NULL,
  payment_method_ref text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  expires_at timestamp with time zone NULL DEFAULT (now() + '24:00:00'::interval),
  linked_to_company_id uuid NULL,
  
  -- Payment card details (for display/tracking)
  brand text NULL,
  last4 text NULL,
  exp_month integer NULL,
  exp_year integer NULL,
  
  -- Payment verification & error tracking
  payment_verified boolean NULL DEFAULT false,
  payment_error text NULL,
  
  -- Plan & billing info
  plan_id uuid NULL,
  amount numeric(10, 2) NULL,
  currency text NULL DEFAULT 'USD'::text,
  
  -- Mercado Pago specific fields
  payment_id text NULL,
  payment_method_id text NULL,
  issuer_id text NULL,
  
  -- User info at signup time (captured for audit)
  full_name text NULL,
  company_name text NULL,
  
  -- Modules selected during signup (JSON array)
  modules jsonb NULL DEFAULT '[]'::jsonb,
  
  -- Constraints
  CONSTRAINT signup_payment_methods_pkey PRIMARY KEY (id),
  CONSTRAINT fk_company FOREIGN KEY (linked_to_company_id) 
    REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT signup_payment_methods_plan_id_fkey FOREIGN KEY (plan_id) 
    REFERENCES subscription_plans(id),
  CONSTRAINT signup_payment_methods_provider_check CHECK (
    provider = ANY (ARRAY['stripe'::text, 'mercadopago'::text])
  )
) TABLESPACE pg_default;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_signup_payment_methods_company 
  ON public.signup_payment_methods USING btree (linked_to_company_id) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_signup_payment_methods_linked_company 
  ON public.signup_payment_methods USING btree (linked_to_company_id) 
  TABLESPACE pg_default 
  WHERE (linked_to_company_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_signup_payment_methods_email 
  ON public.signup_payment_methods USING btree (email) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_signup_payment_methods_expires_at 
  ON public.signup_payment_methods USING btree (expires_at) 
  TABLESPACE pg_default;

-- Add table comment for documentation
COMMENT ON TABLE public.signup_payment_methods IS 
  'Temporary storage for payment methods during signup flow. Auto-deletes after 24h if not linked to company. Supports Mercado Pago (primary) and Stripe (future).';

COMMENT ON COLUMN public.signup_payment_methods.payment_method_ref IS 
  'Mercado Pago token or Stripe payment_method_id';

COMMENT ON COLUMN public.signup_payment_methods.issuer_id IS 
  'Mercado Pago issuer ID (e.g., banco arg, visa, etc.) - helps with payment routing';

COMMENT ON COLUMN public.signup_payment_methods.payment_verified IS 
  'Flag indicating if payment went through successfully';

COMMENT ON COLUMN public.signup_payment_methods.modules IS 
  'JSON array of module IDs selected during signup (crm, pos, inventory, payroll, etc.)';
```

---

## ✅ VERIFICACIÓN POST-EJECUCIÓN

**Una vez ejecutado, verificar:**

### 1. Tabla Existe
En Supabase Dashboard → Database → Tables  
Busca: `signup_payment_methods`  
Debes ver: **20 columnas** (id + 19 más)

### 2. Índices Creados
```
En mismo panel, expandir tabla:
✅ idx_signup_payment_methods_company
✅ idx_signup_payment_methods_linked_company
✅ idx_signup_payment_methods_email
✅ idx_signup_payment_methods_expires_at
```

### 3. Constraints Verificados
```
✅ signup_payment_methods_pkey (PRIMARY KEY)
✅ fk_company (FOREIGN KEY → companies)
✅ signup_payment_methods_plan_id_fkey (FOREIGN KEY → subscription_plans)
✅ signup_payment_methods_provider_check (CHECK provider IN ('stripe', 'mercadopago'))
```

### Si Algo Falla:

**Error: "relation already exists"**  
→ La tabla ya existe. Es OK, significa está creada.  
→ Puedes ver los índices existentes en el panel.

**Error: "foreign key constraint... does not exist"**  
→ La tabla `companies` o `subscription_plans` no existen.  
→ Solución: Crear primero esas tablas (o quitamos FOREIGN KEY por ahora).

**Error: "relation... does not exist"** (companies)  
→ Usa este SQL alternativo sin FOREIGN KEYS:

---

## 🔧 SQL ALTERNATIVO (Sin Foreign Keys - Si companies/subscription_plans no existen)

```sql
-- Versión simplificada sin validación de FK
CREATE TABLE IF NOT EXISTS public.signup_payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  billing_country text NOT NULL,
  provider text NOT NULL,
  payment_method_ref text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  expires_at timestamp with time zone NULL DEFAULT (now() + '24:00:00'::interval),
  linked_to_company_id uuid NULL,
  brand text NULL,
  last4 text NULL,
  exp_month integer NULL,
  exp_year integer NULL,
  payment_verified boolean NULL DEFAULT false,
  payment_error text NULL,
  plan_id uuid NULL,
  amount numeric(10, 2) NULL,
  currency text NULL DEFAULT 'USD'::text,
  payment_id text NULL,
  payment_method_id text NULL,
  issuer_id text NULL,
  full_name text NULL,
  company_name text NULL,
  modules jsonb NULL DEFAULT '[]'::jsonb,
  
  CONSTRAINT signup_payment_methods_pkey PRIMARY KEY (id),
  CONSTRAINT signup_payment_methods_provider_check CHECK (
    provider = ANY (ARRAY['stripe'::text, 'mercadopago'::text])
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signup_payment_methods_company 
  ON public.signup_payment_methods(linked_to_company_id);

CREATE INDEX IF NOT EXISTS idx_signup_payment_methods_email 
  ON public.signup_payment_methods(email);

CREATE INDEX IF NOT EXISTS idx_signup_payment_methods_expires_at 
  ON public.signup_payment_methods(expires_at);
```

**Usa esta versión SI:**
- ❌ No tienes la tabla `companies` creada aún
- ❌ No tienes `subscription_plans` creada
- ✅ Quieres crear rápido sin dependencies

**DESPUÉS:**  
Cuando `companies` y `subscription_plans` existan, ejecuta:

```sql
-- Add foreign keys after tables exist
ALTER TABLE public.signup_payment_methods
ADD CONSTRAINT fk_company FOREIGN KEY (linked_to_company_id) 
  REFERENCES companies(id) ON DELETE SET NULL;

ALTER TABLE public.signup_payment_methods
ADD CONSTRAINT signup_payment_methods_plan_id_fkey FOREIGN KEY (plan_id) 
  REFERENCES subscription_plans(id);
```

---

## 📊 SCHEMA COMPLETO (Documentación)

### Tabla: `signup_payment_methods`

| Columna | Tipo | Nullable | Default | Descripción |
|---------|------|----------|---------|-------------|
| **id** | UUID | NO | gen_random_uuid() | Primary key |
| **email** | TEXT | NO | - | User email for payment |
| **name** | TEXT | NO | - | User display name |
| **billing_country** | TEXT | NO | - | ISO country code (AR, US, etc.) |
| **provider** | TEXT | NO | - | 'stripe' or 'mercadopago' |
| **payment_method_ref** | TEXT | NO | - | Token from provider (MP: token, Stripe: pm_*) |
| **created_at** | TIMESTAMPTZ | YES | NOW() | When payment method was added |
| **expires_at** | TIMESTAMPTZ | YES | NOW() + 24h | Auto-delete at this time |
| **linked_to_company_id** | UUID | YES | NULL | Company after account created |
| **brand** | TEXT | YES | NULL | Card brand (visa, mastercard, etc.) |
| **last4** | TEXT | YES | NULL | Last 4 digits of card |
| **exp_month** | INT | YES | NULL | Card expiration month (1-12) |
| **exp_year** | INT | YES | NULL | Card expiration year (YYYY) |
| **payment_verified** | BOOL | YES | FALSE | Did payment succeed? |
| **payment_error** | TEXT | YES | NULL | Error message if payment failed |
| **plan_id** | UUID | YES | NULL | Which plan was selected |
| **amount** | NUMERIC | YES | NULL | Payment amount |
| **currency** | TEXT | YES | 'USD' | Currency code (USD, ARS, etc.) |
| **payment_id** | TEXT | YES | NULL | MP payment ID or transaction ID |
| **payment_method_id** | TEXT | YES | NULL | MP or Stripe method ID |
| **issuer_id** | TEXT | YES | NULL | MP issuer (bank, provider) |
| **full_name** | TEXT | YES | NULL | User full name at signup |
| **company_name** | TEXT | YES | NULL | Company name at signup |
| **modules** | JSONB | YES | '[]' | Selected modules (JSON array) |

---

## 🔍 MERCADO PAGO INTEGRATION NOTES

### Campos Utilizados en MP Flow:

```javascript
// When user selects AR → Mercado Pago:

const paymentData = {
  email: "user@example.com",           // required
  name: "Juan Pérez",                   // required
  billing_country: "AR",                // required
  provider: "mercadopago",              // required
  payment_method_ref: "<MP_TOKEN>",     // required (from cardForm)
  brand: "visa",                        // from getFormData()
  last4: "1234",                        // from getFormData()
  exp_month: 12,                        // from cardForm
  exp_year: 2027,                       // from cardForm
  full_name: "Juan Pérez",
  company_name: "Mi Empresa",
  plan_id: "<uuid>",                    // selected plan
  amount: 99.00,
  currency: "ARS"
};

// After creating payment (create-intent):
await updatePaymentRecord({
  payment_id: resp.id,                  // MP payment ID
  payment_verified: resp.status === 'approved',
  payment_error: resp.status_detail,
  issuer_id: resp.issuer_id,            // bank/provider info
  payment_method_id: resp.payment_method.id,
  modules: selectedModules              // JSON array of module_ids
});
```

### Índices Optimizados Para:

```sql
-- Cleanup job (every hour)
SELECT * FROM signup_payment_methods 
WHERE expires_at < NOW() AND linked_to_company_id IS NULL;

-- Find user's pending payment
SELECT * FROM signup_payment_methods 
WHERE email = 'user@example.com' AND linked_to_company_id IS NULL;

-- Check if company has verified payment
SELECT * FROM signup_payment_methods 
WHERE linked_to_company_id = $1 AND payment_verified = TRUE;
```

---

## ⚡ QUICK DEPLOYMENT STEPS

### Step 1: Copy SQL
```
Copiar el primer bloque SQL (líneas 1-98)
```

### Step 2: Open Supabase
```
https://supabase.com/dashboard
→ Proyecto: dsfp_space
→ SQL Editor
→ New Query
```

### Step 3: Paste & Run
```
Pega el SQL completo
Click RUN (abajo a la derecha)
Espera 5-10 segundos
```

### Step 4: Verify
```
Database → Tables
Busca: signup_payment_methods
Debes ver 20 columnas ✅
```

---

## 🚀 WHAT'S NEXT (Post-Migration)

### Frontend Changes Needed:
```typescript
// In signup Step 3 flow:
interface PaymentFormData {
  email: string;
  name: string;
  billing_country: 'AR' | 'US' | 'MX' | ...;
  provider: 'mercadopago' | 'stripe';  // computed from country
  payment_method_ref: string;           // from cardForm
  full_name: string;
  company_name: string;
  plan_id: string;
  modules: string[];                    // selected module IDs
}

// Call backend:
const response = await supabase
  .functions
  .invoke('signup-save-payment-method', {
    body: paymentData
  });
```

### Backend Changes Done:
```typescript
// Already implemented in:
// supabase/functions/signup-save-payment-method/index.ts

// Handles:
✅ Insert into signup_payment_methods
✅ Validate Mercado Pago token
✅ Track payment verification
✅ Link to company after creation
✅ Auto-delete expired entries
```

---

## 📞 SUPPORT

### If SQL Fails:

1. **"syntax error"**: Check for missing commas/parentheses
2. **"table already exists"**: That's OK! Means it's already created
3. **"foreign key constraint fails"**: Use the ALTERNATIVE SQL above
4. **"permission denied"**: You need super user/admin role

### If SQL Succeeds but Table Not Visible:

1. Refresh browser (F5)
2. Clear browser cache (Ctrl+Shift+Delete)
3. Go back to Database → Tables
4. Search for "signup_payment" 

---

**Ready to Execute:** ✅ YES  
**Execution Time:** 5 minutes  
**Risk Level:** VERY LOW (new table, no existing data affected)  
**Rollback:** Delete table if needed (simple)

🚀 **Execute this SQL → CRM ready for production** 🚀
