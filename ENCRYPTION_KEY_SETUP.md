# 🔐 ENCRYPTION_KEY Setup Guide

## ¿Qué es la ENCRYPTION_KEY?

**Una SOLA key GLOBAL** que encripta las credenciales de Twilio de TODAS las empresas en la plataforma.

```
┌──────────────────────────────────────────────┐
│  ENCRYPTION_KEY (Supabase Secrets - GLOBAL)  │
│  "b6vzqR9ZXwGpUFOarJo08yht..."               │
│  ↓ Encripta TODAS las credenciales           │
└──────────────────────────────────────────────┘
         │
         ├─→ Empresa A: Twilio SID "AC111", Token "xxx"
         ├─→ Empresa B: Twilio SID "AC222", Token "yyy"  
         └─→ Empresa C: Twilio SID "AC333", Token "zzz"
```

## ❌ Lo que NO es

- ❌ NO es una key por empresa
- ❌ NO la configura el cliente
- ❌ NO es el Account SID ni Auth Token de Twilio
- ❌ NO está en el código ni en la base de datos

## ✅ Lo que SÍ es

- ✅ Una key aleatoria que TÚ (desarrollador) generas UNA SOLA VEZ
- ✅ Se usa para encriptar credenciales de TODAS las empresas
- ✅ Solo la conoce el equipo de DevOps
- ✅ Se guarda en Supabase Vault (secrets)
- ✅ Solo accesible desde edge functions con `Deno.env.get('ENCRYPTION_KEY')`

---

## 🎯 Tu ENCRYPTION_KEY 

### ✅ Si YA tienes `ENCRYPTION_KEY` en Supabase Secrets:

**USA EL EXISTENTE - NO lo cambies**

Razón: Si ya hay credenciales encriptadas con esa key, cambiarla haría imposible desencriptarlas.

### 🆕 Si NO tienes `ENCRYPTION_KEY`:

Usa esta key generada aleatoriamente:

```
b6vzqR9ZXwGpUFOarJo08yhtgCsH7YAxME2nNm4dlcQ3fKBu
```

O genera una nueva con:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

**⚠️ IMPORTANTE: Guarda esta key en un lugar seguro (1Password, Bitwarden, etc.)**

---

## 📝 Paso 1: Verificar Secret Existente

⚠️ **SI YA TIENES UN `ENCRYPTION_KEY` EN SUPABASE SECRETS:**

**✅ USA EL EXISTENTE - NO LO CAMBIES**

Verificar si existe:
```powershell
# Ver todas las secrets
supabase secrets list
```

Si ves `ENCRYPTION_KEY` en la lista:
- ✅ **Perfecto, usa esa key existente**
- ❌ **NO ejecutes `supabase secrets set` de nuevo**
- ❌ **NO cambies la key si ya hay datos encriptados**

---

**SI NO EXISTE `ENCRYPTION_KEY`:**

Crear el secret:
```powershell
# Conectar a tu proyecto Supabase
supabase link --project-ref tu-project-ref

# Guardar la encryption key NUEVA
supabase secrets set ENCRYPTION_KEY "b6vzqR9ZXwGpUFOarJo08yhtgCsH7YAxME2nNm4dlcQ3fKBu"
```

**Output esperado:**
```
Creating secret ENCRYPTION_KEY...
Finished supabase secrets set.
```

---

## 📝 Paso 2: Verificar que se guardó

```powershell
# Ver todas las secrets (no muestra valores, solo nombres)
supabase secrets list
```

**Output esperado:**
```
ENCRYPTION_KEY
```

---

## 📝 Paso 3: Deploy Migration

```powershell
# Deploy la migración que crea las columnas encriptadas
supabase db push
```

---

## 📝 Paso 4: Deploy Edge Function

```powershell
# Deploy la función que usa la ENCRYPTION_KEY
supabase functions deploy send-crm-message
```

---

## 🔄 Flujo Completo

### Cuando una empresa AGREGA credenciales:

