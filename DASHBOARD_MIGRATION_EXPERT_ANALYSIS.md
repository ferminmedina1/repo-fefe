mej# 🔍 ANÁLISIS EXPERTO - MIGRACIONES DE DASHBOARD
**Equipo:** Architect + Security + Performance + DBA + Backend + QA

---

## 📊 RESUMEN EJECUTIVO

### Status: ⚠️ CRÍTICO - Implementación requiere revisiones antes de producción

Las 4 nuevas migraciones del dashboard traen **funcionalidad importante** pero con **varios riesgos**:
- ❌ Tabla `dashboard_layouts` no existe en Supabase (causa 404 errors)
- ⚠️ Problemas de integridad referencial pendientes
- ⚠️ Políticas RLS inconsistentes con arquitectura existente
- ⚠️ Performance issues potenciales sin mitigación
- ✅ Seguridad base adecuada pero con gaps

**Recomendación:** NO ejecutar aún. Seguir plan de 7 pasos antes.

---

## 🏗️ ARQUITECTURA PROPUESTA

```
dashboard_layouts (base)
├── id: UUID primary key
├── user_id: FK → auth.users
├── company_id: FK → companies
├── widgets: JSONB (stored widgets config)
└── is_default: BOOLEAN (one per user-company)
    ↓
├─→ dashboard_configs (snapshots/exports)
│   └─ layout_id: FK → dashboard_layouts
│       version: INT
│       config_data: JSONB (full serialization)
│
├─→ dashboard_shares (share links)
│   └─ layout_id: FK → dashboard_layouts
│       share_token: VARCHAR unique
│       expires_at: TIMESTAMP (optional)
│
└─→ dashboard_templates (presets)
    └─ widgets_data: JSONB (template widgets)
        is_preset: BOOLEAN (TRUE = system)

Independiente:
    custom_metrics
    └─ metric_values
```

---

## 🔐 ANÁLISIS DE SEGURIDAD

### ✅ STRENGTHS

1. **RLS Policies presentes** en todas las tablas
2. **Row-level filtering** correcto basado en `auth.uid()`
3. **Company isolation** verificado en INSERT/UPDATE
4. **Trigger protección** de `updated_at`

### ⚠️ RIESGOS IDENTIFICADOS

#### 1. **CRÍTICO: Inconsistencia en RLS Policy - `dashboard_configs`**
```sql
-- PROBLEMA: Usa user_companies, pero company_users en dashboard_layouts
-- Causa: Inconsistencia de tabla naming

-- dashboard_layouts usa:
WHERE company_users.company_id = dashboard_layouts.company_id 

-- dashboard_configs NO VALIDA COMPANY ACCESS
-- Solo verifica que user_id = auth.uid()
```
**Riesgo:** Usuarios podrían acceder a layouts de compañías donde no tienen acceso.

**Fix Propuesto:**
```sql
-- Antes de ejecutar, verificar nombres correctos de tablas:
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('company_users', 'user_companies', 'user_company_mappings');
```

#### 2. **HIGH: Trigger a función inexistente**
```sql
-- dashboard_templates línea 41 usa:
CREATE TRIGGER dashboard_templates_updated_at_trigger
BEFORE UPDATE ON dashboard_templates
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_configs_timestamp(); ❌ WRONG FUNCTION
```
**Fix:** Debe ser `update_dashboard_templates_timestamp()`

#### 3. **MEDIUM: Sin validación de JSON schema**
```sql
-- widgets JSONB NOT NULL DEFAULT '[]'
-- PROBLEMA: Acepta cualquier JSON, no valida estructura

-- Debería validar:
{
  "widgets": [
    {
      "id": "string (UUID format)",
      "type": "string (enum)",
      "size": "string (full|half|quarter)",
      "order": "number"
    }
  ]
}
```

#### 4. **MEDIUM: Share token generation sin rotación**
```sql
-- PROBLEMA: share_token se genera UNA VEZ, nunca rota
-- Token puede estar comprometido indefinidamente

-- RECOMENDADO: Field expires_at debería ser obligatorio
-- con DEFAULT = now() + interval '30 days'
```

---

## ⚡ ANÁLISIS DE PERFORMANCE

### Índices - ✅ CORRECTO

