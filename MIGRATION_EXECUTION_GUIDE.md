# 📋 GUÍA DE EJECUCIÓN - MIGRACIONES DE DASHBOARD

## ⚠️ IMPORTANTE: ORDEN CRÍTICO

DEBES ejecutar en **ESTE ORDEN EXACTO** o las dependencias fallarán.

---

## 🔵 PASO 1: Ejecutar archivos FIX primero (crea funciones)

**Archivo:** `20260417_FIX_dashboard_migrations.sql`

### Qué hace:
- ✅ Crea función `update_dashboard_layouts_timestamp()`
- ✅ Crea función `update_dashboard_configs_timestamp()`
- ✅ Crea función `update_dashboard_templates_timestamp()`
- ✅ Crea función `generate_share_token()`
- ✅ Crea función `generate_share_token_if_null()`

### Instrucciones:
1. Ir a Supabase → SQL Editor
2. Copiar TODO el contenido de `20260417_FIX_dashboard_migrations.sql`
3. Ejecutar
4. ✅ Verificar que NO hay errores

### Validación:
```sql
-- Copiar en SQL editor para confirmar que se crearon las 5 funciones
SELECT proname FROM pg_proc 
WHERE proname LIKE '%dashboard%' OR proname LIKE '%generate_share%'
ORDER BY proname;

-- ESPERADO: 5 funciones
```

---

## 🟢 PASO 2: Tabla base - dashboard_layouts

**Archivo:** `20260409_create_dashboard_layouts_FIXED.sql`

### Qué hace:
- ✅ Crea tabla `dashboard_layouts` (base de todo)
- ✅ Índices para performance
- ✅ RLS policies para seguridad
- ✅ Trigger para auto-update de timestamp

### Instrucciones:
1. Copiar TODO el contenido
2. Ejecutar en SQL Editor
3. ✅ Sin errores

### Validación:
```sql
-- Copiar en SQL editor
SELECT COUNT(*) FROM public.dashboard_layouts;
-- ESPERADO: 0 (tabla vacía, pero existe)

SELECT * FROM pg_tables WHERE tablename = 'dashboard_layouts';
-- ESPERADO: 1 row (tabla existe)
```

---

## 🟡 PASO 3: Tabla de snapshots - dashboard_configs

**Archivo:** `20260409_create_dashboard_configs_FIXED.sql`

### Qué hace:
- ✅ Crea tabla `dashboard_configs` (depende de layouts)
- ✅ RLS policies CON validación de company access
- ✅ Trigger para timestamp

### Instrucciones:
1. Copiar TODO el contenido
2. Ejecutar
3. ✅ Sin errores

### Validación:
```sql
SELECT COUNT(*) FROM public.dashboard_configs;
-- ESPERADO: 0
```

---

## 🟠 PASO 4: Tabla de share links - dashboard_shares

**Archivo:** `20260409_create_dashboard_shares_FIXED.sql`

### Qué hace:
- ✅ Crea tabla `dashboard_shares`
- ✅ Trigger para auto-generar share_token
- ✅ RLS policies
- ✅ Función helper `get_shared_dashboard_layout()`

### Instrucciones:
1. Copiar TODO el contenido
2. Ejecutar
3. ✅ Sin errores

### Validación:
```sql
SELECT COUNT(*) FROM public.dashboard_shares;
-- ESPERADO: 0
```

---

## 🔵 PASO 5: Tabla de templates - dashboard_templates

**Archivo:** `20260409_create_dashboard_templates_FIXED.sql`

### Qué hace:
- ✅ Crea tabla `dashboard_templates`
- ✅ 2 índices separate para presets vs custom
- ✅ RLS policies para ver presets públicamente
- ✅ **INSERTA 5 templates de demostración**

### Instrucciones:
1. Copiar TODO el contenido
2. Ejecutar
3. ✅ Sin errores

