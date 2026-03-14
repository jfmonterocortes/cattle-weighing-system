# Client

## Overview
This frontend is the React/Vite application for BASCULA LA ESPERANZA. It provides the role-based UI for login, weighing sheet operations, people management, user administration, account-link requests, and exports.

## Development
Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

The client uses `VITE_API_BASE_URL` when provided. If it is not set, the API base URL defaults to `http://localhost:3000`.

## Verification
Run the frontend checks from this directory:

```bash
npm test
npm run lint
npm run build
```

## Key UI Areas
- `/login`: authentication and role-based redirect
- `/dashboard`: summary metrics and operational snapshots
- `/planillas`: sheet listing and filtering
- `/planillas/new`: create weighing sheets
- `/planillas/:id`: edit rows, reorder cattle, export PDF, and update payment status
- `/personas`: operator-facing people directory
- `/usuarios`: admin-managed user creation, linking, password reset, and link-request review
- `/settings`: account settings, client linking workflow, and system defaults

## Contract Notes
- Client account linking uses `/people/search`, not the full `/people` directory.
- Client-facing person search only depends on the minimal linking payload returned by the backend.
- The frontend test suite includes coverage for login, person autocomplete, admin user management, and sheet detail behavior.
