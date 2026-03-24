# ✅ Solución: Proxy para Desarrollo + Netlify Function para Producción

## Problema Encontrado

En Netlify (`tutorialventify.netlify.app`) el código estaba intentando llamar directamente a Claude API, generando **CORS error**.

## Solución Implementada

### 1️⃣ Desarrollo Local (Ya Funciona ✅)
```
npm run dev         # Vite frontend en http://localhost:8081
npm run proxy       # Proxy server en http://localhost:3001
```
- Cliente: `http://localhost:8081` → Proxy: `http://localhost:3001` → Claude API

### 2️⃣ Producción en Netlify (Nuevo ✅)
```
netlify/functions/generate-alliance-profiles.ts  ← Serverless function
```
- Cliente: `https://tutorialventify.netlify.app` → Netlify Function: `/.netlify/functions/generate-alliance-profiles` → Claude API
- **Sin CORS:** Netlify Function es server-side, puede llamar Claude API

---

## Cambios Realizados

### Archivos Creados
```
netlify/functions/generate-alliance-profiles.ts  ← Nueva Netlify Function
netlify.toml                                       ← Configuración Netlify
```

### Archivos Actualizados
```
src/lib/allianceMarketAI.ts  ← Ahora detects DEV vs PROD
```

---

## Cómo Funciona el Nuevo Código

```typescript
// En desarrollo (npm run dev):
if (import.meta.env.DEV) {
  // Llama a localhost:3001 (local proxy)
  profilesUrl = 'http://localhost:3001/api/generate-alliance-profiles'
}

// En producción (Netlify):
else {
  // Llama a Netlify Function
  profilesUrl = '/.netlify/functions/generate-alliance-profiles'
}
```

---

## 📋 Pasos Para Actualizar Producción

### Paso 1: Copiar tu ANTHROPIC_API_KEY a Netlify

**En panel Netlify:**
1. Site settings → Build & deploy → Environment
2. Add environment variables:
   ```
   Key: ANTHROPIC_API_KEY
   Value: sk-ant-api03-xxxxxx...  (tu API key)
   ```

### Paso 2: Hacer Build Local

```powershell
npm run build
```

### Paso 3: Desplegar a Netlify

**Opción A: Git Push (Recomendado)**
```powershell
git add .
git commit -m "Add Netlify Functions for Claude integration"
git push origin main
```
→ Netlify automáticamente re-deploya

**Opción B: Deploy Manual**
```powershell
# Instalar Netlify CLI (si no lo tienes)
npm install -g netlify-cli

# Desplegar
netlify deploy --prod
```

### Paso 4: Verificar que Funciona

1. Ir a `https://tutorialventify.netlify.app`
2. Alliance Market → Settings
3. Llenar formulario
4. Click "Buscar perfiles"
5. ✅ Debería generar perfiles SIN CORS error

---

## Estructura de Archivos

```
netlify/functions/
  generate-alliance-profiles.ts  ← Proxy server como Netlify Function
  
src/lib/
  allianceMarketAI.ts            ← Cliente que elige: local proxy vs Netlify

netlify.toml                      ← Configuración Netlify
```

---

## Si Algo Falla

**Error: `Cannot find module @anthropic-ai/sdk`**
- Solución: El package.json ya lo tiene instalado, reconstruye:
  ```bash
  npm install
  npm run build
  ```

**Error: `ANTHROPIC_API_KEY not configured`**
- Solución: Agrega la variable en panel Netlify (ver Paso 1)

**Still CORS error en Netlify:**
- Verifica que la variable esté bien escrita en Netlify
- Rebuild: `git push` or `netlify deploy --prod`

---

## Para Desarrollo: Sigue Siendo Local

```powershell
# Terminal 1
npm run dev

# Terminal 2
npm run proxy
```

✅ Todo sigue funcionando como antes en localhost

---

## Para Contabo (Si Quieres También Deployar Ahí)

El proxy-server.ts sigue siendo válido. Ver: [CONTABO_DEPLOYMENT_GUIDE.md](CONTABO_DEPLOYMENT_GUIDE.md)

---

## Resumen

| Entorno | Proxy | Ubicación |
|---------|-------|----------|
| **Local** | `localhost:3001` | Tu PC |
| **Netlify** | Netlify Function | `/.netlify/functions/...` |
| **Contabo** (opcional) | `http://TUIP:3001` | Tu servidor Contabo |

---

**Fecha:** 2026-03-24
