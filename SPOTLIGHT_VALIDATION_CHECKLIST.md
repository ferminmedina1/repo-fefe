# ✅ Spotlight Validation Checklist - 100% Quality Assurance

> **Objetivo:** Validar que el spotlight funciona perfectamente en todos los tutoriales
> **Fecha:** 18 de Marzo 2026
> **Estado:** Checklist para ejecutar

---

## 1️⃣ VALIDACIÓN TÉCNICA - Code Review

### CSS Animation
- [ ] Verificar que `spotlightStyles` está definido (línea 14-25 en TutorialRunner.tsx)
- [ ] Confirmar 4 capas de shadow: inner ring (4px), outer ring (8px), bloom (30px), bloom ancho (60px)
- [ ] Validar que animation keyframes están en 50% state (glow se expande 30px→40px)
- [ ] Check `!important` flags en todos los shadow values
- [ ] Verificar color hex: `rgba(59, 130, 246, ...)` (Blue-500)

### DOM Injection
- [ ] Confirmar useEffect inject styles (línea 527-539)
- [ ] Verificar que style tiene `id="spotlight-pulse-animation"`
- [ ] Validar cleanup on unmount (removeChild)
- [ ] Confirmar que NO se inyecta dos veces (getElementById check)

### Joyride Configuration
- [ ] `overlayColor: 'rgba(0, 0, 0, 0.20)'` está en Joyride styles (20% opacity = context visible)
- [ ] `borderRadius: '14px'` en spotlight
- [ ] `boxShadow` inicial coincide con keyframes 0% state
- [ ] `floaterProps.disableAnimation: true` para evitar conflictos

### Tutorial Context
- [ ] isRunning mantiene `true` durante transiciones (nextStep, previousStep, goToStep)
- [ ] Último paso: `isRunning: false` con delay 2800ms
- [ ] skipTutorial preserva `completedSteps`
- [ ] triggerCompletion solo se dispara UNA VEZ al finalizar

---

## 2️⃣ VALIDACIÓN DE TUTORIALES - Por Módulo

### Estructura esperada para cada tutorial:

```typescript
// En config.ts
{
  id: 'module-name',
  title: 'Título módulo',
  description: 'Descripción',
  category: 'Category',
  steps: [
    {
      target: '[data-tutorial="selector-1"]',  // ✅ Debe existir en el DOM
      content: 'Texto del paso',
      title: 'Título del paso'
    },
    // ... más pasos
  ]
}
```

### Tutoriales a validar (17 total):

- [ ] **dashboard** — 4 pasos | Target KPIs, chart, notifications, actions
- [ ] **sales** — 4 pasos | Target sales modules
- [ ] **products** — 4 pasos | Target product list, filters
- [ ] **customers** — 4 pasos | Target customer list, details
- [ ] **inventory** — 4 pasos | Target stock alerts, levels
- [ ] **pos** — 4+ pasos | Target cart, payment, receipt
- [ ] **deliveries** — 4 pasos | Target delivery list, map
- [ ] **returns** — 4 pasos | Target returns form
- [ ] **reservations** — 4 pasos | Target reservation list
- [ ] **accounts_receivable** — 4 pasos | Target aging report
- [ ] **customer_support** — 5 pasos | Target ticket system
- [ ] **purchase_orders** — 4 pasos | Target PO creation
- [ ] **purchases** — 4 pasos | Target purchase history
- [ ] **purchase_reception** — 4 pasos | Target reception form
- [ ] **purchase_returns** — 4 pasos | Target return authorization
- [ ] **suppliers** — 4 pasos | Target supplier list
- [ ] **bank_accounts** — 4 pasos | Target account reconciliation

### Para cada tutorial:

- [ ] Todos los `data-tutorial` selectors existen en el DOM real de la página
- [ ] Spotlight se centra correctamente en el elemento
- [ ] Spotlight es visible sobre el overlay (20% opacity)
- [ ] Animación de pulse es suave (no parpadea)
- [ ] NarrationCard aparece en posición correcta
- [ ] Botones "Siguiente" y "Completar" funcionan
- [ ] Puedo minimizar/maximizar sin perder el spotlight
- [ ] La navegación forward/backward mantiene spotlight animado

---

## 3️⃣ VALIDACIÓN VISUAL - Manual Testing

### Antes de ejecutar cada test:
```bash
npm run build
```

### Test Spotlight Animation (cada tutorial):

1. **Iniciador:** Accede a /learning-center
2. **Selecciona:** Primera tutorial (ej: Dashboard)
3. **Verifica:**
   - [ ] Overlay es oscuro pero translúcido (ves el fondo)
   - [ ] Spotlight tiene glow brillante azul
   - [ ] Spotlight tiene anillo interior visible
   - [ ] Spotlight pulsea suavemente cada 2 segundos
   - [ ] No parpadea, transición suave
   - [ ] Tooltip NO cubre el elemento spotlight
   - [ ] Puedes ver claramente qué elemento es el objetivo

4. **Pasos:**
   - [ ] Completa paso 1 → Spotlight sigue animándose correctamente
   - [ ] Paso 2 → Spotlight pasa a nuevo elemento sin lag
   - [ ] Paso 3 → Animación continúa
   - [ ] Paso 4 (último) → Botón dice "Completar"

5. **Interacciones:**
   - [ ] Click "Siguiente" → Transición suave, no laggy
   - [ ] Click "Anterior" → Regresa correctamente
   - [ ] Minimizar → Spotlight desaparece, MiniBar aparece sin lag
   - [ ] Click MiniBar → Vuelve a maximizar, spotlight activo

