# 🎯 Spotlight 100% - Quick Start Guide

> **Cómo asegurar que el spotlight funcione al 100% en todos los tutoriales**  
> Actualizado: 18 de Marzo 2026

---

## 🚀 PASO 1: Validación Rápida (5 minutos)

```powershell
# Ejecutar script de validación
.\validateSpotlight.ps1
```

**Esto verifica:**
- ✅ CSS animation definition
- ✅ DOM style injection  
- ✅ Joyride configuration
- ✅ 17 tutorial modules
- ✅ Build production-ready
- ✅ TypeScript errors

Si todo pasa ✅ → Ve al Paso 2

---

## 🧪 PASO 2: Validación Visual (10 minutos)

```bash
# Terminal 1: Iniciar servidor dev
npm run dev
```

Abre: `http://localhost:5173/learning-center`

### Ejecuta este test en CADA tutorial:

1. **Click en cualquier tutorial** (ej: "Dashboard")
2. **Verifica:**
   - [ ] **Spotlight es VISIBLE** — ves un glow azul alrededor del elemento
   - [ ] **Spotlight es BRILLANTE** — no es borroso ni débil
   - [ ] **Spotlight PULSA** — cada 2 segundos se expande suavemente
   - [ ] **Overlay es TRANSLÚCIDO** — ves el fondo, no todo negro
   - [ ] **Tooltip está bien posicionado** — no cubre el spotlight
   
3. **Click "Siguiente" →** Verifica que spotlight se mueve al nuevo elemento
4. **Repite para 5 tutoriales diferentes**

**Si TODO se ve bien ✅** → Ve al Paso 3

**Si el spotlight NO se ve:**
```
Posibles causas:
1. Tema del navegador está en "reduce-motion" → Desactivar en Accessibility
2. CSS animation no se inyectó → DevTools: buscar "spotlight-pulse-animation" en <head>
3. Targeting incorrecto → DevTools: verificar elemento tiene [data-tutorial="..."]
```

---

## 🏗️ PASO 3: Validación de Performance (10 minutos)

```bash
# Terminal: ejecutar con profiling
npm run build 2>&1 | Select-Object -Last 20
```

**Debería mostrar:**
```
✔ built in XXXms
```

### DevTools Performance Check:

1. Abre DevTools → **Performance tab**
2. Click en **Record** 🔴
3. Completa UN tutorial entero (4-5 pasos)
4. Click **Stop** ⏹️
5. **Analiza:**
   - [ ] FPS fluctúa entre 55-60 (ideal = 60)
   - [ ] No hay spike de memory
   - [ ] CSS animation corre suavemente (no frames dropped)

**Si FPS < 30:**
```javascript
// En TutorialRunner.tsx, buscar:
const spotlightStyles = `
  @keyframes spotlight-pulse {
    // Verificar que animation-duration sea 2s (no 0.5s o muy rápido)
    animation: spotlight-pulse 2s ease-in-out infinite;
  }
`;
```

---

## ✅ PASO 4: Tests Automatizados (5 minutos)

```bash
# Ejecutar test suite
npm test -- validateSpotlight
```

**Expected output:**
```
✓ 15 tests passed
- CSS Animation Definition: OK
- DOM Style Injection: OK
- Joyride Configuration: OK
- Tutorial Modules: OK (17 modules)
- No TypeScript Errors: OK
```

Si falla alguno → Lee el error específico y busca "Casos Edge" abajo

---

## 📊 CHECKLIST FINAL - Spotlight 100% Ready

Marcar cada uno conforme completes los pasos:

| Item | Status |
|------|--------|
| Script de validación pasó ✅ | [ ] |
| Spotlight visible en 5+ tutoriales | [ ] |
| Spotlight pulsa suavemente cada 2s | [ ] |
| Overlay translúcido (no todo negro) | [ ] |
| Transiciones smooth entre pasos | [ ] |
| Performance: 55+ FPS constantes | [ ] |
| Tests automatizados passed | [ ] |
| **Build production limpio** | [ ] |

**Si todos están ✅ → SPOTLIGHT 100% READY! 🎉**

---

## 🔧 Troubleshooting - Casos Comunes

### ❌ Problema: Spotlight NO aparece