1. **Usuario de Empresa A** va a Settings → Integrations → WhatsApp
2. **Usuario ingresa**: Account SID, Auth Token, Phone Number (plaintext)
3. **Frontend** llama a edge function con estos datos
4. **Edge function**:
   - Lee `ENCRYPTION_KEY` de Supabase Secrets
   - Inserta credenciales en DB
   - Llama `encrypt_whatsapp_credentials(row_id, ENCRYPTION_KEY)`
   - Credenciales quedan encriptadas en DB

### Cuando se ENVÍA un mensaje de WhatsApp:

1. **Usuario** envía mensaje desde CRM
2. **Edge function `send-crm-message`**:
   - Lee `ENCRYPTION_KEY` de Supabase Secrets
   - Busca credenciales de la empresa (encriptadas)
   - Llama `decrypt_whatsapp_credentials(row_id, ENCRYPTION_KEY)`
   - Obtiene credenciales en plaintext (solo en memoria)
   - Llama a Twilio API con esas credenciales
   - Credenciales se destruyen al terminar la función

---

## 🔒 Seguridad

### ✅ Qué está protegido:

- **En reposo**: Credenciales encriptadas en PostgreSQL (columnas `*_encrypted`)
- **En tránsito**: HTTPS entre edge function y Twilio API
- **En memoria**: Credenciales solo existen plaintext durante la ejecución de la función
- **Acceso**: Solo edge functions pueden leer `ENCRYPTION_KEY` del Vault

### ⚠️ Qué debes proteger:

1. **ENCRYPTION_KEY**: Nunca la pongas en código, git, o logs
2. **Supabase Service Role Key**: Tiene acceso a todo
3. **Acceso al dashboard de Supabase**: Solo equipo autorizado

---

## 🚨 Si necesitas rotar la key:

```powershell
# 1. Generar nueva key
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object {[char]$_})

# Output ejemplo: "X4pL7m9Q2vN8aB5wK3..."

# 2. Desencriptar TODAS las credenciales con key vieja
# 3. Re-encriptar TODAS con key nueva
# 4. Actualizar Supabase Secret
supabase secrets set ENCRYPTION_KEY "X4pL7m9Q2vN8aB5wK3..."

# 5. Re-deploy edge functions
supabase functions deploy send-crm-message
```

**⚠️ ESTO ES COMPLEJO - Solo hacerlo si hay brecha de seguridad**

---

## 📞 Troubleshooting

### Error: "Encryption key is required"

**Causa**: Edge function no puede leer `ENCRYPTION_KEY` de Supabase Secrets

**Solución**:
```powershell
# Verificar que existe
supabase secrets list

# Si no existe, crearla
supabase secrets set ENCRYPTION_KEY "b6vzqR9ZXwGpUFOarJo08yhtgCsH7YAxME2nNm4dlcQ3fKBu"

# Re-deploy edge function
supabase functions deploy send-crm-message
```

### Error: "Failed to decrypt: wrong key or corrupted data"

**Causa**: La key con que se encriptó es diferente a la actual

**Solución**: Ver sección "Si necesitas rotar la key" arriba

---

## ✅ Checklist de Deployment

- [ ] Key generada y guardada en 1Password/Bitwarden
- [ ] `supabase secrets set ENCRYPTION_KEY "..."` ejecutado
- [ ] `supabase secrets list` muestra ENCRYPTION_KEY
- [ ] `supabase db push` ejecutado (migración desplegada)
- [ ] `supabase functions deploy send-crm-message` ejecutado
- [ ] Prueba: Empresa agrega credenciales → Se encriptan ✓
- [ ] Prueba: Enviar mensaje WhatsApp → Desencripta y funciona ✓
- [ ] Verificar audit trail: `SELECT * FROM crm_whatsapp_credentials_audit`

---

**Última actualización**: 2026-03-04  
**Generada por**: GitHub Copilot  
**Key válida desde**: 2026-03-04