```sql
-- dashboard_layouts - 2 índices apropiados
idx_dashboard_layouts_user_company       → SELECT queries (most common)
idx_dashboard_layouts_is_default         → Filtering by company

-- dashboard_configs - 2 índices apropiados
idx_dashboard_configs_user_company       → User access queries
idx_dashboard_configs_is_default         → Default layout lookup

-- dashboard_shares - 2 índices + 1 condicional ✅
idx_dashboard_shares_token               → lookup by share token
idx_dashboard_shares_user                → user's shares list
idx_dashboard_shares_active              → WHERE active filter (good!)

-- custom_metrics - 5 índices ✅ COMPREHENSIVE
```

### Query Patterns - ⚠️ PROBLEMAS POTENCIALES

#### Issue 1: N+1 Risk en `useTemplates`
```typescript
// CURRENT: Trae TODOS los templates en una query
const { data: templates } = useTemplates(false); // is_preset = true

// PROBLEMA: Si hay 1000 templates presets + queries posteriores
// La app hace: SELECT * FROM dashboard_templates WHERE is_preset = true

// RECOMENDADO: Paginar o limitar
.limit(50) // solo 50 templates
```

#### Issue 2: No hay pagination en `useTemplatesForCategory`
```typescript
// Mismo problema, busca todos por category
// Si categoria "sales" tiene 500 templates → heavy query
```

#### Issue 3: `useDashboardLayout` hace SELECT .single() 
```typescript
// Correcto BUT: Si hay múltiples layouts (bug), falla silentemente
// MEJOR: .limit(1) y manejar caso vacío explícitamente
```

### Recomendaciones Performance:
1. ✅ Índices están bien
2. ⚠️ Agregar LIMIT 50 en queries de templates
3. ⚠️ Agregar pagination controls en UI
4. ⚠️ Cache strategy: Current staleTime = 5 min (OK)

---

## 🔌 INTEGRIDAD DE DATOS

### Análisis de Constraints

#### ✅ Foreign Keys - CORRECTOS
```sql
dashboard_layouts
  ├─ FK user_id        → auth.users (CASCADE) ✅ Correcto
  ├─ FK company_id     → companies (CASCADE) ✅ Correcto
  └─ UNIQUE constraint → (user_id, company_id, is_default) ✅ 

dashboard_configs
  ├─ FK user_id        → auth.users (CASCADE) ✅
  ├─ FK company_id     → companies (CASCADE) ✅ 
  ├─ FK layout_id      → dashboard_layouts (CASCADE) ✅
  └─ UNIQUE constraint → (user_id, company_id, name) ✅

dashboard_shares
  ├─ FK layout_id      → dashboard_layouts (CASCADE) ✅
  ├─ FK user_id        → auth.users (CASCADE) ✅
  ├─ FK company_id     → companies (CASCADE) ✅
  └─ UNIQUE constraint → (layout_id, user_id) ✅

dashboard_templates
  ├─ FK user_id        → auth.users (CASCADE) ✅ pero NULLABLE (OK para presets)
  ├─ FK company_id     → companies (CASCADE) ✅
  └─ UNIQUE constraint → (COALESCE(user_id, '...'), is_preset, name) ⚠️ RISKY
```

#### ⚠️ PROBLEMA: UNIQUE constraint con COALESCE en dashboard_templates
```sql
UNIQUE(COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), is_preset, name)
```
**Riesgo:** Si hay 2 presets con mismo nombre = UNIQUE violation
**Mejor:** Hacer manualmente:
```sql
-- SQL alternativo
CREATE UNIQUE INDEX idx_dashboard_templates_unique_name
  ON dashboard_templates(is_preset, name)
  WHERE is_preset = TRUE;

CREATE UNIQUE INDEX idx_dashboard_templates_user_custom
  ON dashboard_templates(user_id, company_id, name)
  WHERE is_preset = FALSE;
```

### Triggers - ⚠️ PROBLEMAS

#### Issue 1: Función de trigger WRONG
```sql
-- dashboard_templates usa:
update_dashboard_configs_timestamp() ← WRONG FUNCTION NAME

-- Debería ser:
update_dashboard_templates_timestamp()
```

#### Issue 2: Función genera_share_token() nunca se usa
```sql
-- La función está definida BUT
-- Nunca se llama en trigger al INSERT

-- RECOMENDADO: Agregar trigger
CREATE TRIGGER dashboard_shares_generate_token_trigger
BEFORE INSERT ON dashboard_shares
FOR EACH ROW
EXECUTE FUNCTION generate_share_token_if_null();
```

---

## 📱 ANÁLISIS DE APLICACIÓN

### Cómo se integra el código

