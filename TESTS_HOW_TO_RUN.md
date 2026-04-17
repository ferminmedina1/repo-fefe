# 🧪 CÓMO EJECUTAR LOS TESTS - DASHBOARD

## 📋 Archivos de Prueba Creados

- `__tests__/dashboard.migrations.test.ts` - Tests de migraciones BD
- `__tests__/useDashboardLayout.test.ts` - Tests del hook useDashboardLayout
- `__tests__/useTemplates.test.ts` - Tests del hook useTemplates

---

## 🚀 Ejecutar Tests

### Opción 1: Ejecutar todos los tests dashboard

```bash
npm run test -- dashboard
```

**Output esperado:**
```
✓ dashboard.migrations.test.ts (12 tests)
✓ useDashboardLayout.test.ts (8 tests)
✓ useTemplates.test.ts (10 tests)

TOTAL: 30 tests passed
```

---

### Opción 2: Ejecutar un test específico

```bash
# Solo tests de migraciones
npm run test -- dashboard.migrations

# Solo tests del hook useTemplates
npm run test -- useTemplates

# Solo tests del hook useDashboardLayout
npm run test -- useDashboardLayout
```

---

### Opción 3: Modo watch (re-ejecuta al cambiar archivos)

```bash
npm run test:watch -- dashboard
```

---

### Opción 4: Con reporte de cobertura

```bash
npm run test:coverage -- __tests__/dashboard
```

**Output esperado:**
```
Statements   | Branches   | Functions  | Lines      |
-------------|------------|------------|----------|
90% (27/30) | 85% (17/20)| 88% (7/8)  | 90% (27/30)
```

---

## 🎯 Qué validan los tests

### dashboard.migrations.test.ts

- ✅ Todas las 6 tablas existen
- ✅ RLS está habilitado
- ✅ 7 funciones existen
- ✅ 5 presets están cargados
- ✅ Foreign keys funcionan
- ✅ Índices están configurados

**Ejecutar:**
```bash
npm run test -- dashboard.migrations
```

---

### useDashboardLayout.test.ts

- ✅ Agregar widgets funciona
- ✅ Remover widgets funciona
- ✅ Reordenar widgets funciona
- ✅ Auto-save con debounce
- ✅ Error handling para tabla inexistente
- ✅ Reset layout limpia widgets

**Ejecutar:**
```bash
npm run test -- useDashboardLayout
```

---

### useTemplates.test.ts

- ✅ LIMIT está aplicado (máximo 50)
- ✅ Error handling por categoría
- ✅ Table-not-exists devuelve array vacío
- ✅ Retry configurado correctamente
- ✅ Cache de 5 minutos

**Ejecutar:**
```bash
npm run test -- useTemplates
```

---

## 📊 Interpretar Resultados

### ✅ Todos pasan

```
✓ dashboard.migrations.test.ts
  ✓ Tables exist
    ✓ should have table dashboard_layouts
    ✓ should have table dashboard_configs
    ...
```

**Significa:** Las migraciones están correctas, hooks funcionan bien.

---

### ❌ Algunos fallan

```
✗ dashboard.migrations.test.ts > should have table dashboard_layouts
  Error: Table does not exist (42P01)
```

**Significa:** Las migraciones NO se ejecutaron. 
**Solución:** Ejecutar MIGRATION_EXECUTION_GUIDE.md

---

### ⏭️ Tests skipped

```
⊙ useDashboardLayout.test.ts > should handle table not exists error

Skipped: 5 tests
```

**Significa:** Algunos tests necesitan setup adicional.
**No es problema** para validación inicial.

---

## 🔧 Troubleshooting Tests

### Error: "Cannot find module '@

/integrations/supabase/client'"

**Causa:** Import paths no están configurados
**Solución:**
```bash
# Verificar tsconfig.json tiene baseUrl y paths
npm run test -- --reporter=verbose
```

---

### Error: "QueryClient not provided"

**Causa:** Mock de provider falta
**Solución:** Tests ya incluyen wrapper con QueryClientProvider
```typescript
// Esto ya está en los tests
wrapper: ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
)
```

---

### Error: "Supabase client mock failed"

**Causa:** Mock de supabase incorrecto
**Solución:** Reiniciar tests:
```bash
npm run test -- --clearCache
npm run test -- dashboard
```

---

## 📈 CI/CD Integration

### En GitHub Actions

Agregar a `.github/workflows/test.yml`:

```yaml
- name: Run Dashboard Tests
  run: npm run test -- dashboard
  
- name: Check Coverage
  run: npm run test:coverage -- __tests__/dashboard
  
- name: Fail if coverage < 80%
  run: npm run test:coverage -- __tests__/dashboard --check-coverage --branches 80
```

---

## 📝 Pre-Deployment Checklist

Antes de mergear a main:

```bash
# 1. Ejecutar todos los tests
npm run test

# 2. Ejecutar solo dashboard tests
npm run test -- dashboard

# 3. Verificar cobertura está > 85%
npm run test:coverage -- __tests__/dashboard

# 4. Ejecutar build para asegurar no hay errores
npm run build

# 5. Verificar que no hay warnings
npm run lint
```

---

## ✨ Si todo pasa

1. ✅ Migraciones en BD están correctas
2. ✅ Hooks funcionan sin errores
3. ✅ Error handling está implementado
4. ✅ Listo para producción

**Tiempo estimado:** 2-3 minutos

---

## 📚 Recursos

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Supabase Testing Guide](https://supabase.com/docs/guides/testing)
