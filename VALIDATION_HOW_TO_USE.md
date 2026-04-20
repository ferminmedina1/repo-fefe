# 🧪 VALIDACIÓN DE MIGRACIONES - DASHBOARD

## 📌 Opción 1: SQL Editor de Supabase (Automático)

**Archivo:** `VALIDATION_CHECK_DASHBOARD_TABLES.sql`

1. Copiar TODO el contenido del archivo
2. Ir a Supabase → SQL Editor
3. Pegar el código
4. Ejecutar
5. Revisar resultados

**Qué verifica:**
✅ Todas las tablas existen
✅ RLS está habilitado
✅ Todas las funciones existen
✅ Todos los triggers están configurados
✅ Todas las policies están definidas
✅ Los 5 presets están cargados
✅ Foreign keys están correctos
✅ Índices están optimizados
✅ Tamaños de tablas

---

## 📌 Opción 2: Browser Console (Para Desarrolladores)

### Método A: Automático al iniciar la app

El hook `useDashboardValidation.ts` se ejecuta automáticamente en **modo desarrollo**.

**Cómo usar:**

1. Abre la app en desarrollo
2. Abre DevTools (F12)
3. Vé a la pestaña **Console**
4. Ve el mensaje: `[Dashboard] Validation Report: {...}`

**En producción:** La validación está desactivada. Para activarla:
```javascript
// En Console
localStorage.setItem('dashboard_validation', 'true');
// Recarga la página
window.location.reload();
```

---

### Método B: Manual desde Console

**Opción B.1: Si tienes importado el módulo**
```javascript
// En Console
validateDashboard();
```

**Opción B.2: Si no tienes ni idea**
```javascript
// Copiar en Console y ejecutar
import { validateDashboard } from '/src/lib/dashboard/validation.ts';
await validateDashboard();
```

---

## 📊 Entender los Resultados

### Si todo está bien ✅

Todos los items mostrarán:
```
✅ Table dashboard_layouts
   Table exists and is readable (0 rows)

✅ Table dashboard_configs
   Table exists and is readable (0 rows)

✅ Table dashboard_shares
   Table exists and is readable (0 rows)

✅ Table dashboard_templates
   Table exists and is readable (5 rows)
```

### Si algo falla ❌

```
❌ Table dashboard_layouts
   Table does not exist: relation "dashboard_layouts" does not exist

❌ Custom Functions
   Custom functions not found
```

**Qué significa:**
- La tabla no fue creada → Re-ejecutar migraciones
- Las funciones no existen → Re-ejecutar FIX script
- RLS no funciona → Revisar policies en Supabase

---

## 🔧 Component en UI (Desarrollo)

**Para ver problemas de validación EN la app:**

1. Abre `src/App.tsx`
2. Importa el component (opcional, solo para desarrollo):
   ```typescript
   import { DashboardValidationDebug } from '@/hooks/useDashboardValidation';
   ```

3. Agrega al final del JSX:
   ```jsx
   {import.meta.env.DEV && <DashboardValidationDebug />}
   ```

Si hay problemas, aparecerá un badge rojo en la esquina inferior derecha.

---

## 🐛 Troubleshooting

### "Table does not exist (42P01)"
**Causa:** La migración no se ejecutó
**Solución:** Ver [MIGRATION_EXECUTION_GUIDE.md](MIGRATION_EXECUTION_GUIDE.md)

### "Custom functions not found"
**Causa:** FIX script no se ejecutó primero
**Solución:** Ejecutar `20260417_FIX_dashboard_migrations.sql` en Supabase

### "RLS might not be working"
**Causa:** Las políticas RLS no están activas
**Solución:** Revisar en Supabase → SQL Editor:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'dashboard_layouts';
-- Debería haber 4 policies
```

### "No preset templates found"
**Causa:** La migración de templates no ejecutó INSERT
**Solución:** Ejecutar esto en SQL Editor:
```sql
INSERT INTO dashboard_templates 
  (name, is_preset, company_id, category, widgets_data, description)
VALUES 
  ('Sales Overview', TRUE, '00000000-0000-0000-0000-000000000000', 'sales',
   '{"widgets":[{"type":"monthly-sales","size":"half"},{"type":"gross-margin","size":"half"}]}'::jsonb,
   'Sales KPIs'),
  -- ... etc
```

---

## 📋 Checklist de Validación

- [ ] SQL: Ejecutar `VALIDATION_CHECK_DASHBOARD_TABLES.sql`
  - [ ] 6 tablas existen
  - [ ] RLS habilitado en todas
  - [ ] 7 funciones existen
  - [ ] 5 triggers configurados
  - [ ] 5 presets cargados

- [ ] App: Abrir DevTools Console
  - [ ] Ver `[Dashboard] Validation Report: {...}`
  - [ ] Todos los items con ✅

- [ ] Funcional: Ir a Dashboard
  - [ ] Click en "Explorar templates" → sin error 404
  - [ ] Ver 5 templates
  - [ ] Click en uno → se cargan widgets

---

## ✨ Una vez todo validado

1. ✅ Migraciones ejecutadas correctamente
2. ✅ RLS funcionando
3. ✅ Presets cargados
4. ✅ App puede usar dashboard

**Próximos pasos:**
- [ ] Crear dashboard personalizado
- [ ] Agregar widgets
- [ ] Guardar layouts
- [ ] Compartir via links

---

**Tiempo estimado:** 3-5 minutos

¿Todos los checks pasan? 🎉