### Test todos los 17 tutoriales:
```
Repetir Test Spotlight Animation para CADA tutorial en la lista
```

### Temas visuales:
- [ ] Tema claro: Spotlight es visible (contraste azul sobre fondo claro)
- [ ] Tema oscuro: Spotlight es visible (contraste azul sobre fondo oscuro)
- [ ] Tema del SO: Spotlight adapta correctamente

---

## 4️⃣ VALIDACIÓN DE CASOS EDGE

### Elementos que pueden causar problemas:

- [ ] **Fixed elements** — Spotlight en botones fijos en header
  - Verifica: Spotlight se posiciona correctamente
  - Tutorial: Accede a un módulo que enseña botón fijo

- [ ] **Scrollable containers** — Targeting dentro de scroll
  - Verifica: Spotlight sigue al elemento si hace scroll
  - Tutorial: Si existe un tutorial en tabla scrollable

- [ ] **Modal/Dialog** — Spotlight dentro de modal
  - Verifica: Spotlight visible sobre modal
  - Check Z-index (10000 en options)

- [ ] **Responsive** — Diferentes tamaños de pantalla
  - [ ] Desktop (1920x1080): Spotlight escala bien
  - [ ] Tablet (768x1024): Spotlight posicionado correctamente
  - [ ] Mobile (375x667): Spotlight visible, no overflow

- [ ] **Zoom del navegador** — 90%, 100%, 110%, 125%
  - [ ] Spotlight mantiene glow visible en todos los niveles

- [ ] **CSR Rendering** — Si elemento es lazy-loaded
  - [ ] Esperar a DOM ready antes de spotlight
  - [ ] Verificar que loadingSteps no causa problemas

- [ ] **Múltiples mentorías simultaneas**
  - [ ] No debería pasar, pero check: Una tutorial activa a la vez

---

## 5️⃣ VALIDACIÓN DE ESTADOS

### Estados del Tutorial:

- [ ] **isRunning: true** durante visualización
  - Verifica: shouldRunJoyride = true
  - Joyride run prop = true

- [ ] **isRunning: false** al terminar
  - Verifica: shouldRunJoyride = false
  - Joyride desaparece
  - MiniBar se oculta

- [ ] **minimized: true** durante minimización
  - Verifica: Joyride desaparece + MiniBar aparece
  - shouldRunJoyride = false

- [ ] **minimized: false** al restaurar
  - Verifica: Spotlight vuelve + MiniBar desaparece
  - shouldRunJoyride = true

- [ ] **currentStep** transiciones correctas
  - Verifica: Cada paso en rango válido
  - Spotlight siempre tiene target válido

---

## 6️⃣ VALIDACIÓN DE PERFORMANCE

```bash
# Abrir DevTools → Performance tab
# Grabar durante 1 tutorial completa (4-5 pasos)
```

- [ ] Animation frame rate constante (60 fps ideal, mín 30 fps)
- [ ] No memory leaks (heap size estable)
- [ ] CSS animation sin JavaScript churn
- [ ] useEffect fires solo una vez (style injection)
- [ ] Cleanup function executa al desmontar

---

## 7️⃣ VALIDACIÓN DE ACCESIBILIDAD

- [ ] ARIA labels en spotlight (opcionalmente añadir)
- [ ] Keyboard navigation funciona (Tab, Enter, Esc)
- [ ] Screen readers describen qué está siendo enseñado
- [ ] Contraste suficiente (WCAG AA)
- [ ] Sin parpadeos rápidos que trigger fotosensibilidad

---

## 8️⃣ VALIDACIÓN DE BUILD & DEPLOYMENT

```bash
# Clean build
npm run build

# Check output
npm run preview
```

- [ ] Build completo sin errores TypeScript
- [ ] Sin warnings relacionados a CSS injection
- [ ] Bundle size no aumentó significativamente
- [ ] Spotlight funciona en producción (no solo dev)
- [ ] Sin console errors relacionados a Joyride

---

## 📊 RESULTADO FINAL - Checklist de Sign-Off

| Area | Completado | Notas |
|------|-----------|-------|
| **Técnico** | ☐ | Todos los checks pasados |
| **17 Tutoriales** | ☐ | Cada uno testeado manualmente |
| **Casos Edge** | ☐ | Responsive, modals, lazy-loading |
| **Estados** | ☐ | isRunning, minimized, currentStep funcionan |
| **Performance** | ☐ | 60 fps, sin memory leaks |
| **Accesibilidad** | ☐ | ARIA, keyboard navigation |
| **Build** | ☐ | Producción-ready |

---

## 🚀 Próximos Pasos (si encuentras problemas)

1. **Spotlight no aparece:**
   - Verificar data-tutorial selector existe en DOM
   - Confirmar isRunning: true
   - Check consola para errores Joyride

2. **Spotlight no se anima:**
   - Verificar style inyectado (`#spotlight-pulse-animation` en <head>)
   - Check browser doesn't block animations (preferences > reduce-motion)
   - Inspeccionar computed styles del .react-joyride__spotlight

3. **Lag en transiciones:**
   - Verificar delay 2800ms en nextStep()
   - Check performance tab en DevTools
   - Reducir complexity del DOM si es necesario

4. **Overlay demasiado oscuro/claro:**
   - Ajustar rgba(0, 0, 0, 0.20) a 0.15 o 0.25 en Joyride styles
   - Test en tema claro y oscuro

5. **Z-index issues:**
   - Modal o elemento cubre spotlight
   - Aumentar `zIndex: 10000` en Joyride options
   - Check otros elementos con z-index mayor

---

**Licencia:** Este checklist es exhaustivo. Completa todas las secciones para garantizar spotlight al 100%.