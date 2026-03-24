# 🚀 Deployment del Proxy Server en Contabo

## Paso 0: Encontrar tu URL de Contabo

1. **Sin acceso a Contabo ahora?** Puedes:
   - Panel Contabo → "Overview" → "IP Publica" o "Dominio"
   - Email de bienvenida de Contabo (tiene IP/dominio)
   - SSH directo: `ssh root@TU_IP_CONTABO`

2. **Anótala aquí importante:**
   ```
   IP o Dominio: _________________ 
   Usuario SSH: _________________ (generalmente "root" o "tu_usuario")
   Contraseña: _________________ (si usas password SSH)
   ```

---

## Paso 1: Conectar por SSH

Abre PowerShell en tu PC y conecta:

```powershell
# Opción A: Con IP
ssh root@TU_IP_AQUI
# Ejemplo: ssh root@185.239.242.123

# Opción B: Con Dominio
ssh root@tudominio.com

# Si pide contraseña, ingresa la de Contabo
```

**Si no funciona:**
- Verifica en Panel Contabo la IP correcta
- Contabo puede ocupar puerto SSH no-estándar: `ssh root@IP -p 22` o `-p 2222`

---

## Paso 2: Instalar Node.js en Contabo

Una vez conectado por SSH a Contabo, copia y pega todo esto:

```bash
# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20 (versión LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

---

## Paso 3: Descargar tu Código en Contabo

```bash
# Ir a directorio de proyectos
cd /home
mkdir -p appsync
cd appsync

# Opción A: Clonar desde Git
git clone https://github.com/TU_USUARIO/TU_REPO.git dsfp_space
cd dsfp_space

# Opción B: Si no tienes Git, transferir archivos con SCP/SFTP
# Desde tu PC (PowerShell):
scp -r "C:\ruta\local\proxy-server.ts" root@TU_IP:/home/appsync/dsfp_space/

# Opción C: Copiar solo proxy-server.ts + package.json
# Necesitas ambos archivos en Contabo
```

---

## Paso 4: Instalar Dependencias en Contabo

Dentro de Contabo, en el directorio del proyecto:

```bash
cd /home/appsync/dsfp_space

# Instalar solo dependencias del proxy (no todo node_modules)
npm install express cors @anthropic-ai/sdk tsx

# O instalar todo si clonaste el repo completo
npm install
```

---

## Paso 5: Configurar Variables de Entorno

Crear `.env` en Contabo:

```bash
# Crear archivo
nano .env

# Pegar esto en nano:
ANTHROPIC_API_KEY=sk-ant-api03-XXXXXXXXXXXXX
NODE_ENV=production
PORT=3001

# Guardar: Ctrl + O → Enter → Ctrl + X
```

**⚠️ IMPORTANTE:** 
- `ANTHROPIC_API_KEY` debe ser la misma que tienes localmente
- Puerto `3001` deve estar abierto en firewall Contabo

---

## Paso 6: Probar que Funciona (Prueba Rápida)

```bash
# Desde /home/appsync/dsfp_space
npm run proxy
# o
tsx proxy-server.ts
```

Deberías ver:
```
✅ Alliance Market proxy server running on http://0.0.0.0:3001
```

Presiona `Ctrl + C` para detener (solo era prueba)

---

## Paso 7: Usar PM2 para Ejecutar Permanentemente

PM2 mantiene tu servidor corriendo 24/7 (incluso si reinicia Contabo):

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar proxy server con PM2
pm2 start proxy-server.ts --name "alliance-proxy" --interpreter tsx

# Guardar configuración PM2 (importante!)
pm2 save

# Hacer que PM2 se inicie con el sistema
pm2 startup

# Ver estado
pm2 status
pm2 logs alliance-proxy
```

**Comando útil:** Ver logs en tiempo real:
```bash
pm2 logs alliance-proxy
```

---

## Paso 8: Abrir Puerto 3001 en Firewall (Crítico)

Si el firewall bloquea el puerto 3001, nadie puede acceder.

```bash
# Ver firewall actual
sudo ufw status

# Permitir puerto 3001
sudo ufw allow 3001/tcp

# Permitir SSH también (importante para no perder acceso!)
sudo ufw allow 22/tcp

# Activar firewall
sudo ufw enable

# Verificar
sudo ufw status
```

