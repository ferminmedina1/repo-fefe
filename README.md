
# 🚀 VENTIFY - Sistema de Gestión Empresarial

**Estado:** ✅ Producción Ready | **Última Actualización:** 8 Abril 2026

---

## 📋 Tabla de Contenidos

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Documentación](#documentación)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Comandos Principales](#comandos-principales)
- [Módulos Principales](#módulos-principales)
- [Contribuir](#contribuir)

---

## Overview

**VENTIFY** es una plataforma SaaS de gestión empresarial con:

✅ **Gestión de Productos & Categorías** - Crear, editar, eliminar con validaciones  
✅ **Sistema de Inventario** - Almacenes, stock, transferencias, alertas  
✅ **Módulo CRM** - Oportunidades, pipelines, actividades, reportes  
✅ **Rate Limiting** - Protección contra abuso (18 endpoints)  
✅ **Multi-tenancy** - Aislamiento seguro de datos por empresa  
✅ **78 Tests** - Cobertura completa con testing automatizado  

---

## 🚀 Quick Start

### Requisitos
- Node.js 18+ (verificar con `node --version`)
- npm (incluido con Node.js)
- Git

### Instalación (5 min)

```bash
# 1. Clonar repositorio
git clone <YOUR_GIT_URL>
cd dsfp_space

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env.local
# Llenar Supabase keys en .env.local

# 4. Iniciar desarrollo
npm run dev

# 5. Abrir en navegador
# http://localhost:5173
```

---

## 📚 Documentación

### 👶 Nuevo en el Proyecto?
1. Lee [FINAL_SUMMARY.md](FINAL_SUMMARY.md) (5 min) - Overview visual
2. Lee [CLAUDE.md](CLAUDE.md) (5 min) - Reglas de desarrollo
3. Lee [SECURITY.md](SECURITY.md) (10 min) - Qué no hacer

### 🏗️ Entendiendo la Arquitectura
- [CRM_SOT.md](CRM_SOT.md) - Architecture del módulo CRM
- [VENTIFY_ONBOARDING_STRATEGY.md](VENTIFY_ONBOARDING_STRATEGY.md) - Onboarding strategy

### 🔨 Implementando Features
- [CHECKLIST_EXECUTIVE.md](CHECKLIST_EXECUTIVE.md) - Qué está pendiente
- [INVENTORY_DELETE_IMPLEMENTATION_GUIDE.md](INVENTORY_DELETE_IMPLEMENTATION_GUIDE.md) - Guía paso a paso
- [QUICK_REFERENCE_SNIPPETS.md](QUICK_REFERENCE_SNIPPETS.md) - Code copy-paste

### 📖 Índice Completo
→ Ver [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

## 🛠️ Stack Tecnológico

```
Frontend:
  ├─ React 18 (UI components)
  ├─ TypeScript (type safety)
  ├─ TanStack Query (data fetching)
  ├─ Zod (validation)
  ├─ TailwindCSS (styling)
  └─ shadcn/ui (component library)

Backend:
  ├─ Supabase (PostgreSQL + Auth)
  ├─ Edge Functions (serverless)
  ├─ RLS (Row-Level Security)
  └─ Real-time subscriptions

Testing:
  ├─ Vitest (unit tests)
  ├─ React Testing Library
  ├─ MSW (mock API)
  └─ 78 tests total ✅

Deployment:
  ├─ Netlify (frontend)
  ├─ Supabase (backend)
  └─ GitHub (source control)
```

---

## 📁 Estructura del Proyecto

```
src/
├─ pages/              # Rutas principales (Products, CRM, Inventory, etc)
├─ components/        # Reusable React components
├─ services/          # Business logic & API calls
├─ utils/             # Helpers & utilities
├─ hooks/             # Custom React hooks
├─ types/             # TypeScript types & interfaces
└─ styles/            # TailwindCSS & global styles

__tests__/            # Test suites (78 tests)
supabase/             # Database migrations & configuration
docs/                 # Technical documentation
```

---

## 🎮 Comandos Principales

```bash
# Desarrollo
npm run dev              # Iniciar servidor dev (localhost:5173)
npm run build            # Build para producción
npm run preview          # Preview del build

# Testing
npm test                 # Ejecutar todos los tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # Coverage report

# Linting & Formatting
npm run lint             # ESLint
npm run type-check       # TypeScript check

# Database
npm run supabase:up      # Ejecutar migraciones
npm run supabase:down    # Revertir migraciones
```

---

## 📦 Módulos Principales

### 1. **Products** ✅
- Crear/editar/eliminar categorías
- Gestión de productos
- SKU generation automático
- `src/pages/Products.tsx`

### 2. **Inventory** ⏳
- Warehouses (almacenes)
- Warehouse Stock
- Warehouse Transfers
- Inventory Alerts
- `src/pages/Inventory/`

### 3. **CRM** 🏗️
- Oportunidades & Pipelines
- Actividades & Tareas
- Filtros guardados
- Exportaciones
- `src/pages/CRM/`

### 4. **Reports** 📊
- Análisis de ventas
- Dashboards
- Reportes personalizados

---

## 🔒 Seguridad

⚠️ **Nunca pushear:**
- `.env.local` (credenciales)
- Supabase keys en el código
- API keys

✅ **Siempre usar:**
- Variables de entorno (`.env.local`)
- RLS en Supabase
- Input validation (Zod)
- Type safety (TypeScript)

Ver [SECURITY.md](SECURITY.md) para detalles completos.

---

## 🧪 Testing

Se requiere **mínimo 80% coverage** para PRs.

```bash
# Ejecutar tests específicos
npm test -- Products

# Ver cobertura
npm test -- --coverage

# Watch mode para desarrollo
npm test -- --watch
```

**Status Actual:** ✅ 78/78 tests pasando

---

## 🚀 Deployment

### Pre-producción
1. ✅ Tests pasando (`npm test`)
2. ✅ Lint OK (`npm run lint`)
3. ✅ Type check OK (`npm run type-check`)
4. ✅ Build successful (`npm run build`)

### Producción
```bash
git push origin main
# → Automático deploy en Netlify
```

---

## 💡 Guía de Desarrollo

### Antes de Empezar
1. Lee [CLAUDE.md](CLAUDE.md) - Estándares del proyecto
2. Crea rama: `git checkout -b feature/tunombre`
3. Implementa con tests
4. Haz PR con descripción clara

### Evitar N+1 Queries
```typescript
// ❌ MAL - Query en bucle
for (const item of items) {
  const result = await repo.findById(item.id);
}

// ✅ BIEN - Una sola query
const ids = items.map(i => i.id);
const results = await repo.findByIds(ids);
```

Ver [CLAUDE.md](CLAUDE.md) para más buenas prácticas.

---

## 📞 Soporte

- 📖 Lee la documentación: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- 🔍 Busca en issues: `github.com/.../issues`
- 💬 Contacta al equipo

---

## 📄 Licencia

Proyecto privado - Derechos reservados 2026

---

**Última actualización:** 8 Abril 2026  
**Mantenido por:** Tech Team Ventify
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?





Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.


