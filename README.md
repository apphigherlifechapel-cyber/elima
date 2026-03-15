# Elima Store - Hybrid Retail + Wholesale Ecommerce

Production-ready hybrid B2C + B2B commerce platform for retail and wholesale operations.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL
- NextAuth (Auth.js credentials provider)
- Paystack payment initialization + server-side verification + webhook verification
- Optional SMTP receipt emails

## Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)
- npm

## Environment Variables

Use `.env` in the project root.

Required:

```dotenv
DATABASE_URL="postgresql://elima:elima@127.0.0.1:5434/elima_store?schema=public"
NEXTAUTH_SECRET="replace-with-random-long-secret"
NEXTAUTH_URL="http://localhost:3000"
PAYSTACK_SECRET_KEY=""
PAYSTACK_CALLBACK_URL="http://localhost:3000/checkout/success"
```

Optional email receipt settings:

```dotenv
EMAIL_HOST="smtp.mailtrap.io"
EMAIL_PORT="587"
EMAIL_USER=""
EMAIL_PASS=""
EMAIL_FROM="no-reply@elima.com"
```

Webhook signature verification:

```dotenv
PAYSTACK_WEBHOOK_SECRET=""
CRON_SECRET=""
```

Cloudinary (admin uploads):

```dotenv
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

Redis rate limiting (either option):

```dotenv
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
# or
REDIS_URL="redis://localhost:6379"
```

## Local Setup

1. Start database:

```bash
docker start elima-postgres
```

If container does not exist yet:

```bash
docker run --name elima-postgres -e POSTGRES_USER=elima -e POSTGRES_PASSWORD=elima -e POSTGRES_DB=elima_store -p 5434:5432 -d postgres:16
```

2. Install dependencies:

```bash
npm install
```

3. Sync schema and seed:

```bash
npm run prisma:push
npm run seed
```

4. Run app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Seeded Admin Credentials

- Email: `admin@elima.com`
- Password: `Admin123!`

## Staff Role Guidance

- `ADMIN` and `STAFF` can manage fulfillment/inventory operations.
- `ADMIN` retains full platform management responsibilities.
- To create staff users quickly, update a user record in DB role to `STAFF`.

## Useful Commands

```bash
npm run test -- --run
npm run lint
npm run build
npm run prisma:generate
npm run cleanup:observability
npm run readiness:check
```

## Scheduled Maintenance (Observability Retention)

You can enforce observability retention in two ways:

1. Local/worker scheduled command:

```bash
npm run cleanup:observability
# optional custom retention hours
npm run cleanup:observability -- 72
```

2. Authenticated cron endpoint:

`POST /api/admin/observability/cleanup`

Use `Authorization: Bearer <CRON_SECRET>`.

Optional JSON body:

```json
{ "retentionHours": 72 }
```

If `retentionHours` is omitted, the endpoint uses the configured observability retention setting.

## Security and Deployment Checklist

1. Rotate `NEXTAUTH_SECRET` to a strong random secret.
2. Configure `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` in production.
3. Configure Cloudinary credentials for admin media uploads.
4. Configure Redis (`UPSTASH_*` or `REDIS_URL`) for distributed rate limiting.
5. Use managed PostgreSQL and back up regularly.
6. Run schema sync/migrations before deploy (`npm run prisma:push` or migration workflow).
7. Validate webhook endpoint and callback URLs against production domain.
8. Keep admin credentials unique per environment and never use seeded password in production.

## Backup and Recovery Runbook (Practical)

1. Schedule daily Postgres backups (managed DB snapshots or `pg_dump`).
2. Keep at least 7 days of restore points.
3. Test restore monthly to a staging environment.
4. Version control Prisma schema and deployment change logs.

## Implemented Core Modules

- Retail catalog, product pages, cart, checkout, payment verify flow
- Guest checkout path
- Wholesale application flow + admin approval actions
- Quote request flow + admin review/reprice/approve/reject/convert
- Admin: dashboard, reports, orders, products CRUD, quotes, wholesale apps, customers, inventory, discounts, settings, banners
- Account pages, address management, order tracking, wishlist management
- Product reviews with verified purchase restriction

## Deployment Notes (Vercel)

- Set all environment variables in Vercel project settings.
- Ensure `DATABASE_URL` points to production Postgres.
- Configure Paystack callback and webhook URL to deployed domain.
- Run schema push/migrations during deploy process.
- See full free-tier deployment walkthrough in `DEPLOYMENT.md`.

## Runtime Health & Readiness

- Liveness endpoint: `GET /api/health`
- Readiness endpoint: `GET /api/readiness` (returns `503` when not ready)
- CLI gate check:

```bash
npm run readiness:check
```

Use the CLI check in CI/CD before deploy and readiness endpoint in platform health probes.