### Validación:
```sql
SELECT COUNT(*) FROM public.dashboard_templates;
-- ESPERADO: 5 (los templates de demo)

SELECT name, is_preset FROM public.dashboard_templates ORDER BY name;
-- ESPERADO:
-- Executive | true
-- Finance Dashboard | true
-- Minimal | true
-- Operations | true
-- Sales Overview | true
```

---

## 🟢 PASO 6: Tabla de métricas - custom_metrics

**Archivo:** `20260410_create_custom_metrics_tables_FIXED.sql`

### Qué hace:
- ✅ Crea tabla `custom_metrics`
- ✅ Crea tabla `metric_values`
- ✅ Índices para performance
- ✅ RLS policies
- ✅ Trigger para timestamp

### Instrucciones:
1. Copiar TODO el contenido
2. Ejecutar
3. ✅ Sin errores

### Validación:
```sql
SELECT COUNT(*) FROM public.custom_metrics;
-- ESPERADO: 0

SELECT COUNT(*) FROM public.metric_values;
-- ESPERADO: 0
```

---

## ✅ VERIFICACIÓN FINAL

Una vez ejecutadas todas las migraciones:

```sql
-- Verificar que todas las tablas existen
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'dashboard%'
ORDER BY tablename;

-- ESPERADO: 5 tablas
-- - dashboard_configs
-- - dashboard_layouts
-- - dashboard_shares
-- - dashboard_templates
-- - (metric_values y custom_metrics también, pero sin prefix)

-- Verificar RLS está activado
SELECT tablename, rowsecurity FROM pg_class 
WHERE relname IN ('dashboard_layouts', 'dashboard_configs', 'dashboard_shares', 'dashboard_templates', 'custom_metrics', 'metric_values');

-- ESPERADO: rowsecurity = true para todas

-- Verificar triggers existen
SELECT trigger_name, table_name FROM information_schema.triggers
WHERE table_schema = 'public' AND table_name LIKE 'dashboard%'
ORDER BY table_name;

-- ESPERADO: Varios triggers
```

---

## 🚨 SI ALGO FALLA

### Error: "Function already exists"
**Causa:** Ejecutaste FIX script dos veces
**Solución:** No es problema, puedes continuar. Las funciones se sobrescriben con `CREATE OR REPLACE`

### Error: "Table already exists"
**Causa:** Migraciones ya fueron ejecutadas
**Solución:** Borrar la tabla (NO RECOMENDADO en prod)
```sql
DROP TABLE IF EXISTS public.dashboard_layouts CASCADE;
```

### Error: "Referenced table doesn't exist"
**Causa:** No seguiste el orden (Ej: intentaste crear dashboard_configs antes de dashboard_layouts)
**Solución:** Ejecutar en orden exacto desde PASO 1

### Error: "Function ... does not exist"
**Causa:** FIX script no se ejecutó primero
**Solución:** Ejecutar PASO 1 antes de continuar

---

## 📝 RESUMEN - Orden Exacto

```
1. 20260417_FIX_dashboard_migrations.sql              [Funciones]
2. 20260409_create_dashboard_layouts_FIXED.sql       [Base]
3. 20260409_create_dashboard_configs_FIXED.sql       [Depende de #2]
4. 20260409_create_dashboard_shares_FIXED.sql        [Depende de #2]
5. 20260409_create_dashboard_templates_FIXED.sql     [Depende de #2, inserta 5 templates]
6. 20260410_create_custom_metrics_tables_FIXED.sql   [Independiente]
```

---

## ⏱️ Tiempo estimado
- Ejecutar: 5 minutos
- Validar: 3 minutos
- **Total: 8 minutos**

---

## ✨ Una vez completado

Estos archivos ya están listos:
- ✅ `src/hooks/dashboard/useDashboardLayout.ts` - Actualizado con error handling
- ⏳ `src/hooks/dashboard/useTemplates.ts` - PRÓXIMO: Agregar LIMIT
- ⏳ `src/components/dashboard/TemplateGallery.tsx` - PRÓXIMO: Error handling

El app debería funcionar correctamente después de estas migraciones.
