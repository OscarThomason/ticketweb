# Ticketflow

Proyecto frontend en React + Vite.

## Backend para escalamiento real

Ya se agrego un backend completo en:

`backend/`

Incluye:

- API REST (Express)
- Autenticacion JWT
- PostgreSQL con Prisma
- Modulos de usuarios, equipos, tickets, inventario y auditoria
- Guia de despliegue a VPS

Revisa:

`backend/README.md`

## Conexion frontend -> backend

1. Crea `.env` en raiz con:
   `VITE_API_URL=http://localhost:4000`
2. Inicia backend.
3. Inicia frontend.

Si `VITE_API_URL` no existe, el frontend sigue en modo local (localStorage).
