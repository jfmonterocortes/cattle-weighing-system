# Cattle Weighing Management System

Sistema web full-stack para digitalizar planillas de pesaje de ganado, con control por roles, pagos, exportes y trazabilidad.

## Stack
- Backend: Node.js, Express, PostgreSQL, Prisma, JWT, Zod
- Frontend: React + Vite, Tailwind CSS
- Exportes: PDFKit, ExcelJS
- Tests: Vitest (backend y frontend)

## Features principales
- Roles: `ADMIN`, `LIQUIDADOR`, `CLIENT`
- Separacion `Person` vs `User`
- Vinculacion de cuenta a persona existente con aprobacion administrativa
- Vinculacion manual admin `User ? Person`
- Planillas con numeracion visible `YYYY-###`
- Captura de filas de reses con orden, reordenamiento y renumeracion
- Reglas de edicion:
  - `ADMIN`: edicion total
  - `LIQUIDADOR`: edicion solo durante los primeros 10 minutos (si fue creador)
  - `CLIENT`: solo lectura de planillas donde su persona participa
- Calculos:
  - total/promedio general
  - total/promedio machos y hembras
  - agrupacion por tipo+sexo
  - valor total = precioPorCabeza * cantidad
- Pagos:
  - marcar pagada / pendiente
  - bitacora de pagos
  - filtros de pago (pagadas, pendientes, pagadas hoy/ayer)
- Auditoria de eventos clave (planilla, filas, pagos, cambios criticos)
- Exportes:
  - PDF por planilla
  - Excel consolidado (admin)

## Persona vs Usuario
- `Person`: entidad operativa para planillas (vendedor/comprador). Puede existir sin cuenta.
- `User`: cuenta autenticable con rol (`ADMIN`, `LIQUIDADOR`, `CLIENT`).
- Una cuenta puede solicitar vinculacion a una persona existente.
- El administrador puede aprobar/rechazar solicitudes y tambien vincular manualmente.
- Crear planillas siempre requiere `Person`, no necesariamente `User`.

## Flujos operativos clave
- CLIENT:
  - Busca persona por nombre/telefono/cedula
  - Crea solicitud de vinculacion
- ADMIN:
  - Crea personas
  - Crea usuarios cliente (`/auth/register-managed`)
  - Lista/revisa solicitudes (`/link-requests`)
  - Vincula manualmente usuario-persona (`/users/:userId/person-link`)
- LIQUIDADOR:
  - Crea personas operativas para planilla
  - Crea planillas y selecciona vendedor/comprador

## Arquitectura resumida
### Backend
- `src/routes/*`: rutas por modulo (`auth`, `people`, `sheets`, `link-requests`, `users`, `settings`, `exports`)
- `src/controllers/*`: adaptadores HTTP
- `src/services/*`: logica de negocio
- `src/validators/*`: contratos de entrada con Zod
- `src/middlewares/*`: auth JWT, roles, validacion, rate-limit, manejo de errores

### Frontend
- Login compatible con backend actual (`POST /auth/login`, respuesta con `token`)
- Dashboard por rol con:
  - busqueda/filtros de planillas
  - creacion de persona
  - creacion de planilla
  - solicitud de vinculacion (cliente)
  - gestion admin de usuarios cliente y vinculaciones
- Detalle de planilla con edicion inline de filas, drag/drop y estado de pago
- Autocomplete con portal para evitar problemas de z-index/overlays

## Modelo de datos (Prisma)
Entidades principales:
- `Person`
- `User`
- `PersonAccountLinkRequest`
- `WeighingSheet`
- `CattleRow`
- `PaymentLog`
- `SheetAuditLog`
- `SystemSetting`

## Variables de entorno
Crear `.env` en raiz:

```env
PORT=3000
JWT_SECRET=supersecretkey
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cattle_weighing_db"
CORS_ORIGIN="http://localhost:5173"
```

## Instalacion y ejecucion
### 1) Dependencias
```bash
npm install
cd client && npm install
```

### 2) Base de datos
```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

### 3) Backend
```bash
npm run dev
```

### 4) Frontend
```bash
cd client
npm run dev
```

## Migraciones
Incluidas:
- `prisma/migrations/20260306120000_rebuild_domain/migration.sql`
- `prisma/migrations/20260307005746_rebuild_domain/migration.sql`

## Seed/demo
Seed incluido en `prisma/seed.js` con:
- Admin demo
- Liquidador demo
- Cliente demo
- Personas demo
- Planillas demo
- Filas de res demo
- Estados de pago demo
- Solicitudes de vinculacion demo

Credenciales demo:
- `admin@bascula.com / Admin123!`
- `liquidador@bascula.com / Liquidador123!`
- `cliente@bascula.com / Cliente123!`

## Testing
### Backend
```bash
npm test
```

### Frontend
```bash
cd client
npm test
```

Cobertura actual relevante:
- middleware auth JWT
- validaciones de planilla/filas
- calculos de planilla
- flujo critico integrado (link request, revision admin, create person/planilla, create client user)
- contrato de login frontend
- flujo UI cliente para solicitud de vinculacion

## Roadmap sugerido
- i18n completo (estructura inicial ya preparada)
- CI con pipeline de tests y lint
- reportes avanzados por rango y cliente
- firma digital y trazabilidad avanzada
- notificaciones de solicitud de vinculacion
