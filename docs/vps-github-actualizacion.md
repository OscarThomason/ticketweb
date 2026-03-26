# Actualizacion En VPS Con GitHub

Esta guia aplica para subir cambios del proyecto (frontend + backend), incluyendo configuracion para usar backend real en VPS.

## 1) En tu maquina local (subir cambios a GitHub)

```bash
git add .
git commit -m "feat: splash first load + deploy backend vps cors"
git push origin main
```

Si usas otra rama, reemplaza `main` por tu rama.

## 2) Variables de entorno necesarias

### Frontend (`.env` en raiz)

Ejemplo:

```bash
VITE_API_URL=https://api.tudominio.com
```

Nota: el frontend llama rutas `/api/*`.

### Backend (`backend/.env`)

Ejemplo:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://ticket_user:ticket_pass@127.0.0.1:5432/ticketflow?schema=public
JWT_SECRET=pon-un-secreto-largo
JWT_EXPIRES_IN=7d
UPLOAD_DIR=./uploads
CORS_ALLOWED_ORIGINS=https://app.tudominio.com
```

Para multiples dominios:

```bash
CORS_ALLOWED_ORIGINS=https://app.tudominio.com,https://admin.tudominio.com
```

## 3) Actualizar en VPS (sin Docker, con PM2 o systemd)

```bash
cd /ruta/de/tu/proyecto
git pull origin main

# Frontend
npm ci
npm run build

# Backend
cd backend
npm ci
npm run prisma:generate
npm run prisma:deploy
```

Reinicia backend:

- PM2:
```bash
pm2 restart ticketflow-api
pm2 save
```

- systemd:
```bash
sudo systemctl restart ticketflow-api
sudo systemctl status ticketflow-api --no-pager
```

Si el frontend lo sirves con Nginx desde `dist/`, actualiza los archivos publicados y recarga Nginx:

```bash
sudo systemctl reload nginx
```

## 4) Actualizar en VPS (con Docker Compose backend)

```bash
cd /ruta/de/tu/proyecto/backend
git pull origin main
docker compose up -d --build
docker exec -it ticketflow-api npm run prisma:deploy
```

Si necesitas datos de prueba:

```bash
docker exec -it ticketflow-api npm run prisma:seed
```

## 5) Verificacion rapida post-despliegue

Backend:

```bash
curl https://api.tudominio.com/api/health
curl https://api.tudominio.com/api/health/db
```

Debe responder `ok: true`.

## 6) Rollback rapido (si algo falla)

```bash
git log --oneline -n 5
git checkout <commit_anterior_estable>
```

Luego repite build/restart del backend y frontend.
