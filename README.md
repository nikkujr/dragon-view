# Dragon View

Dragon View is a client-server farm management system for dragon-fruit
inventory, FIFO sales, quality grading, planting guidance, and descriptive
analytics.

## Projects

- `frontend` — Angular 22 and TypeScript
- `backend` — Node.js, Express, TypeScript, simple CQRS, and vertical slices
- `backend/database` — MySQL schema and seed data

The frontend and backend are independently deployable and communicate only
through the documented HTTP API.

## Local configuration

Copy each `.env.example` to `.env`, configure MySQL, then install dependencies
from the repository root.

```text
npm install
npm run db:setup
npm run dev:backend
npm run dev:frontend
```

The Angular development server proxies `/api` requests to
`http://localhost:3000`. Sign in with either seeded account:

- `owner@dragonview.ph`
- `staff@dragonview.ph`

Both use the development-only password `password`.

## Database lifecycle

Migrations are applied in filename order and recorded in the
`schema_migrations` table.

```text
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:down
npm run db:seed
```

Development seeds are repeatable and may be run again without duplicating
records. The seeded owner and staff accounts use the development-only password
`password`.
