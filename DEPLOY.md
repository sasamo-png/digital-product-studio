# Despliegue — Digital Product Studio

App **Next.js + Prisma (PostgreSQL)** servida en el **puerto 3000**.

> ⚠️ **Estado actual de tu VPS (5.189.172.97):** el puerto **3000 ya está ocupado
> por _Easypanel_**. Tienes dos caminos: (A) desplegar **a través de Easypanel**
> (recomendado, ya está instalado) o (B) despliegue **manual** en **otro puerto**
> (p. ej. 3001) detrás de Nginx, sin tocar Easypanel.
>
> 🔐 **Secretos:** la `DATABASE_URL` no se commitea nunca. Se introduce a mano
> en el servidor (archivo `.env` o panel de Easypanel).
>
> 🔑 **API key de OpenAI:** la app es **BYOK** — cada usuario aporta su propia key
> desde `/settings` (se guarda solo en su navegador). El servidor **no** necesita
> ninguna `OPENAI_API_KEY`; no la configures en producción.

## Variables de entorno (las creas tú en el servidor)

| Variable | Obligatoria | Ejemplo / valor |
|----------|:--:|------|
| `DATABASE_URL` | sí | `postgresql://dps_user:TU_PASS@localhost:5432/digital_product_studio?schema=public` |
| `OPENAI_MODEL` | no | `gpt-4o-mini` (por defecto si se omite) |
| `NODE_ENV` | no | `production` |

---

## Opción A — Easypanel (recomendada, ya instalado)

Easypanel gestiona contenedores Docker, base de datos y variables de entorno
desde su UI (https://5.189.172.97:3000). Los secretos quedan en el servidor.

1. **Crea un servicio PostgreSQL** en Easypanel:
   - Add Service → Postgres. Anota host interno, usuario, contraseña y nombre de
     la BD (Easypanel te da una URL de conexión interna).

2. **Crea la App** desde el repositorio:
   - Add Service → App → Source: **GitHub** → `sasamo-png/digital-product-studio`,
     rama `main`.
   - Build: **Dockerfile** (el repo ya incluye uno) o Nixpacks (autodetección).

3. **Variables de entorno** de la App (pestaña Environment):
   ```
   DATABASE_URL=postgresql://<usuario>:<password>@<host-interno-postgres>:5432/<db>?schema=public
   OPENAI_MODEL=gpt-4o-mini
   ```
   > No configures `OPENAI_API_KEY`: la app es BYOK y el servidor no la usa.

4. **Puerto / Dominio:**
   - La app expone el **3000** dentro del contenedor. En Easypanel mapea ese
     puerto a un dominio (Domains) y deja que su proxy gestione el HTTPS.
   - No necesitas abrir el 3000 público en el firewall: Easypanel pone su proxy
     (80/443) delante.

5. **Migraciones:** el contenedor ejecuta `prisma migrate deploy` automáticamente
   al arrancar (ver `CMD` del Dockerfile). No hay que hacer nada manual.

6. **Deploy:** pulsa **Deploy**. Easypanel clona, construye con el Dockerfile,
   inyecta las variables y levanta el contenedor.

---

## Opción B — Manual (Node + PM2 + Nginx), puerto 3001

Si prefieres no usar Easypanel. Usamos **3001** para no chocar con Easypanel (3000).
> Si en el `ecosystem.config.js` / `package.json` quieres 3001, cambia `-p 3000`
> por `-p 3001` y el `Nginx` apunta a 3001.

### B.1 Requisitos en el VPS (una vez)

```bash
# Node.js LTS 20 (vía nodesource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL, git y PM2
sudo apt-get install -y postgresql git
sudo npm install -g pm2
```

### B.2 Crear base de datos y usuario

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE digital_product_studio;
CREATE USER dps_user WITH ENCRYPTED PASSWORD 'CAMBIA_ESTA_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE digital_product_studio TO dps_user;
-- En PostgreSQL 15+ además hace falta sobre el schema public:
\c digital_product_studio
GRANT ALL ON SCHEMA public TO dps_user;
SQL
```

### B.3 Clonar y configurar

```bash
cd /var/www            # o donde prefieras
git clone https://github.com/sasamo-png/digital-product-studio.git
cd digital-product-studio

# Crear el .env de producción A MANO (NUNCA se commitea):
cat > .env <<'ENV'
DATABASE_URL="postgresql://dps_user:CAMBIA_ESTA_PASSWORD@localhost:5432/digital_product_studio?schema=public"
OPENAI_MODEL="gpt-4o-mini"
NODE_ENV="production"
ENV
# Nota: no se pone OPENAI_API_KEY — la app es BYOK (cada usuario aporta la suya).
chmod 600 .env
```

### B.4 Instalar, migrar y compilar

```bash
npm ci
npx prisma migrate deploy     # aplica prisma/migrations a la BD
npm run build
```

### B.5 Arrancar con PM2 (reinicio automático)

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup          # ejecuta el comando que imprime, para arranque al bootear
pm2 status
```

### B.6 Reverse proxy con Nginx (opcional, para dominio + HTTPS)

`/etc/nginx/sites-available/digital-product-studio`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;   # (o 3001 si lo cambiaste)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/digital-product-studio /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
# HTTPS gratis con certbot:
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### Alternativa a PM2: servicio systemd

`/etc/systemd/system/digital-product-studio.service`:

```ini
[Unit]
Description=Digital Product Studio (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/var/www/digital-product-studio
EnvironmentFile=/var/www/digital-product-studio/.env
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now digital-product-studio
sudo systemctl status digital-product-studio
```

---

## Firewall

- **Con Easypanel (Opción A):** su proxy sirve en 80/443; no expongas el 3000.
- **Opción manual sin Nginx:** abre el 3000 (o 3001):
  ```bash
  sudo ufw allow 3000/tcp
  ```
  Además, en el **panel del proveedor** (firewall de red del VPS) habilita el
  puerto si aplica. Recomendado: exponer solo 80/443 y dejar el 3000 interno.

## Actualizar el despliegue

```bash
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 reload digital-product-studio     # o: docker redeploy en Easypanel
```

## Seguridad post-despliegue

- **Rota la contraseña root del VPS** (se compartió en texto plano) y configura
  **claves SSH** en vez de contraseña.
- Mantén `.env` con permisos `600` y fuera de git (ya está en `.gitignore`).
- BYOK: la API key de OpenAI la aporta cada usuario desde `/settings` y vive solo
  en su navegador; el servidor no la persiste ni la necesita.
