# Wireframe Funcional - Ticketflow

## 1. Analisis rapido del proyecto actual

El proyecto ya implementa tres perfiles y coincide con tu contexto:

- `user`: crea tickets, ve su estado e historial, califica soporte al cerrar.
- `supervisor`: crea tickets, visualiza tickets del equipo (sus usuarios), comenta y filtra por miembro.
- `support`: recibe todos los tickets, cambia estado/prioridad, administra usuarios/equipos, gestiona inventario y revisa auditoria.

Entidades detectadas:

- Tickets (con comentarios, historial de estado, adjuntos y calificacion de soporte).
- Usuarios y Equipos (1 usuario en 1 equipo, supervisores ligados a equipo).
- Inventario de activo fijo (equipos de computo, PDF de responsiva, mantenimiento).
- Auditoria (historial de cambios exportable).
- Notificaciones.

---

## 2. Mapa de navegacion propuesto (wireframe global)

```text
[Login]
   |
   +--> [Dashboard Usuario]
   |
   +--> [Dashboard Supervisor]
   |
   +--> [Dashboard Soporte]
             |
             +--> Gestion de Tickets
             +--> Historial Global
             +--> Administracion
                     +--> Usuarios
                     +--> Equipos
                     +--> Inventario (Activo fijo)
                     +--> Historial de Cambios (Auditoria)
```

---

## 3. Wireframe - Usuario

```text
+--------------------------------------------------------------------------------+
| HEADER: Mis Tickets | Fecha | [Notificaciones] [Nuevo Ticket]                 |
+--------------------------------------------------------------------------------+
| KPI: Total | Abiertos | En Proceso | Cerrados                                 |
+--------------------------------------------------------------------------------+
| Tabs: [Mis Tickets] [Historial]                          [Exportar Excel]*     |
|--------------------------------------------------------------------------------|
| Filtros: Buscar | Estado | Prioridad | Impide trabajar | Categoria            |
|--------------------------------------------------------------------------------|
| Tabla/Lista de tickets                                                         |
|  ID | Titulo | Categoria | Prioridad | Estado | Fecha | > Detalle             |
+--------------------------------------------------------------------------------+

Modal "Crear Ticket"
- Titulo
- Descripcion
- Categoria
- Prioridad (solo soporte decide, usuario queda en Media)
- Impide trabajar (Si/No)
- Adjuntar imagen
- [Crear]

Modal "Detalle Ticket"
- Datos generales
- Historial de estados
- Comentarios
- Calificacion de soporte (si status = Cerrado y creador = usuario)
```

---

## 4. Wireframe - Supervisor

```text
+--------------------------------------------------------------------------------+
| HEADER: Panel Supervisor | Equipo | Miembros | [Notificaciones] [Nuevo Ticket] |
+--------------------------------------------------------------------------------+
| KPI: Total Equipo | Abiertos | En Proceso | Criticos                          |
+--------------------------------------------------------------------------------+
| Bloque: Miembros del equipo (cards por usuario con total/open)                |
+--------------------------------------------------------------------------------+
| Tabs: [Tickets del Equipo] [Mis Tickets] [Historial]      [Exportar Excel]*   |
|--------------------------------------------------------------------------------|
| Filtros: Buscar | Estado | Prioridad | Impide | Categoria | Usuario            |
|--------------------------------------------------------------------------------|
| Tabla/Lista: ID | Titulo | Solicitante | Prioridad | Estado | Fecha | Detalle   |
+--------------------------------------------------------------------------------+

Detalle del ticket (supervisor)
- Puede comentar
- No cambia estado
- Visualiza historial y adjuntos
```

---

## 5. Wireframe - Soporte (principal)

```text
+--------------------------------------------------------------------------------+
| HEADER: Soporte | [Notificaciones]                                             |
+--------------------------------------------------------------------------------+
| Tabs principales: [Dashboard] [Gestion] [Historial] [Administracion]           |
+--------------------------------------------------------------------------------+

[Dashboard]
- KPIs globales
- Graficas (estado/prioridad/tendencia)
- Tickets recientes

[Gestion / Historial]
- Filtros globales
- Tabla global de tickets
- Modal detalle: cambiar Estado + nota, cambiar Prioridad, comentar

[Administracion] sub-modulos:
  1) Usuarios
  2) Equipos
  3) Inventario
  4) Auditoria
```

### 5.1 Sub-wireframe: Administracion de Usuarios

```text
+---------------------------------------------------------------+
| Toolbar: Buscar | Importar Excel | Exportar Excel | Nuevo User|
+---------------------------------------------------------------+
| Tabla: Nombre | Correo | Rol | Equipo | Activo fijo asignado  |
|        [Editar] [Eliminar]                                    |
+---------------------------------------------------------------+

Modal Usuario:
- Nombre, correo, password
- Rol (user/supervisor/support)
- Equipo
- Equipo de computo asignado (desde inventario)
```

### 5.2 Sub-wireframe: Administracion de Equipos

```text
+---------------------------------------------------------------+
| Toolbar: Buscar equipo/supervisor/miembro | Nuevo Equipo      |
+---------------------------------------------------------------+
| Tabla/cards: Equipo | Supervisores | Miembros | Acciones       |
|                  [Editar equipo] [Eliminar equipo]            |
+---------------------------------------------------------------+

Modal Equipo:
- Nombre
- Supervisores (1 o mas)
- Miembros (usuarios)
```

### 5.3 Sub-wireframe: Inventario de Activo Fijo

```text
+--------------------------------------------------------------------------------+
| Toolbar: Buscar por serie | Exportar Excel | Importar Excel | Agregar Equipo   |
+--------------------------------------------------------------------------------+
| Tabla: Equipo | Pertenece a | Asignado a | Serie | Estado | Tickets | PDF | ...|
|                 [Etiqueta PDF] [Editar] [Eliminar]                            |
+--------------------------------------------------------------------------------+

Modal Inventario:
- Datos de hardware (marca, modelo, serie, SO, RAM, storage, etc.)
- Asignacion (usuario / equipo)
- Estado del activo
- Notas
- Responsiva PDF (subir/ver/quitar)
- Historial de mantenimiento (comentarios)
```

### 5.4 Sub-wireframe: Historial de Cambios (Auditoria)

```text
+---------------------------------------------------------------+
| Header: Historial de Cambios | [Exportar Excel]               |
+---------------------------------------------------------------+
| Card-list:                                                     |
| Fecha | Actor | Accion | Entidad | Resumen | Detalle          |
+---------------------------------------------------------------+
```

---

## 6. Flujo operativo recomendado (end-to-end)

```text
Usuario/Supervisor crea ticket
    -> Soporte recibe en Gestion
    -> Soporte prioriza + cambia estado con nota
    -> Soporte comenta avances
    -> Soporte cierra
    -> Usuario califica soporte
    -> Todo queda en historial (ticket + auditoria)
```

---

## 7. Reglas funcionales clave a mantener

- Soporte administra usuarios, equipos e inventario.
- Usuarios y supervisores pueden crear tickets.
- Supervisor visualiza tickets propios y de su equipo.
- Solo soporte cambia estado/prioridad.
- Todo cambio critico debe generar auditoria.
- Inventario ligado a usuarios/equipos y con responsiva PDF.
