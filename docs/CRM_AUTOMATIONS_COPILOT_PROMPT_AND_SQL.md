# Prompt para Copilot + SQL manual (CRM > Automatizaciones)

Este documento te deja 2 cosas listas:
1. Un **prompt copy/paste** para que Copilot integre el submódulo en frontend.
2. Un **script SQL** para ejecutar manualmente en Supabase SQL Editor.

---

## 1) Prompt para Copilot (copy/paste)

```md
Necesito que implementes un submódulo nuevo llamado **Automatizaciones** dentro de **CRM**, con alcance SOLO para opportunities y pipelines.

### Contexto técnico del proyecto
- React + TS + Vite.
- Sidebar principal en `src/components/layout/Sidebar.tsx`.
- Rutas en `src/App.tsx`.
- Acceso por módulos con `ModuleProtectedRoute`.
- Permisos por rol en `src/hooks/usePermissions.tsx`.
- En este proyecto CRM ya usa `moduleCode="opportunities"` para páginas CRM relacionadas (ej. reportes CRM), así que para MVP reutilizá ese mismo módulo de permisos/licenciamiento.

### Objetivo
Agregar en el sidebar CRM un item hijo llamado **Automatizaciones** que navegue a `/crm-automations`, y crear la pantalla base para gestionar workflows CRM.

### Requisitos obligatorios
1. **Sidebar**
   - En `src/components/layout/Sidebar.tsx`, dentro de sección CRM (`children` de CRM), agregar:
     - `title: "Automatizaciones"`
     - `href: "/crm-automations"`
     - ícono existente de `lucide-react` (usar uno ya disponible, por ejemplo `Workflow` o `Zap`)
     - `module: "opportunities"` (MVP: reutilizar permisos CRM actuales)

2. **Ruteo**
   - En `src/App.tsx`:
     - Agregar lazy import de página `CrmAutomations`.
     - Agregar ruta protegida:
       - `path="/crm-automations"`
       - `element={<ProtectedRoute><ModuleProtectedRoute moduleCode="opportunities"><CrmAutomations /></ModuleProtectedRoute></ProtectedRoute>}`

3. **Nueva página**
   - Crear `src/pages/CrmAutomations.tsx`.
   - La página debe incluir:
     - Título: `Automatizaciones CRM`.
     - Subtítulo: `Workflows para opportunities y pipelines`.
     - Listado de workflows desde tabla `crm_automation_workflows` filtrando por `company_id` actual.
     - Estados visuales: `draft`, `published`, `paused`, `archived`.
     - Botón “Nuevo workflow” (puede abrir placeholder por ahora).
   - Mantener estilo UI ya usado en otras páginas (`Card`, `Button`, `Badge`, etc.) sin introducir librerías nuevas.

4. **Consultas y performance**
   - Usar React Query como en el resto del CRM.
   - No hacer N+1 queries: traer workflows en una sola query.

5. **Tipado y errores**
   - Tipar filas con `Database["public"]["Tables"]["crm_automation_workflows"]["Row"]` si está disponible.
   - Manejar estados de loading/error coherentes con el proyecto.

6. **No tocar alcance fuera de CRM**
   - No agregar features para otros módulos.
   - No cambiar permisos globales ni diseño general del sidebar fuera de este alta puntual.

### Entregable esperado
- Archivos modificados:
  - `src/components/layout/Sidebar.tsx`
  - `src/App.tsx`
- Archivo nuevo:
  - `src/pages/CrmAutomations.tsx`
- Código compila sin errores TypeScript.
```

---

## 2) SQL para migración manual en Supabase (SQL Editor)

> Ejecutar en una sola corrida. Es idempotente (`IF NOT EXISTS` / `ON CONFLICT`).

