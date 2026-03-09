# BASCULA LA ESPERANZA

## Overview
BASCULA LA ESPERANZA is a full-stack cattle weighing management platform for digitizing operational weighing sheets, payments, and account access control. It separates operational identities (`Person`) from authentication identities (`User`) to support real-world workflows where people may exist in transactions before they have an account. The system is designed for role-based operations with production-oriented validation, auditing, and export features.

## Problem It Solves
Many livestock weighing operations still rely on paper sheets and manual reconciliation across sellers, buyers, liquidators, and payment records. This project centralizes those workflows into a role-secure web system that supports searchable historical records, controlled editing windows, account-to-person linking approval, and business-ready PDF/Excel outputs.

## Architecture
The application follows a standard web architecture with a clear frontend/backend boundary:

- React client (Vite + React Router) for role-based UI flows and operational forms
- Express API for authentication, authorization, validation, and business rules
- PostgreSQL database accessed through Prisma ORM for relational domain persistence

Core domain entities include `User`, `Person`, `WeighingSheet`, `CattleRow`, `PersonAccountLinkRequest`, `PaymentLog`, and `SystemSetting`.

## Tech Stack
- Backend: Node.js, Express, Prisma, PostgreSQL, JWT, Zod
- Frontend: React, React Router, Vite, Tailwind CSS
- Exports: PDFKit, ExcelJS
- Testing: Vitest, Supertest, Testing Library

## Key Features
- Role model with `ADMIN`, `LIQUIDADOR`, and `CLIENT`
- Strict `Person` vs `User` separation with admin-approved account linking
- Route-based frontend structure:
  - `/dashboard`
  - `/planillas`
  - `/planillas/new`
  - `/planillas/:id`
  - `/personas`
  - `/usuarios` (admin only)
  - `/settings`
- Instant sheet filtering with backend-aligned query parameters
- Operational planilla workflow with row editing, reordering, totals, and grouped metrics
- Payment lifecycle with paid/unpaid state and payment logs
- Export capabilities (PDF and Excel) with authorization checks
- Admin user management for `CLIENT`/`LIQUIDADOR`, including manual linking and password reset flows

## Project Structure
- [`/src`](./src): Express server, routes, services, validators, middlewares, and integration/unit tests
- [`/prisma`](./prisma): Prisma schema, migrations, and seed data
- [`/client/src`](./client/src): React application pages, shared components, API client, and frontend tests

## How to Run
1. Install dependencies
```bash
npm install
cd client && npm install
```

2. Configure environment variables in `.env`
```env
PORT=3000
JWT_SECRET=supersecretkey
PASSWORD_RESET_SECRET=optional-reset-secret
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cattle_weighing_db"
CORS_ORIGIN="http://localhost:5173"
FRONTEND_BASE_URL="http://localhost:5173"
```

3. Generate Prisma client, run migrations, and seed demo data
```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

4. Start backend
```bash
npm run dev
```

5. Start frontend
```bash
cd client
npm run dev
```

## Why This Project Stands Out
- It models a real operational domain with non-trivial identity rules (`Person` vs `User`) rather than a simplified CRUD-only approach.
- It enforces business constraints in both API and UI layers, including role-specific editing permissions and linking approval workflows.
- It includes practical production concerns: validation, rate limiting, audit logging, exports, and automated tests for critical flows.
- The codebase is organized for maintainability, with separated modules for people, users, sheets, linking, settings, and exports.

## Demo Seed Accounts
- `admin@bascula.com / Admin123!`
- `liquidador@bascula.com / Liquidador123!`
- `cliente@bascula.com / Cliente123!`
