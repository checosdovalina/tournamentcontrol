# 🚀 Guía de Deployment - CourtFlow en Debian 12

Guía completa para desplegar CourtFlow en un servidor VPS con Debian 12 y PostgreSQL local.

---

## **PASO 1: Preparar el Servidor**

```bash
# Conectar al servidor
ssh root@tu_servidor_ip

# Actualizar sistema
apt update && apt upgrade -y

# Instalar herramientas básicas
apt install -y curl wget git build-essential nano ufw
```

---

## **PASO 2: Instalar Node.js 20**

```bash
# Añadir repositorio NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Instalar Node.js
apt install -y nodejs

# Verificar instalación
node --version   # Debe mostrar v20.x.x
npm --version    # Debe mostrar 10.x.x
```

---

## **PASO 3: Instalar PostgreSQL 15**

```bash
# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib postgresql-client

# Verificar estado
systemctl status postgresql

# Habilitar inicio automático
systemctl enable postgresql
```

---

## **PASO 4: Configurar PostgreSQL**

```bash
# Conectar como usuario postgres
sudo -u postgres psql
```

Ejecutar dentro del prompt de PostgreSQL:

```sql
-- Crear usuario
CREATE USER courtflow WITH PASSWORD 'CourtFlow2025.';

-- Crear base de datos
CREATE DATABASE courtflow OWNER courtflow;

-- Dar privilegios
GRANT ALL PRIVILEGES ON DATABASE courtflow TO courtflow;

-- Conectar a la base de datos
\c courtflow

-- Dar permisos en schema public
GRANT ALL ON SCHEMA public TO courtflow;

-- Salir
\q
```

Configurar autenticación por contraseña:

```bash
# Editar configuración
nano /etc/postgresql/15/main/pg_hba.conf
```

Buscar y cambiar estas líneas:
```
# DE:
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256

# A:
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

Guardar (`Ctrl+X`, `Y`, `Enter`) y reiniciar:

```bash
systemctl restart postgresql
```

---

## **PASO 5: Migrar Base de Datos desde Neon**

**IMPORTANTE:** En el dashboard de Neon, selecciona la conexión "Direct" (no "Pooled") para obtener la URL correcta.

```bash
# Exportar desde Neon (reemplaza con tu URL Direct de Neon)
pg_dump -Fc --no-acl --no-owner \
  "postgresql://usuario:password@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  > /tmp/neon_backup.dump

# Importar a PostgreSQL local
PGPASSWORD='CourtFlow2025.' pg_restore --no-acl --no-owner \
  -h localhost \
  -U courtflow \
  -d courtflow \
  /tmp/neon_backup.dump

# Verificar que se importó correctamente
psql -U courtflow -d courtflow -c "\dt"

# Ver cantidad de registros importados
psql -U courtflow -d courtflow -c "SELECT COUNT(*) FROM users;"
psql -U courtflow -d courtflow -c "SELECT COUNT(*) FROM tournaments;"

# Limpiar archivo temporal
rm /tmp/neon_backup.dump
```

---

## **PASO 6: Clonar el Proyecto**

```bash
# Crear directorio para aplicaciones
mkdir -p /var/www
cd /var/www

# Clonar repositorio
git clone https://github.com/checosdovalina/tournamentcontrol.git courtflow

# Entrar al directorio
cd courtflow

# Verificar
ls -la
```

---

## **PASO 7: Configurar Variables de Entorno**

```bash
# Crear archivo .env
nano /var/www/courtflow/.env
```

Pegar el siguiente contenido:

**⚠️ IMPORTANTE:** El `DATABASE_URL` **NO debe tener parámetros SSL** porque PostgreSQL está en el mismo servidor (localhost).

```env
# Node Environment
NODE_ENV=production

# Base de datos LOCAL (PostgreSQL) - SIN SSL
DATABASE_URL=postgresql://courtflow:CourtFlow2025.@localhost:5432/courtflow
PGHOST=localhost
PGDATABASE=courtflow
PGUSER=courtflow
PGPASSWORD=CourtFlow2025.
PGPORT=5432

# Session Secret (genera uno aleatorio y seguro)
SESSION_SECRET=CourtFlow_MX_2025_Super_Secure_Session_Secret_Key_1234567890

