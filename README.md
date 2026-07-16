# WhatsApp Attendance System (Pro Group)

Next.js 14 (App Router) + TypeScript + Tailwind + PostgreSQL + Prisma.

This is the backend/dashboard for a WhatsApp-based attendance system. An external n8n workflow sends HTTP POST requests to this app when employees message "حضور" / "انصراف". This app contains all business logic and is the single source of truth.

## Requirements

- Node.js 18+ (Prisma is pinned to v5 for compatibility).
- Docker + Docker Compose (for PostgreSQL).

## Local development

1) Create env file:

```bash
cp .env.example .env
```

2) Start Postgres:

```bash
docker compose up -d db
```

3) Run migrations + seed:

```bash
npx prisma migrate dev
npx prisma db seed
```

Seed prints:
- Dashboard login: `admin@progroup.eg` / `admin123`
- API token for n8n (copy it when printed)

4) Start the app:

```bash
npm run dev
```

Open http://localhost:3000 (redirects to `/ar` by default).

## i18n (Arabic + English)

- Locale routing: `/ar/...` and `/en/...` (default `/ar`).
- Translation files:
  - `messages/ar.json`
  - `messages/en.json`

To add a new string:
1. Add a key in both JSON files.
2. Use it via `useTranslations('namespace')` and never hardcode UI text.

## n8n integration API

### `POST /api/attendance/check`

Auth: `Authorization: Bearer <token>` (token is stored hashed in `ApiToken`).

Request body example:

```json
{
  "phone": "+201001234567",
  "employee_code_guess": "1032",
  "action": "check_in",
  "timestamp": "2026-07-13T09:03:00+02:00",
  "location": "فرع مدينتي",
  "note": "جه متأخر شوية",
  "raw_message": "حضور فرع مدينتي"
}
```

Response statuses:

```json
{ "status": "success", "employee_name": "...", "message": "..." }
{ "status": "not_found" }
{ "status": "phone_mismatch" }
{ "status": "checkout_not_allowed" }
{ "status": "already_checked_out" }
{ "status": "no_check_in" }
```

### Optional lookup helper

`GET /api/employees/lookup?phone=...`

## Cron (daily marking)

Trigger:

`POST /api/cron/mark-attendance`

Header:

`x-cron-secret: <CRON_SECRET>`

This marks:
- FIELD: check-in without check-out → `INCOMPLETE`
- Working day without record → `ABSENT`

## Docker (full app + DB)

```bash
docker compose up --build
```