```sql
BEGIN;

-- =====================================================
-- 0) Helpers de permisos para automatizaciones CRM
-- Reutiliza funciones CRM existentes (roles/permisos).
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_can_view_automations()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((public.crm_user_permissions() ->> 'can_view')::boolean, false)
$$;

CREATE OR REPLACE FUNCTION public.crm_can_manage_automations()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((public.crm_user_permissions() ->> 'can_edit')::boolean, false)
$$;

-- =====================================================
-- 1) Workflows
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'archived')),
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_automation_workflows_company_idx
  ON public.crm_automation_workflows (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_automation_workflows_status_idx
  ON public.crm_automation_workflows (company_id, status);

-- =====================================================
-- 2) Workflow versions (snapshot inmutable)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.crm_automation_workflows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  definition jsonb NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_automation_versions_current_unique_idx
  ON public.crm_automation_workflow_versions (workflow_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS crm_automation_versions_company_idx
  ON public.crm_automation_workflow_versions (company_id, workflow_id, created_at DESC);

-- =====================================================
-- 3) Ejecuciones
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.crm_automation_workflows(id) ON DELETE CASCADE,
  workflow_version_id uuid REFERENCES public.crm_automation_workflow_versions(id) ON DELETE SET NULL,
  source_event_id text NOT NULL,
  source_event_type text NOT NULL,
  source_entity_type text NOT NULL CHECK (source_entity_type IN ('opportunity', 'pipeline')),
  source_entity_id uuid,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed', 'canceled', 'dead_letter')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, source_event_id, workflow_id)
);

CREATE INDEX IF NOT EXISTS crm_automation_exec_company_status_idx
  ON public.crm_automation_executions (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_automation_exec_workflow_idx
  ON public.crm_automation_executions (workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_automation_exec_entity_idx
  ON public.crm_automation_executions (company_id, source_entity_type, source_entity_id);

-- =====================================================
-- 4) Pasos de ejecución
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.crm_automation_executions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_key text NOT NULL,
  step_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'skipped')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  error_message text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id, step_order)
);

CREATE INDEX IF NOT EXISTS crm_automation_steps_exec_idx
  ON public.crm_automation_execution_steps (execution_id, step_order);

CREATE INDEX IF NOT EXISTS crm_automation_steps_company_status_idx
  ON public.crm_automation_execution_steps (company_id, status, created_at DESC);

-- =====================================================
-- 5) Dead-letter queue
-- =====================================================
CREATE TABLE IF NOT EXISTS public.crm_automation_dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  execution_id uuid REFERENCES public.crm_automation_executions(id) ON DELETE SET NULL,
  workflow_id uuid REFERENCES public.crm_automation_workflows(id) ON DELETE SET NULL,
  reason text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  replayed boolean NOT NULL DEFAULT false,
  replayed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_automation_dlq_company_created_idx
  ON public.crm_automation_dead_letter_queue (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS crm_automation_dlq_replayed_idx
  ON public.crm_automation_dead_letter_queue (company_id, replayed, created_at DESC);

-- =====================================================
-- 6) Trigger updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.crm_automation_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_automation_workflows_updated_at ON public.crm_automation_workflows;
CREATE TRIGGER trg_crm_automation_workflows_updated_at
BEFORE UPDATE ON public.crm_automation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.crm_automation_set_updated_at();

DROP TRIGGER IF EXISTS trg_crm_automation_exec_updated_at ON public.crm_automation_executions;
CREATE TRIGGER trg_crm_automation_exec_updated_at
BEFORE UPDATE ON public.crm_automation_executions
FOR EACH ROW
EXECUTE FUNCTION public.crm_automation_set_updated_at();

-- =====================================================
-- 7) RLS
-- =====================================================
ALTER TABLE public.crm_automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- Workflows
DROP POLICY IF EXISTS "CRM automations workflows select" ON public.crm_automation_workflows;
DROP POLICY IF EXISTS "CRM automations workflows insert" ON public.crm_automation_workflows;
DROP POLICY IF EXISTS "CRM automations workflows update" ON public.crm_automation_workflows;
DROP POLICY IF EXISTS "CRM automations workflows delete" ON public.crm_automation_workflows;

CREATE POLICY "CRM automations workflows select"
  ON public.crm_automation_workflows
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations workflows insert"
  ON public.crm_automation_workflows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations workflows update"
  ON public.crm_automation_workflows
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations workflows delete"
  ON public.crm_automation_workflows
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

-- Versions
DROP POLICY IF EXISTS "CRM automations versions select" ON public.crm_automation_workflow_versions;
DROP POLICY IF EXISTS "CRM automations versions insert" ON public.crm_automation_workflow_versions;
DROP POLICY IF EXISTS "CRM automations versions update" ON public.crm_automation_workflow_versions;
DROP POLICY IF EXISTS "CRM automations versions delete" ON public.crm_automation_workflow_versions;

CREATE POLICY "CRM automations versions select"
  ON public.crm_automation_workflow_versions
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations versions insert"
  ON public.crm_automation_workflow_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations versions update"
  ON public.crm_automation_workflow_versions
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations versions delete"
  ON public.crm_automation_workflow_versions
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

-- Executions
DROP POLICY IF EXISTS "CRM automations executions select" ON public.crm_automation_executions;
DROP POLICY IF EXISTS "CRM automations executions insert" ON public.crm_automation_executions;
DROP POLICY IF EXISTS "CRM automations executions update" ON public.crm_automation_executions;
DROP POLICY IF EXISTS "CRM automations executions delete" ON public.crm_automation_executions;

CREATE POLICY "CRM automations executions select"
  ON public.crm_automation_executions
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations executions insert"
  ON public.crm_automation_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations executions update"
  ON public.crm_automation_executions
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations executions delete"
  ON public.crm_automation_executions
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

-- Steps
DROP POLICY IF EXISTS "CRM automations steps select" ON public.crm_automation_execution_steps;
DROP POLICY IF EXISTS "CRM automations steps insert" ON public.crm_automation_execution_steps;
DROP POLICY IF EXISTS "CRM automations steps update" ON public.crm_automation_execution_steps;
DROP POLICY IF EXISTS "CRM automations steps delete" ON public.crm_automation_execution_steps;

CREATE POLICY "CRM automations steps select"
  ON public.crm_automation_execution_steps
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations steps insert"
  ON public.crm_automation_execution_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations steps update"
  ON public.crm_automation_execution_steps
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations steps delete"
  ON public.crm_automation_execution_steps
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

-- DLQ
DROP POLICY IF EXISTS "CRM automations dlq select" ON public.crm_automation_dead_letter_queue;
DROP POLICY IF EXISTS "CRM automations dlq insert" ON public.crm_automation_dead_letter_queue;
DROP POLICY IF EXISTS "CRM automations dlq update" ON public.crm_automation_dead_letter_queue;
DROP POLICY IF EXISTS "CRM automations dlq delete" ON public.crm_automation_dead_letter_queue;

CREATE POLICY "CRM automations dlq select"
  ON public.crm_automation_dead_letter_queue
  FOR SELECT
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_view_automations()
  );

CREATE POLICY "CRM automations dlq insert"
  ON public.crm_automation_dead_letter_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations dlq update"
  ON public.crm_automation_dead_letter_queue
  FOR UPDATE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  )
  WITH CHECK (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

CREATE POLICY "CRM automations dlq delete"
  ON public.crm_automation_dead_letter_queue
  FOR DELETE
  TO authenticated
  USING (
    company_id = public.crm_user_company_id()
    AND public.crm_can_manage_automations()
  );

COMMIT;
```

