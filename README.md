# Cattle Weighing Management System

Sistema full-stack para digitalizar planillas de pesaje de ganado con separación `Person`/`User`, control por roles, pagos, auditoría y exportes.

## Stack
- Backend: Node.js, Express, PostgreSQL, Prisma, JWT, Zod
- Frontend: React, React Router, Vite, Tailwind CSS
- Exportes: PDFKit, ExcelJS
- Tests: Vitest (backend y frontend)

## Estructura de rutas frontend
- `/dashboard`
- `/planillas`
- `/planillas/new`
- `/planillas/:id`
- `/personas`
- `/usuarios` (solo ADMIN)
- `/settings`

Navegación con layout tipo dashboard:
- sidebar fijo en desktop
- menú hamburguesa en mobile

## Roles y reglas de negocio
### Roles
- `ADMIN`
- `LIQUIDADOR`
- `CLIENT`

### Reglas clave
- `Person` y `User` son entidades separadas.
- Vendedor/comprador de planilla siempre son `Person`.
- `ADMIN` no requiere vinculación a `Person`.
- Solo existe un administrador operativo: la gestión de usuarios no permite crear/promover a `ADMIN`.
- `CLIENT` solo lectura (excepto flujo de vinculación en Settings).

## Módulos
### Dashboard
Resumen operativo por rol.

### Planillas (`/planillas`)
- búsqueda y filtros instantáneos (sin dependencia de botón Aplicar)
- filtros backend-aligned: `q, seller, buyer, sellerPhone, buyerPhone, from, to, paymentStatus, page, pageSize`
- estados `loading/error/empty/data`

### Nueva Planilla (`/planillas/new`)
- selector de vendedor/comprador con apertura inmediata
- lista alfabética completa de personas (hasta 100 por request)
- filtro en tiempo real
- crear persona inline desde selector
- guardado visible y funcional para `ADMIN`/`LIQUIDADOR`

### Detalle de Planilla (`/planillas/:id`)
- métricas completas: total/promedio general, machos, hembras
- desglose por tipo+sexo (`computed.totalsByTypeSex`)
- filas con edición/reordenamiento según permisos backend
- export PDF
- estado de pago + bitácora
- `Especificación` en mayúsculas

### Personas (`/personas`)
- listado paginado + búsqueda
- indicador vinculada/no vinculada
- creación de persona
- edición por rol:
  - `ADMIN`: nombre/teléfono/cédula
  - `LIQUIDADOR`: teléfono/cédula (nombre bloqueado)

### Usuarios (`/usuarios`, ADMIN)
- listado y búsqueda de usuarios
- crear `CLIENT`/`LIQUIDADOR`
- activar/desactivar y edición de datos
- alias de liquidador
- vinculación manual `User ↔ Person`
- gestión de solicitudes de vinculación
- reset de contraseña:
  - generar link/token de reset
  - cambio manual admin

### Settings (`/settings`)
- visible para todos
- perfil de cuenta
- `ADMIN`: precio global por cabeza
- `CLIENT`: flujo de vinculación y estado de solicitud

## Vinculación de cuenta (CLIENT)
Flujo movido a Settings.

Regla one-time de por vida:
- solo se puede enviar una solicitud de vinculación por cuenta
- al intentar una segunda solicitud se responde con:

"Tu solicitud de vinculación ya fue utilizada. Si necesitas hacer una corrección, por favor comunícate con atención al cliente o con el administrador."

## Reset de contraseña: decisión implementada
Si no existe infraestructura real de correo configurada, no se simula envío.

Se implementa:
- generación real de token/link por admin (`POST /users/:userId/password-reset-link`)
- consumo de token (`POST /auth/reset-password`)
- cambio manual admin (`PATCH /users/:userId/password`)

Tradeoff:
- sin infraestructura de email, el link/token se entrega por canal administrativo interno.

## Backend (rutas principales)
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/register-managed` (ADMIN)
- `POST /auth/reset-password`
- `GET /people`
- `GET /people/search`
- `POST /people`
- `PATCH /people/:personId`
- `GET /sheets`
- `POST /sheets`
- `GET /sheets/:id`
- `POST /sheets/:id/rows*`
- `POST /sheets/:id/payment-status`
- `GET /users` (ADMIN)
- `PATCH /users/:userId` (ADMIN)
- `PATCH /users/:userId/person-link` (ADMIN)
- `POST /users/:userId/password-reset-link` (ADMIN)
- `PATCH /users/:userId/password` (ADMIN)
- `GET /settings`
- `PATCH /settings` (ADMIN)
- `GET /link-requests/me` (CLIENT)
- `POST /link-requests` (CLIENT)
- `GET /link-requests` (ADMIN)
- `PATCH /link-requests/:requestId/review` (ADMIN)

## Variables de entorno
```env
PORT=3000
JWT_SECRET=supersecretkey
PASSWORD_RESET_SECRET=optional-reset-secret
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cattle_weighing_db"
CORS_ORIGIN="http://localhost:5173"
FRONTEND_BASE_URL="http://localhost:5173"
```

## Instalación y ejecución
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

## Seed/demo
`prisma/seed.js` incluye:
- admin/liquidador/cliente demo
- personas demo
- planillas demo + filas
- estados de pago
- solicitudes de vinculación

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

## Estado
Versión reorganizada por producto con React Router, módulos separados, reglas de rol reforzadas y adaptación frontend↔backend alineada.