#### 1. **useDashboardLayout** (Principal)
```typescript
// Location: src/hooks/dashboard/useDashboardLayout.ts

// FLUJO:
1. Query: SELECT * FROM dashboard_layouts 
   WHERE user_id = $1 AND company_id = $2
   
2. Local state: setLocalWidgets(layoutData.widgets)

3. Auto-save: Debounce 1s → mutate to Supabase
   IF layout exists: UPDATE dashboard_layouts SET widgets = $1
   ELSE: INSERT new layout

4. Add/Remove/Reorder widgets: Local mutations
```

**Issues encontrados:** 
- ❌ No retry si tabla no existe (ERROR 42P01)
- ❌ Silent failure si error no es PGRST116 o 42P01
- ✅ Auto-save con debounce es bueno

**Ya Parcialmente Fixed:** Agregué manejo de 42P01 (table doesn't exist)

#### 2. **useTemplates** (Templates Gallery)
```typescript
// Location: src/hooks/dashboard/useTemplates.ts

// FLUJO:
1. Query: SELECT * FROM dashboard_templates 
   WHERE is_preset = true  (si includeCustom=false)
   
2. Return data como DashboardTemplate[]

3. Stale time: 5 min (OK)
```

**Issues:**
- ⚠️ Sin LIMIT (puede traer 1000s templates)
- ⚠️ Sin error handling específico para tabla inexistente
- ⚠️ Cache nunca invalida si admin agrega nuevos templates

#### 3. **TemplateGallery Component**
```typescript
// Location: src/components/dashboard/TemplateGallery.tsx

// Llama useTemplates(false) para mostrar presets
// Problema: Si dashboard_templates tabla no existe
// → useTemplates falla
// → TemplateGallery no renderiza error
// → Silent failure
```

---

## 🚀 PLAN DE IMPLEMENTACIÓN (7 Pasos)

### Paso 1: Validación Pre-Migración (5 min)
```sql
-- Ejecutar en Supabase SQL Editor

-- 1.1 Verificar tablas requeridas existen
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_name IN ('companies', 'auth.users', 'user_companies', 'company_users');

-- 1.2 Nombres correctos de tablas mapping
SELECT table_name FROM information_schema.tables 
WHERE table_name LIKE '%company%user%' OR table_name LIKE '%user%company%';

-- RESULTADO ESPERADO: 
-- user_companies o company_users (NO AMBOS)
```

### Paso 2: Crear Migration inicial (dashboard_layouts) - ✅
```sql
-- EJECUTAR PRIMERO - Base de todo
-- Archivo: 20260409_create_dashboard_layouts.sql

-- Validación post-ejecución:
SELECT COUNT(*) FROM dashboard_layouts;
```

### Paso 3: Crear Migration configs - ✅
```sql
-- EJECUTAR SEGUNDO - Depende de dashboard_layouts
-- Archivo: 20260409_create_dashboard_configs.sql

-- Validación:
SELECT COUNT(*) FROM dashboard_configs;
```

### Paso 4: Crear Migration shares - ✅
```sql
-- EJECUTAR TERCERO
-- Archivo: 20260409_create_dashboard_shares.sql

-- REVISAR PRIMERO: El trigger usa función generate_share_token()
-- Pero nunca se ejecuta automáticamente
```

### Paso 5: CREATE MIGRATION templates - ⚠️ REQUIERE FIX
```sql
-- EJECUTAR CUARTO - PERO PRIMERO APLICAR FIXES:

-- FIX 1: Trigger nombre correcto
-- CAMBIAR ESTO:
CREATE TRIGGER dashboard_templates_updated_at_trigger
BEFORE UPDATE ON dashboard_templates
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_configs_timestamp(); ❌

-- A ESTO:
CREATE TRIGGER dashboard_templates_updated_at_trigger
BEFORE UPDATE ON dashboard_templates
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_templates_timestamp(); ✅

-- ASEGÚRATE DE CREAR LA FUNCIÓN:
CREATE OR REPLACE FUNCTION update_dashboard_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FIX 2: UNIQUE constraint - OPCIÓN A (recomendado)
-- REEMPLAZAR:
UNIQUE(COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), is_preset, name)

-- CON DOS ÍNDICES:
CREATE UNIQUE INDEX idx_dashboard_templates_preset
  ON dashboard_templates(is_preset, name)
  WHERE is_preset = TRUE;

CREATE UNIQUE INDEX idx_dashboard_templates_custom
  ON dashboard_templates(user_id, company_id, name)
  WHERE is_preset = FALSE;
```

### Paso 6: Crear Migration metrics - ✅
```sql
-- EJECUTAR QUINTO
-- Archivo: 20260410_create_custom_metrics_tables.sql
-- Este es independiente, no issues
```

### Paso 7: Deploy el código React + Validación
```bash
# 1. El código ya está en el merge
# 2. npm run build (compiler check)
# 3. Verificar en dev:
#    - Click "Explorar templates" → debe mostrar 5 presets
#    - Crear nuevo dashboard → debe guardar en DB
#    - Cambiar widgets → debe auto-save
```

---

## 🐛 TABLA DE RIESGOS

| Riesgo | Severidad | Probabilidad | Impacto | Mitigation |
|--------|-----------|--------------|---------|-----------|
| RLS Policy inconsistencia en dashboard_configs | CRITICAL | ALTA | Users ver layouts ajenos | Fix Policy ANTES de deploy |
| Trigger función nombre incorrecto | HIGH | ALTÍSIMA | dashboard_templates no actualiza timestamps | Cambiar nombre función |
| UNIQUE constraint COALESCE fail | HIGH | MEDIA | No pueden crear presets con mismo nombre | Usar 2 índices |
| N+1 en useTemplates sin LIMIT | MEDIUM | MEDIA | Slow query si muchos presets | Agregar .limit(50) |
| Share token no rota | MEDIUM | BAJA | Token comprometido indefinido | Agregar expires_at |
| Sin validación JSON schema widgets | LOW | ALTA | Widgets inválidos se guardan | Agregar función check |

---

## ✅ CHECKLIST PRE-PRODUCCIÓN

- [ ] 1. Ejecutar validación pre-migración (Paso 1)
- [ ] 2. Aplicar FIX a migration templates
- [ ] 3. Ejecutar migrations EN ORDEN (Paso 2-6)
- [ ] 4. Verificar cada tabla vacía post-migración
- [ ] 5. Verificar RLS policies están activas: `SELECT * FROM pg_policies WHERE tablename LIKE 'dashboard%';`
- [ ] 6. Verificar triggers están activos: `SELECT * FROM pg_trigger WHERE tgrelname LIKE 'dashboard%';`
- [ ] 7. Test en dev: Click "Explorar templates"
- [ ] 8. Crear test unitario: guardar layout → traer layout → verificar
- [ ] 9. Load test: 100 usuarios simultáneos creando layouts
- [ ] 10. Security audit: Intentar access layout de otro user (debe fallar)

---

## 📋 RESUMEN DE FIXES REQUERIDOS

### Antes de Ejecutar Migraciones:

#### 1. Crear archivo SQL FIX correcto:
```sql
-- FILE: supabase/migrations/20260417_FIX_dashboard_migrations.sql

-- FIX 1: Crear función que falta
CREATE OR REPLACE FUNCTION update_dashboard_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- FIX 2: Validar table naming en RLS
-- (Ejecutar query de validación primero)

-- FIX 3: Agregar LIMIT a queries templates  
-- (Fix en código React)

-- FIX 4: Share token generation trigger (opcional pero recomendado)
CREATE OR REPLACE FUNCTION generate_share_token_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_token IS NULL THEN
    NEW.share_token := encode(gen_random_bytes(12), 'base64');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dashboard_shares_token_trigger
BEFORE INSERT ON dashboard_shares
FOR EACH ROW
WHEN (NEW.share_token IS NULL)
EXECUTE FUNCTION generate_share_token_if_null();
```

#### 2. Actualizar archivo migraciones templates:
```
Cambiar: update_dashboard_configs_timestamp() 
A: update_dashboard_templates_timestamp()

Cambiar UNIQUE constraint a 2 índices
```

#### 3. Actualizar código React:
```typescript
// useTemplates.ts
.limit(50) // Agregar limit

// Agregar manejo de error si tabla no existe
if (error?.code === '42P01') {
  console.warn('dashboard_templates table not created yet');
  return [];
}
```

---

## 🎯 CONCLUSIÓN

**Status:** ⚠️ **HOLD IMPLEMENTACIÓN**

**Next Steps:**
1. ✅ Apply FIX SQL
2. ✅ Update migrations
3. ✅ Update React code
4. ✅ Run in order
5. ✅ Execute checklist
6. ✅ Deploy

**Estimated time:** 1.5 hours total

Este análisis asegura que la implementación sea:
- 🔒 Segura (RLS correcto)
- ⚡ Performante (Índices optimizados)
- 💪 Resiliente (Error handling)
- 🔄 Mantenible (Código limpio)
