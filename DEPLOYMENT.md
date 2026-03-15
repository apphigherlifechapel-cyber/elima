# Free Deployment Guide (Vercel + Neon + Upstash)

This app can run on a free stack for MVP/testing:
- Frontend/API: Vercel Hobby
- Database: Neon Free (PostgreSQL)
- Optional Redis: Upstash Free
- Payments: Paystack (transaction fees still apply)

## 1. Create Managed Services

1. Create a Neon project and copy the pooled `DATABASE_URL`.
2. (Optional but recommended) Create Upstash Redis and copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Create a strong random secret for:
   - `NEXTAUTH_SECRET`
   - `CRON_SECRET`

## 2. Import Repo into Vercel

1. Push your code to GitHub.
2. In Vercel: **Add New Project** -> import this repo.
3. Framework preset should auto-detect Next.js.

## 3. Configure Environment Variables in Vercel

Set these in Project Settings -> Environment Variables:

Required:
- `DATABASE_URL` (Neon connection string)
- `NEXTAUTH_SECRET` (long random value)
- `NEXTAUTH_URL` (`https://<your-vercel-domain>`)
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `PAYSTACK_CALLBACK_URL` (`https://<your-vercel-domain>/checkout/success`)
- `CRON_SECRET`

Recommended:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Optional email:
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

## 4. Apply Prisma Schema

After first deploy, run schema sync against production DB:

```bash
npx prisma db push
```

Then seed if needed:

```bash
npm run seed
```

Recommended from your local machine (with production `DATABASE_URL` exported), or via a one-off CI job.

## 5. Paystack Production Setup

In Paystack dashboard:
1. Set callback URL to:
   - `https://<your-vercel-domain>/checkout/success`
2. Set webhook URL to:
   - `https://<your-vercel-domain>/api/webhooks`
3. Ensure the webhook secret matches `PAYSTACK_WEBHOOK_SECRET` in Vercel.

## 6. Schedule Maintenance Jobs

Use any external cron service (GitHub Actions schedule, cron-job.org, EasyCron).

1. Expire stale orders:
   - `POST https://<your-vercel-domain>/api/orders/expire`
   - Header: `Authorization: Bearer <CRON_SECRET>`

2. Clean observability logs:
   - `POST https://<your-vercel-domain>/api/admin/observability/cleanup`
   - Header: `Authorization: Bearer <CRON_SECRET>`

## 7. Post-Deploy Verification

Run these checks:

1. App loads and CSS renders correctly.
2. `GET /api/health` returns healthy.
3. `GET /api/readiness` returns `200`.
4. Register/login works.
5. Add to bag + checkout initialization works.
6. Paystack verification and webhook update order status.
7. Admin pages load and product edit works.

## 8. Free Tier Limits (Important)

- Vercel Hobby has function/runtime limits.
- Neon Free may pause on inactivity (cold starts).
- Upstash Free has request quotas.

This setup is good for MVP, demos, and low traffic. For production growth, move to paid plans.

## 9. Optional GitHub Actions CI/CD

This repo includes:
- `.github/workflows/ci-deploy.yml`

What it does:
1. On PR and push to `main`: runs lint, tests, build, and readiness checks.
2. On push to `main`: deploys to Vercel only if Vercel secrets are set.

Add these GitHub repository secrets:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CALLBACK_URL`
- `PAYSTACK_WEBHOOK_SECRET`
- `CRON_SECRET`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Get Vercel IDs/token:

```bash
vercel login
vercel link
vercel env pull .env.vercel
```

Then copy values from:
- `.vercel/project.json` -> `projectId`, `orgId`
- Vercel account settings -> token
