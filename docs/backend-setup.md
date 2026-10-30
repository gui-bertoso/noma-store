# Backend setup

## Production configuration

1. Sign in to Cloudflare and create the database:

```bash
npx wrangler login
npx wrangler d1 create noma-db
```

Add the returned D1 `database_id` to `wrangler.jsonc`:

```jsonc
"d1_databases": [{
  "binding": "DB",
  "database_name": "noma-db",
  "database_id": "<id returned by wrangler>"
}]
```

Set `PUBLIC_SITE_URL` in `wrangler.jsonc` to your final domain. Apply the schema
and configure secrets:

```bash
npx wrangler d1 migrations apply noma-db --remote
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npm run deploy
```

In Stripe, create an endpoint at
`https://YOUR-DOMAIN.example/api/webhooks/stripe` listening for
`checkout.session.completed`. Copy its signing secret to `STRIPE_WEBHOOK_SECRET`.
Use test keys (`sk_test_`) first, validate a complete order flow, and only then
switch to production keys (`sk_live_`).

The `admin.html` dashboard uses D1 and requires the `ADMIN_TOKEN` secret.
It does not automatically order from suppliers; add that integration only after
validating the platform's APIs and permissions.

## Secrets

Copy `.env.example` to `.env.production.local`, fill it in locally and import it
into the Worker:

```powershell
Copy-Item .env.example .env.production.local
# Edit .env.production.local locally; never commit its values.
npx wrangler secret bulk .env.production.local
```

This project uses Cloudflare Workers with D1 rather than static Pages. The
`.env` format is accepted by `wrangler secret bulk`; values are stored as secrets
instead of being embedded in the bundle. See the
[official documentation](https://developers.cloudflare.com/workers/configuration/secrets/).
