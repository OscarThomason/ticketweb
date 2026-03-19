# Ticketflow Backend

Backend API para escalar Ticketflow a entorno real con:
- Express
- Prisma + PostgreSQL
- JWT auth
- Modulos: auth, usuarios, equipos, tickets, inventario, auditoria

## 1) Instalacion local

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

API base: `http://localhost:4000/api`

Healthcheck:

```bash
GET /api/health
GET /api/health/db
```

## 2) Credenciales de seed

- Support: `support@ticketflow.local` / `Support1234!`
- Supervisor: `supervisor@ticketflow.local` / `Supervisor1234!`
- Usuario: `usuario@ticketflow.local` / `Usuario1234!`

## 3) Endpoints principales

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/users` (support)
- `GET/POST/PUT/DELETE /api/teams`
- `GET/POST/PUT /api/tickets`
- `POST /api/tickets/:id/comments`
- `POST /api/tickets/:id/status`
- `GET/POST/PUT/DELETE /api/inventory`
- `PUT /api/inventory/:id/responsiva` (PDF base64, max 5MB)
- `GET /api/audit` (support)

## 4) Reglas de negocio ya aplicadas

- Usuarios `support` no pueden pertenecer a equipos.
- Supervisores deben tener rol `supervisor`.
- Un usuario solo puede pertenecer a un equipo.
- Un supervisor solo puede estar en un equipo.
- Puede haber mas de 1 supervisor por equipo.
- Responsiva solo acepta PDF <= 5MB.

## 5) Despliegue rapido en VPS (Docker)

En tu VPS:

```bash
cd backend
cp .env.example .env
docker compose up -d --build
```

Luego ejecuta seed:

```bash
docker exec -it ticketflow-api npm run prisma:seed
```

## 6) Produccion recomendada

- Usa un `JWT_SECRET` largo y privado.
- Restringe CORS al dominio real.
- Coloca Nginx delante del backend con HTTPS (Let's Encrypt).
- Haz backups automaticos de PostgreSQL.
- Agrega logs centralizados y monitoreo (Uptime + errores).
