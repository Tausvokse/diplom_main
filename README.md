# Dormitory Management Monorepo

Система управління гуртожитками з кабінетами студента, адмін‑панеллю, розподілом місць, скаргами/ремонтами, платежами та повідомленнями.

## Стек

- **Client:** React + Vite + Tailwind (`src/client`)
- **Server:** Express + Socket.io (`src/server`)
- **DB:** PostgreSQL + Prisma (`prisma/schema.prisma`)

## Швидкий старт

1. Встановіть залежності:
   ```bash
   npm install
   ```
2. Створіть `.env` (див. змінні нижче).
3. Підготуйте Prisma:
   ```bash
   npm run prisma:generate
   npm run prisma:push
   ```
4. Запуск у dev‑режимі:
   ```bash
   npm run dev
   ```

## Змінні середовища

**Server:**

- `DATABASE_URL` — PostgreSQL connection string (**обов’язково**)
- `DIRECT_URL` — direct connection string (для Prisma, опціонально)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — секрети JWT
- `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` — тривалість токенів (опціонально)
- `DIIA_WEBHOOK_SECRET` — секрет для Diia‑інтеграції
- `PORT` — порт сервера (за замовчуванням `4000`)
- `FRONTEND_URL` — URL фронтенду
- `API_URL` — базовий URL API (опціонально)
- `CORS_ORIGINS` — дозволені домени через кому

**Client:**

- `VITE_API_URL` — базовий URL API (за замовчуванням `http://localhost:4000/api`)
- `VITE_SOCKET_URL` — URL Socket.io (за замовчуванням `http://localhost:4000`)

## Скрипти

- `npm run dev` — Vite + server watch
- `npm run dev:client` — лише клієнт
- `npm run dev:server` — лише сервер
- `npm run build` — збірка клієнта й сервера
- `npm run start` — запуск зібраного сервера
- `npm run prisma:generate` / `npm run prisma:push` / `npm run prisma:migrate:deploy`
- `npm run lint`
- `npm run test`

## Структура проєкту

```
src/
  client/   # React UI
  server/   # Express API + Socket.io
prisma/     # Prisma schema
uploads/    # Файли користувачів (ігнорується git)
```
