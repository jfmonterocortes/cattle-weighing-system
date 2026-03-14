# BASCULA LA ESPERANZA

## Overview
BASCULA LA ESPERANZA is a full-stack cattle weighing system for operational sheet capture, payment tracking, and role-based access control. The backend models real-world participants as `Person` records and authentication accounts as `User` records so weighing activity can exist before an account is created or linked.

## Core Roles
- `ADMIN`: manages users, reviews account-link requests, configures defaults, and can operate sheets.
- `LIQUIDADOR`: creates and edits operational weighing sheets inside the allowed edit window.
- `CLIENT`: can register publicly, view only their permitted sheet history, and request one-time account linking.

## Security and Contract Notes
- Public `POST /auth/register` creates `CLIENT` accounts only.
- Operator account creation stays on the admin-managed flow: `POST /auth/register-managed`.
- `GET /people` is operator-facing and not available to clients.
- `GET /people/search` is role-aware:
  - operators receive richer linked-account metadata for operational workflows
  - clients receive only the minimum person payload required for account-linking

## Consistency Rules
- Sheet create, update, and row mutations commit their primary business writes transactionally.
- Payment status changes commit the sheet update and payment log in the same transaction.
- Link review commits request review and user-link updates in the same transaction.
- Sheet audit logging is best-effort and must not turn a committed business mutation into a 500.

## Repository Layout
- [`/src`](./src): Express app, services, routes, middleware, validators, and backend tests
- [`/prisma`](./prisma): Prisma schema, migrations, and seed script
- [`/scripts`](./scripts): automated backend bootstrap helpers
- [`/client`](./client): React/Vite frontend, frontend tests, and build tooling

## Prerequisites
- Node.js 20+
- npm 11+
- PostgreSQL 15+ accessible from `DATABASE_URL` and `TEST_DATABASE_URL`

## Environment
Copy [`/.env.example`](./.env.example) to `.env` and set the required values:

```env
PORT=3000
JWT_SECRET=supersecretkey
PASSWORD_RESET_SECRET=optional-reset-secret
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cattle_weighing_db
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cattle_weighing_test_db
CORS_ORIGIN=http://localhost:5173
FRONTEND_BASE_URL=http://localhost:5173
```

The backend now validates required environment variables at startup and fails fast with a clear message if they are missing.

## Clean Clone Setup
1. Install backend dependencies:
```bash
npm install
```

2. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

3. Apply backend migrations to the development database:
```bash
npm run prisma:migrate
```

4. Seed development data:
```bash
npm run seed
```

`npm install` runs Prisma client generation automatically through `postinstall`, so a clean clone does not need a separate manual `prisma generate` step unless you want to force one with `npm run prisma:generate`.

## Running Locally
Backend:
```bash
npm run dev
```

Frontend:
```bash
cd client
npm run dev
```

The frontend defaults to `http://localhost:3000` for the API. To point it elsewhere, set `VITE_API_BASE_URL` in the frontend environment.

## Verification
Backend:
```bash
npm test
```

The backend test flow is isolated from development data and automatically:
- generates the Prisma client
- creates the test database if it does not exist
- resets the test database with migrations
- runs the seed/bootstrap data
- executes the backend Vitest suite

To run a subset of backend tests with the same isolated flow:
```bash
npm test -- src/tests/mutation-consistency.integration.test.js
```

Frontend:
```bash
cd client
npm test
npm run lint
npm run build
```

## Seed Behavior
- `npm run seed` is intended for the development database after migrations are applied.
- The seed is rerunnable: it upserts demo users, people, and sheets, then rebuilds the demo cattle rows and payment log state.
- The automated backend test flow resets the test database before seeding so tests never depend on manually prepared local state.

## Demo Accounts
- `admin@bascula.com / Admin123!`
- `liquidador@bascula.com / Liquidador123!`
- `cliente@bascula.com / Cliente123!`