# Google Cloud Storage (si lo usas)
DEFAULT_OBJECT_STORAGE_BUCKET_ID=courtflow-bucket
GOOGLE_APPLICATION_CREDENTIALS=/var/www/courtflow/gcs-credentials.json
PUBLIC_OBJECT_SEARCH_PATHS=public
PRIVATE_OBJECT_DIR=.private

# Puerto interno
PORT=3000
```

Guardar (`Ctrl+X`, `Y`, `Enter`).

**Opcional - Si usas Google Cloud Storage:**

```bash
# Crear archivo de credenciales
nano /var/www/courtflow/gcs-credentials.json

# Pegar tu JSON de credenciales de Google Cloud Service Account

# Proteger archivo
chmod 600 /var/www/courtflow/gcs-credentials.json
```

---

## **PASO 8: Instalar Dependencias**

```bash
cd /var/www/courtflow

# Instalar dependencias (puede tomar varios minutos)
npm install
```

---

## **PASO 9: Construir el Proyecto**

```bash
# Build del frontend
npm run build

# Verificar que se creó la carpeta dist
ls -la dist/
```

---

## **PASO 10: Instalar y Configurar PM2**

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Crear archivo de configuración
nano /var/www/courtflow/ecosystem.config.js
```

Pegar:

```javascript
module.exports = {
  apps: [{
    name: 'courtflow',
    script: 'npm',
    args: 'run dev',
    cwd: '/var/www/courtflow',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/courtflow-error.log',
    out_file: '/var/log/courtflow-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    time: true
  }]
};
```

Guardar (`Ctrl+X`, `Y`, `Enter`).

```bash
# Iniciar aplicación con PM2
pm2 start ecosystem.config.js

# Ver logs en tiempo real
pm2 logs courtflow

# Si ves "Server running on port 3000" está funcionando correctamente

# Configurar PM2 para auto-inicio al reiniciar servidor
pm2 startup systemd

# Ejecutar el comando que PM2 muestra (algo como):
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root

# Guardar configuración actual
pm2 save
```

---

## **PASO 11: Instalar y Configurar Nginx**

```bash
# Instalar Nginx
apt install -y nginx

# Crear configuración del sitio
nano /etc/nginx/sites-available/courtflow
```

Pegar (reemplaza `tu_ip_servidor` con la IP real de tu servidor):

```nginx
server {
    listen 80;
    server_name tu_ip_servidor;

    client_max_body_size 50M;

    access_log /var/log/nginx/courtflow-access.log;
    error_log /var/log/nginx/courtflow-error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Client info headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para WebSocket
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

Guardar (`Ctrl+X`, `Y`, `Enter`).

```bash
# Activar el sitio
ln -s /etc/nginx/sites-available/courtflow /etc/nginx/sites-enabled/

# Eliminar sitio por defecto
rm /etc/nginx/sites-enabled/default

# Verificar configuración
nginx -t

# Si todo está OK, reiniciar Nginx
systemctl restart nginx

# Habilitar Nginx al inicio
systemctl enable nginx
```

---

## **PASO 12: Configurar Firewall**

```bash
# Permitir SSH, HTTP y HTTPS
ufw allow OpenSSH
ufw allow 'Nginx Full'

# Habilitar firewall
ufw enable

# Verificar estado
ufw status
```

---

## **PASO 13: Verificar que Todo Funciona**

```bash
# Ver estado de PM2
pm2 status

# Ver logs de la aplicación
pm2 logs courtflow --lines 50

# Ver estado de servicios
systemctl status postgresql
systemctl status nginx

# Probar conexión a base de datos
psql -U courtflow -d courtflow -c "SELECT COUNT(*) FROM users;"
```

**Acceder desde navegador:**
- `http://tu_ip_servidor`

---

## **📝 Comandos de Mantenimiento**

### PM2
```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs courtflow

# Reiniciar aplicación
pm2 restart courtflow

# Detener aplicación
pm2 stop courtflow

# Monitor en tiempo real
pm2 monit
```

### Nginx
```bash
# Reiniciar Nginx
systemctl restart nginx

# Recargar configuración (sin downtime)
systemctl reload nginx

# Ver estado
systemctl status nginx

# Verificar configuración
nginx -t

# Ver logs
tail -f /var/log/nginx/courtflow-error.log
tail -f /var/log/nginx/courtflow-access.log
```