---

## Paso 9: Actualizar Frontend para Usar Contabo

Ahora necesitas decirle al frontend que use el proxy en Contabo, no localhost.

En tu PC, edita `/src/lib/allianceMarketAI.ts`:

**Encuentra esta línea:**
```typescript
const response = await fetch('http://localhost:3001/api/generate-alliance-profiles', {
```

**Reemplázala por:**
```typescript
// En desarrollo: localhost
// En producción: Contabo
const PROXY_URL = process.env.VITE_PROXY_URL || 'http://localhost:3001';

const response = await fetch(`${PROXY_URL}/api/generate-alliance-profiles`, {
```

Luego en `.env` (de tu PC):
```env
# Desarrollo
VITE_PROXY_URL=http://localhost:3001

# Producción (cuando depliegues):
# VITE_PROXY_URL=http://TU_IP_CONTABO:3001
```

---

## Paso 10: Verificar que Todo Funciona

Desde tu navegador:
```
http://TU_IP_CONTABO:3001
```

Deberías recibir error o respuesta (eso significa que el servidor está corriendo ✅)

Test real: En tu app frontend, click "Buscar perfiles"
- ✅ Debería funcionar sin CORS errors
- ❌ Si falla, verifica: `pm2 logs alliance-proxy`

---

## Configuración HTTPS (Opcional pero Recomendado para Producción)

Si quieres HTTPS (seguro):

### Opción A: Certbot (Gratis con Let's Encrypt)
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado (necesitas un dominio)
sudo certbot certonly --standalone -d tudominio.com

# Los certificates están en: /etc/letsencrypt/live/tudominio.com/
```

### Opción B: Usar Nginx como Reverse Proxy (Recomendado)
```bash
# Instalar Nginx
sudo apt install nginx -y

# Editar configuración Nginx
sudo nano /etc/nginx/sites-available/default

# Agregar esto:
server {
    listen 80;
    server_name TU_IP_O_DOMINIO;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| `npm: command not found` | Node.js no está instalado. Repite Paso 2 |
| `Cannot find module 'express'` | Falta instalar dependencias: `npm install express cors @anthropic-ai/sdk` |
| `ECONNREFUSED` en frontend | Puerto 3001 no está abierto o PM2 no inició. Ver `pm2 status` |
| `ANTHROPIC_API_KEY not found` | `.env` no está configurado. Repite Paso 5 |
| `Port 3001 already in use` | Otro proceso usa puerto 3001: `lsof -i :3001` para ver cuál |
| `Permission denied` con ssh | SSH key no configurado. Pide contraseña SSH a Contabo |
| Nginx 502 Bad Gateway | PM2 no está corriendo: `pm2 start proxy-server.ts --interpreter tsx` |

---

## Comandos Útiles para Contabo

```bash
# Ver procesos PM2
pm2 status
pm2 list

# Ver logs
pm2 logs alliance-proxy
pm2 logs alliance-proxy --lines 100

# Reiniciar servidor
pm2 restart alliance-proxy

# Detener
pm2 stop alliance-proxy

# Eliminar de PM2
pm2 delete alliance-proxy

# Ver estado del firewall
sudo ufw status

# Verificar conexión al proxy
curl http://localhost:3001/api/generate-alliance-profiles

# Verificar API key en .env
cat .env
```

---

## Checklist Final

- [ ] Tengo IP/Dominio de Contabo
- [ ] Puedo conectar por SSH
- [ ] Node.js está instalado
- [ ] Código está descargado en Contabo
- [ ] `.env` tiene ANTHROPIC_API_KEY
- [ ] PM2 está ejecutando proxy server
- [ ] Puerto 3001 está abierto en firewall
- [ ] Frontend apunta a `VITE_PROXY_URL`
- [ ] Test: "Buscar perfiles" funciona sin CORS errors ✅

---

## Próximos Pasos

1. **Hoy:** Deployment en Contabo + test básico
2. **Después:** HTTPS con Certbot
3. **Producción:** Monitores de uptime, backups automáticos

---

**¿Necesitas ayuda?** Copia el error exacto de `pm2 logs` y comparte.

Fecha: 2026-03-24