```
Diagnóstico:
1. Abre DevTools → Inspector
2. Busca elemento con classe "react-joyride__spotlight"
   - Si NO existe: Joyride no encuentra el target
   - Si existe pero sin glow: CSS no se inyectó
   
Solución:
- Verificar [data-tutorial="..."] existe en el DOM
- Verificar selector CSS en config.ts es EXACTO
- Limpiar cache: Ctrl+Shift+Delete → Clear all
```

### ⚠️ Problema: Spotlight aparece pero NO se anima

```
Diagnóstico:
1. DevTools → Elements → <head>
2. Buscar <style id="spotlight-pulse-animation">
   - Si NO existe: useEffect no corrió
   - Si existe: CSS syntax error

Solución:
- Refrescar página: Ctrl+R
- Abrir nueva pestaña e ir a /learning-center
- Verificar browser NO tiene "Reduce Motion" habilitado
  → Settings → Accessibility → Reduce Motion = OFF
```

### 🐢 Problema: Spotlight lagea / FPS bajo

```
Diagnóstico:
1. DevTools → Performance tab → Record
2. Si FPS cae a <30:
   - Posible: DOM complejo con muchos elementos
   - Posible: Otra animación conflictéa
   
Solución:
- Verificar que floaterProps.disableAnimation: true
  (desactiva animación por defecto de Joyride)
- Si tabla tiene muchas filas: considerar virtualizar
- Si en mobile: verificar device no está throttled
```

### 🎨 Problema: Spotlight muy oscuro/claro en ciertos temas

```
Diagnóstico:
1. DevTools → Inspector → elemento spotlight
2. Check computed box-shadow
   - Debería tener: rgba(59, 130, 246, ...)
   
Solución:
- Color azul (59, 130, 246) funciona en temas claro y oscuro
- Si necesitas ajustar:
  → TutorialRunner.tsx, línea 14+
  → Cambiar rgba(59, 130, 246 a otro color
  → Ejemplo: rgba(147, 51, 234 para púrpura
```

---

## 🎯 Síntesis: Cómo funciona el Spotlight

```
USER INICIA TUTORIAL
       ↓
TutorialRunner.tsx monta
       ↓
useEffect inyecta [CSS animation] en <head>
       ↓
Joyride recibe isRunning: true
       ↓
Spotlight renderiza alrededor del elemento [data-tutorial="..."]
       ↓
CSS animation "spotlight-pulse" se aplica
       ↓
Cada 2 segundos:
  - Glow se expande de 30px → 40px
  - Border se expande de 4px → 6px
  - Brillo aumenta (opacity 0.6 → 0.8)
       ↓
Usuario ve "beacon pulsante" atrayendo atención
       ↓
Usuario completa paso
       ↓
Spotlight transiciona al siguiente elemento
       ↓
Loop hasta completar todos los pasos
       ↓
isRunning: false → Joyride disappears
       ↓
useEffect cleanup → Style removido del DOM
```

---

## 📞 Si algo no funciona después de estos pasos

**Copia & pega esto en terminal:**

```powershell
# 1. Limpiar cache & node_modules
Remove-Item -Path "node_modules" -Recurse -Force
npm install

# 2. Limpiar build
Remove-Item -Path ".vite" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue

# 3. Rebuild
npm run build

# 4. Verificar nuevamente
.\validateSpotlight.ps1
```

Si SIGUE sin funcionar → Ejecuta y copia output:

```bash
npm run build 2>&1
```

Luego revisa archivo de log para errores específicos.

---

## 📚 Referencias

- **Animation Spec:** [SPOTLIGHT_IMPROVEMENTS_2026-03-18.md](SPOTLIGHT_IMPROVEMENTS_2026-03-18.md)
- **Bug Fixes:** [TUTORIAL_BUGS_FIXED_2026-03-18.md](TUTORIAL_BUGS_FIXED_2026-03-18.md)
- **Full Checklist:** [SPOTLIGHT_VALIDATION_CHECKLIST.md](SPOTLIGHT_VALIDATION_CHECKLIST.md)
- **Code:** [src/components/learning/TutorialRunner.tsx](src/components/learning/TutorialRunner.tsx)

---

## 🎉 Resumen en 1 línea

**Spotlight está implementado al 100%. Este guide valida que todo funciona.**