### PostgreSQL
```bash
# Reiniciar PostgreSQL
systemctl restart postgresql

# Conectar a base de datos
psql -U courtflow -d courtflow

# Backup de base de datos
pg_dump -U courtflow courtflow > /root/backup_courtflow_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
psql -U courtflow courtflow < backup_courtflow_20241021.sql
```

### Actualizar Código
```bash
cd /var/www/courtflow

# Descargar últimos cambios
git pull

# Instalar nuevas dependencias (si las hay)
npm install

# Reconstruir frontend
npm run build

# Reiniciar aplicación
pm2 restart courtflow

# Ver logs
pm2 logs courtflow
```

---

## **🔧 Script de Deployment Automático**

Crear script para futuras actualizaciones:

```bash
nano /var/www/deploy.sh
```

Pegar:

```bash
#!/bin/bash
echo "🚀 Iniciando deployment de CourtFlow..."

cd /var/www/courtflow

echo "📥 Descargando últimos cambios..."
git pull

echo "📦 Instalando dependencias..."
npm install

echo "🏗️ Construyendo frontend..."
npm run build

echo "🔄 Reiniciando aplicación..."
pm2 restart courtflow

echo "✅ Deployment completado!"
echo "📊 Estado de la aplicación:"
pm2 status

echo ""
echo "📝 Últimos logs:"
pm2 logs courtflow --lines 20 --nostream
```

```bash
# Hacer ejecutable
chmod +x /var/www/deploy.sh

# Usar en el futuro:
/var/www/deploy.sh
```

---

## **✅ Checklist de Deployment**

- [ ] Servidor Debian 12 actualizado
- [ ] Node.js 20 instalado
- [ ] PostgreSQL 15 instalado y configurado
- [ ] Usuario y base de datos creados
- [ ] Base de datos migrada desde Neon
- [ ] Proyecto clonado desde GitHub
- [ ] Variables de entorno configuradas (`.env`)
- [ ] Dependencias instaladas (`npm install`)
- [ ] Frontend construido (`npm run build`)
- [ ] PM2 instalado y aplicación corriendo
- [ ] PM2 configurado para auto-inicio (`pm2 startup`)
- [ ] Configuración PM2 guardada (`pm2 save`)
- [ ] Nginx instalado y configurado
- [ ] Sitio Nginx activado
- [ ] Firewall configurado y activo
- [ ] Aplicación accesible desde navegador
- [ ] WebSockets funcionando
- [ ] Sistema de timeout funcionando

---

## **🐛 Solución de Problemas**

### Aplicación no inicia
```bash
# Ver logs detallados
pm2 logs courtflow

# Ver errores
tail -f /var/log/courtflow-error.log

# Reiniciar
pm2 restart courtflow
```

### Error de SSL: "HostnameIP does not match certificate's altnames"

Este error aparece cuando el `DATABASE_URL` tiene parámetros SSL pero la base de datos es local.

```bash
# Editar .env
nano /var/www/courtflow/.env

# Asegurarse que DATABASE_URL sea EXACTAMENTE:
# DATABASE_URL=postgresql://courtflow:CourtFlow2025.@localhost:5432/courtflow
# 
# NO debe tener:
# - ?sslmode=require
# - ?channel_binding=require
# - Ningún parámetro SSL

# Después de editar, reiniciar
pm2 restart courtflow
pm2 logs courtflow
```

### Error de conexión a base de datos
```bash
# Verificar que PostgreSQL está corriendo
systemctl status postgresql

# Probar conexión manual
psql -U courtflow -d courtflow

# Verificar variables de entorno
cat /var/www/courtflow/.env | grep PG
```

### Nginx muestra 502 Bad Gateway
```bash
# Verificar que la aplicación está corriendo
pm2 status

# Verificar que escucha en puerto 3000
ss -tlnp | grep 3000

# Ver logs de Nginx
tail -f /var/log/nginx/courtflow-error.log
```

### PM2 no inicia al reiniciar servidor
```bash
# Reconfigurar startup
pm2 unstartup
pm2 startup systemd

# Ejecutar comando que PM2 muestra
# Guardar configuración
pm2 save
```

---

## **📚 Recursos Adicionales**

- [Documentación PM2](https://pm2.keymetrics.io/)
- [Documentación Nginx](https://nginx.org/en/docs/)
- [Documentación PostgreSQL](https://www.postgresql.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Fecha de creación:** Octubre 2024  
**Versión:** 1.0  
**Proyecto:** CourtFlow - Sistema de Control de Torneos de Pádel
