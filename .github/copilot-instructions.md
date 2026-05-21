# Copilot instructions

## Build, run, test, lint
- `npm run dev` (Vite client + tsx watch server)
- `npm run dev:client` (Vite only)
- `npm run dev:server` (server only, entry: `src/server/server.ts`)
- `npm run build` / `npm run build:client` / `npm run build:server`
- `npm run start` (runs `dist/server/server.js`)
- Prisma: `npm run prisma:generate`, `npm run prisma:push`, `npm run prisma:migrate:deploy`
- Tests: no test script is defined in `package.json`
- Lint: no lint script is defined in `package.json`

## High-level architecture
- Monorepo layout: React client in `src/client`, Express API in `src/server`, Prisma/Postgres schema in `prisma/schema.prisma`.
- Server entrypoint is `src/server/server.ts` (HTTP server + Socket.io). Express app lives in `src/server/app.ts` with security middleware, `/api` routes, and a global error handler.
- Routes map to controllers and services (`src/server/routes` -> `controllers` -> `services`), with Prisma as the persistence layer.
- Allocation pipeline lives in `src/server/services/allocation.service.ts` and uses AHP + K-means implementations in `src/server/utils/algorithms`.
- Client uses React Router with role-gated routes (`ProtectedRoute`), Zustand for auth state, and an Axios API client with refresh-token flow.

## Key conventions
- Auth: JWT access token is sent as `Authorization: Bearer <token>`; refresh via `POST /api/auth/refresh`. Client tokens live in Zustand persisted storage (`dormitory-auth-storage`).
- Role-based access: use `authenticate` first, then `requireRole` middleware.
- API base URL defaults to `http://localhost:4000/api` via `VITE_API_URL`; Socket.io client uses `VITE_SOCKET_URL` (default `http://localhost:4000`).
- File uploads use `multer` and are stored under `uploads/`; server stores paths as `/uploads/<filename>`.
- Allocation-related student vectors are stored as JSON strings in `studentProfile.clusteringVector` and parsed before use.
