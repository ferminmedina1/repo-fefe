# 🚀 Alliance Market - Claude Integration (Proxy Server)

## Problema Resuelto ✅

**Error CORS**: Las llamadas a Claude fueron bloqueadas por el navegador  
**Solución**: Crear un servidor local que actúe como proxy (sin CORS)

## Cómo Funciona

```
React App (localhost:8081)
  ↓
Local Proxy Server (localhost:3001) ← NO tiene CORS
  ↓
Claude API ← Solo backend-to-backend
  ↓
Supabase Database
```

## Instalación Rápida (3 pasos)

### 1. Instalar Dependencias
```bash
npm install express cors @anthropic-ai/sdk tsx concurrently
```

### 2. Opción A: Correr Proxy en Terminal Separada
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Proxy server
npm run proxy
```

**O Opción B: Correr Todo Junto** (recomendado)
```bash
npm run dev:full
```

### 3. Verificar que Funciona
- Dev server debería estar en: **http://localhost:8081**
- Proxy debería estar en: ✅ **http://localhost:3001** 

Verifica en consola:
```
✅ Alliance Market proxy server running on http://localhost:3001
```

## Probar Alliance Market

1. Ve a http://localhost:8081
2. Click **Alliance Market** en sidebar
3. Click ⚙️ **(Settings)**
4. Completa "Alliance Config"
5. Click **"Buscar perfiles"**
6. **¡Debería funcionar!** ✅

## Estructura de Archivos

```
proxy-server.ts              ← Servidor proxy local
src/lib/allianceMarketAI.ts  ← Cliente que llama al proxy
package.json                 ← Scripts npm
```

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| Proxy no inicia | Instala dependencias: `npm install` |
| Error "Cannot find module" | `npm install express cors @anthropic-ai/sdk tsx` |
| "Connect ECONNREFUSED" | Verifica que proxy está corriendo en Terminal 2 |
| "Invalid JSON response" | Verifica VITE_ANTHROPIC_API_KEY en .env |
| Proxy error en consola | Copia el error exacto y comparte |

## Variables de Entorno

El proxy usa:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Asegúrate que esté en `.env`:
```bash
cat .env | grep ANTHROPIC
```

## Estructura del Request

El proxy request es:
```json
POST http://localhost:3001/api/generate-alliance-profiles

{
  "companyDescription": "...",
  "productsSummary": "...",
  "targetIndustries": [...],
  "targetRelationTypes": [...],
  "searchKeywords": [...]
}
```

Response:
```json
{
  "success": true,
  "profiles_generated": 7,
  "profiles": [...]
}
```

## Próximos Pasos Después del Testing

Para producción, necesitarás elegir UNA opción:
1. **Supabase Edge Functions** - Desplegado en nube
2. **Backend propio** - Node.js/Express en tu servidor
3. **Serverless** - AWS Lambda, Vercel Functions, etc.

## Archivos Modificados

- ✅ `proxy-server.ts` - Nuevo servidor proxy
- ✅ `src/lib/allianceMarketAI.ts` - Ahora llama al proxy
- ✅ `package.json` - Scripts npm nuevos

## Fecha: 2026-03-24

---

**¿Necesitas ayuda?** Copia el error exacto de la consola y comparte.