---

## 3) SQL opcional (si querés módulo/licencia independiente)

Si querés que “Automatizaciones” sea un módulo separado de `opportunities` (facturable/activable), agregá esto:

```sql
-- 3.1 Crear módulo en catálogo
INSERT INTO public.platform_modules (
  code,
  name,
  description,
  category,
  display_order,
  route,
  price_monthly,
  price_annual,
  is_active,
  is_base
)
VALUES (
  'crm_automations',
  'Automatizaciones CRM',
  'Workflows para opportunities y pipelines',
  'clientes',
  26,
  '/crm-automations',
  0,
  0,
  true,
  false
)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  route = EXCLUDED.route,
  is_active = EXCLUDED.is_active;

-- 3.2 Activar para todas las compañías activas (opcional)
INSERT INTO public.company_modules (company_id, module_id, active, status, activated_at)
SELECT c.id, pm.id, true, 'active', now()
FROM public.companies c
JOIN public.platform_modules pm ON pm.code = 'crm_automations'
ON CONFLICT (company_id, module_id) DO NOTHING;

-- 3.3 Permisos por rol (role_permissions) para todas las compañías
INSERT INTO public.role_permissions (company_id, role, module, can_view, can_create, can_edit, can_delete, can_export)
SELECT c.id, rp.role, 'crm_automations', rp.can_view, rp.can_create, rp.can_edit, rp.can_delete, rp.can_export
FROM public.companies c
JOIN (
  VALUES
    ('admin', true, true, true, true, true),
    ('manager', true, true, true, false, true),
    ('cashier', false, false, false, false, false),
    ('accountant', false, false, false, false, false),
    ('viewer', false, false, false, false, false),
    ('warehouse', false, false, false, false, false),
    ('technician', false, false, false, false, false),
    ('auditor', true, false, false, false, true),
    ('employee', false, false, false, false, false)
) AS rp(role, can_view, can_create, can_edit, can_delete, can_export)
ON CONFLICT (company_id, role, module) DO NOTHING;
```

> Si usás este modo independiente, después en frontend sí cambiá el `module` del sidebar y `moduleCode` de ruta a `crm_automations`, y agregá ese código al tipo `Module` en `usePermissions.tsx` + `mapSidebarModuleToPermission` en sidebar.
