# Backend setup

```bash
npx wrangler d1 create noma-db
npx wrangler d1 migrations apply noma-db --remote
npx wrangler secret put JWT_SECRET
npx wrangler secret put STRIPE_SECRET_KEY
```

Add the returned D1 `database_id` to `wrangler.jsonc`:

```jsonc
"d1_databases": [{
  "binding": "DB",
  "database_name": "noma-db",
  "database_id": "<id returned by wrangler>"
}]
```
